"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isChangeField } from "./change-request-fields";

// Leader/admin actions on a single member: upload their passport photo, and
// review their change requests. All go through the service role with authz
// re-checked in code (caller is not a member; the member is visible under RLS,
// which is the scope check). Change-request approval is restricted to
// state-level admins per the UX brief.

const PHOTO_BUCKET = "member-photos";
const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

export type LeaderPhotoState = { status: "idle" | "success" | "error"; message?: string };

export async function uploadMemberPhotoByLeader(
  _prev: LeaderPhotoState,
  formData: FormData,
): Promise<LeaderPhotoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { status: "error", message: "You cannot manage member photos." };

  const memberId = z.string().uuid().safeParse(formData.get("member_id"));
  if (!memberId.success) return { status: "error", message: "Invalid member." };

  // RLS-scoped read = the scope check.
  const { data: member } = await supabase
    .from("members")
    .select("id, passport_photo_url, status")
    .eq("id", memberId.data)
    .maybeSingle();
  if (!member) return { status: "error", message: "Member not found." };
  if (member.status === "deleted") return { status: "error", message: "This member is not active." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { status: "error", message: "Choose a photo." };
  if (!EXT[file.type]) return { status: "error", message: "Use a JPEG, PNG, or WebP image." };
  if (file.size > MAX_BYTES) return { status: "error", message: "The image must be 5 MB or smaller." };

  const admin = createAdminClient();
  const path = `${memberId.data}/passport-${Date.now()}.${EXT[file.type]}`;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: file.type });
  if (upErr) return { status: "error", message: "Upload failed. Please try again." };

  const { error: dbErr } = await admin.from("members").update({ passport_photo_url: path }).eq("id", member.id);
  if (dbErr) {
    await admin.storage.from(PHOTO_BUCKET).remove([path]);
    return { status: "error", message: "Could not save the photo. Please try again." };
  }
  if (member.passport_photo_url && member.passport_photo_url !== path) {
    await admin.storage.from(PHOTO_BUCKET).remove([member.passport_photo_url]);
  }

  revalidatePath(`/app/members/${member.id}`);
  return { status: "success", message: "Photo updated." };
}

// Approve (apply the value) or reject a member's change request.
export async function reviewChangeRequest(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || (me.role !== "national_admin" && me.role !== "state_admin")) return;

  const id = z.string().uuid().safeParse(formData.get("request_id"));
  const decision = String(formData.get("decision") ?? "");
  if (!id.success || (decision !== "approve" && decision !== "reject")) return;

  // RLS-scoped read = the scope check (only in-scope requests are visible).
  const { data: req } = await supabase
    .from("change_requests")
    .select("id, member_id, field, new_value, status")
    .eq("id", id.data)
    .maybeSingle();
  if (!req || req.status !== "pending" || !isChangeField(req.field)) return;

  const admin = createAdminClient();
  if (decision === "approve") {
    // Apply the value. DB triggers/constraints still guard (age, email uniqueness);
    // if the apply fails, leave the request pending rather than marking it approved.
    const { error: applyErr } = await admin
      .from("members")
      .update({ [req.field]: req.new_value })
      .eq("id", req.member_id);
    if (applyErr) return;
  }
  await admin
    .from("change_requests")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", req.id);

  revalidatePath(`/app/members/${req.member_id}`);
  revalidatePath("/app/members");
}
