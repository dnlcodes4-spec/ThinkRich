"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Move a partnership request along its lifecycle. Runs under the CALLER's client,
// so `partnership_requests_super_all` is the real gate; the role read only skips
// a pointless write for anyone else. "onboarded" is set by the onboarding flow,
// not here, so it is not an option.
const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "declined"]),
});

export async function setRequestStatus(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") return;

  const parsed = schema.safeParse({
    id: formData.get("id"),
    status: formData.get("status"),
  });
  if (!parsed.success) return;

  await supabase
    .from("partnership_requests")
    .update({
      status: parsed.data.status,
      handled_by: user.id,
      handled_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.id)
    .neq("status", "onboarded"); // never walk back an onboarded request

  revalidatePath("/app/admin/partners/requests");
}
