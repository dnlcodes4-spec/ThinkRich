"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivityAs } from "@/lib/activity";
import { openStateFor } from "@/lib/states";
import { ROLE_RANK, ROLE_LEVEL, scopeColumnsToClear, roleLabel, type Role } from "@/app/app/admin/new-account/tiers";

// Promotion and demotion (T-046 / T-049, CR-0009 §3.3, ADR-0015).
//
// NO SERVICE ROLE HERE, deliberately. A promotion path is a privilege-escalation
// path, and routing it through a client that bypasses RLS would mean the only
// thing between a member and a leader role is an `if` in TypeScript. Everything
// below runs under the CALLER's own credentials, so `profiles_update` is the
// actual authorization boundary (ADR-0005).
//
// That policy already encodes exactly what the client described as "the admin
// above the intended person": it checks rank on BOTH the old and the new row, so
// an admin may move someone between levels that are both strictly below their
// own, and can neither promote anyone to their own rank nor touch a peer.
//
// This became possible only once member profiles carried scope (migration 0026).
// Before that, `profile_in_scope` saw four nulls and refused every admin.

export type RoleChangeState = {
  status: "idle" | "success" | "error";
  message?: string;
};

const schema = z.object({
  profile_id: z.string().uuid(),
  new_role: z.enum([
    "state_admin",
    "lg_admin",
    "ward_admin",
    "unit_coordinator",
    "leader",
    "member",
  ]),
});

export async function changeRole(
  _prev: RoleChangeState,
  formData: FormData,
): Promise<RoleChangeState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const parsed = schema.safeParse({
    profile_id: formData.get("profile_id"),
    new_role: formData.get("new_role"),
  });
  if (!parsed.success) return { status: "error", message: "Pick a role." };
  const { profile_id, new_role } = parsed.data;

  if (profile_id === user.id) {
    return { status: "error", message: "You cannot change your own role." };
  }

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me) return { status: "error", message: "Your profile was not found." };

  // Mirror of the policy, so the user gets a sentence instead of a silent no-op.
  // The database refuses this independently; this is not the control.
  if (ROLE_RANK[new_role as Role] <= ROLE_RANK[me.role as Role]) {
    return { status: "error", message: "You can only assign roles below your own." };
  }

  // RLS scopes this read: seeing them IS the scope check.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, full_name, role, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", profile_id)
    .maybeSingle();
  if (!target) return { status: "error", message: "That person is not in your area." };
  if (target.role === new_role) return { status: "error", message: "They already hold that role." };

  // A leadership role needs the full geographic path. A member's profile now
  // carries it (0026), so promotion inherits where they already are rather than
  // asking the admin to re-enter it.
  const needsUnit = new_role === "leader" || new_role === "unit_coordinator";
  if (needsUnit && !target.polling_unit_id) {
    return {
      status: "error",
      message: "This person has no polling unit on record, so they cannot hold a unit role yet.",
    };
  }

  // A leadership profile must carry a VIN (migration 0024), and a member profile
  // never does: theirs lives on the `members` row, because duplicating it would
  // mean two places to keep in step. So promotion has to carry it across.
  //
  // It is the same person and the same card, and `voter_ids` is a shared table
  // (ADR-0015), so both rows legitimately point at one entry. Without this the
  // promotion fails on `profiles_vin_required`, which is exactly how the RLS test
  // caught it.
  const patch: { role: typeof new_role; vin_id?: string; state_id?: null; lga_id?: null; ward_id?: null; polling_unit_id?: null } = {
    role: new_role,
  };
  if (target.role === "member" && new_role !== "member") {
    const { data: memberRow } = await supabase
      .from("members")
      .select("vin_id")
      .eq("user_id", profile_id)
      .maybeSingle();
    if (!memberRow?.vin_id) {
      return {
        status: "error",
        message: "This person has no voter's card number on record. Add one before promoting them.",
      };
    }
    patch.vin_id = memberRow.vin_id;
  }

  // The new role may sit at a shallower geo level than the one it's replacing
  // (e.g. ward_admin -> lg_admin): null every column deeper than it allows, or
  // the leftover value trips `profiles_scope_matches_role` below.
  for (const column of scopeColumnsToClear(ROLE_LEVEL[new_role as Role])) {
    patch[column] = null;
  }

  const { error } = await supabase.from("profiles").update(patch).eq("id", profile_id);

  if (error) {
    const m = error.message.toLowerCase();
    // The trigger from migration 0028: a leader still holding members.
    if (m.includes("still hold")) {
      return { status: "error", message: error.message };
    }
    if (m.includes("scope_matches_role")) {
      return {
        status: "error",
        message: "That role needs a fuller area than this person has on record.",
      };
    }
    return { status: "error", message: "That change was refused. Check your permissions and try again." };
  }

  const direction = ROLE_RANK[new_role as Role] < ROLE_RANK[target.role as Role] ? "Promoted" : "Changed";
  await logActivityAs(user.id, {
    action: direction === "Promoted" ? "account.promoted" : "account.role_changed",
    summary: `${direction} ${target.full_name} from ${roleLabel(target.role as Role)} to ${roleLabel(new_role as Role)}`,
    subjectType: "account",
    subjectId: profile_id,
  });

  // Appointing a State Coordinator opens that state, exactly as creating one from
  // scratch does (new-account/actions.ts). Without this, a state promoted into a
  // coordinator stayed shut and no member could be registered there.
  //
  // The service role appears here only for this consequence write: `states` is
  // reference data with no write policy by design. The escalation itself stayed
  // under the caller's own credentials above, which is the point of this file.
  // Best effort, like the log: the role change has already succeeded.
  if (new_role === "state_admin" && target.state_id) {
    await openStateFor(user.id, target.state_id);
  }

  revalidatePath("/app/admin/team");
  revalidatePath("/app/members");
  return {
    status: "success",
    message: `${target.full_name} is now a ${roleLabel(new_role as Role)}.`,
  };
}
