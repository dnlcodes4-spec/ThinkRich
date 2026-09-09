"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zodFail } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import { FLAG_TEMPORARY } from "@/lib/must-change-password";
import { logActivityAs } from "@/lib/activity";
import { partnerAdminSchema, partnerEditSchema } from "@/lib/partners";
import { provisionPartnerAdmin } from "@/lib/partner-provisioning";

const NOT_SUPER = "Only a super admin can manage a partner.";

type SuperGate =
  | { error: string }
  | { supabase: Awaited<ReturnType<typeof createClient>>; userId: string };

async function requireSuperAdmin(): Promise<SuperGate> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") return { error: NOT_SUPER };
  return { supabase, userId: user.id };
}

// ─────────── deactivate / reactivate ───────────

// The update runs under the CALLER's own client, so `partners_super_all` is what
// authorises it: a non-super-admin's update matches no rows even if they reach
// this action. The role read is only there to keep the log honest.
export async function setPartnerActive(formData: FormData): Promise<void> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return;
  const { supabase, userId } = gate;

  const id = z.string().uuid().safeParse(formData.get("partner_id"));
  if (!id.success) return;
  const active = formData.get("active") === "true";

  const { data: updated } = await supabase
    .from("partners")
    .update({ status: active ? "active" : "inactive" })
    .eq("id", id.data)
    .select("id, name")
    .maybeSingle();
  if (!updated) return;

  await logActivityAs(userId, {
    action: active ? "partner.reactivated" : "partner.deactivated",
    summary: `${active ? "Reactivated" : "Deactivated"} partner ${updated.name}`,
    subjectType: "partner",
    subjectId: updated.id,
    partnerId: updated.id,
  });

  revalidatePath("/app/admin/partners");
  revalidatePath(`/app/admin/partners/${updated.id}`);
}

// ─────────── edit details (name + ceiling; code is fixed) ───────────

export type PartnerActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
  tempPassword?: string;
  email?: string;
};

export async function updatePartner(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return { status: "error", message: gate.error };
  const { supabase, userId } = gate;

  const id = z.string().uuid().safeParse(formData.get("partner_id"));
  if (!id.success) return { status: "error", message: "Unknown partner." };

  const rawState = (formData.get("scopeStateId") as string | null) || null;
  const parsed = partnerEditSchema.safeParse({
    name: formData.get("name"),
    scopeStateId: rawState,
  });
  if (!parsed.success) {
    const failed = zodFail(parsed.error);
    return { status: "error", message: failed.message, fieldErrors: failed.fieldErrors };
  }
  const d = parsed.data;

  // A friendlier message than the DB trigger's: count who would be stranded.
  if (d.scopeStateId) {
    const admin = createAdminClient();
    const [{ count: m }, { count: p }] = await Promise.all([
      admin
        .from("members")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", id.data)
        .neq("status", "deleted")
        .neq("state_id", d.scopeStateId),
      admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("partner_id", id.data)
        .not("state_id", "is", null)
        .neq("state_id", d.scopeStateId),
    ]);
    const outside = (m ?? 0) + (p ?? 0);
    if (outside > 0) {
      return {
        status: "error",
        message: `Cannot cap this partner at that state: ${outside} ${outside === 1 ? "person is" : "people are"} already registered outside it.`,
        fieldErrors: { scopeStateId: "People are outside this state." },
      };
    }
  }

  const { data: updated, error } = await supabase
    .from("partners")
    .update({ name: d.name, scope_state_id: d.scopeStateId })
    .eq("id", id.data)
    .select("id, name")
    .maybeSingle();
  if (error || !updated) {
    // The widen-only trigger also guards this, in case the app check raced.
    if (error?.message?.includes("narrow this partner")) {
      return {
        status: "error",
        message: "Cannot cap this partner at that state: it has members or staff outside it.",
        fieldErrors: { scopeStateId: "People are outside this state." },
      };
    }
    return { status: "error", message: "Could not save. Please try again." };
  }

  await logActivityAs(userId, {
    action: "partner.updated",
    summary: `Updated partner ${updated.name}`,
    subjectType: "partner",
    subjectId: updated.id,
    stateId: d.scopeStateId,
    partnerId: updated.id,
  });

  revalidatePath("/app/admin/partners");
  revalidatePath(`/app/admin/partners/${updated.id}`);
  return { status: "success", message: "Partner updated." };
}

// ─────────── add another partner admin ───────────

export async function addPartnerAdmin(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return { status: "error", message: gate.error };
  const { supabase, userId } = gate;
  if (!isAdminConfigured()) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const id = z.string().uuid().safeParse(formData.get("partner_id"));
  if (!id.success) return { status: "error", message: "Unknown partner." };

  const parsed = partnerAdminSchema.safeParse({
    adminFullName: formData.get("adminFullName"),
    adminEmail: formData.get("adminEmail"),
    adminVin: formData.get("adminVin"),
    adminPhone: formData.get("adminPhone"),
  });
  if (!parsed.success) {
    const failed = zodFail(parsed.error);
    return { status: "error", message: failed.message, fieldErrors: failed.fieldErrors };
  }

  const admin = createAdminClient();
  const { data: partner } = await supabase.from("partners").select("id, name").eq("id", id.data).maybeSingle();
  if (!partner) return { status: "error", message: "Unknown partner." };

  const provisioned = await provisionPartnerAdmin(admin, {
    partnerId: partner.id,
    fullName: parsed.data.adminFullName,
    email: parsed.data.adminEmail,
    vin: parsed.data.adminVin,
    phone: parsed.data.adminPhone,
  });
  if (!provisioned.ok) {
    return { status: "error", message: provisioned.message, fieldErrors: provisioned.fieldErrors };
  }

  await logActivityAs(userId, {
    action: "partner.admin_added",
    summary: `Added an admin (${parsed.data.adminFullName}) to partner ${partner.name}`,
    subjectType: "partner",
    subjectId: partner.id,
    partnerId: partner.id,
  });

  revalidatePath(`/app/admin/partners/${partner.id}`);
  return {
    status: "success",
    message: "Admin added.",
    tempPassword: provisioned.tempPassword,
    email: provisioned.email,
  };
}

// ─────────── reset a partner admin's password ───────────

export async function resetPartnerAdminPassword(
  _prev: PartnerActionState,
  formData: FormData,
): Promise<PartnerActionState> {
  const gate = await requireSuperAdmin();
  if ("error" in gate) return { status: "error", message: gate.error };
  const { supabase, userId } = gate;
  if (!isAdminConfigured()) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const profileId = z.string().uuid().safeParse(formData.get("profile_id"));
  if (!profileId.success) return { status: "error", message: "Unknown admin." };

  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role, partner_id")
    .eq("id", profileId.data)
    .maybeSingle();
  if (!target || target.role !== "partner_admin" || !target.partner_id) {
    return { status: "error", message: "That is not a partner admin." };
  }

  const admin = createAdminClient();
  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(target.id, {
    password,
    app_metadata: FLAG_TEMPORARY,
  });
  if (error) return { status: "error", message: "Could not reset the password. Please try again." };

  await logActivityAs(userId, {
    action: "partner.admin_login_reset",
    summary: `Reset the login password for ${target.full_name}`,
    subjectType: "partner",
    subjectId: target.partner_id,
    partnerId: target.partner_id,
  });

  const { data: emailRow } = await admin.auth.admin.getUserById(target.id);
  revalidatePath(`/app/admin/partners/${target.partner_id}`);
  return {
    status: "success",
    message: "Password reset.",
    tempPassword: password,
    email: emailRow?.user?.email ?? "",
  };
}
