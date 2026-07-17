"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NEXT_TIER, type Role } from "@/app/app/admin/new-account/tiers";

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
  const { data: target } = await supabase.from("profiles").select("id, role").eq("id", id.data).maybeSingle();
  if (!target || target.role !== tier.role) return;

  const admin = createAdminClient();
  await admin.from("profiles").update({ status: active ? "active" : "inactive" }).eq("id", target.id);
  await admin.auth.admin.updateUserById(target.id, { ban_duration: active ? "none" : "876000h" });
  revalidatePath("/app/admin/team");
}
