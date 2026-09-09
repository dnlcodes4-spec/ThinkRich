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

// The partner admin's own details. Shared by onboarding (the first admin) and
// "add another admin" on the partner page.
export const partnerAdminSchema = z.object({
  adminFullName: z.string().trim().min(2, "Enter the admin's full name."),
  adminEmail: emailField(),
  adminVin: z.string().trim().min(1, "Enter the admin's voter's card number (VIN)."),
  adminPhone: z.string().trim().min(1, "Enter the admin's phone number."),
});

export const partnerOnboardSchema = partnerAdminSchema.extend({
  name: z.string().trim().min(2, "Enter the organisation's name.").max(120, "Use 120 characters or fewer."),
  kind: z.enum(["political", "community"]),
  /** null means a nationwide ceiling. */
  scopeStateId: z.string().uuid("Choose a valid state.").nullable(),
  code: partnerCodeSchema,
});

export type PartnerOnboardInput = z.infer<typeof partnerOnboardSchema>;

// Editing a partner after onboarding. The code is NOT here: it is baked into
// every membership number the partner has issued, so it is fixed for life.
export const partnerEditSchema = z.object({
  name: z.string().trim().min(2, "Enter the organisation's name.").max(120, "Use 120 characters or fewer."),
  /** null means a nationwide ceiling. */
  scopeStateId: z.string().uuid("Choose a valid state.").nullable(),
});

// The public "become a partner" form on the Think-Winners landing.
export const partnershipRequestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(200),
  organization: z.string().trim().min(2, "Enter your campaign or organization.").max(200),
  role: z.string().trim().max(200).optional(),
  email: emailField(),
  phone: z.string().trim().max(50).optional(),
  message: z.string().trim().min(10, "Tell us a little about your campaign.").max(4000),
});

export const PARTNERSHIP_REQUEST_STATUS_LABELS = {
  new: "New",
  contacted: "Contacted",
  onboarded: "Onboarded",
  declined: "Declined",
} as const;

export type PartnershipRequestStatus = keyof typeof PARTNERSHIP_REQUEST_STATUS_LABELS;

export const PARTNERSHIP_REQUEST_STATUSES = Object.keys(
  PARTNERSHIP_REQUEST_STATUS_LABELS,
) as PartnershipRequestStatus[];
