"use server";

import { z } from "zod";

// Server-side validation for the partnership request (every Server Action validates input — Zod).
const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  organization: z.string().trim().min(2, "Enter your campaign or organization."),
  role: z.string().trim().optional(),
  email: z.email("Enter a valid email address."),
  phone: z.string().trim().optional(),
  message: z.string().trim().min(10, "Tell us a little about your campaign."),
});

export type PartnershipState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export async function requestPartnership(
  _prev: PartnershipState,
  formData: FormData,
): Promise<PartnershipState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    organization: formData.get("organization"),
    role: formData.get("role"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [key, msgs] of Object.entries(flat)) {
      if (msgs && msgs[0]) fieldErrors[key] = msgs[0];
    }
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors,
    };
  }

  // TODO(partnership-destination): persist the lead + notify the team (email / a
  // `partnership_requests` table + admin notification / webhook) once the destination is
  // decided. Until then we validate server-side and acknowledge receipt.
  return {
    status: "success",
    message:
      "Thank you. Your partnership request has been received, and we'll be in touch shortly.",
  };
}
