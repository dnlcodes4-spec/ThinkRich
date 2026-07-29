"use client";

import { useEffect } from "react";

// Registers the service worker (ADR-0004). No state, so it's a pure side effect.
//
// Mounted in the /app shell, not the root layout (CR-0008). Service workers are
// origin-scoped, and after the two-origin split the root layout also renders the
// ThinkRich umbrella landing on a different host, which has no app to install and
// no business registering one. Scope matches the manifest: /app, not /.
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/app", updateViaCache: "none" })
        .catch(() => {
          /* registration is best-effort; the app works without it */
        });
    }
  }, []);
  return null;
}
