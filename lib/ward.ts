// Ward name normalisation for the self-service ward add (mirrors lib/polling-unit
// for CR-0018). Unlike polling units, ward names in the seed are mixed-case place
// names ("Auna South", "Awkuzu III", "Gandi 'B'"), so this tidies whitespace and
// separators but PRESERVES the case the admin typed. Server-side is the control;
// a form may mirror it while typing.

/**
 * Collapse runs of whitespace, trim, and tidy spacing around commas, slashes and
 * hyphens, keeping the original case. Returns null if nothing usable remains (< 2 chars).
 */
export function normalizeWardName(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).replace(/\s+/g, " ").trim();
  s = s.replace(/\s*,\s*/g, ", ").replace(/\s*\/\s*/g, "/").replace(/\s*-\s*/g, " - ");
  s = s.replace(/\s+/g, " ").trim();
  return s.length >= 2 ? s : null;
}

/** Case/space-insensitive key for dedupe within an LGA. */
export function wardKey(name: string): string {
  return (normalizeWardName(name) ?? "").toLowerCase();
}

export const WARD_NAME_HINT = "As it appears on the register, e.g. Auna South.";
export const WARD_NAME_INVALID = "Enter the ward name.";
