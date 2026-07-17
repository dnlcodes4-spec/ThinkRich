"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// National admin activates/deactivates a state. `states` is reference data with
// no write RLS policy, so this uses the service role, gated to national admins in
// code. A state is meant to be active once it has a state admin; this is the
// explicit control for that.
export async function setStateActive(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "national_admin") return;

  const id = z.string().uuid().safeParse(formData.get("state_id"));
  if (!id.success) return;
  const active = formData.get("active") === "true";

  const admin = createAdminClient();
  await admin.from("states").update({ is_active: active }).eq("id", id.data);
  revalidatePath("/app/admin/states");
}
