"use client";

import { useEffect } from "react";

// Registers the service worker (ADR-0004). No state, so it's a pure side effect.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {
          /* registration is best-effort; the app works without it */
        });
    }
  }, []);
  return null;
}
