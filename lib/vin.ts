// Voter Identification Number handling (CR-0009 §3.1, ADR-0015).
//
// The client's rules, in order: strip spaces and punctuation, uppercase, cap at
// 19 characters, then validate.
//
// The important part is WHERE this runs. Sanitising only in the browser would let
// the same card be stored as "90F5B05EEB..." and "90F5B-05EEB...", two distinct
// rows, and `voter_ids.vin` being a primary key would guarantee nothing. So this
// module is the single gate every VIN passes through server-side, and the field
// only mirrors it for a decent typing experience.

/** Nigerian PVC VINs are 19 alphanumeric characters once punctuation is removed. */
export const VIN_LENGTH = 19;

const VIN_PATTERN = /^[0-9A-Z]{19}$/;

/**
 * Strip everything that is not a letter or digit, uppercase, and cap at 19.
 *
 * The cap is applied to the SANITISED value, never the raw one: a `maxlength=19`
 * on the raw input truncates "90F5B-05EEB-..." mid-entry, silently costing the
 * user real characters.
 */
export function sanitizeVin(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, "")
    .slice(0, VIN_LENGTH);
}

export function isValidVin(sanitized: string): boolean {
  return VIN_PATTERN.test(sanitized);
}

/** Sanitise and validate in one step. `null` means "not a usable VIN". */
export function normalizeVin(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const clean = sanitizeVin(raw);
  return isValidVin(clean) ? clean : null;
}

export const VIN_HINT = `${VIN_LENGTH} characters from your voter's card. Spaces and dashes are ignored.`;
export const VIN_INVALID = `Enter the ${VIN_LENGTH}-character number from the voter's card.`;
