import Link from "next/link";
import { ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";

// Shown instead of crashing when a surface needs the service-role key and the
// deployment does not have it. Server component: only rendered from server pages.
export function NotConfigured({ title }: { title: string }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 px-6 py-16">
      <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h1>
      <div className="rounded-card border border-warning/40 bg-warning-soft p-5">
        <p className="text-sm font-semibold text-foreground">This page is unavailable</p>
        <p className="mt-1 text-sm text-muted">{ADMIN_NOT_CONFIGURED}</p>
      </div>
      <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
        Back to your area
      </Link>
    </main>
  );
}
