// Persistent, in-context form-level error. The sanctioned mechanism for a
// whole-submit failure (the field-level errors live on the inputs too). Never a
// toast: an error the user must act on should not time out from under them.
//
// The message carries the ACTUAL validation text (from zodFail). One problem
// reads as a sentence; several are newline-joined and shown as a list, so the
// user sees exactly what to fix without hunting for a highlighted field.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  const lines = message.split("\n").filter(Boolean);
  return (
    <div
      role="alert"
      className="flex items-start gap-1.5 rounded-sm border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-foreground"
    >
      <span aria-hidden="true" className="mt-px text-danger">
        ✕
      </span>
      {lines.length <= 1 ? (
        <span>{lines[0] ?? message}</span>
      ) : (
        <ul className="flex list-disc flex-col gap-0.5 pl-4">
          {lines.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
