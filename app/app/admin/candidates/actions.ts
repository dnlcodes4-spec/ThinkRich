"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zodFail } from "@/lib/action-state";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CANDIDATE_PHOTOS_BUCKET, scopeValuesFor, type ConstituencyKind } from "@/lib/offices";
import { logActivityAs } from "@/lib/activity";

// Writes go through the CALLER's client, so the containment policies in
// 0017_elective_offices_rls.sql are the authorization boundary (ADR-0005): an
// admin can only touch a race whose constituency sits inside their own scope.
// The service role is used for the photo object only, never for the row.

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 5 * 1024 * 1024;

const schema = z.object({
  id: z.string().uuid().optional(),
  election_id: z.string().uuid("Choose an election."),
  office_type_id: z.string().uuid("Choose an office."),
  geo_id: z.string().uuid().optional(),
  full_name: z.string().trim().min(2, "Enter the candidate's full name."),
  running_mate_name: z.string().trim().max(160, "Keep the running mate's name under 160 characters.").optional(),
  party_id: z.string().uuid().optional(),
  slogan: z.string().trim().max(200, "Keep the slogan under 200 characters.").optional(),
  bio: z.string().trim().max(2000, "Keep the bio under 2000 characters.").optional(),
  is_endorsed: z.boolean(),
  is_published: z.boolean(),
});

export type CandidacyState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

function str(fd: FormData, key: string) {
  const v = fd.get(key);
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

export async function saveCandidacy(_prev: CandidacyState, formData: FormData): Promise<CandidacyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You are not signed in." };

  const parsed = schema.safeParse({
    id: str(formData, "id"),
    // Required: read as "" (not undefined) so the friendly ".uuid(Choose an
    // election.)" message fires instead of the cryptic base-type error if the
    // field ever arrives empty.
    election_id: formData.get("election_id") ?? "",
    office_type_id: str(formData, "office_type_id"),
    geo_id: str(formData, "geo_id"),
    full_name: formData.get("full_name"),
    running_mate_name: str(formData, "running_mate_name"),
    party_id: str(formData, "party_id"),
    slogan: str(formData, "slogan"),
    bio: str(formData, "bio"),
    is_endorsed: formData.get("is_endorsed") === "on",
    is_published: formData.get("is_published") === "on",
  });
  if (!parsed.success) {
    return zodFail(parsed.error);
  }
  const d = parsed.data;

  // The office decides which geography column is filled. Read it from the
  // catalogue rather than trusting the form.
  const { data: office } = await supabase
    .from("office_types")
    .select("constituency_kind, has_running_mate")
    .eq("id", d.office_type_id)
    .maybeSingle();
  if (!office) return { status: "error", message: "That office no longer exists." };

  const kind = office.constituency_kind as ConstituencyKind;
  if (kind !== "nation" && !d.geo_id) {
    return {
      status: "error",
      message: "Choose the area this candidate is standing in.",
      fieldErrors: { geo_id: "Required." },
    };
  }
  const scope = scopeValuesFor(kind, {
    stateId: d.geo_id,
    lgaId: d.geo_id,
    wardId: d.geo_id,
    constituencyId: d.geo_id,
  });

  // Optional photo, uploaded to the public bucket before the row is written.
  let photoPath: string | null = null;
  const file = formData.get("photo");
  if (file instanceof File && file.size > 0) {
    if (!EXT[file.type]) {
      return { status: "error", message: "Use a JPEG, PNG, or WebP image.", fieldErrors: { photo: "Invalid type." } };
    }
    if (file.size > MAX_BYTES) {
      return { status: "error", message: "The image must be 5 MB or smaller.", fieldErrors: { photo: "Too large." } };
    }
    const admin = createAdminClient();
    const key = `${d.office_type_id}/${d.geo_id ?? "national"}-${Date.now()}.${EXT[file.type]}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await admin.storage
      .from(CANDIDATE_PHOTOS_BUCKET)
      .upload(key, bytes, { contentType: file.type });
    if (upErr) return { status: "error", message: "Photo upload failed. Please try again." };
    photoPath = key;
  }

  const row = {
    election_id: d.election_id,
    office_type_id: d.office_type_id,
    ...scope,
    full_name: d.full_name,
    running_mate_name: office.has_running_mate ? (d.running_mate_name ?? null) : null,
    party_id: d.party_id ?? null,
    slogan: d.slogan ?? null,
    bio: d.bio ?? null,
    is_endorsed: d.is_endorsed,
    is_published: d.is_published,
    updated_by: user.id,
  };

  const { error } = d.id
    ? await supabase
        .from("candidacies")
        .update(photoPath ? { ...row, photo_url: photoPath } : row)
        .eq("id", d.id)
    : await supabase.from("candidacies").insert({ ...row, photo_url: photoPath, created_by: user.id });

  if (error) {
    // RLS refusing is the expected failure for an out-of-scope attempt.
    return { status: "error", message: "Could not save. You may not manage candidates for that area." };
  }

  await logActivityAs(user.id, {
    action: "candidate.saved",
    summary: `${d.id ? "Updated" : "Added"} candidate ${d.full_name}`,
    subjectType: "candidacy",
    subjectId: d.id ?? null,
  });

  revalidatePath("/app/admin/candidates");
  revalidatePath("/app/vote");
  return { status: "success", message: "Candidate saved." };
}

export async function deleteCandidacy(formData: FormData): Promise<void> {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Read the name first (RLS-scoped, so seeing it is the scope check) for the log.
  const { data: cand } = await supabase
    .from("candidacies")
    .select("id, full_name")
    .eq("id", id)
    .maybeSingle();
  if (!cand) return;
  // RLS decides whether this is allowed; no extra check is needed here.
  const { error } = await supabase.from("candidacies").delete().eq("id", id);
  if (error) return;
  await logActivityAs(user?.id ?? null, {
    action: "candidate.removed",
    summary: `Removed candidate ${cand.full_name}`,
    subjectType: "candidacy",
    subjectId: id,
  });
  revalidatePath("/app/admin/candidates");
  revalidatePath("/app/vote");
}
