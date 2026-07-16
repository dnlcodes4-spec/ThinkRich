"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Membership lifecycle (T-008): active -> frozen -> (active | deleted).
// Members can't update their own row under RLS, and permanent deletion erases
// PII across two systems (Postgres + Storage + Auth), so every transition runs
// through the service role. Authorization is re-checked in code: member-initiated
// actions confirm the row is the caller's own; leader/admin actions reuse RLS
// visibility (if the caller can read the member, they're in scope) and refuse
// members. The DB status-transition trigger is the backstop for all of it.

// Retention window before a frozen membership can be permanently deleted.
// NOTE: 30 days is our default; the client has not confirmed a retention policy.
const RETENTION_DAYS = 30;

const nowIso = () => new Date().toISOString();

async function caller() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  return { supabase, userId: user.id, role: profile?.role ?? null };
}

// ─────────────────────────── member: opt out / cancel ───────────────────────────

export type OptOutState = { status: "idle" | "success" | "error"; message?: string };

export async function requestOptOut(_prev: OptOutState, formData: FormData): Promise<OptOutState> {
  const c = await caller();
  if (!c) return { status: "error", message: "You must be signed in." };

  const reason = z.string().trim().max(500).optional().safeParse(formData.get("reason") || undefined);
  const reasonText = reason.success ? (reason.data ?? null) : null;

  const { data: member } = await c.supabase
    .from("members")
    .select("id, status")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (!member) return { status: "error", message: "No member profile for this account." };
  if (member.status !== "active") return { status: "error", message: "Your membership is not active." };

  const admin = createAdminClient();
  const retentionUntil = new Date(Date.now() + RETENTION_DAYS * 86400000).toISOString();

  const { error: freezeErr } = await admin
    .from("members")
    .update({ status: "frozen", frozen_at: nowIso() })
    .eq("id", member.id);
  if (freezeErr) return { status: "error", message: "Could not process your request. Please try again." };

  const { error: reqErr } = await admin.from("opt_out_requests").insert({
    member_id: member.id,
    reason: reasonText,
    status: "frozen",
    retention_until: retentionUntil,
    requested_at: nowIso(),
  });
  if (reqErr) {
    await admin.from("members").update({ status: "active", frozen_at: null }).eq("id", member.id);
    return { status: "error", message: "Could not process your request. Please try again." };
  }

  revalidatePath("/app/profile");
  return { status: "success", message: "Your membership has been paused." };
}

// Member changes their mind during the retention window.
export async function cancelOptOut(): Promise<void> {
  const c = await caller();
  if (!c) return;
  const { data: member } = await c.supabase
    .from("members")
    .select("id, status")
    .eq("user_id", c.userId)
    .maybeSingle();
  if (!member || member.status !== "frozen") return;

  const admin = createAdminClient();
  await admin.from("members").update({ status: "active", frozen_at: null }).eq("id", member.id);
  await admin
    .from("opt_out_requests")
    .update({ status: "reactivated", resolved_at: nowIso(), resolved_by: c.userId })
    .eq("member_id", member.id)
    .eq("status", "frozen");
  revalidatePath("/app/profile");
}

// ─────────────────────────── leader/admin: reactivate / delete ───────────────────────────

export async function reactivateMember(formData: FormData): Promise<void> {
  const c = await caller();
  if (!c || c.role === "member") return;
  const id = z.string().uuid().safeParse(formData.get("member_id"));
  if (!id.success) return;

  // RLS-scoped read = the scope check.
  const { data: member } = await c.supabase.from("members").select("id, status").eq("id", id.data).maybeSingle();
  if (!member || member.status !== "frozen") return;

  const admin = createAdminClient();
  await admin.from("members").update({ status: "active", frozen_at: null }).eq("id", member.id);
  await admin
    .from("opt_out_requests")
    .update({ status: "reactivated", resolved_at: nowIso(), resolved_by: c.userId })
    .eq("member_id", member.id)
    .eq("status", "frozen");
  revalidatePath("/app/members");
}

export async function deleteMember(formData: FormData): Promise<void> {
  const c = await caller();
  if (!c || c.role === "member") return;
  const id = z.string().uuid().safeParse(formData.get("member_id"));
  if (!id.success) return;

  const { data: member } = await c.supabase
    .from("members")
    .select("id, status, user_id, passport_photo_url")
    .eq("id", id.data)
    .maybeSingle();
  if (!member || member.status !== "frozen") return;

  // Retention gate: only permanently delete after the window has elapsed.
  const { data: req } = await c.supabase
    .from("opt_out_requests")
    .select("id, retention_until")
    .eq("member_id", member.id)
    .eq("status", "frozen")
    .maybeSingle();
  if (!req || new Date(req.retention_until) > new Date()) return;

  const admin = createAdminClient();
  // Erase PII; keep the immutable membership number + geography as a tombstone.
  await admin
    .from("members")
    .update({
      status: "deleted",
      deleted_at: nowIso(),
      full_name: "(deleted)",
      nin: null,
      vin: null,
      email: null,
      date_of_birth: null,
      account_number: null,
      account_name: null,
      bank_name: null,
      passport_photo_url: null,
      user_id: null,
    })
    .eq("id", member.id);

  if (member.passport_photo_url) {
    await admin.storage.from("member-photos").remove([member.passport_photo_url]);
  }
  // Revoke their login too.
  if (member.user_id) {
    await admin.from("profiles").delete().eq("id", member.user_id);
    await admin.auth.admin.deleteUser(member.user_id);
  }
  await admin
    .from("opt_out_requests")
    .update({ status: "deleted", resolved_at: nowIso(), resolved_by: c.userId })
    .eq("id", req.id);

  revalidatePath("/app/members");
}
