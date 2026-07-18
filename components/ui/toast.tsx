"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type Variant = "default" | "success" | "error";
type Toast = { id: number; message: string; variant: Variant };

const ToastContext = createContext<{ toast: (message: string, variant?: Variant) => void } | null>(null);

let counter = 0;

// App-wide transient feedback. Auto-dismiss after a few seconds (errors linger a
// little longer); dismissible. State updates happen in event/timeout callbacks,
// never synchronously in an effect.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: Variant = "default") => {
      const id = ++counter;
      setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
      setTimeout(() => remove(id), variant === "error" ? 7000 : 4000);
    },
    [remove],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={
              "pointer-events-auto flex w-full max-w-sm items-start justify-between gap-3 rounded-card border px-4 py-3 shadow-lg " +
              (t.variant === "success"
                ? "border-success/40 bg-success-soft text-foreground"
                : t.variant === "error"
                  ? "border-danger/40 bg-danger-soft text-foreground"
                  : "border-border bg-surface text-foreground")
            }
          >
            <span className="text-sm font-medium">{t.message}</span>
            <button
              type="button"
              onClick={() => remove(t.id)}
              aria-label="Dismiss"
              className="shrink-0 text-sm text-muted hover:text-foreground"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Returns a no-op outside a provider, so components stay safe to render anywhere.
export function useToast() {
  return useContext(ToastContext) ?? { toast: () => {} };
}
