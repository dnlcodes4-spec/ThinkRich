// Polling-unit name/code normalisation (CR-0018). Admins can add polling units
// the INEC seed missed; this keeps what they type consistent with the ~120k
// seeded units (UPPERCASE, single-spaced) so search and dedupe actually work.
// Server-side is the control; a form may mirror it while typing.

/**
 * Uppercase, collapse runs of whitespace, trim, and tidy spacing around commas,
 * slashes and hyphens. Returns null if nothing usable remains (< 2 chars).
 */
export function normalizePollingUnitName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).toUpperCase().replace(/\s+/g, " ").trim();
  // Tidy spacing around common separators: "A ,B" -> "A, B", "A / B" -> "A/B".
  s = s.replace(/\s*,\s*/g, ", ").replace(/\s*\/\s*/g, "/").replace(/\s*-\s*/g, " - ");
  s = s.replace(/\s+/g, " ").trim();
  return s.length >= 2 ? s : null;
}

/** Optional unit code: uppercased/trimmed; a bare number is zero-padded to 3 (seed style "008"). */
export function normalizePollingUnitCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const s = String(raw).toUpperCase().replace(/\s+/g, "").trim();
  if (!s) return null;
  return /^\d{1,3}$/.test(s) ? s.padStart(3, "0") : s;
}

/** Case/space-insensitive key for dedupe within a ward. */
export function pollingUnitKey(name: string): string {
  return (normalizePollingUnitName(name) ?? "").toLowerCase();
}

export const PU_NAME_HINT = "As it appears at the unit, e.g. PRIMARY SCHOOL, IKOT EYO OKON.";
export const PU_NAME_INVALID = "Enter the polling unit name.";
