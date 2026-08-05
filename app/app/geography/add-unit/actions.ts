"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import {
  normalizePollingUnitName,
  normalizePollingUnitCode,
  pollingUnitKey,
  PU_NAME_INVALID,
} from "@/lib/polling-unit";

// Add a polling unit the INEC seed missed (CR-0018). RLS (0034) is the control:
// it admits only the coordinator tiers, only for a ward in their own scope. This
// action re-checks scope for a friendly message, normalises the name, and refuses
// a case-insensitive duplicate in that ward before inserting through the user's
// own session (never the service role).

const ADMIN_ROLES = ["national_admin", "state_admin", "lg_admin", "ward_admin", "unit_coordinator"];

export type AddUnitState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdId?: string;
  createdName?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  ward_id: z.string().uuid("Choose a ward."),
  name: z.string().trim().min(1, PU_NAME_INVALID),
  code: z.string().trim().optional(),
});

export async function addPollingUnit(_prev: AddUnitState, formData: FormData): Promise<AddUnitState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id, ward_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.includes(me.role)) {
    return { status: "error", message: "Your role cannot add polling units." };
  }

  const parsed = schema.safeParse({
    ward_id: formData.get("ward_id"),
    name: formData.get("name"),
    code: formData.get("code") || undefined,
  });
  if (!parsed.success) {
    const fe: Record<string, string> = {};
    for (const [k, m] of Object.entries(parsed.error.flatten().fieldErrors)) if (m?.[0]) fe[k] = m[0];
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors: fe };
  }

  const name = normalizePollingUnitName(parsed.data.name);
  if (!name) return { status: "error", message: PU_NAME_INVALID, fieldErrors: { name: PU_NAME_INVALID } };
  const code = normalizePollingUnitCode(parsed.data.code);

  // Resolve the ward's lineage and check it sits in the caller's scope (RLS also
  // enforces this; the check just yields a clearer message).
  const { data: ward } = await supabase
    .from("wards")
    .select("id, lga_id, lgas(state_id)")
    .eq("id", parsed.data.ward_id)
    .maybeSingle();
  if (!ward) return { status: "error", message: "That ward could not be found." };
  const wardState = (ward.lgas as { state_id?: string } | null)?.state_id ?? null;
  const outOfScope =
    (me.state_id && wardState !== me.state_id) ||
    (me.lga_id && ward.lga_id !== me.lga_id) ||
    (me.ward_id && ward.id !== me.ward_id);
  if (outOfScope) return { status: "error", message: "That ward is outside your own area." };

  // Case-insensitive dedupe within the ward, so the same unit is not added twice.
  const { data: existing } = await supabase
    .from("polling_units")
    .select("id, name")
    .eq("ward_id", ward.id);
  const key = pollingUnitKey(name);
  const dupe = (existing ?? []).find((p) => pollingUnitKey(p.name) === key);
  if (dupe) {
    return {
      status: "error",
      message: `“${dupe.name}” already exists in this ward. Use it instead of adding a duplicate.`,
      fieldErrors: { name: "Already exists." },
    };
  }

  const { data: created, error } = await supabase
    .from("polling_units")
    .insert({ ward_id: ward.id, name, code })
    .select("id, name")
    .single();
  if (error || !created) {
    return { status: "error", message: "Could not add the polling unit. Please try again." };
  }

  return {
    status: "success",
    message: "Polling unit added.",
    createdId: created.id,
    createdName: created.name,
  };
}
