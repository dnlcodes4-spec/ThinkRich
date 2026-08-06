"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";
import { isAdult } from "@/lib/age";

// Everyone is a member (CR-0014 / ADR-0016). A staff account (any non-member role)
// is also a member of the movement: they hold a real `members` record keyed to their
// PERSONAL home voter registration (home state/LGA/ward/polling unit + NIN/VIN/DOB),
// independent of the admin scope on their profile. That record carries their
// membership number and card.
//
// This is a self-service path, so it uses the service-role client (app_metadata /
// cross-row checks) but is HARD-SCOPED to the caller: every write targets
// user_id = auth.uid(). It can never create a membership for anyone else. It mirrors
// `addMyVin`, and additionally creates the member row and activates the account.

export type MembershipState = {
  status: "idle" | "success" | "error";
  message?: string;
  membershipNumber?: string;
  memberId?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  date_of_birth: z.string().min(1, "Enter your date of birth."),
  nin: z.string().trim().min(1, "Enter your NIN."),
  // Optional here: a staff account that already has a VIN on its profile reuses it,
  // so the form omits the field. Required (enforced below) only when there is none.
  vin: z.string().trim().optional(),
  gender: z.enum(["male", "female"], { message: "Choose a gender." }),
  phone: z.string().trim().optional(),
  polling_unit_id: z.string().uuid("Choose your home polling unit."),
});

export async function completeMyMembership(
  _prev: MembershipState,
  formData: FormData,
): Promise<MembershipState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const admin = tryCreateAdminClient();
  if (!admin) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    date_of_birth: formData.get("date_of_birth"),
    nin: formData.get("nin"),
    vin: formData.get("vin"),
    gender: formData.get("gender"),
    phone: formData.get("phone") || undefined,
    polling_unit_id: formData.get("polling_unit_id") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, m] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (m && m[0]) fieldErrors[k] = m[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  // The caller's profile. Base-tier members are registered by a leader, not here.
  const { data: profile } = await admin
    .from("profiles")
    .select("role, status, vin_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return { status: "error", message: "Your profile was not found." };
  if (profile.role === "member") {
    return {
      status: "error",
      message: "Registered voters already have a membership record from registration.",
    };
  }

  // Already a member? Idempotent: return their existing number rather than duplicating.
  const { data: existing } = await admin
    .from("members")
    .select("id, membership_number")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) {
    return {
      status: "success",
      message: "You are already a member.",
      membershipNumber: existing.membership_number,
      memberId: existing.id,
    };
  }

  if (!isAdult(parsed.data.date_of_birth)) {
    return {
      status: "error",
      message: "You must be at least 18 years old.",
      fieldErrors: { date_of_birth: "Must be 18 or older." },
    };
  }

  let phone: string | null = null;
  if (parsed.data.phone) {
    phone = normalizePhone(parsed.data.phone);
    if (!phone) return { status: "error", message: PHONE_INVALID, fieldErrors: { phone: PHONE_INVALID } };
  }

  // Resolve the home path from the chosen polling unit, so state/lga/ward are consistent.
  const { data: unit } = await admin
    .from("polling_units")
    .select("id, ward_id")
    .eq("id", parsed.data.polling_unit_id)
    .maybeSingle();
  const { data: ward } = unit
    ? await admin.from("wards").select("id, lga_id").eq("id", unit.ward_id).maybeSingle()
    : { data: null };
  const { data: lga } = ward
    ? await admin.from("lgas").select("id, state_id").eq("id", ward.lga_id).maybeSingle()
    : { data: null };
  if (!unit || !ward || !lga) {
    return { status: "error", message: "That polling unit could not be found." };
  }

  // A person has one voter's card. If the profile already carries a VIN, REUSE it
  // (never overwrite); otherwise take, validate, dedupe and store the entered one.
  let vin = profile.vin_id;
  if (!vin) {
    const entered = normalizeVin(parsed.data.vin ?? null);
    if (!entered) return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
    // The entered VIN must not already belong to someone else.
    const [{ data: vinOnMember }, { data: vinOnProfile }] = await Promise.all([
      admin.from("members").select("id").eq("vin_id", entered).maybeSingle(),
      admin.from("profiles").select("id").eq("vin_id", entered).neq("id", user.id).maybeSingle(),
    ]);
    if (vinOnMember || vinOnProfile) {
      return {
        status: "error",
        message: "That voter's card number is already registered.",
        fieldErrors: { vin: "Already registered." },
      };
    }
    // The VIN row must exist before a member/profile can reference it (voter_ids.vin PK).
    const { error: vinErr } = await admin.from("voter_ids").upsert({ vin: entered }, { onConflict: "vin" });
    if (vinErr) return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
    vin = entered;
  }

  // Create the caller's own membership. registered_by = self: a staff person brings
  // themselves in. The membership number is assigned by the DB trigger.
  const { data: inserted, error } = await admin
    .from("members")
    .insert({
      user_id: user.id,
      registered_by: user.id,
      state_id: lga.state_id,
      lga_id: ward.lga_id,
      ward_id: unit.ward_id,
      polling_unit_id: unit.id,
      full_name: parsed.data.full_name,
      date_of_birth: parsed.data.date_of_birth,
      nin: parsed.data.nin,
      vin_id: vin,
      gender: parsed.data.gender,
      phone,
    })
    .select("id, membership_number")
    .single();

  if (error) {
    const m = error.message.toLowerCase();
    if (error.code === "23505" && m.includes("nin")) {
      return {
        status: "error",
        message: "A voter with this NIN is already registered.",
        fieldErrors: { nin: "Already registered." },
      };
    }
    if (error.code === "23505" && m.includes("vin")) {
      return {
        status: "error",
        message: "That voter's card number is already registered.",
        fieldErrors: { vin: "Already registered." },
      };
    }
    if (m.includes("18 years")) {
      return {
        status: "error",
        message: "You must be at least 18 years old.",
        fieldErrors: { date_of_birth: "Must be 18 or older." },
      };
    }
    return { status: "error", message: "Could not save your membership. Please try again." };
  }

  // Put the VIN on the profile and activate the account, unless it is frozen or
  // deleted (never revive those through a self-service path). Same rule as addMyVin.
  const nextStatus =
    profile.status === "frozen" || profile.status === "deleted" ? profile.status : "active";
  await admin.from("profiles").update({ vin_id: vin, status: nextStatus }).eq("id", user.id);

  return {
    status: "success",
    message: "Your membership is complete.",
    membershipNumber: inserted.membership_number,
    memberId: inserted.id,
  };
}
