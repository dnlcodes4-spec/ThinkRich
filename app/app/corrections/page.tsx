import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fieldLabel } from "@/app/app/members/change-request-fields";
import { reviewChangeRequest } from "@/app/app/members/detail-actions";

export const metadata: Metadata = {
  title: "Correction requests",
  robots: { index: false, follow: false },
};

// The review queue: every correction a member has asked for, across the caller's
// scope, in one place. Previously these could only be found one member at a time
// on the member detail page.
//
// RLS scopes the rows (a coordinator sees only their own area). Acting on a
// request is restricted to state-level admins, exactly as on member detail and in
// reviewChangeRequest itself, which re-checks the role server-side. Lower tiers
// still see the queue read-only, so they know what is waiting.
type Row = {
  id: string;
  field: string;
  new_value: string;
  reason: string | null;
  status: string;
  created_at: string;
  members: { id: string; full_name: string; membership_number: string } | null;
};

export default async function CorrectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!me || me.role === "member") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Correction requests
        </h1>
        <p className="text-sm text-muted">This area is for leaders and coordinators.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const canReview = me.role === "national_admin" || me.role === "state_admin";

  const { data } = await supabase
    .from("change_requests")
    .select("id, field, new_value, reason, status, created_at, members(id, full_name, membership_number)")
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as unknown as Row[];
  const waiting = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending").slice(0, 10);

  const when = (iso: string) =>
    new Date(iso).toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Correction requests
      </h1>
      <p className="mt-1 text-sm text-muted">
        {waiting.length === 0
          ? "Nothing is waiting for review."
          : `${waiting.length} waiting for review${canReview ? "." : ", handled by a State or National Coordinator."}`}
      </p>

      {waiting.length === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            When a member asks to correct their details, the request appears here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {waiting.map((r) => (
            <li key={r.id} className="rounded-card border border-border bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {r.members ? (
                    <Link
                      href={`/app/members/${r.members.id}`}
                      className="font-semibold text-foreground underline-offset-4 hover:underline"
                    >
                      {r.members.full_name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-foreground">Member</span>
                  )}
                  {r.members ? (
                    <p className="font-mono text-xs text-muted">{r.members.membership_number}</p>
                  ) : null}
                </div>
                <span className="shrink-0 rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-bold text-warning">
                  Waiting for review
                </span>
              </div>

              <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
                <dt className="text-muted">Change</dt>
                <dd className="font-medium text-foreground">{fieldLabel(r.field)}</dd>
                <dt className="text-muted">New value</dt>
                <dd className="font-medium break-all text-foreground">{r.new_value}</dd>
                {r.reason ? (
                  <>
                    <dt className="text-muted">Reason</dt>
                    <dd className="text-foreground">{r.reason}</dd>
                  </>
                ) : null}
                <dt className="text-muted">Asked</dt>
                <dd className="text-muted">{when(r.created_at)}</dd>
              </dl>

              {canReview ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <form action={reviewChangeRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="approve" />
                    <button className="min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
                      Approve &amp; apply
                    </button>
                  </form>
                  <form action={reviewChangeRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <input type="hidden" name="decision" value="reject" />
                    <button className="min-h-9 rounded-md border border-danger/50 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft">
                      Decline
                    </button>
                  </form>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <section className="mt-12 border-t border-border pt-8">
          <h2 className="text-sm font-semibold text-foreground">Recently decided</h2>
          <ul className="mt-4 flex flex-col gap-2">
            {decided.map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2 text-xs"
              >
                <span className="text-muted">
                  <span className="font-medium text-foreground">{r.members?.full_name ?? "Member"}</span>{" "}
                  {fieldLabel(r.field)} to {r.new_value}
                </span>
                <span className={r.status === "approved" ? "font-semibold text-success" : "font-semibold text-danger"}>
                  {r.status === "approved" ? "Applied" : "Declined"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
