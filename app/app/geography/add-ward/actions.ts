"use server";

import { z } from "zod";
import { zodFail } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { normalizeWardName, wardKey, WARD_NAME_INVALID } from "@/lib/ward";

// Add a ward the seed missed (mirrors CR-0018 for wards). RLS (0041) is the
// control: it admits only LGA-level and up, only for an LGA in their own scope.
// This action re-checks scope for a friendly message, normalises the name, and
// refuses a case-insensitive duplicate in that LGA before inserting through the
// user's own session (never the service role). ward_number is assigned by an
// existing trigger, so it is never set here.

const ADMIN_ROLES = ["super_admin", "national_admin", "state_admin", "lg_admin"];

export type AddWardState = {
  status: "idle" | "success" | "error";
  message?: string;
  createdId?: string;
  createdName?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  lga_id: z.string().uuid("Choose an LGA."),
  name: z.string().trim().min(1, WARD_NAME_INVALID),
});

export async function addWard(_prev: AddWardState, formData: FormData): Promise<AddWardState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me || !ADMIN_ROLES.includes(me.role)) {
    return { status: "error", message: "Your role cannot add wards." };
  }

  const parsed = schema.safeParse({
    lga_id: formData.get("lga_id"),
    name: formData.get("name"),
  });
  if (!parsed.success) {
    return zodFail(parsed.error);
  }

  const name = normalizeWardName(parsed.data.name);
  if (!name) return { status: "error", message: WARD_NAME_INVALID, fieldErrors: { name: WARD_NAME_INVALID } };

  // Resolve the LGA's lineage and check it sits in the caller's scope (RLS also
  // enforces this; the check just yields a clearer message).
  const { data: lga } = await supabase
    .from("lgas")
    .select("id, state_id")
    .eq("id", parsed.data.lga_id)
    .maybeSingle();
  if (!lga) return { status: "error", message: "That LGA could not be found." };
  const outOfScope =
    (me.state_id && lga.state_id !== me.state_id) || (me.lga_id && lga.id !== me.lga_id);
  if (outOfScope) return { status: "error", message: "That LGA is outside your own area." };

  // Case-insensitive dedupe within the LGA, so the same ward is not added twice.
  // (The DB also enforces unique (lga_id, name), which is case-sensitive.)
  const { data: existing } = await supabase.from("wards").select("id, name").eq("lga_id", lga.id);
  const key = wardKey(name);
  const dupe = (existing ?? []).find((w) => wardKey(w.name) === key);
  if (dupe) {
    return {
      status: "error",
      message: `“${dupe.name}” already exists in this LGA. Use it instead of adding a duplicate.`,
      fieldErrors: { name: "Already exists." },
    };
  }

  const { data: created, error } = await supabase
    .from("wards")
    .insert({ lga_id: lga.id, name })
    .select("id, name")
    .single();
  if (error || !created) {
    // 23505 = the DB unique(lga_id, name) backstop caught a race/case-exact dupe.
    if (error?.code === "23505") {
      return {
        status: "error",
        message: "That ward already exists in this LGA.",
        fieldErrors: { name: "Already exists." },
      };
    }
    return { status: "error", message: "Could not add the ward. Please try again." };
  }

  return {
    status: "success",
    message: "Ward added.",
    createdId: created.id,
    createdName: created.name,
  };
}
