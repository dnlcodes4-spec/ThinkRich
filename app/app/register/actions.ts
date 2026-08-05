"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { provisionMemberLogin } from "@/app/app/members/provision-login";
import { logActivityAs } from "@/lib/activity";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";

// Who may register a member (CR-0017 item 7). A leader and unit coordinator write
// into their own polling unit; the higher coordinator tiers and the national
// coordinator choose a polling unit within their scope. RLS (0033) is the control;
// this list and the containment check below mirror it.
const REGISTRAR_ROLES = [
  "leader",
  "unit_coordinator",
  "ward_admin",
  "lg_admin",
  "state_admin",
  "national_admin",
] as const;
// These have a fixed polling unit (their own); the rest choose one in their scope.
const FIXED_PU_ROLES = ["leader", "unit_coordinator"] as const;

// Registering a member (T-004, extended by T-033 and T-040).
//
// A LEADER registers into their own polling unit; geography is not chosen, it is
// derived from their profile. There is no longer a limit on how many members they
// may hold: CR-0009 §3.4 turned ten from a ceiling into a milestone, and migration
// 0023 dropped the enforcing trigger.
//
// The NATIONAL COORDINATOR registers into any polling unit and may attribute the
// member to a leader there, which keeps the member inside the leadership chain.
//
// The membership number is assigned by a DB trigger; RLS + triggers enforce
// scope, NIN uniqueness and age >= 18. This action validates input and maps DB
// errors to friendly messages; it never bypasses RLS (no service role).

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the member's full name."),
  date_of_birth: z.string().min(1, "Enter the date of birth."),
  nin: z.string().trim().min(1, "Enter the NIN."),
  // Required for everyone as of CR-0009 §3.1. Validated after normalisation, not
  // on the raw string, so a member may type it with spaces or dashes.
  vin: z.string().trim().min(1, "Enter the voter's card number (VIN)."),
  // Required for everyone as of CR-0017. Validated after normalisation.
  phone: z.string().trim().min(1, "Enter the member's phone number."),
  gender: z.enum(["male", "female"], { message: "Choose a gender." }),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]).optional(),
  account_number: z.string().trim().optional(),
  account_name: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
  polling_unit_id: z.string().uuid().optional(),
  registered_by: z.string().uuid().optional(),
});

export type RegisterState = {
  status: "idle" | "success" | "error";
  message?: string;
  membershipNumber?: string;
  loginEmail?: string;
  loginTempPassword?: string;
  loginNote?: string;
  fieldErrors?: Record<string, string>;
};

