"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { provisionMemberLogin } from "@/app/app/members/provision-login";

// A leader registers a member (T-004). Geography is NOT chosen — it is derived
// from the leader's own polling unit. The membership number is assigned by the DB
// trigger; RLS + triggers enforce scope, NIN uniqueness, age >= 18, and the
// <= 10-active-members cap. This action validates input and maps DB errors to
// friendly messages; it never bypasses RLS (no service role).

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter the member's full name."),
  date_of_birth: z.string().min(1, "Enter the date of birth."),
  nin: z.string().trim().min(1, "Enter the NIN."),
  vin: z.string().trim().optional(),
  email: z.union([z.literal(""), z.email("Enter a valid email address.")]).optional(),
  account_number: z.string().trim().optional(),
  account_name: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
});

export type RegisterState = {
  status: "idle" | "success" | "error";
  message?: string;
  membershipNumber?: string;
  loginEmail?: string;
  loginTempPassword?: string;
  loginNote?: string;
  fieldErrors?: Record<string, string>;
};

function isAdult(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

export async function registerMember(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, state_id, lga_id, ward_id, polling_unit_id")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "leader" ||
    !profile.state_id ||
    !profile.lga_id ||
    !profile.ward_id ||
    !profile.polling_unit_id
  ) {
    return { status: "error", message: "Only leaders can register members." };
  }

  // A state must be activated (T-019) before members can be registered in it.
  const { data: state } = await supabase
    .from("states")
    .select("is_active")
    .eq("id", profile.state_id)
    .maybeSingle();
  if (!state?.is_active) {
    return {
      status: "error",
      message: "Your state is not active yet. Registration opens once it is activated.",
    };
  }

  const parsed = schema.safeParse({
    full_name: formData.get("full_name"),
    date_of_birth: formData.get("date_of_birth"),
    nin: formData.get("nin"),
    vin: formData.get("vin"),
    email: formData.get("email"),
    account_number: formData.get("account_number"),
    account_name: formData.get("account_name"),
    bank_name: formData.get("bank_name"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(parsed.error.flatten().fieldErrors)) {
      if (msgs && msgs[0]) fieldErrors[key] = msgs[0];
    }
    return { status: "error", message: "Please fix the highlighted fields.", fieldErrors };
  }

  if (!isAdult(parsed.data.date_of_birth)) {
    return {
      status: "error",
      message: "The member must be at least 18 years old.",
      fieldErrors: { date_of_birth: "Must be 18 or older." },
    };
  }

  const email = parsed.data.email ? parsed.data.email : null;

  const { data: inserted, error } = await supabase
    .from("members")
    .insert({
      registered_by: user.id,
      state_id: profile.state_id,
      lga_id: profile.lga_id,
      ward_id: profile.ward_id,
      polling_unit_id: profile.polling_unit_id,
      full_name: parsed.data.full_name,
      date_of_birth: parsed.data.date_of_birth,
      nin: parsed.data.nin,
      vin: parsed.data.vin || null,
      email,
      account_number: parsed.data.account_number || null,
      account_name: parsed.data.account_name || null,
      bank_name: parsed.data.bank_name || null,
    })
    .select("id, membership_number")
    .single();

  if (error) {
    const m = error.message.toLowerCase();
    if (error.code === "23505" && m.includes("nin")) {
      return {
        status: "error",
        message: "A member with this NIN is already registered.",
        fieldErrors: { nin: "Already registered." },
      };
    }
    if (error.code === "23505" && m.includes("email")) {
      return {
        status: "error",
        message: "That email is already in use.",
        fieldErrors: { email: "Already in use." },
      };
    }
    if (m.includes("capacity")) {
      return { status: "error", message: "You have reached your limit of 10 active members." };
    }
    if (m.includes("18 years")) {
      return {
        status: "error",
        message: "The member must be at least 18 years old.",
        fieldErrors: { date_of_birth: "Must be 18 or older." },
      };
    }
    if (m.includes("geography")) {
      return { status: "error", message: "Member geography is invalid for your polling unit." };
    }
    return { status: "error", message: "Could not register the member. Please try again." };
  }

  // If an email was captured, provision the member's own login now and hand the
  // temporary password back to the leader. A provisioning failure does NOT fail
  // the registration (the member exists); it is surfaced as a note instead, and
  // the login can be provisioned later from the roster.
  let loginEmail: string | undefined;
  let loginTempPassword: string | undefined;
  let loginNote: string | undefined;
  if (email) {
    const res = await provisionMemberLogin(inserted.id);
    if (res.ok) {
      loginEmail = res.email;
      loginTempPassword = res.tempPassword;
    } else {
      loginNote = res.error;
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/members");
  return {
    status: "success",
    membershipNumber: inserted.membership_number,
    message: "Member registered.",
    loginEmail,
    loginTempPassword,
    loginNote,
  };
}
