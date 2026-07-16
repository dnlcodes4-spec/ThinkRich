"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateTempPassword } from "@/lib/provisioning";

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
  email: z.email("Enter a valid email address."),
});

export async function createNationalAdmin(
  _prev: BootstrapState,
  formData: FormData,
): Promise<BootstrapState> {
  if (devOnly()) return { status: "error", message: "Not available." };

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs[0]) fieldErrors[k] = msgs[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const admin = createAdminClient();
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
