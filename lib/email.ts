import { z } from "zod";

// Email field for forms.
//
// z.email() rejects ANY leading/trailing whitespace, and mobile keyboards
// routinely append a trailing space (autocomplete, the space bar, the "next"
// key) that the user never sees — so a perfectly valid address was rejected with
// "Enter a valid email address." and blocked account creation. Trim FIRST, then
// validate, so the check is forgiving of whitespace and the value we store/use
// is clean. Note `z.email().trim()` does NOT do this: the format check runs
// before the trim. The pipe order matters.

export const EMAIL_INVALID = "Enter a valid email address.";

/** A whitespace-tolerant email schema: trims, then validates, yielding the trimmed value. */
export function emailField(message: string = EMAIL_INVALID) {
  return z.string().trim().pipe(z.email(message));
}
