"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/ui/form-error";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { addMyVin, type AddVinState } from "@/app/app/account/actions";
import { VIN_HINT } from "@/lib/vin";

const initial: AddVinState = { status: "idle" };
const DISMISS_KEY = "tr:vin-prompt-dismissed";
const DISMISS_EVENT = "tr:vin-prompt-dismissed";

// Dismissal lives in sessionStorage (external state), read through
// useSyncExternalStore rather than an effect + setState, matching the theme
// toggle and the password prompt. Hidden during SSR so server and first paint agree.
function subscribe(callback: () => void) {
  window.addEventListener(DISMISS_EVENT, callback);
  return () => window.removeEventListener(DISMISS_EVENT, callback);
}
function getSnapshot(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function getServerSnapshot(): boolean {
  return true;
}

/**
 * Shown when a staff account (any non-member role) has no voter's card on file.
 * Such an account cannot be `active` (CR-0009), and every RLS check gated on
 * status='active' silently returns nothing for it, so this is how they activate
 * themselves. Dismissible ("Not now"), lasting the browser session, so it returns
 * on the next sign-in until a VIN is supplied.
 */
export function VinPrompt() {
  const router = useRouter();
  const [state, action, pending] = useActionState(addMyVin, initial);
  // Shows its own success view then refreshes, so suppress the toast.
  const { error } = useActionFeedback(state, { artifact: true });
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const done = state.status === "success";

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => router.refresh(), 1200);
    return () => clearTimeout(t);
  }, [done, router]);

  useEffect(() => {
    if (!dismissed) firstFieldRef.current?.focus();
  }, [dismissed]);

  if (dismissed) return null;

  function dismiss() {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // ignore storage failures (private mode)
    }
    window.dispatchEvent(new Event(DISMISS_EVENT));
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="vin-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/50" />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-lg">
        <h2 id="vin-prompt-title" className="font-display text-xl font-semibold tracking-tight text-foreground">
          Add your voter&apos;s card
        </h2>
        <p className="mt-1 text-sm text-muted">
          Your account needs your voter&apos;s card number (VIN) to be fully active. Until you add
          it, some pages will show nothing.
        </p>

        {done ? (
          <p role="status" className="mt-5 text-sm font-semibold text-success">
            {state.message}
          </p>
        ) : (
          <form action={action} noValidate className="mt-5 flex flex-col gap-4">
            <Input
              ref={firstFieldRef}
              label="Voter's card number (VIN)"
              name="vin"
              autoComplete="off"
              required
              hint={VIN_HINT}
              error={state.fieldErrors?.vin}
            />

            <FormError message={error} />

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={pending}>
                Save and activate
              </Button>
              <button
                type="button"
                onClick={dismiss}
                className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
              >
                Not now
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
