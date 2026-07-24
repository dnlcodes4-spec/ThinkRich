"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NEXT_TIER, type Role } from "@/app/app/admin/new-account/tiers";
import { logActivityAs } from "@/lib/activity";

// Deactivate / reactivate a direct subordinate admin. An admin manages exactly the
// tier below them (the same NEXT_TIER used for provisioning). Authorization is
// re-checked in code: the target must be visible under RLS (the scope check) and
// its role must be exactly the caller's next tier down. Deactivating sets the
// profile status AND bans the auth user so they can no longer sign in.
export async function setAdminStatus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const tier = me ? NEXT_TIER[me.role as Role] : undefined;
  if (!tier) return; // this role manages no one

  const id = z.string().uuid().safeParse(formData.get("profile_id"));
  if (!id.success || id.data === user.id) return; // never act on self
  const active = formData.get("active") === "true";

  // RLS-scoped read = the scope check; must be the direct tier below.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", id.data)
    .maybeSingle();
  if (!target || target.role !== tier.role) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ status: active ? "active" : "inactive" }).eq("id", target.id);
  await admin.auth.admin.updateUserById(target.id, { ban_duration: active ? "none" : "876000h" });

  await logActivityAs(user.id, {
    action: active ? "account.reactivated" : "account.deactivated",
    summary: `${active ? "Reactivated" : "Deactivated"} ${target.full_name ?? "an account"}`,
    subjectType: "profile",
    subjectId: target.id,
  });

  revalidatePath("/app/admin/team");
}

export type DeleteAccountState = { status: "idle" | "error"; message?: string };

// Permanently delete a direct subordinate's account. Deactivation is the norm;
// this is the irreversible door, so it is gated three ways: the same tier check
// as above, a typed confirmation of the person's name, and a refusal while they
// still have members. That last one is also enforced by the database
// (members.registered_by is ON DELETE RESTRICT) so this can never orphan a
// member; the check here exists to say why in plain words instead of surfacing a
// constraint error. Deleting the auth user cascades to their profile.
export async function deleteAdminAccount(
  _prev: DeleteAccountState,
  formData: FormData,
): Promise<DeleteAccountState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const tier = me ? NEXT_TIER[me.role as Role] : undefined;
  if (!tier) return { status: "error", message: "Your role does not manage accounts." };

  const id = z.string().uuid().safeParse(formData.get("profile_id"));
  if (!id.success) return { status: "error", message: "Invalid account." };
  if (id.data === user.id) return { status: "error", message: "You cannot delete your own account." };

  // RLS-scoped read = the scope check; must be the direct tier below.
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, full_name")
    .eq("id", id.data)
    .maybeSingle();
  if (!target || target.role !== tier.role) {
    return { status: "error", message: "That account is not yours to delete." };
  }

  // Typed confirmation: the name must match exactly (case and spacing forgiven).
  const typed = String(formData.get("confirm_name") ?? "").trim().toLowerCase();
  if (typed !== (target.full_name ?? "").trim().toLowerCase()) {
    return { status: "error", message: "The name you typed does not match. Nothing was deleted." };
  }

  const admin = createAdminClient();
  const { count } = await admin
    .from("members")
    .select("*", { count: "exact", head: true })
    .eq("registered_by", target.id);
  if (count && count > 0) {
    return {
      status: "error",
      message: `${target.full_name} still has ${count} member${count === 1 ? "" : "s"}. Reassign or remove them first, then delete this account.`,
    };
  }

  const { error } = await admin.auth.admin.deleteUser(target.id);
  if (error) return { status: "error", message: "Could not delete the account. Please try again." };

  // Logged after the fact: actor_id survives, but the subject no longer exists,
  // which is exactly why the log carries names rather than only foreign keys.
  await logActivityAs(user.id, {
    action: "account.deleted",
    summary: `Permanently deleted the account of ${target.full_name ?? "an account"}`,
    subjectType: "profile",
    subjectId: null,
  });

  revalidatePath("/app/admin/team");
  return { status: "idle" };
}
