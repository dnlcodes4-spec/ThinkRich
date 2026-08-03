"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { type ActionState, ok, fail } from "@/lib/action-state";

// Manual constituency-membership editing (T-031c, CR-0013 §4b). Only the national
// admin may do this; the `catalogue_write` RLS policy is the real gate, and this
// runs through the caller's RLS-scoped client so it is enforced in the database.
// The `constituency_wards` enforce trigger fills `kind` and rejects a ward from
// another state, so we write only {constituency_id, ward_id}.
//
// We manage DIRECT ward membership (constituency_wards). Whole-LGA membership
// (constituency_lgas, e.g. imported federal seats) is never touched here, so the
// importer's data is safe; the ward_constituencies view unions both.

const schema = z.object({
  constituency_id: z.string().uuid(),
  ward_ids: z.array(z.string().uuid()),
});

export type MembershipState = ActionState;

export async function saveMembership(
  _prev: MembershipState,
  formData: FormData,
): Promise<MembershipState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("You must be signed in.");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "national_admin") return fail("Only the national admin can edit constituency areas.");

  const parsed = schema.safeParse({
    constituency_id: formData.get("constituency_id"),
    ward_ids: formData.getAll("ward_ids"),
  });
  if (!parsed.success) return fail("Something was off with that selection. Please try again.");
  const { constituency_id, ward_ids } = parsed.data;

  const { data: con } = await supabase
    .from("constituencies")
    .select("id, state_id")
    .eq("id", constituency_id)
    .maybeSingle();
  if (!con) return fail("That constituency was not found.");

  // Every chosen ward must be in the constituency's state. The trigger enforces
  // this too, but catching it here gives one clean message instead of a raw error.
  if (ward_ids.length > 0) {
    const { count } = await supabase
      .from("wards")
      .select("id, lgas!inner(state_id)", { count: "exact", head: true })
      .in("id", ward_ids)
      .eq("lgas.state_id", con.state_id);
    if ((count ?? 0) !== ward_ids.length) {
      return fail("Some selected wards are not in this constituency's state.");
    }
  }

  // Reconcile: current direct ward set → desired set.
  const { data: current } = await supabase
    .from("constituency_wards")
    .select("ward_id")
    .eq("constituency_id", constituency_id);
  const currentIds = new Set((current ?? []).map((r) => r.ward_id));
  const desired = new Set(ward_ids);
  const toAdd = ward_ids.filter((w) => !currentIds.has(w));
  const toRemove = [...currentIds].filter((w) => !desired.has(w));

  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("constituency_wards")
      .delete()
      .eq("constituency_id", constituency_id)
      .in("ward_id", toRemove);
    if (error) return fail("Could not update the area. Please try again.");
  }
  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("constituency_wards")
      .insert(toAdd.map((ward_id) => ({ constituency_id, ward_id })));
    if (error) return fail("Could not update the area. Please try again.");
  }

  revalidatePath("/app/admin/candidates/areas");
  const n = desired.size;
  return ok({
    message:
      toAdd.length || toRemove.length
        ? `Saved. This constituency now covers ${n} ward${n === 1 ? "" : "s"}.`
        : "No changes to save.",
  });
}
