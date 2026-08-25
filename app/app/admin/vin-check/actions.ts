"use server";

// THROWAWAY verification tool for the voter_ids upsert -> insert fix (PR #81).
// Not linked from any nav; delete this whole directory once confirmed live.
//
// Exercises the exact write register/actions.ts makes, under the caller's own
// RLS-bound credentials (no service role) so it fails or succeeds exactly the
// way a leader's registration would. `deleteTestVin` is the one exception: it
// uses the admin client only to clean up the row this page itself created,
// after confirming nothing real references it first.

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { type ActionState, ok, fail } from "@/lib/action-state";

const schema = z.object({ vin: z.string().trim().min(1, "Enter a VIN.") });

export type VinCheckState = ActionState<{ vin: string; alreadyExisted: boolean }>;

// Both actions are gated identically: a Server Action is its own callable
// endpoint, independent of whether the page that renders its form checks
// anything, so the page's role check alone would NOT stop a direct call here —
// least of all deleteTestVin, which runs on the service-role client.
async function requireNonMember() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, message: "You must be signed in." };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") {
    return { ok: false as const, message: "Your role cannot register voters, so this test isn't representative for you." };
  }
  return { ok: true as const, supabase };
}

export async function saveTestVin(_prev: VinCheckState, formData: FormData): Promise<VinCheckState> {
  const parsed = schema.safeParse({ vin: formData.get("vin") });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? "Enter a VIN.");

  const vin = normalizeVin(parsed.data.vin);
  if (!vin) return fail(VIN_INVALID, { vin: VIN_INVALID });

  const gate = await requireNonMember();
  if (!gate.ok) return fail(gate.message);

  // The exact call register/actions.ts makes post-fix: a plain insert, no
  // ON CONFLICT clause, under the caller's own session.
  const { error } = await gate.supabase.from("voter_ids").insert({ vin });
  if (error && error.code !== "23505") {
    return fail(`Insert failed: ${error.message} (code ${error.code ?? "unknown"})`);
  }

  return ok({ vin, alreadyExisted: error?.code === "23505", message: "Saved." });
}

export async function deleteTestVin(_prev: VinCheckState, formData: FormData): Promise<VinCheckState> {
  const gate = await requireNonMember();
  if (!gate.ok) return fail(gate.message);

  const parsed = schema.safeParse({ vin: formData.get("vin") });
  if (!parsed.success) return fail("Missing VIN.");
  const vin = parsed.data.vin;

  const admin = createAdminClient();
  const [{ count: memberRefs }, { count: profileRefs }] = await Promise.all([
    admin.from("members").select("id", { count: "exact", head: true }).eq("vin_id", vin),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("vin_id", vin),
  ]);
  if ((memberRefs ?? 0) > 0 || (profileRefs ?? 0) > 0) {
    return fail("This VIN is attached to a real member or profile — not deleting it.");
  }

  const { error } = await admin.from("voter_ids").delete().eq("vin", vin);
  if (error) return fail(`Delete failed: ${error.message}`);

  return ok({ vin, alreadyExisted: false, message: "Deleted." });
}
