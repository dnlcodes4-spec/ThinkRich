"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";

// Provision a member's own login. A member needs THREE things to sign in and be
// recognised by RLS: an `auth.users` row, a `profiles` row with role = 'member'
// (RLS reads role from `profiles`, and the member self-read policy keys on
// `user_id`), and `members.user_id` linked to that auth user. Creating these
// requires the service role (bypasses RLS), so authorization is re-checked in
// code: the caller must be able to see the member under RLS (that IS the scope
// check) and must not themselves be a member.

export type ProvisionResult =
  | { ok: true; tempPassword: string; email: string }
  | { ok: false; error: string };

export async function provisionMemberLogin(memberId: string): Promise<ProvisionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (!isAdminConfigured()) return { ok: false, error: ADMIN_NOT_CONFIGURED };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { ok: false, error: "You cannot provision logins." };

  // RLS scopes this read: if the caller can see the member, the member is in the
  // caller's management scope. No separate scope query needed.
  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, user_id, status")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { ok: false, error: "Member not found." };
  if (member.user_id) return { ok: false, error: "This member already has a login." };
  if (!member.email) return { ok: false, error: "Add an email for this member first." };
  if (member.status === "deleted") return { ok: false, error: "This member is not active." };

  const admin = createAdminClient();
  const password = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return { ok: false, error: "That email already has an account." };
    }
    return { ok: false, error: "Could not create the login. Please try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "member",
    full_name: member.full_name,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // no orphan auth user
    return { ok: false, error: "Could not create the login profile. Please try again." };
  }

  const { error: linkErr } = await admin.from("members").update({ user_id: created.user.id }).eq("id", member.id);
  if (linkErr) {
    await admin.from("profiles").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Could not link the login to the member. Please try again." };
  }

  return { ok: true, tempPassword: password, email: member.email };
}

// Form-action wrapper for the roster button (useActionState). No revalidatePath:
// the temp password is shown once in the client state and must survive on screen.
export type ProvisionState = {
  status: "idle" | "success" | "error";
  message?: string;
  tempPassword?: string;
  email?: string;
};

export async function provisionMemberLoginAction(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const id = z.string().uuid().safeParse(formData.get("member_id"));
  if (!id.success) return { status: "error", message: "Invalid member." };

  const res = await provisionMemberLogin(id.data);
  if (!res.ok) return { status: "error", message: res.error };
  return { status: "success", tempPassword: res.tempPassword, email: res.email };
}
