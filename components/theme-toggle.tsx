"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

// The theme lives on <html data-theme> (set before paint by the layout's inline
// script). We read it as external state via useSyncExternalStore, which avoids
// setState-in-effect and handles SSR/hydration correctly.
function subscribe(callback: () => void) {
  window.addEventListener("themechange", callback);
  return () => window.removeEventListener("themechange", callback);
}

function getSnapshot(): Theme {
  return (document.documentElement.dataset.theme as Theme) ?? "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

/**
 * Toggles the app theme by setting `data-theme` on <html> and persisting the
 * choice. The initial theme is applied before paint by the inline script in
 * the root layout; this component reflects and updates it.
 */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // ignore storage failures (private mode, etc.)
    }
    window.dispatchEvent(new Event("themechange"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:border-ring focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      <span aria-hidden="true">{theme === "dark" ? "☾" : "☀"}</span>
      {theme === "dark" ? "Dark" : "Light"}
    </button>
  );
}
