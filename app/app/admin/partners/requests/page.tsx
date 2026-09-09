import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPhone } from "@/lib/phone";
import {
  PARTNERSHIP_REQUEST_STATUS_LABELS,
  type PartnershipRequestStatus,
} from "@/lib/partners";
import { setRequestStatus } from "./actions";

export const metadata: Metadata = {
  title: "Partnership requests",
  robots: { index: false, follow: false },
};

const badge: Record<string, string> = {
  new: "border-primary/30 bg-primary/10 text-primary",
  contacted: "border-border bg-surface-muted text-muted",
  onboarded: "border-success/30 bg-success-soft text-success",
  declined: "border-border bg-surface-muted text-muted",
};

// Leads from the public "become a partner" form (CR-0026). Super-admin only;
// `partnership_requests_super_all` is what authorises the reads and writes.
export default async function PartnershipRequestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (me?.role !== "super_admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Partnership requests
        </h1>
        <p className="text-sm text-muted">This area is for the super admin.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const { data: requests } = await supabase
    .from("partnership_requests")
    .select("id, name, organization, role_title, email, phone, message, status, partner_id, created_at")
    .order("created_at", { ascending: false });

  const rows = requests ?? [];
  const openCount = rows.filter((r) => r.status === "new").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/app/admin/partners"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Back to partners
      </Link>

      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-foreground">
        Partnership requests
      </h1>
      <p className="mt-1 text-sm text-muted">
        {rows.length === 0
          ? "Nothing yet. Submissions from the Think-Winners partnership form land here."
          : `${openCount} new, ${rows.length} in total.`}
      </p>

      {rows.length === 0 ? (
        <div className="mt-10">
          <EmptyState title="No requests yet" />
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {rows.map((r) => (
            <li key={r.id} className="rounded-card border border-border bg-surface p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.organization}</p>
                  <p className="text-sm text-muted">
                    {r.name}
                    {r.role_title ? `, ${r.role_title}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${badge[r.status] ?? badge.contacted}`}
                >
                  {PARTNERSHIP_REQUEST_STATUS_LABELS[r.status as PartnershipRequestStatus]}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{r.message}</p>

              <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted">
                <div>
                  <dt className="sr-only">Email</dt>
                  <dd>
                    <a href={`mailto:${r.email}`} className="text-primary underline-offset-4 hover:underline">
                      {r.email}
                    </a>
                  </dd>
                </div>
                {r.phone ? (
                  <div>
                    <dt className="sr-only">Phone</dt>
                    <dd>{formatPhone(r.phone)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="sr-only">Received</dt>
                  <dd>{new Date(r.created_at).toLocaleDateString()}</dd>
                </div>
              </dl>

              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-border pt-4">
                {r.status === "onboarded" ? (
                  <p className="text-sm text-success">
                    Onboarded.{" "}
                    {r.partner_id ? (
                      <Link
                        href={`/app/admin/partners/${r.partner_id}`}
                        className="font-semibold underline-offset-4 hover:underline"
                      >
                        View the partner
                      </Link>
                    ) : null}
                  </p>
                ) : (
                  <>
                    <Link
                      href={`/app/admin/partners/new?request=${r.id}`}
                      className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                    >
                      Onboard
                    </Link>
                    <form action={setRequestStatus} className="flex items-center gap-2">
                      <input type="hidden" name="id" value={r.id} />
                      <label htmlFor={`status-${r.id}`} className="sr-only">
                        Set status
                      </label>
                      <select
                        id={`status-${r.id}`}
                        name="status"
                        defaultValue={r.status}
                        className="min-h-11 rounded-md border border-border bg-surface px-3 text-sm text-foreground"
                      >
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="declined">Declined</option>
                      </select>
                      <button
                        type="submit"
                        className="min-h-11 rounded-md border border-border px-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
                      >
                        Update
                      </button>
                    </form>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
