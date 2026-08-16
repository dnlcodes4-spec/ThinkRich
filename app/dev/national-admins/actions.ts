"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { zodFail } from "@/lib/action-state";
import { emailField } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";

// DEV-ONLY bootstrap (ADR-0012). There is no national admin above a national admin,
// so the chain has to start somewhere. This page/actions create that first account
// with the service role (which bypasses RLS) and NO authenticated caller — which is
// exactly why they must not exist in production. Each action re-checks the env
// itself, because a Server Action is invokable without the page ever rendering.
function devOnly(): { blocked: true } | null {
  return process.env.NODE_ENV === "production" ? { blocked: true } : null;
}

const PATH = "/dev/national-admins";

export type BootstrapState = {
  status: "idle" | "success" | "error";
  message?: string;
  tempPassword?: string;
  email?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the person's full name."),
  email: emailField(),
  // CR-0009: every active non-member profile must carry a VIN (profiles_vin_required).
  // The bootstrap creates a national admin, so it needs one too.
  vin: z.string().trim().min(1, "Enter the voter's card number (VIN)."),
});

export async function createNationalAdmin(
  _prev: BootstrapState,
  formData: FormData,
): Promise<BootstrapState> {
  if (devOnly()) return { status: "error", message: "Not available." };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    vin: formData.get("vin"),
  });
  if (!parsed.success) {
    return zodFail(parsed.error);
  }

  // Normalise server-side: voter_ids.vin is a primary key, so an unsanitised value
  // would create a second row for the same card. Mirrors the new-account flow.
  const vin = normalizeVin(parsed.data.vin);
  if (!vin) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  const admin = createAdminClient();

  // Refuse early if this card already belongs to someone.
  const [{ data: vinOnMember }, { data: vinOnProfile }] = await Promise.all([
    admin.from("members").select("id").eq("vin_id", vin).maybeSingle(),
    admin.from("profiles").select("id").eq("vin_id", vin).maybeSingle(),
  ]);
  if (vinOnMember || vinOnProfile) {
    return { status: "error", message: "That voter's card number is already registered.", fieldErrors: { vin: "Already registered." } };
  }
  const { error: vinErr } = await admin.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) {
    return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };
  }

  const password = generateTempPassword();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    const m = (createErr?.message ?? "").toLowerCase();
    if (m.includes("already") || m.includes("registered") || m.includes("exists")) {
      return { status: "error", message: "An account with that email already exists.", fieldErrors: { email: "Already in use." } };
    }
    return { status: "error", message: "Could not create the account. Please try again." };
  }

  const { error: profileErr } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "national_admin",
    full_name: parsed.data.full_name,
    vin_id: vin,
  });
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id); // no orphan auth user
    return { status: "error", message: "Could not save the profile. Please try again." };
  }

  revalidatePath(PATH);
  return { status: "success", message: "National admin created.", tempPassword: password, email: parsed.data.email };
}

export async function deleteNationalAdmin(formData: FormData): Promise<void> {
  if (devOnly()) return;
  const id = z.string().uuid().safeParse(formData.get("id"));
  if (!id.success) return;

  const admin = createAdminClient();
  // Only ever delete an account that is actually a national admin.
  const { data: target } = await admin.from("profiles").select("role").eq("id", id.data).maybeSingle();
  if (target?.role !== "national_admin") return;

  await admin.from("profiles").delete().eq("id", id.data);
  await admin.auth.admin.deleteUser(id.data);
  revalidatePath(PATH);
}
