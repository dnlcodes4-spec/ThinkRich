// private.block_inactive_partner_write() (migration 0053) raises this when a
// caller tries to register a member or create a staff account inside a partner
// whose status is 'inactive'. It comes back as a check_violation (23514), so we
// match on the message text, which the trigger controls.
const MARKER = "is inactive; registration into it is suspended";

export const PARTNER_SUSPENDED_MESSAGE =
  "That organisation is suspended. Reactivate it before registering anyone new.";

export function isInactivePartnerError(error: {
  message?: string | null;
  code?: string | null;
} | null | undefined): boolean {
  return Boolean(error?.message && error.message.includes(MARKER));
}
