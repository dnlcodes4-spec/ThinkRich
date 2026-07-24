"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Every signed-in user can change their own password. This uses the caller's own
// session (never the service role): Supabase applies the change to the caller,
// so there is no way to target someone else's account from here.

export type ChangePasswordState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string().min(1, "Re-enter the new password."),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });

export async function changePassword(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const parsed = schema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [k, m] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (m && m[0]) fieldErrors[k] = m[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    // Supabase rejects a password identical to the current one, among others.
    return { status: "error", message: error.message };
  }

  return { status: "success", message: "Your password has been changed." };
}
