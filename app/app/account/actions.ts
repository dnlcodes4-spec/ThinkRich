"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { FLAG_CHOSEN } from "@/lib/must-change-password";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";

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

  // The password is now one the user chose, so drop the "still temporary" flag.
  // app_metadata is service-role only, which is why this needs the admin client;
  // it only ever targets the caller's own id. If the key is missing the password
  // change still stands, the prompt simply appears again.
  const admin = tryCreateAdminClient();
  if (admin) {
    await admin.auth.admin.updateUserById(user.id, { app_metadata: FLAG_CHOSEN });
  }

  return { status: "success", message: "Your password has been changed." };
}

// A staff account (any non-member role) must carry a voter's card to be `active`
// (CR-0009). Accounts created before that rule, or seeded without one, sit
// un-activated and every RLS check gated on status='active' silently returns
// nothing for them. This lets such a user supply their own VIN and activate
// themselves, mirroring the new-account provisioning flow.
export type AddVinState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

const vinSchema = z.object({ vin: z.string().trim().min(1, "Enter your voter's card number (VIN).") });

export async function addMyVin(_prev: AddVinState, formData: FormData): Promise<AddVinState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const admin = tryCreateAdminClient();
  if (!admin) return { status: "error", message: ADMIN_NOT_CONFIGURED };

  const parsed = vinSchema.safeParse({ vin: formData.get("vin") });
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors.vin?.[0] ?? VIN_INVALID;
    return { status: "error", message: msg, fieldErrors: { vin: msg } };
  }

  // Normalise server-side; voter_ids.vin is a primary key, so an unsanitised
  // value would silently create a second row for the same card.
  const vin = normalizeVin(parsed.data.vin);
  if (!vin) return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };

  // Members carry their VIN on the member row, not the profile.
  const { data: me } = await admin
    .from("profiles")
    .select("role, status, vin_id")
    .eq("id", user.id)
    .maybeSingle();
  if (!me) return { status: "error", message: "Your profile was not found." };
  if (me.role === "member") {
    return { status: "error", message: "Members manage their voter's card from their membership details." };
  }
  if (me.vin_id) return { status: "success", message: "Your voter's card is already on file." };

  // Refuse a card that already belongs to someone else.
  const [{ data: onMember }, { data: onProfile }] = await Promise.all([
    admin.from("members").select("id").eq("vin_id", vin).maybeSingle(),
    admin.from("profiles").select("id").eq("vin_id", vin).maybeSingle(),
  ]);
  if (onMember || onProfile) {
    return {
      status: "error",
      message: "That voter's card number is already registered.",
      fieldErrors: { vin: "Already registered." },
    };
  }

  const { error: vinErr } = await admin.from("voter_ids").upsert({ vin }, { onConflict: "vin" });
  if (vinErr) return { status: "error", message: VIN_INVALID, fieldErrors: { vin: VIN_INVALID } };

  // Set the VIN, and activate only if the account is merely un-activated. Never
  // un-freeze a frozen account or revive a deleted one through this path.
  const nextStatus = me.status === "frozen" || me.status === "deleted" ? me.status : "active";
  const { error: updErr } = await admin
    .from("profiles")
    .update({ vin_id: vin, status: nextStatus })
    .eq("id", user.id);
  if (updErr) return { status: "error", message: "Could not save your voter's card. Please try again." };

  return { status: "success", message: "Your voter's card is saved and your account is active." };
}
