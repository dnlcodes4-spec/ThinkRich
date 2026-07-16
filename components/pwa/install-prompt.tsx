"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

// iOS-standalone + iOS-device detection are browser reads; useSyncExternalStore
// keeps them SSR-safe without setState-in-effect. The value is a stable string so
// React can compare snapshots by value.
function useDisplayFlags(): string {
  return useSyncExternalStore(
    () => () => {},
    () => {
      const standalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      const ios = /iPad|iPhone|iPod/.test(window.navigator.userAgent);
      return `${standalone ? 1 : 0}${ios ? 1 : 0}`;
    },
    () => "00",
  );
}

// A quiet, dismissible install affordance. It only appears when the browser has
// offered an install (Android/desktop Chrome) or on iOS Safari (which needs a
// manual "Add to Home Screen"). Hidden once installed. Never blocks the UI.
export function InstallPrompt() {
  const flags = useDisplayFlags();
  const standalone = flags[0] === "1";
  const isIOS = flags[1] === "1";

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (standalone || dismissed) return null;
  // Nothing to offer: no captured prompt and not iOS.
  if (!deferred && !isIOS) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-foreground">Install the app</p>
          <p className="mt-0.5 text-xs text-muted">
            Add ThinkRich to your home screen for quick access and a full-screen, app-like
            experience.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted"
        >
          Not now
        </button>
      </div>

      {deferred ? (
        <button
          type="button"
          onClick={install}
          className="mt-3 inline-flex min-h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Add to home screen
        </button>
      ) : isIOS ? (
        <p className="mt-3 text-xs text-muted">
          On iPhone or iPad: tap the <span aria-hidden="true">⎋</span> Share button, then{" "}
          <strong className="font-semibold text-foreground">Add to Home Screen</strong>.
        </p>
      ) : null}
    </div>
  );
}
