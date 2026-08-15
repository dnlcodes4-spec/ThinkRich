import { z } from "zod";

// Schema + form reader for the "Complete membership" flow, kept out of the
// "use server" action file so it can be unit-tested (a "use server" module may
// only export async functions).
//
// THE NULL TRAP: `formData.get(name)` returns `null` when a field is absent, and
// `z.string()` (even `.optional()`, which only permits `undefined`) rejects null
// with "invalid input: expected string, received null". The VIN field is omitted
// whenever the caller already has a VIN on file, so reading it naively produced
// that cryptic error and blocked every staff member with a VIN. readMembershipForm
// coalesces every field to a string (or, for the optional VIN, to undefined), so
// a missing field yields its own friendly message instead.

export const membershipSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  date_of_birth: z.string().min(1, "Enter your date of birth."),
  nin: z.string().trim().min(1, "Enter your NIN."),
  // Optional here: a staff account that already has a VIN on its profile reuses it,
  // so the form omits the field. Required (enforced in the action) only when none.
  vin: z.string().trim().optional(),
  gender: z.enum(["male", "female"], { message: "Choose a gender." }),
  phone: z.string().trim().min(1, "Enter your phone number."),
  polling_unit_id: z.string().uuid("Choose your home polling unit."),
});

export type MembershipInput = z.infer<typeof membershipSchema>;

/** Read a form value as a string, coalescing an absent field (null) to "". */
function str(formData: FormData, key: string): string {
  const v = formData.get(key);
  return typeof v === "string" ? v : "";
}

/**
 * Shape the FormData into the object the schema expects, with no nulls: required
 * fields become "" (so they fail with their own message), and the optional VIN
 * becomes undefined when absent (which `.optional()` accepts).
 */
export function readMembershipForm(formData: FormData): Record<string, unknown> {
  const vin = formData.get("vin");
  return {
    full_name: str(formData, "full_name"),
    date_of_birth: str(formData, "date_of_birth"),
    nin: str(formData, "nin"),
    vin: typeof vin === "string" ? vin : undefined,
    gender: str(formData, "gender"),
    phone: str(formData, "phone"),
    polling_unit_id: str(formData, "polling_unit_id"),
  };
}
