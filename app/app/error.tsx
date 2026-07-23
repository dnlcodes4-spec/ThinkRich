"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Error boundary for every /app/* route. Says what happened in plain words and
// offers the two useful moves: try again, or go home. It never shows the raw
// error text, which can leak query or schema detail.
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaces in the server/browser logs for diagnosis; the digest ties a
    // client report back to the server-side stack.
    console.error("App route error:", error.digest ?? error.message);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        Something went wrong
      </h1>
      <p className="text-sm text-muted">
        We could not load this page. This is usually temporary, so please try again. If it keeps
        happening, tell your coordinator.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={reset}>Try again</Button>
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ring px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          Go to home
        </Link>
      </div>
      {error.digest ? (
        <p className="text-xs text-muted">
          Reference: <span className="font-mono">{error.digest}</span>
        </p>
      ) : null}
    </main>
  );
}
