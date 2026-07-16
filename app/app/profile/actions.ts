"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "member-photos";
const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type PhotoState = { status: "idle" | "success" | "error"; message?: string };

// A member sets their OWN passport photo. Members can't update their row via RLS
// (members_update requires role <> 'member'), so the write goes through the
// service role — authorized in code by confirming the row is the caller's own
// (members.user_id = auth.uid(), read back under RLS). Only passport_photo_url is
// touched. The bucket is private; the path is stored, not a public URL.
export async function uploadPhoto(_prev: PhotoState, formData: FormData): Promise<PhotoState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  // Self-read under RLS proves ownership.
  const { data: member } = await supabase
    .from("members")
    .select("id, user_id, passport_photo_url")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!member) return { status: "error", message: "No member profile for this account." };

  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", message: "Choose a photo to upload." };
  }
  if (!EXT[file.type]) {
    return { status: "error", message: "Use a JPEG, PNG, or WebP image." };
  }
  if (file.size > MAX_BYTES) {
    return { status: "error", message: "The image must be 5 MB or smaller." };
  }

  const admin = createAdminClient();
  const path = `${user.id}/passport-${Date.now()}.${EXT[file.type]}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (upErr) return { status: "error", message: "Upload failed. Please try again." };

  const { error: dbErr } = await admin
    .from("members")
    .update({ passport_photo_url: path })
    .eq("id", member.id);
  if (dbErr) {
    await admin.storage.from(BUCKET).remove([path]); // don't leave an orphan object
    return { status: "error", message: "Could not save the photo. Please try again." };
  }

  // Best-effort cleanup of the previous file.
  if (member.passport_photo_url && member.passport_photo_url !== path) {
    await admin.storage.from(BUCKET).remove([member.passport_photo_url]);
  }

  revalidatePath("/app/profile");
  return { status: "success", message: "Photo updated." };
}
