// Nigerian phone-number handling (CR-0017). Every admin and member now carries a
// contact number. Like the VIN, normalisation runs SERVER-SIDE so the database is
// what is guaranteed correct; a form may mirror it for a nicer typing experience.
//
// Accepted inputs (spaces, dashes, brackets ignored):
//   0803 123 4567      -> +2348031234567   (local, leading 0)
//   +234 803 123 4567  -> +2348031234567   (already international)
//   234 803 123 4567   -> +2348031234567   (international, no +)
//   803 123 4567       -> +2348031234567   (10-digit subscriber, no 0)
//
// Nigerian mobile subscriber numbers are 10 digits after the country code and
// begin 7, 8 or 9. We do not enforce anything finer (operator prefixes shift).

const SUBSCRIBER = /^[789]\d{9}$/;

/** Reduce any accepted form to its 10-digit subscriber part, or null. */
function subscriberPart(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  let sub: string | null = null;
  if (digits.length === 13 && digits.startsWith("234")) sub = digits.slice(3);
  else if (digits.length === 11 && digits.startsWith("0")) sub = digits.slice(1);
  else if (digits.length === 10) sub = digits;
  return sub && SUBSCRIBER.test(sub) ? sub : null;
}

export function isValidPhone(raw: string | null | undefined): boolean {
  return subscriberPart(raw) !== null;
}

/** Normalise to `+234XXXXXXXXXX`, or null if not a usable Nigerian number. */
export function normalizePhone(raw: string | null | undefined): string | null {
  const sub = subscriberPart(raw);
  return sub ? `+234${sub}` : null;
}

/** Pretty form for display: `+234 803 123 4567`. Input assumed already normalised. */
export function formatPhone(normalized: string | null | undefined): string {
  const sub = subscriberPart(normalized);
  if (!sub) return normalized ?? "";
  return `+234 ${sub.slice(0, 3)} ${sub.slice(3, 6)} ${sub.slice(6)}`;
}

export const PHONE_HINT = "Nigerian mobile number, e.g. 0803 123 4567.";
export const PHONE_INVALID = "Enter a valid Nigerian phone number, e.g. 0803 123 4567.";
