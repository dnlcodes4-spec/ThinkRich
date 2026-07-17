"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notify } from "@/lib/notify";

export type AnnounceState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  title: z.string().trim().min(3, "Enter a short headline.").max(120),
  body: z.string().trim().max(1000).optional(),
});

// A leader/admin broadcasts to the members in their scope. Recipients are resolved
// through the sender's RLS-scoped view of members (so scope needs no app logic);
// the fan-out insert uses the service role.
export async function sendAnnouncement(_prev: AnnounceState, formData: FormData): Promise<AnnounceState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { status: "error", message: "You cannot send announcements." };

  const parsed = schema.safeParse({ title: formData.get("title"), body: formData.get("body") || undefined });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, m] of Object.entries(parsed.error.flatten().fieldErrors)) if (m && m[0]) fieldErrors[k] = m[0];
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const { data: members } = await supabase
    .from("members")
    .select("user_id")
    .not("user_id", "is", null)
    .neq("status", "deleted");
  const ids = (members ?? []).map((m) => m.user_id).filter((v): v is string => !!v);
  if (ids.length === 0) {
    return { status: "error", message: "No members with a login in your scope yet." };
  }

  const sent = await notify(ids, {
    type: "announcement",
    title: parsed.data.title,
    body: parsed.data.body ?? null,
    createdBy: user.id,
  });
  revalidatePath("/app/notifications");
  revalidatePath("/app");
  return { status: "success", message: `Sent to ${sent} member${sent === 1 ? "" : "s"}.` };
}

export async function markRead(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id.data)
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}

export async function markAllRead(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const admin = createAdminClient();
  await admin
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/app/notifications");
  revalidatePath("/app");
}
