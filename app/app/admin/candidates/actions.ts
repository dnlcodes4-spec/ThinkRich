"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CANDIDATE_SCOPE, CANDIDATE_PHOTOS_BUCKET, type Role } from "./scope";

// Admins manage the candidate for their own scope. `candidates` has no write RLS
// policy, so writes go through the service role with authz re-checked in code:
// the caller's role decides the level, and the geography comes from the caller's
// own profile (never from the form).

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the candidate's full name."),
  party: z.string().trim().max(120).optional(),
  running_mate: z.string().trim().max(160).optional(),
  slogan: z.string().trim().max(200).optional(),
});

export type CandidateState = { status: "idle" | "success" | "error"; message?: string; fieldErrors?: Record<string, string> };

async function callerScope() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile) return null;
  const scope = CANDIDATE_SCOPE[profile.role as Role];
  if (!scope) return null;
  return { userId: user.id, profile, scope };
}

// Resolve the target candidate's identity from the caller's scope (never the form).
function targetFor(c: NonNullable<Awaited<ReturnType<typeof callerScope>>>) {
  const { scope, profile } = c;
  if (scope.level === "presidential") return { level: scope.level, state_id: null, lga_id: null };
  if (scope.level === "state") return { level: scope.level, state_id: profile.state_id, lga_id: null };
  return { level: scope.level, state_id: profile.state_id, lga_id: profile.lga_id };
}

export async function upsertCandidate(_prev: CandidateState, formData: FormData): Promise<CandidateState> {
  const c = await callerScope();
  if (!c) return { status: "error", message: "You cannot manage candidates." };
  const target = targetFor(c);
  if ((target.level === "state" && !target.state_id) || (target.level === "lg" && !target.lga_id)) {
    return { status: "error", message: "Your account has no geography set." };
  }

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    party: formData.get("party") || undefined,
    running_mate: formData.get("running_mate") || undefined,
    slogan: formData.get("slogan") || undefined,
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, m] of Object.entries(parsed.error.flatten().fieldErrors)) if (m && m[0]) fieldErrors[k] = m[0];
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const admin = createAdminClient();

  // Find the existing candidate for this exact scope.
  let query = admin.from("candidates").select("id, photo_url").eq("level", target.level);
  query = target.state_id ? query.eq("state_id", target.state_id) : query.is("state_id", null);
  query = target.lga_id ? query.eq("lga_id", target.lga_id) : query.is("lga_id", null);
  const { data: existing } = await query.maybeSingle();

  // Optional photo upload to the public bucket.
  let photoPath: string | null = existing?.photo_url ?? null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!EXT[file.type]) return { status: "error", message: "Use a JPEG, PNG, or WebP image.", fieldErrors: { photo: "Invalid type." } };
    if (file.size > MAX_BYTES) return { status: "error", message: "The image must be 5 MB or smaller.", fieldErrors: { photo: "Too large." } };
    const key = `${target.level}/${target.lga_id ?? target.state_id ?? "national"}-${Date.now()}.${EXT[file.type]}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage.from(CANDIDATE_PHOTOS_BUCKET).upload(key, bytes, { contentType: file.type });
    if (upErr) return { status: "error", message: "Photo upload failed. Please try again." };
    if (existing?.photo_url) await admin.storage.from(CANDIDATE_PHOTOS_BUCKET).remove([existing.photo_url]);
    photoPath = key;
  }

  const row = {
    level: target.level,
    state_id: target.state_id,
    lga_id: target.lga_id,
    full_name: parsed.data.full_name,
    party: parsed.data.party ?? null,
    running_mate: parsed.data.running_mate ?? null,
    slogan: parsed.data.slogan ?? null,
    photo_url: photoPath,
    uploaded_by: c.userId,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await admin.from("candidates").update(row).eq("id", existing.id)
    : await admin.from("candidates").insert(row);
  if (error) return { status: "error", message: "Could not save the candidate. Please try again." };

  revalidatePath("/app/admin/candidates");
  revalidatePath("/app/vote");
  return { status: "success", message: "Candidate saved." };
}

export async function deleteCandidate(): Promise<void> {
  const c = await callerScope();
  if (!c) return;
  const target = targetFor(c);
  const admin = createAdminClient();
  let query = admin.from("candidates").select("id, photo_url").eq("level", target.level);
  query = target.state_id ? query.eq("state_id", target.state_id) : query.is("state_id", null);
  query = target.lga_id ? query.eq("lga_id", target.lga_id) : query.is("lga_id", null);
  const { data: existing } = await query.maybeSingle();
  if (!existing) return;
  if (existing.photo_url) await admin.storage.from(CANDIDATE_PHOTOS_BUCKET).remove([existing.photo_url]);
  await admin.from("candidates").delete().eq("id", existing.id);
  revalidatePath("/app/admin/candidates");
  revalidatePath("/app/vote");
}
