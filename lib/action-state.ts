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
