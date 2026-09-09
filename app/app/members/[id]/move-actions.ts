"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Move a rank-and-file member between partitions (CR-0026 Chunk B). The heavy
// lifting, and the authoritative audit-log row, live in the
// public.move_member_to_partition RPC (migration 0056); this action just gates
// on super_admin for a friendly message, maps the form, and calls it. The RPC's
// own private.current_user_role() check is the real boundary.
export type MoveState = {
  status: "idle" | "success" | "error";
  message?: string;
  newNumber?: string;
};

const schema = z.object({
  member_id: z.string().uuid(),
  // "core" = the core movement (partner_id null); otherwise a partner id.
  target: z.union([z.literal("core"), z.string().uuid()]),
});

export async function moveMember(_prev: MoveState, formData: FormData): Promise<MoveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") {
    return { status: "error", message: "Only a super admin can move a member between organisations." };
  }

  const parsed = schema.safeParse({
    member_id: formData.get("member_id"),
    target: formData.get("target"),
  });
  if (!parsed.success) return { status: "error", message: "Choose a destination organisation." };

  // Omit p_target_partner for a move to the core movement (the RPC defaults it to
  // null); pass the partner id otherwise.
  const args =
    parsed.data.target === "core"
      ? { p_member: parsed.data.member_id }
      : { p_member: parsed.data.member_id, p_target_partner: parsed.data.target };

  const { data: newNumber, error } = await supabase.rpc("move_member_to_partition", args);

  if (error || !newNumber) {
    return {
      status: "error",
      message: error?.message ?? "Could not move the member. Please try again.",
    };
  }

  revalidatePath(`/app/members/${parsed.data.member_id}`);
  return { status: "success", message: "Member moved.", newNumber: newNumber as string };
}
