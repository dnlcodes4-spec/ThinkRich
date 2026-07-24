import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { roleLabel } from "@/lib/terms";

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

// What each action means in plain words, plus the tone it should read in. Unknown
// actions fall back to the raw key rather than being hidden, so a newly added
// action is never silently invisible in the log.
const ACTION_META: Record<string, { label: string; tone: "neutral" | "good" | "warn" | "bad" }> = {
  "member.registered": { label: "Member registered", tone: "good" },
  "member.paused": { label: "Member paused", tone: "warn" },
  "member.reactivated": { label: "Member reactivated", tone: "good" },
  "member.removed": { label: "Member removed", tone: "bad" },
  "member.login_reset": { label: "Login password reset", tone: "warn" },
  "account.created": { label: "Account created", tone: "good" },
  "account.deactivated": { label: "Account deactivated", tone: "warn" },
  "account.reactivated": { label: "Account reactivated", tone: "good" },
  "account.deleted": { label: "Account deleted", tone: "bad" },
  "correction.approved": { label: "Correction applied", tone: "good" },
  "correction.declined": { label: "Correction declined", tone: "warn" },
  "state.activated": { label: "State activated", tone: "good" },
  "state.deactivated": { label: "State deactivated", tone: "warn" },
  "candidate.saved": { label: "Candidate updated", tone: "neutral" },
  "announcement.sent": { label: "Announcement sent", tone: "neutral" },
};

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
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

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

  const filters = Object.keys(ACTION_META);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
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
        <div className="mt-10 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            {action
              ? "Nothing recorded for this kind of activity yet."
              : "Nothing recorded yet. Activity appears here as people use the platform."}
          </p>
        </div>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {rows.map((r) => {
            const meta = ACTION_META[r.action] ?? { label: r.action, tone: "neutral" as const };
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
