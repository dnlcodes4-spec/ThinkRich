"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import type { Database } from "@/lib/database.types";
import { FLAG_TEMPORARY } from "@/lib/must-change-password";
import { openStateFor } from "@/lib/states";
import { allowedTargets, ROLE_LEVEL, type Role } from "./tiers";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";

// Provisioning authorization, re-checked here because the service role bypasses
// RLS. Two rules, the same ones profiles_insert enforces:
//   1. the target role must rank strictly BELOW the caller's;
//   2. the target's geographic path must sit inside the caller's own scope.
// For a national admin rule 2 is vacuous: their scope is the country, so any
// path passes. That is deliberate, not an oversight.

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the person's full name."),
  email: z.email("Enter a valid email address."),
  // CR-0009 item 1: "before registering any admin, include voter card number".
  vin: z.string().trim().min(1, "Enter the voter's card number (VIN)."),
  // CR-0017 item 1: phone required on every creation form.
  phone: z.string().trim().min(1, "Enter the phone number."),
  target_role: z.string().min(1, "Choose a role."),
  state_id: z.string().uuid().optional(),
  lga_id: z.string().uuid().optional(),
  ward_id: z.string().uuid().optional(),
  polling_unit_id: z.string().uuid().optional(),
});

export type CreateAccountState = {
  status: "idle" | "success" | "error";
  message?: string;
  tempPassword?: string;
  email?: string;
  role?: string;
  fieldErrors?: Record<string, string>;
};

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };
  if (!isAdminConfigured()) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return { status: "error", message: "Your profile was not found." };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    vin: formData.get("vin"),
    phone: formData.get("phone"),
    target_role: str(formData, "target_role"),
    state_id: str(formData, "state_id"),
    lga_id: str(formData, "lga_id"),
    ward_id: str(formData, "ward_id"),
    polling_unit_id: str(formData, "polling_unit_id"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs[0]) fieldErrors[k] = msgs[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }
  const d = parsed.data;

  // Normalise server-side. The field mirrors this as you type, but the database
  // is what has to be right: `voter_ids.vin` is a primary key, so an unsanitised
  // value would silently create a second row for the same card.
  const vin = normalizeVin(d.vin);
  if (!vin) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  const phone = normalizePhone(d.phone);
  if (!phone) {
    return { status: "error", message: PHONE_INVALID, fieldErrors: { phone: PHONE_INVALID } };
  }

  // Rule 1: is this a role the caller may create at all?
  const targets = allowedTargets(me.role as Role);
  const target = targets.find((t) => t.role === d.target_role);
  if (!target) return { status: "error", message: "Your role cannot create that kind of account." };

  const admin = createAdminClient();

  // Resolve and verify the full path bottom-up, so every level is genuinely the
  // child of the one above it (no stitching an LGA onto the wrong state).
  let scope: Pick<
    Database["public"]["Tables"]["profiles"]["Insert"],
    "state_id" | "lga_id" | "ward_id" | "polling_unit_id"
  > = { state_id: null, lga_id: null, ward_id: null, polling_unit_id: null };

  const level = ROLE_LEVEL[target.role];
  const missing = (what: string) => ({
    status: "error" as const,
    message: `Select a ${what}.`,
    fieldErrors: { geo: "Required." },
  });

  if (level === "state") {
    if (!d.state_id) return missing("state");
    const { data } = await admin.from("states").select("id").eq("id", d.state_id).maybeSingle();
    if (!data) return { status: "error", message: "That state is not valid.", fieldErrors: { geo: "Invalid." } };
    scope.state_id = d.state_id;
  } else if (level === "lga") {
    if (!d.lga_id) return missing("LGA");
    const { data } = await admin.from("lgas").select("id, state_id").eq("id", d.lga_id).maybeSingle();
    if (!data) return { status: "error", message: "That LGA is not valid.", fieldErrors: { geo: "Invalid." } };
    scope = { state_id: data.state_id, lga_id: data.id, ward_id: null, polling_unit_id: null };
  } else if (level === "ward") {
    if (!d.ward_id) return missing("ward");
    const { data } = await admin
      .from("wards")
      .select("id, lga_id, lgas(state_id)")
      .eq("id", d.ward_id)
      .maybeSingle();
    if (!data) return { status: "error", message: "That ward is not valid.", fieldErrors: { geo: "Invalid." } };
    const st = (data.lgas as { state_id?: string } | null)?.state_id ?? null;
    scope = { state_id: st, lga_id: data.lga_id, ward_id: data.id, polling_unit_id: null };
  } else if (level === "polling_unit") {
    if (!d.polling_unit_id) return missing("polling unit");
    const { data } = await admin
      .from("polling_units")
      .select("id, ward_id, wards(lga_id, lgas(state_id))")
      .eq("id", d.polling_unit_id)
      .maybeSingle();
    if (!data) return { status: "error", message: "That polling unit is not valid.", fieldErrors: { geo: "Invalid." } };
    const w = data.wards as { lga_id?: string; lgas?: { state_id?: string } } | null;
    scope = {
      state_id: w?.lgas?.state_id ?? null,
      lga_id: w?.lga_id ?? null,
      ward_id: data.ward_id,
      polling_unit_id: data.id,
    };
  }

  // Rule 2: containment. Every scope field the CALLER has set must match the
  // target's path. A national admin has none set, so nothing constrains them.
  const outOfScope =
    (me.state_id && scope.state_id !== me.state_id) ||
    (me.lga_id && scope.lga_id !== me.lga_id) ||
    (me.ward_id && scope.ward_id !== me.ward_id) ||
    (me.polling_unit_id && scope.polling_unit_id !== me.polling_unit_id);
  if (outOfScope) {
    return { status: "error", message: "That area is outside your own.", fieldErrors: { geo: "Out of scope." } };
  }

  // Refuse early if this card already belongs to someone, so we do not create an
  // auth user we are about to throw away. The unique index is still the actual
  // guarantee; this is just a better error.
  const [{ data: vinOnMember }, { data: vinOnProfile }] = await Promise.all([
    admin.from("members").select("id").eq("vin_id", vin).maybeSingle(),
    admin.from("profiles").select("id").eq("vin_id", vin).maybeSingle(),
  ]);
  if (vinOnMember || vinOnProfile) {
    return {
      status: "error",
      message: "That voter's card number is already registered.",
      fieldErrors: { vin: "Already registered." },
    };
  }
  const { error: vinErr } = await admin.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  // Create the auth user, then the profile. Roll back the user if the profile fails.
  const password = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: d.email,
    password,
    email_confirm: true,
    app_metadata: FLAG_TEMPORARY,
  });
  if (createErr || !created.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return { status: "error", message: "An account with that email already exists.", fieldErrors: { email: "Already in use." } };
    }
    return { status: "error", message: "Could not create the account. Please try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: target.role,
    full_name: d.full_name,
    vin_id: vin,
    phone,
    ...scope,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // don't leave an orphan auth user
    return { status: "error", message: "Could not save the account profile. Please try again." };
  }

  // Assigning a state admin activates that state (T-019: "active once a State Admin
  // is assigned"). Losing the last one closes it again, in the database: see
  // migration 0031_state_closes_without_admin.sql.
  if (target.role === "state_admin" && scope.state_id) {
    await openStateFor(user.id, scope.state_id);
  }

  return {
    status: "success",
    message: "Account created.",
    tempPassword: password,
    email: d.email,
    role: target.role,
  };
}
