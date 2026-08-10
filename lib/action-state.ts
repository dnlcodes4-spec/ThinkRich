import type { ZodError } from "zod";

// Shared shape for Server Action results consumed by useActionState. The dashboard
// standardises on this so every form stops re-declaring its own state type.
// `Extra` carries one-time payloads (temp password, membership number) without
// loosening the base shape.
export type ActionState<Extra = object> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} & Partial<Extra>;

export const idle: ActionState = { status: "idle" };

export function ok<E extends Record<string, unknown> = Record<string, never>>(
  extra?: E & { message?: string },
): ActionState<E> {
  return { status: "success", ...(extra ?? {}) } as ActionState<E>;
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return fieldErrors ? { status: "error", message, fieldErrors } : { status: "error", message };
}

// Turn a failed Zod parse into an error state whose message is the ACTUAL
// validation text, not a generic "fix the highlighted fields" that leaves the
// user hunting for which field. One line per failing field (each schema message
// is written as a plain, specific instruction, e.g. "Enter the voter's phone
// number."); FormError renders a single line as a sentence and several as a
// list. The per-field messages still ride along on `fieldErrors` so inputs
// highlight inline too.
export function zodFail(error: ZodError): ActionState {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" || typeof key === "number") {
      const k = String(key);
      // Keep the first message per field; that is the one shown at the input.
      if (!(k in fieldErrors)) fieldErrors[k] = issue.message;
    } else {
      formErrors.push(issue.message);
    }
  }
  const lines = [...Object.values(fieldErrors), ...formErrors];
  const message = lines.length ? lines.join("\n") : "Something needs a quick fix before this can be saved.";
  return { status: "error", message, fieldErrors };
}
