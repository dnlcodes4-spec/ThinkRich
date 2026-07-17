"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import type { Database } from "@/lib/database.types";
import { NEXT_TIER, type Role } from "./tiers";

// The provisioning hierarchy (NEXT_TIER) is the SAME one the RLS profiles_insert
// policy enforces, re-checked here because the service role bypasses RLS.

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the person's full name."),
  email: z.email("Enter a valid email address."),
  geo_id: z.string().uuid().optional(),
});

export type CreateAccountState = {
  status: "idle" | "success" | "error";
  message?: string;
  tempPassword?: string;
  email?: string;
  role?: string;
  fieldErrors?: Record<string, string>;
};

export async function createAccount(
  _prev: CreateAccountState,
  formData: FormData,
): Promise<CreateAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return { status: "error", message: "Your profile was not found." };

  const tier = NEXT_TIER[me.role as Role];
  if (!tier) return { status: "error", message: "Your role cannot create accounts." };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    geo_id: formData.get("geo_id") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs[0]) fieldErrors[k] = msgs[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  // Resolve the new account's full geographic path, validating that the chosen
  // entity sits within the caller's own scope.
  const admin = createAdminClient();
  let scope: Pick<
    Database["public"]["Tables"]["profiles"]["Insert"],
    "state_id" | "lga_id" | "ward_id" | "polling_unit_id"
  > = { state_id: null, lga_id: null, ward_id: null, polling_unit_id: null };

  if (tier.level === "state") {
    if (!parsed.data.geo_id) return { status: "error", message: "Select a state.", fieldErrors: { geo_id: "Required." } };
    const { data } = await admin.from("states").select("id").eq("id", parsed.data.geo_id).maybeSingle();
    if (!data) return { status: "error", message: "That state is not valid.", fieldErrors: { geo_id: "Invalid." } };
    scope.state_id = parsed.data.geo_id;
  } else if (tier.level === "lga") {
    const { data } = await admin.from("lgas").select("id").eq("id", parsed.data.geo_id ?? "").eq("state_id", me.state_id ?? "").maybeSingle();
    if (!data) return { status: "error", message: "Select an LGA within your state.", fieldErrors: { geo_id: "Out of scope." } };
    scope = { state_id: me.state_id, lga_id: parsed.data.geo_id!, ward_id: null, polling_unit_id: null };
  } else if (tier.level === "ward") {
    const { data } = await admin.from("wards").select("id").eq("id", parsed.data.geo_id ?? "").eq("lga_id", me.lga_id ?? "").maybeSingle();
    if (!data) return { status: "error", message: "Select a ward within your LGA.", fieldErrors: { geo_id: "Out of scope." } };
    scope = { state_id: me.state_id, lga_id: me.lga_id, ward_id: parsed.data.geo_id!, polling_unit_id: null };
  } else if (tier.level === "polling_unit") {
    const { data } = await admin.from("polling_units").select("id").eq("id", parsed.data.geo_id ?? "").eq("ward_id", me.ward_id ?? "").maybeSingle();
    if (!data) return { status: "error", message: "Select a polling unit within your ward.", fieldErrors: { geo_id: "Out of scope." } };
    scope = { state_id: me.state_id, lga_id: me.lga_id, ward_id: me.ward_id, polling_unit_id: parsed.data.geo_id! };
  } else {
    // unit_coordinator -> leader: inherit the coordinator's full PU path.
    scope = { state_id: me.state_id, lga_id: me.lga_id, ward_id: me.ward_id, polling_unit_id: me.polling_unit_id };
  }

  // Create the auth user, then the profile. Roll back the user if the profile fails.
  const password = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
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
    role: tier.role,
    full_name: parsed.data.full_name,
    ...scope,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // don't leave an orphan auth user
    return { status: "error", message: "Could not save the account profile. Please try again." };
  }

  // Assigning a state admin activates that state (T-019: "active once a State Admin is assigned").
  if (tier.role === "state_admin" && scope.state_id) {
    await admin.from("states").update({ is_active: true }).eq("id", scope.state_id);
  }

  return {
    status: "success",
    message: "Account created.",
    tempPassword: password,
    email: parsed.data.email,
    role: tier.role,
  };
}
