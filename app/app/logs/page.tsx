import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/terms";
import { ACTION_META, ACTION_KEYS } from "@/lib/activity-meta";

export const metadata: Metadata = {
  title: "Activity",
  robots: { index: false, follow: false },
};

type LogRow = {
  id: string;
  created_at: string;
  actor_name: string;
  actor_role: string | null;
  action: string;
  summary: string;
};

// Action labels + tones live in lib/activity-meta (one source of truth shared with
// the emitters). Unknown actions still fall back to the raw key below, so a newly
// added action is never silently invisible.
const TONE_CLASS: Record<string, string> = {
  neutral: "border-border bg-surface-muted text-muted",
  good: "border-success/30 bg-success-soft text-success",
  warn: "border-warning/30 bg-warning-soft text-warning",
  bad: "border-danger/30 bg-danger-soft text-danger",
};

// National Coordinator only. RLS enforces this too (activity_log is readable only
// by an active national_admin), so this guard is the courtesy, not the control.
export default async function LogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string }>;
}) {
  const { action } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role, status, vin_id").eq("id", user.id).maybeSingle()
    : { data: null };

  // The read policy also requires status='active' (CR-0009). A national admin who
  // has not supplied a voter's card is not active, so RLS returns nothing — which
  // would otherwise read as "no activity" instead of "your account isn't active".
  if (me?.role === "national_admin" && me.status !== "active") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="text-sm text-muted">
          Your account isn&apos;t fully active yet, so this is hidden. Add your voter&apos;s card
          number to unlock it.
        </p>
        <Link href="/app/account" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Go to your account
        </Link>
      </main>
    );
  }

  if (me?.role !== "national_admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Activity</h1>
        <p className="text-sm text-muted">This area is for the National Coordinator.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  let query = supabase
    .from("activity_log")
    .select("id, created_at, actor_name, actor_role, action, summary")
    .order("created_at", { ascending: false })
    .limit(100);
  if (action) query = query.eq("action", action);
  const { data } = await query;
  const rows = (data ?? []) as LogRow[];

  const when = (iso: string) =>
    new Date(iso).toLocaleString("en-NG", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const filters = ACTION_KEYS;

  return (
    <main className="app-fade-in mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Activity</h1>
      <p className="mt-1 text-sm text-muted">
        What has been happening across the platform. Newest first, last 100 entries.
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href="/app/logs"
          className={
            action
              ? "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted"
              : "rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
          }
        >
          All
        </Link>
        {filters.map((key) => (
          <Link
            key={key}
            href={`/app/logs?action=${encodeURIComponent(key)}`}
            className={
              action === key
                ? "rounded-full border border-primary bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
                : "rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:bg-surface-muted"
            }
          >
            {ACTION_META[key].label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="Nothing recorded yet"
            description={
              action
                ? "Nothing recorded for this kind of activity yet."
                : "Activity appears here as people use the platform."
            }
          />
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((r) => {
            const meta = ACTION_META[r.action as keyof typeof ACTION_META] ?? {
              label: r.action,
              tone: "neutral" as const,
            };
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-card border border-border bg-surface p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{r.summary}</p>
                  <p className="mt-1 text-xs text-muted">
                    {r.actor_name}
                    {r.actor_role ? ` · ${roleLabel(r.actor_role)}` : ""} · {when(r.created_at)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${TONE_CLASS[meta.tone]}`}
                >
                  {meta.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
