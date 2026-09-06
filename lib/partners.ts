import { z } from "zod";
import { emailField } from "@/lib/email";

// Partner organisations (CR-0026). A partner brings its own people onto the
// platform under its own membership-number prefix, with a ceiling state (or
// nationwide). Labels and schemas only: the writes live in the Server Actions.

export const PARTNER_KIND_LABELS = {
  political: "Political",
  community: "Community",
} as const;

export type PartnerKind = keyof typeof PARTNER_KIND_LABELS;

export const PARTNER_KINDS = Object.keys(PARTNER_KIND_LABELS) as PartnerKind[];

/** Ceiling label for a partner whose `scope_state_id` is null. */
export const NATIONWIDE_LABEL = "Nationwide";

// The code prefixes every membership number this partner issues (migration
// 0047), and `partners.code` carries the same check constraint. Uppercase first,
// so "abc1" and "ABC1" cannot become two partners.
export const partnerCodeSchema = z
  .string()
  .trim()
  .transform((s) => s.toUpperCase())
  .pipe(z.string().regex(/^[A-Z0-9]{2,6}$/, "Use 2 to 6 letters or digits."));

export const partnerOnboardSchema = z.object({
  name: z.string().trim().min(2, "Enter the organisation's name.").max(120, "Use 120 characters or fewer."),
  kind: z.enum(["political", "community"]),
  /** null means a nationwide ceiling. */
  scopeStateId: z.string().uuid("Choose a valid state.").nullable(),
  code: partnerCodeSchema,
  adminFullName: z.string().trim().min(2, "Enter the first admin's full name."),
  adminEmail: emailField(),
  adminVin: z.string().trim().min(1, "Enter the admin's voter's card number (VIN)."),
  adminPhone: z.string().trim().min(1, "Enter the admin's phone number."),
});

export type PartnerOnboardInput = z.infer<typeof partnerOnboardSchema>;
