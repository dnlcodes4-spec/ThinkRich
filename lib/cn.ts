/**
 * Join class names, dropping falsy values. A deliberately tiny helper — no
 * tailwind-merge yet (add it if class-conflict overrides become a real need).
 */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
