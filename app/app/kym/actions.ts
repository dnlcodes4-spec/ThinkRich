"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { roleLabel, type Role } from "@/app/app/admin/new-account/tiers";

// No ambiguous characters (0/O, 1/I).
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function genCode(): string {
  const group = () => Array.from({ length: 3 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
  return `${group()}-${group()}-${group()}`;
}

async function callerIsLeaderish(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!me || me.role === "member") return null;
  return user.id;
}

// Mint the caller's KYM code if they don't have one yet.
export async function generateMyKymCode(): Promise<void> {
  const uid = await callerIsLeaderish();
  if (!uid) return;
  const admin = createAdminClient();
  const { data: existing } = await admin.from("leader_kym_codes").select("id").eq("leader_id", uid).maybeSingle();
  if (existing) return;
  for (let i = 0; i < 6; i++) {
    const { error } = await admin.from("leader_kym_codes").insert({ leader_id: uid, code: genCode() });
    if (!error) break;
    if (error.code === "23505") {
      // Either the code collided (retry) or a concurrent insert made ours (stop).
      const { data: now } = await admin.from("leader_kym_codes").select("id").eq("leader_id", uid).maybeSingle();
      if (now) break;
    }
  }
  revalidatePath("/app/kym");
}

export type VerifyState = {
  status: "idle" | "found" | "notfound" | "error";
  leader?: { name: string; role: string; where: string };
};

// Verify a code belongs to a real, active leader; return their public identity.
export async function verifyKymCode(_prev: VerifyState, formData: FormData): Promise<VerifyState> {
  const uid = await callerIsLeaderish();
  if (!uid) return { status: "error" };

  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase();
  if (!code) return { status: "error" };

  const admin = createAdminClient();
  const { data: row } = await admin.from("leader_kym_codes").select("leader_id").eq("code", code).maybeSingle();
  if (!row) return { status: "notfound" };

  const { data: prof } = await admin
    .from("profiles")
    .select("role, full_name, status, state_id, lga_id")
    .eq("id", row.leader_id)
    .maybeSingle();
  if (!prof || prof.status !== "active") return { status: "notfound" };

  const parts: string[] = [];
  if (prof.lga_id) {
    const { data } = await admin.from("lgas").select("name").eq("id", prof.lga_id).maybeSingle();
    if (data) parts.push(data.name);
  }
  if (prof.state_id) {
    const { data } = await admin.from("states").select("name").eq("id", prof.state_id).maybeSingle();
    if (data) parts.push(data.name);
  }

  return {
    status: "found",
    leader: { name: prof.full_name, role: roleLabel(prof.role as Role), where: parts.join(", ") || "Nationwide" },
  };
}
