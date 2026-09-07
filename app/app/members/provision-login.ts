"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, isAdminConfigured, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import { logActivityAs } from "@/lib/activity";
import { emailField } from "@/lib/email";
import { FLAG_TEMPORARY } from "@/lib/must-change-password";

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
    .select("id, full_name, email, user_id, status, partner_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { ok: false, error: "Voter not found." };
  if (member.user_id) return { ok: false, error: "This member already has a login." };
  if (!member.email) return { ok: false, error: "Add an email for this voter first." };
  if (member.status === "deleted") return { ok: false, error: "This voter is not active." };

  const admin = createAdminClient();
  const password = generateTempPassword();

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: member.email,
    password,
    email_confirm: true,
    app_metadata: FLAG_TEMPORARY,
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
    // Mirror the member's partition onto their login profile (CR-0026 /
    // ADR-0018). private.current_partner_id() reads this row, so without it a
    // partner member fails the partition guard in member_in_scope for their own
    // member row. Migration 0049 lets this profile carry partner_id with no
    // state_id. A core member's partner_id is null, unchanged.
    partner_id: member.partner_id ?? null,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // no orphan auth user
    return { ok: false, error: "Could not create the login profile. Please try again." };
  }

  const { error: linkErr } = await admin.from("members").update({ user_id: created.user.id }).eq("id", member.id);
  if (linkErr) {
    await admin.from("profiles").delete().eq("id", created.user.id);
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Could not link the login to the voter. Please try again." };
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
  if (!id.success) return { status: "error", message: "Invalid voter." };

  const res = await provisionMemberLogin(id.data);
  if (!res.ok) return { status: "error", message: res.error };
  return { status: "success", tempPassword: res.tempPassword, email: res.email };
}

// Reset an EXISTING member login's password to a fresh temporary one. This is how
// a leader/admin recovers a login whose one-time password was missed (there is
// nowhere else to retrieve it). Same authorization as provisioning: caller is not
// a member, the member is visible under RLS (the scope check), and the member
// already has a login. Uses the service role.
export async function resetMemberLoginPassword(memberId: string): Promise<ProvisionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (!isAdminConfigured()) return { ok: false, error: ADMIN_NOT_CONFIGURED };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { ok: false, error: "You cannot reset logins." };

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, user_id, status")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { ok: false, error: "Voter not found." };
  if (!member.user_id) return { ok: false, error: "This member has no login yet." };
  if (member.status === "deleted") return { ok: false, error: "This voter is not active." };

  const admin = createAdminClient();
  const password = generateTempPassword();
  const { error } = await admin.auth.admin.updateUserById(member.user_id, {
    password,
    app_metadata: FLAG_TEMPORARY,
  });
  if (error) return { ok: false, error: "Could not reset the password. Please try again." };

  await logActivityAs(user.id, {
    action: "member.login_reset",
    summary: `Reset the login password for ${member.full_name}`,
    subjectType: "member",
    subjectId: member.id,
  });

  return { ok: true, tempPassword: password, email: member.email ?? "" };
}

export async function resetMemberLoginPasswordAction(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const id = z.string().uuid().safeParse(formData.get("member_id"));
  if (!id.success) return { status: "error", message: "Invalid voter." };

  const res = await resetMemberLoginPassword(id.data);
  if (!res.ok) return { status: "error", message: res.error };
  return { status: "success", tempPassword: res.tempPassword, email: res.email };
}

// Fill in a MISSING email for a member and provision their login in one step
// (CR-0025). Email is required for every member now, but members registered
// before the rule have none, so a leader/admin needs to add it for them.
//
// Deliberately NOT a general email editor: this only writes when `email` is null.
// Changing an address a member already has still goes through the correction
// review flow (submitChangeRequest → reviewChangeRequest), which is the audited
// path for editing an existing detail.
//
// Authorization mirrors provisioning exactly: caller is not a member, and the
// target member is visible under RLS (that IS the scope check — a leader sees
// members they registered, an admin sees their geography). The write itself uses
// the service role because there is no members-UPDATE RLS policy for staff.
export async function addMemberEmail(
  memberId: string,
  rawEmail: string,
): Promise<ProvisionResult & { note?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "You must be signed in." };
  if (!isAdminConfigured()) return { ok: false, error: ADMIN_NOT_CONFIGURED };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { ok: false, error: "You cannot edit voter details." };

  const parsedEmail = emailField().safeParse(rawEmail);
  if (!parsedEmail.success) return { ok: false, error: "Enter a valid email address." };
  // Lower-cased to match the case-insensitive unique index (migration 0030) and
  // the address Supabase Auth will key the login on.
  const email = parsedEmail.data.toLowerCase();

  const { data: member } = await supabase
    .from("members")
    .select("id, full_name, email, user_id, status")
    .eq("id", memberId)
    .maybeSingle();
  if (!member) return { ok: false, error: "Voter not found." };
  if (member.status === "deleted") return { ok: false, error: "This voter is not active." };
  if (member.email) {
    return { ok: false, error: "This voter already has an email. Use a correction request to change it." };
  }

  const admin = createAdminClient();
  const { error: updateErr } = await admin.from("members").update({ email }).eq("id", member.id);
  if (updateErr) {
    if (updateErr.code === "23505") {
      return { ok: false, error: "That email is already in use by another voter." };
    }
    return { ok: false, error: "Could not save the email. Please try again." };
  }

  await logActivityAs(user.id, {
    action: "member.email_added",
    summary: `Added an email for ${member.full_name}`,
    subjectType: "member",
    subjectId: member.id,
  });

  // With an email on file, provision the login now unless one already exists.
  // No revalidatePath: like provisionMemberLogin, the one-time temp password is
  // held in client state and must survive on screen. The roster's "no email"
  // filter goes stale for this row until the next navigation, which is the same
  // trade-off provisioning already makes.
  if (member.user_id) {
    return { ok: true, tempPassword: "", email, note: "Email saved. This voter already has a login." };
  }

  const prov = await provisionMemberLogin(member.id);
  if (!prov.ok) {
    return { ok: true, tempPassword: "", email, note: `Email saved, but the login was not created: ${prov.error}` };
  }
  return { ok: true, tempPassword: prov.tempPassword, email };
}

export async function addMemberEmailAction(
  _prev: ProvisionState,
  formData: FormData,
): Promise<ProvisionState> {
  const id = z.string().uuid().safeParse(formData.get("member_id"));
  if (!id.success) return { status: "error", message: "Invalid voter." };

  const res = await addMemberEmail(id.data, String(formData.get("email") ?? ""));
  if (!res.ok) return { status: "error", message: res.error };
  return {
    status: "success",
    tempPassword: res.tempPassword || undefined,
    email: res.email,
    message: res.note,
  };
}
