// Persistent, in-context form-level error. The sanctioned mechanism for a
// whole-submit failure (the field-level errors live on the inputs). Never a
// toast: an error the user must act on should not time out from under them.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 rounded-sm border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-foreground"
    >
      <span aria-hidden="true" className="text-danger">
        ✕
      </span>
      {message}
    </p>
  );
}
