import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { generateTempPassword } from "@/lib/provisioning";
import { FLAG_TEMPORARY } from "@/lib/must-change-password";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";

type Admin = SupabaseClient<Database>;

// True when this VIN already belongs to a member or a profile. Callers that
// create other rows first (onboarding creates the partner) use this to bail
// before doing so; provisionPartnerAdmin also re-checks as defense.
export async function vinAlreadyRegistered(admin: Admin, vin: string): Promise<boolean> {
  const [{ data: onMember }, { data: onProfile }] = await Promise.all([
    admin.from("members").select("id").eq("vin_id", vin).maybeSingle(),
    admin.from("profiles").select("id").eq("vin_id", vin).maybeSingle(),
  ]);
  return Boolean(onMember || onProfile);
}

export type ProvisionPartnerAdminResult =
  | { ok: true; userId: string; tempPassword: string; email: string }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

// Create one `partner_admin` account for an existing partner: validate + dedupe
// the VIN, create the auth user with a temp password, insert the profile (no
// geography — `profiles_scope_matches_role` requires that for the role), and
// unwind the auth user if the profile write fails. It does NOT touch the
// `partners` row; onboarding owns that and its own rollback.
//
// Uses the service-role `admin` client throughout: creating an auth user needs
// it, and the caller has already checked the actor is a super admin.
export async function provisionPartnerAdmin(
  admin: Admin,
  input: {
    partnerId: string;
    fullName: string;
    email: string;
    vin: string;
    phone: string;
  },
): Promise<ProvisionPartnerAdminResult> {
  const vin = normalizeVin(input.vin);
  if (!vin) return { ok: false, message: VIN_INVALID, fieldErrors: { adminVin: VIN_INVALID } };

  const phone = normalizePhone(input.phone);
  if (!phone) return { ok: false, message: PHONE_INVALID, fieldErrors: { adminPhone: PHONE_INVALID } };

  // Refuse a card that already belongs to someone before creating anything.
  if (await vinAlreadyRegistered(admin, vin)) {
    return {
      ok: false,
      message: "That voter's card number is already registered.",
      fieldErrors: { adminVin: "Already registered." },
    };
  }

  const { error: vinErr } = await admin.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) return { ok: false, message: VIN_INVALID, fieldErrors: { adminVin: VIN_INVALID } };

  const password = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: input.email,
    password,
    email_confirm: true,
    app_metadata: FLAG_TEMPORARY,
  });
  if (createErr || !created?.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return {
        ok: false,
        message: "An account with that email already exists.",
        fieldErrors: { adminEmail: "Already in use." },
      };
    }
    return { ok: false, message: "Could not create the admin account. Please try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "partner_admin",
    full_name: input.fullName,
    partner_id: input.partnerId,
    vin_id: vin,
    phone,
    status: "active",
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // no orphan auth user
    return { ok: false, message: "Could not save the admin's profile. Please try again." };
  }

  return { ok: true, userId: created.user.id, tempPassword: password, email: input.email };
}
