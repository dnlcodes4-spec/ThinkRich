"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

// Shown when a staff account (any non-member role) has no membership record yet
// (CR-0014). Everyone is a member of the movement; this nudges staff to complete
// their own membership so they get a number and a card. Dismissible for the
// browser session ("Not now"), so it returns on the next sign-in until completed.
// The actual form lives on /app/account/membership (it needs a geo picker), so
// this is a lightweight CTA rather than an inline form.
const DISMISS_KEY = "tr:membership-prompt-dismissed";
const DISMISS_EVENT = "tr:membership-prompt-dismissed";

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

export function CompleteMembershipPrompt() {
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
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
      aria-labelledby="membership-prompt-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div className="absolute inset-0 bg-ink-950/50" />
      <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-lg">
        <h2
          id="membership-prompt-title"
          className="font-display text-xl font-semibold tracking-tight text-foreground"
        >
          Complete your membership
        </h2>
        <p className="mt-1 text-sm text-muted">
          You&apos;re a member of the movement too. Add your details to get your membership number
          and downloadable card. It only takes a minute.
        </p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Link
            href="/app/account/membership"
            onClick={dismiss}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Complete membership
          </Link>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm font-semibold text-muted underline-offset-4 hover:text-foreground hover:underline"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}
