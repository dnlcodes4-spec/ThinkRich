"use server";

import { revalidatePath } from "next/cache";
import { zodFail } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import { FLAG_TEMPORARY } from "@/lib/must-change-password";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";
import { logActivityAs } from "@/lib/activity";
import { PARTNER_KIND_LABELS, partnerOnboardSchema } from "@/lib/partners";

// Onboarding a partner organisation (CR-0026) is two writes that must agree:
// the `partners` row, and the first `partner_admin` who runs it.
//
// They use DIFFERENT clients on purpose. The partners row goes through the
// CALLER's client so `partners_super_all` authorises it in the database, which
// keeps RLS as the real boundary rather than a code check. The auth user and the
// profile need the service role (nothing holding a user JWT can create an auth
// user), so the super_admin check below is re-done in code for that half.
//
// A partner_admin carries NO geography: `profiles_scope_matches_role` requires
// every geo column null with `partner_id` set, and `enforce_partner_ceiling`
// exempts the role. Sending a state_id here would be rejected by the database.

export type OnboardPartnerResult = {
  status: "success" | "error";
  message?: string;
  partnerId?: string;
  tempPassword?: string;
  email?: string;
  fieldErrors?: Record<string, string>;
};

const NOT_SUPER = "Only a super admin can onboard a partner.";

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

  const parsed = partnerOnboardSchema.safeParse(input);
  if (!parsed.success) {
    const failed = zodFail(parsed.error);
    return { status: "error", message: failed.message, fieldErrors: failed.fieldErrors };
  }
  const d = parsed.data;

  // Normalise server-side: `voter_ids.vin` is a primary key, so an unsanitised
  // value would quietly create a second row for the same card.
  const vin = normalizeVin(d.adminVin);
  if (!vin) return { status: "error", message: VIN_INVALID, fieldErrors: { adminVin: VIN_INVALID } };

  const phone = normalizePhone(d.adminPhone);
  if (!phone) return { status: "error", message: PHONE_INVALID, fieldErrors: { adminPhone: PHONE_INVALID } };

  const admin = createAdminClient();

  if (d.scopeStateId) {
    const { data: state } = await admin.from("states").select("id").eq("id", d.scopeStateId).maybeSingle();
    if (!state) {
      return { status: "error", message: "That state is not valid.", fieldErrors: { scopeStateId: "Invalid." } };
    }
  }

  // Refuse a card that already belongs to someone BEFORE creating anything, so a
  // known-bad submit does not leave an orphan partner row behind.
  const [{ data: vinOnMember }, { data: vinOnProfile }] = await Promise.all([
    admin.from("members").select("id").eq("vin_id", vin).maybeSingle(),
    admin.from("profiles").select("id").eq("vin_id", vin).maybeSingle(),
  ]);
  if (vinOnMember || vinOnProfile) {
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
  const dropPartner = async () => {
    await supabase.from("partners").delete().eq("id", partner.id);
  };

  const { error: vinErr } = await admin.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) {
    await dropPartner();
    return { status: "error", message: VIN_INVALID, fieldErrors: { adminVin: VIN_INVALID } };
  }

  const password = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: d.adminEmail,
    password,
    email_confirm: true,
    app_metadata: FLAG_TEMPORARY,
  });
  if (createErr || !created?.user) {
    await dropPartner();
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return {
        status: "error",
        message: "An account with that email already exists.",
        fieldErrors: { adminEmail: "Already in use." },
      };
    }
    return { status: "error", message: "Could not create the admin account. Please try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "partner_admin",
    full_name: d.adminFullName,
    partner_id: partner.id,
    vin_id: vin,
    phone,
    status: "active",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // don't leave an orphan auth user
    await dropPartner();
    return { status: "error", message: "Could not save the admin's profile. Please try again." };
  }

  await logActivityAs(user.id, {
    action: "partner.onboarded",
    summary: `Onboarded partner ${d.name} (${PARTNER_KIND_LABELS[d.kind]})`,
    subjectType: "partner",
    subjectId: partner.id,
    stateId: d.scopeStateId,
    partnerId: partner.id,
  });

  revalidatePath("/app/admin/partners");

  return {
    status: "success",
    message: "Partner onboarded.",
    partnerId: partner.id,
    tempPassword: password,
    email: d.adminEmail,
  };
}