function isAdult(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

export async function registerMember(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", user.id)
    .maybeSingle();

  const role = profile?.role as (typeof REGISTRAR_ROLES)[number] | undefined;
  if (!profile || !role || !REGISTRAR_ROLES.includes(role)) {
    return { status: "error", message: "Your role cannot register members." };
  }
  const fixedPu = (FIXED_PU_ROLES as readonly string[]).includes(role);
  // A fixed-PU registrar must actually have a polling unit on their profile.
  if (fixedPu && !profile.polling_unit_id) {
    return { status: "error", message: "Your account has no polling unit set, so you cannot register here." };
  }

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    date_of_birth: formData.get("date_of_birth"),
    nin: formData.get("nin"),
    vin: formData.get("vin"),
    phone: formData.get("phone"),
    gender: formData.get("gender"),
    email: formData.get("email"),
    account_number: formData.get("account_number"),
    account_name: formData.get("account_name"),
    bank_name: formData.get("bank_name"),
    polling_unit_id: formData.get("polling_unit_id") || undefined,
    registered_by: formData.get("registered_by") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs[0]) fieldErrors[key] = msgs[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  // Normalise BEFORE anything touches the database. This is the only gate; the
  // field's own sanitising is a typing convenience, not the control.
  const vin = normalizeVin(parsed.data.vin);
  if (!vin) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { status: "error", message: PHONE_INVALID, fieldErrors: { phone: PHONE_INVALID } };
  }

  if (!isAdult(parsed.data.date_of_birth)) {
    return {
      status: "error",
      message: "The member must be at least 18 years old.",
      fieldErrors: { date_of_birth: "Must be 18 or older." },
    };
  }

  // Resolve the target polling unit and its full path. A leader's / unit
  // coordinator's is fixed to their own; the higher tiers choose one, constrained
  // to their scope by the containment check below (and by RLS).
  const targetPu = fixedPu ? profile.polling_unit_id! : parsed.data.polling_unit_id;
  if (!targetPu) {
    return { status: "error", message: "Choose the polling unit this member belongs to." };
  }

  const { data: unit } = await supabase
    .from("polling_units")
    .select("id, ward_id")
    .eq("id", targetPu)
    .maybeSingle();
  const { data: ward } = unit
    ? await supabase.from("wards").select("id, lga_id").eq("id", unit.ward_id).maybeSingle()
    : { data: null };
  const { data: lga } = ward
    ? await supabase.from("lgas").select("id, state_id").eq("id", ward.lga_id).maybeSingle()
    : { data: null };
  const { data: state } = lga
    ? await supabase.from("states").select("id, name, is_active").eq("id", lga.state_id).maybeSingle()
    : { data: null };

  if (!unit || !ward || !lga || !state) {
    return { status: "error", message: "That polling unit could not be found." };
  }
  const lgaId = lga.id;
  const stateId = state.id;

  // Containment: the chosen polling unit must sit inside the registrar's own
  // scope. Defence in depth, RLS (0033) enforces the same; this returns a clear
  // message instead of a policy rejection. A national admin has no scope set, so
  // nothing constrains them; each set level on the profile must match.
  const outOfScope =
    (profile.state_id && stateId !== profile.state_id) ||
    (profile.lga_id && lgaId !== profile.lga_id) ||
    (profile.ward_id && unit.ward_id !== profile.ward_id) ||
    (profile.polling_unit_id && unit.id !== profile.polling_unit_id);
  if (outOfScope) {
    return { status: "error", message: "That polling unit is outside your own area." };
  }

  // A state must be activated (T-019) before members can be registered in it.
  // This is a workflow gate, not a scope limit, so it holds for everyone; the
  // coordinator is the one who can lift it.
  if (!state.is_active) {
    return {
      status: "error",
      message: role === "national_admin"
        ? `${state.name} is not activated yet. Activate it, then register.`
        : "Your state is not active yet. Registration opens once it is activated.",
    };
  }

  // Who holds this member. A leader always holds their own. Any coordinator tier
  // may attribute to a leader in that polling unit, or hold the member themselves.
  let registeredBy = user.id;
  if (role !== "leader" && parsed.data.registered_by) {
    const { data: leader } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", parsed.data.registered_by)
      .eq("role", "leader")
      .eq("polling_unit_id", unit.id)
      .maybeSingle();
    if (!leader) {
      return {
        status: "error",
        message: "That leader is not in this polling unit.",
        fieldErrors: { registered_by: "Not in this polling unit." },
      };
    }
    registeredBy = leader.id;
  }

  // Lowercased so what we store matches what `members_email_unique` compares
  // (migration 0030 indexes lower(email)), and so it matches what Supabase Auth
  // will use if this member is later given a login. Without this, two members
  // could differ only by capitalisation and the second could never sign in.
  const email = parsed.data.email ? parsed.data.email.trim().toLowerCase() : null;

  // The VIN must exist in `voter_ids` before a member can reference it. Upsert
  // rather than insert because the row may legitimately exist already: the same
  // person can hold both a membership record and a leadership profile (ADR-0015),
  // and both point at this one row. A retry after a partial failure lands here too.
  // It does NOT mean two people may share a VIN; the unique indexes on
  // members.vin_id and profiles.vin_id still refuse that.
  const { error: vinErr } = await supabase.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  const { data: inserted, error } = await supabase
    .from("members")
    .insert({
      registered_by: registeredBy,
      state_id: stateId,
      lga_id: lgaId,
      ward_id: unit.ward_id,
      polling_unit_id: unit.id,
      full_name: parsed.data.full_name,
      date_of_birth: parsed.data.date_of_birth,
      nin: parsed.data.nin,
      vin_id: vin,
      phone,
      gender: parsed.data.gender,
      email,
      account_number: parsed.data.account_number || null,
      account_name: parsed.data.account_name || null,
      bank_name: parsed.data.bank_name || null,
    })
    .select("id, membership_number")
    .single();

  if (error) {
    const m = error.message.toLowerCase();
    if (error.code === "23505" && m.includes("nin")) {
      return {
        status: "error",
        message: "A member with this NIN is already registered.",
        fieldErrors: { nin: "Already registered." },
      };
    }
    if (error.code === "23505" && m.includes("vin")) {
      return {
        status: "error",
        message: "That voter's card number is already registered to someone else.",
        fieldErrors: { vin: "Already registered." },
      };
    }
    if (error.code === "23505" && m.includes("email")) {
      return {
        status: "error",
        message: "That email is already in use.",
        fieldErrors: { email: "Already in use." },
      };
    }
    if (m.includes("18 years")) {
      return {
        status: "error",
        message: "The member must be at least 18 years old.",
        fieldErrors: { date_of_birth: "Must be 18 or older." },
      };
    }
    if (m.includes("geography")) {
      return { status: "error", message: "Member geography is invalid for your polling unit." };
    }
    return { status: "error", message: "Could not register the member. Please try again." };
  }

  // If an email was captured, provision the member's own login now and hand the
  // temporary password back to the leader. A provisioning failure does NOT fail
  // the registration (the member exists); it is surfaced as a note instead, and
  // the login can be provisioned later from the roster.
  let loginEmail: string | undefined;
  let loginTempPassword: string | undefined;
  let loginNote: string | undefined;
  if (email) {
    const res = await provisionMemberLogin(inserted.id);
    if (res.ok) {
      loginEmail = res.email;
      loginTempPassword = res.tempPassword;
    } else {
      loginNote = res.error;
    }
  }

  await logActivityAs(user.id, {
    action: "member.registered",
    summary: `Registered ${parsed.data.full_name} (${inserted.membership_number})`,
    subjectType: "member",
    subjectId: inserted.id,
    stateId: profile.state_id,
  });

  // No revalidatePath here: the member's one-time temporary password lives only
  // in the client state below and is shown once. Revalidating refreshes the
  // router and remounts this form, wiping that password before the leader can
  // read it (the roster's provisioning action omits it for the same reason).
  // The home capacity and roster are auth-dynamic pages, so they re-fetch on the
  // next navigation anyway.
  return {
    status: "success",
    membershipNumber: inserted.membership_number,
    message: "Member registered.",
    loginEmail,
    loginTempPassword,
    loginNote,
  };
}
