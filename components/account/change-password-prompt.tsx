"use client";

import { useActionState, useEffect, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { changePassword, type ChangePasswordState } from "@/app/app/account/actions";

const initial: ChangePasswordState = { status: "idle" };
const DISMISS_KEY = "tr:password-prompt-dismissed";
const DISMISS_EVENT = "tr:password-prompt-dismissed";

// The dismissal lives in sessionStorage, which is external state, so it is read
// through useSyncExternalStore rather than an effect + setState (same approach as
// the theme toggle). Hidden during SSR so the server and first paint agree.
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
 * Shown when someone is still signed in with the temporary password we generated
 * for them. Deliberately dismissible: locking a member out of the app because
 * they cannot think of a password would be worse than the nudge. "Not now" only
 * lasts the browser session, so it returns on their next sign-in until changed.
 */
export function ChangePasswordPrompt() {
  const router = useRouter();
  const [state, action, pending] = useActionState(changePassword, initial);
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const done = state.status === "success";

  // Once the password is changed the server flag is cleared, so re-render the
  // shell to pick that up and drop the prompt for good.
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
      aria-labelledby="password-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/50" />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-lg">
        <h2
          id="password-prompt-title"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Set your own password
        </h2>
        <p className="mt-1 text-sm text-muted">
          You are signed in with a temporary password. Choose one you will remember.
        </p>

        {done ? (
          <p role="status" className="mt-5 text-sm font-semibold text-success">
            {state.message}
          </p>
        ) : (
          <form action={action} noValidate className="mt-5 flex flex-col gap-4">
            <PasswordInput
              ref={firstFieldRef}
              label="New password"
              name="password"
              autoComplete="new-password"
              required
              hint="At least 8 characters."
              error={state.fieldErrors?.password}
            />
            <PasswordInput
              label="Confirm new password"
              name="confirm"
              autoComplete="new-password"
              required
              error={state.fieldErrors?.confirm}
            />

            {state.status === "error" && state.message ? (
              <p role="alert" className="text-sm text-danger">
                {state.message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" loading={pending}>
                Save password
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
