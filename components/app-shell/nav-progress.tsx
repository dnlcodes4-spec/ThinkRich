"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

// A thin top progress bar for route changes, so a navigation reads as "loading"
// instead of the page suddenly blanking to a skeleton (or feeling frozen on the
// pages that now keep the previous screen). It starts when an internal link is
// clicked and finishes when the URL actually changes.
//
// State lives in a tiny external store read via useSyncExternalStore, not a
// setState-in-effect, so the route-change effect just calls a plain function
// (the repo blocks set-state-in-effect).

let active = false;
const listeners = new Set<() => void>();
let safety: ReturnType<typeof setTimeout> | undefined;

function emit() {
  for (const l of listeners) l();
}
function start() {
  if (active) return;
  active = true;
  emit();
  // Never let the bar hang if a click didn't actually navigate.
  clearTimeout(safety);
  safety = setTimeout(done, 8000);
}
function done() {
  if (!active) return;
  active = false;
  clearTimeout(safety);
  emit();
}

// For programmatic navigations (router.push) that the click listener won't catch.
export function startNavProgress() {
  start();
}
const store = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  snapshot: () => active,
  server: () => false,
};

function isPlainLeftClick(e: MouseEvent) {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

export function NavProgress() {
  const on = useSyncExternalStore(store.subscribe, store.snapshot, store.server);
  const pathname = usePathname();
  const search = useSearchParams();

  // Start the bar when the user clicks a same-origin link to a different URL.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!isPlainLeftClick(e)) return;
      const a = (e.target as HTMLElement | null)?.closest("a");
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href || a.target === "_blank" || a.hasAttribute("download")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // Finish once the route has actually changed. Calls the store, not setState.
  useEffect(() => {
    done();
  }, [pathname, search]);

  return (
    <div aria-hidden="true" className={`nav-progress${on ? " is-active" : ""}`}>
      <div className="nav-progress__bar" />
    </div>
  );
}
