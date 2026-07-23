import Link from "next/link";

// Shown when an /app/* route calls notFound(), most often a member detail page
// for a record outside the caller's scope. The wording deliberately does not
// distinguish "does not exist" from "not yours to see", so the page never
// confirms the existence of a record RLS is hiding.
export default function AppNotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
        We could not find that
      </h1>
      <p className="text-sm text-muted">
        This page does not exist, or it is outside the area you look after. Check the link, or start
        again from your home screen.
      </p>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
        >
          Go to home
        </Link>
        <Link
          href="/app/members"
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-ring px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
        >
          View members
        </Link>
      </div>
    </main>
  );
}
