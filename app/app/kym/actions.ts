"use server";

import { createClient } from "@/lib/supabase/server";
import { roleLabel, type Role } from "@/app/app/admin/new-account/tiers";

// KYM verification (T-010, repaired in T-038 / CR-0009 §3.6).
//
// Codes are no longer minted here. The database mints one for every leadership
// profile the moment it is created or promoted (migration 0021), because there
// are three ways a profile is born and this action only ever saw one of them.
// That is why `leader_kym_codes` held zero rows and every verification correctly
// answered "not verified".
//
// Lookup goes through the `verify_kym_code` SECURITY DEFINER function (migration
// 0022) under the CALLER's own client. No service role: the function can read the
// code table, but can only ever return the holder's public identity.

export type VerifyState = {
  status: "idle" | "found" | "notfound" | "signedout";
  leader?: { name: string; role: string; where: string };
};

export async function verifyKymCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "signedout" };

  // Product gate, not a security boundary: everything the function returns is
  // already public-facing. Whether members (or the public) may verify is the open
  // question in CR-0009 §3.6.
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return { status: "signedout" };

  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { status: "notfound" };

  const { data, error } = await supabase.rpc("verify_kym_code", { p_code: code });
  const found = data?.[0];
  if (error || !found) return { status: "notfound" };

  const where = [found.lga_name, found.state_name].filter(Boolean).join(", ");
  return {
    status: "found",
    leader: {
      name: found.full_name,
      role: roleLabel(found.role as Role),
      where: where || "Nationwide",
    },
  };
}
