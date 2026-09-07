"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivityAs } from "@/lib/activity";

// Turn a partner on or off. The update runs under the CALLER's own client, so
// `partners_super_all` is what authorises it: a non-super-admin's update matches
// no rows even if they reach this action. The role read below is only there to
// keep the log honest and skip a pointless round trip.
export async function setPartnerActive(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") return;

  const id = z.string().uuid().safeParse(formData.get("partner_id"));
  if (!id.success) return;
  const active = formData.get("active") === "true";

  const { data: updated } = await supabase
    .from("partners")
    .update({ status: active ? "active" : "inactive" })
    .eq("id", id.data)
    .select("id, name")
    .maybeSingle();
  if (!updated) return;

  await logActivityAs(user.id, {
    action: active ? "partner.reactivated" : "partner.deactivated",
    summary: `${active ? "Reactivated" : "Deactivated"} partner ${updated.name}`,
    subjectType: "partner",
    subjectId: updated.id,
    partnerId: updated.id,
  });

  revalidatePath("/app/admin/partners");
  revalidatePath(`/app/admin/partners/${updated.id}`);
}
