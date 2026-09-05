import { z } from "zod";
import { emailField } from "@/lib/email";

// Schema + form reader for the "Register a voter" flow, kept out of the
// "use server" action file so it can be unit-tested (a "use server" module may
// only export async functions). Mirrors lib/membership-form.ts.
//
// THE NULL TRAP: `formData.get(name)` returns `null` for an absent field and
// `z.string()` rejects null with a cryptic message. `readRegisterForm` coalesces
// every required field to a string, so a missing field fails with its own
// friendly message; the truly optional fields become `undefined`.

export const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter the voter's full name."),
  date_of_birth: z.string().min(1, "Enter the date of birth."),
  nin: z.string().trim().min(1, "Enter the NIN."),
  // Required for everyone as of CR-0009 §3.1. Validated after normalisation, not
  // on the raw string, so a member may type it with spaces or dashes.
  vin: z.string().trim().min(1, "Enter the voter's card number (VIN)."),
  // Required for everyone as of CR-0017. Validated after normalisation.
  phone: z.string().trim().min(1, "Enter the voter's phone number."),
  gender: z.enum(["male", "female"], { message: "Choose a gender." }),
  // Required for everyone as of CR-0025. Every member gets an app login
  // provisioned at registration, so an address must be captured here.
  email: emailField("Enter the voter's email address."),
  account_number: z.string().trim().optional(),
  account_name: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
  polling_unit_id: z.string().uuid().optional(),
  registered_by: z.string().uuid().optional(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/** Read a form value as a string, coalescing an absent field (null) to "". */
function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/** Shape the FormData into the object the schema expects, with no stray nulls. */
export function readRegisterForm(formData: FormData): Record<string, unknown> {
  return {
    full_name: str(formData, "full_name"),
    date_of_birth: str(formData, "date_of_birth"),
    nin: str(formData, "nin"),
    vin: str(formData, "vin"),
    phone: str(formData, "phone"),
    gender: str(formData, "gender"),
    email: str(formData, "email"),
    account_number: str(formData, "account_number"),
    account_name: str(formData, "account_name"),
    bank_name: str(formData, "bank_name"),
    polling_unit_id: formData.get("polling_unit_id") || undefined,
    registered_by: formData.get("registered_by") || undefined,
  };
}
