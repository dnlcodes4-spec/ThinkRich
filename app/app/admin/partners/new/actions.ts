"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zodFail } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { logActivityAs } from "@/lib/activity";
import { PARTNER_KIND_LABELS, partnerOnboardSchema } from "@/lib/partners";
import { provisionPartnerAdmin, vinAlreadyRegistered } from "@/lib/partner-provisioning";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";

// Onboarding a partner organisation (CR-0026) is two writes that must agree:
// the `partners` row, and the first `partner_admin` who runs it.
//
// They use DIFFERENT clients on purpose. The partners row goes through the
// CALLER's client so `partners_super_all` authorises it in the database, which
// keeps RLS as the real boundary rather than a code check. The auth user and the
// profile need the service role (nothing holding a user JWT can create an auth
// user), so the super_admin check below is re-done in code for that half.

export type OnboardPartnerResult = {
  status: "success" | "error";
  message?: string;
  partnerId?: string;
  tempPassword?: string;
  email?: string;
  fieldErrors?: Record<string, string>;
};

const NOT_SUPER = "Only a super admin can onboard a partner.";

const onboardInputSchema = partnerOnboardSchema.extend({
  /** When set, this partner came from a public partnership request; mark it onboarded. */
  requestId: z.string().uuid().nullish(),
});

export async function onboardPartner(input: unknown): Promise<OnboardPartnerResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };
  if (!isAdminConfigured()) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (me?.role !== "super_admin") return { status: "error", message: NOT_SUPER };

  const parsed = onboardInputSchema.safeParse(input);
  if (!parsed.success) {
    const failed = zodFail(parsed.error);
    return { status: "error", message: failed.message, fieldErrors: failed.fieldErrors };
  }
  const d = parsed.data;

  const admin = createAdminClient();

  if (d.scopeStateId) {
    const { data: state } = await admin.from("states").select("id").eq("id", d.scopeStateId).maybeSingle();
    if (!state) {
      return { status: "error", message: "That state is not valid.", fieldErrors: { scopeStateId: "Invalid." } };
    }
  }

  // The VIN is checked here too (provisionPartnerAdmin re-checks), so a known-bad
  // submit never creates a partner row that has to be unwound.
  const vin = normalizeVin(d.adminVin);
  if (!vin) return { status: "error", message: VIN_INVALID, fieldErrors: { adminVin: VIN_INVALID } };
  if (await vinAlreadyRegistered(admin, vin)) {
    return {
      status: "error",
      message: "That voter's card number is already registered.",
      fieldErrors: { adminVin: "Already registered." },
    };
  }

  const { data: partner, error: partnerErr } = await supabase
    .from("partners")
    .insert({
      name: d.name,
      kind: d.kind,
      scope_state_id: d.scopeStateId,
      code: d.code,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (partnerErr || !partner) {
    if (partnerErr?.code === "23505") {
      return {
        status: "error",
        message: "That code is already taken.",
        fieldErrors: { code: "That code is already taken." },
      };
    }
    return { status: "error", message: "Could not create the partner. Please try again." };
  }

  // Everything past here owns the partner row: unwind it on any failure.
  const provisioned = await provisionPartnerAdmin(admin, {
    partnerId: partner.id,
    fullName: d.adminFullName,
    email: d.adminEmail,
    vin: d.adminVin,
    phone: d.adminPhone,
  });
  if (!provisioned.ok) {
    await supabase.from("partners").delete().eq("id", partner.id);
    return { status: "error", message: provisioned.message, fieldErrors: provisioned.fieldErrors };
  }

  await logActivityAs(user.id, {
    action: "partner.onboarded",
    summary: `Onboarded partner ${d.name} (${PARTNER_KIND_LABELS[d.kind]})`,
    subjectType: "partner",
    subjectId: partner.id,
    stateId: d.scopeStateId,
    partnerId: partner.id,
  });

  if (d.requestId) {
    await admin
      .from("partnership_requests")
      .update({ status: "onboarded", partner_id: partner.id, handled_by: user.id, handled_at: new Date().toISOString() })
      .eq("id", d.requestId);
  }

  revalidatePath("/app/admin/partners");
  revalidatePath("/app/admin/partners/requests");

  return {
    status: "success",
    message: "Partner onboarded.",
    partnerId: partner.id,
    tempPassword: provisioned.tempPassword,
    email: provisioned.email,
  };
}
