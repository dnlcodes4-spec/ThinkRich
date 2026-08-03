"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Scoped boundary for the statistics route. The charts and the map each run their
// own queries and computation, so a failure here should not fall all the way to
// the app-wide boundary. Plain words, a retry, and never the raw error text.
export default function StatsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Stats route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-6 py-16">
      <div className="rounded-card border border-border bg-surface p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight text-foreground">
          Statistics could not load
        </h1>
        <p className="mt-2 text-sm text-muted">
          This is usually temporary. Try again, and if it keeps happening, tell your coordinator.
        </p>
        <div className="mt-4">
          <Button onClick={reset}>Try again</Button>
        </div>
        {error.digest ? (
          <p className="mt-4 text-xs text-muted">
            Reference: <span className="font-mono">{error.digest}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
