// Marks a login whose password is still the system-generated temporary one.
//
// This lives in Supabase `app_metadata`, NOT `user_metadata`: a signed-in user can
// write their own user_metadata, so they could clear the prompt without ever
// changing the password. app_metadata is service-role only, so the flag can only
// be set when we issue a temporary password and cleared when the password is
// actually changed.
export const MUST_CHANGE_PASSWORD = "must_change_password";

/** Applied wherever we issue a generated password (provision, reset, new account). */
export const FLAG_TEMPORARY = { [MUST_CHANGE_PASSWORD]: true };

/** Applied once the user has chosen their own password. */
export const FLAG_CHOSEN = { [MUST_CHANGE_PASSWORD]: false };

export function needsPasswordChange(appMetadata: unknown): boolean {
  if (!appMetadata || typeof appMetadata !== "object") return false;
  return (appMetadata as Record<string, unknown>)[MUST_CHANGE_PASSWORD] === true;
}
