import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { NotConfigured } from "@/components/ui/not-configured";
import { EmptyState } from "@/components/ui/empty-state";
import { NATIONWIDE_LABEL, PARTNER_KIND_LABELS, type PartnerKind } from "@/lib/partners";

export const metadata: Metadata = {
  title: "Partners",
  robots: { index: false, follow: false },
};

// Super-admin only (CR-0026). Partner organisations bring their own people onto
// the platform under their own membership-number prefix, capped at one state or
// nationwide. `partners_super_all` is what actually authorises the reads and
// writes; the guard below only decides what to render.
export default async function PartnersPage() {
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
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Partners</h1>
        <p className="text-sm text-muted">This area is for the super admin.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) return <NotConfigured title="Partners" />;

  const [partnersRes, statesRes, membersRes, requestsRes] = await Promise.all([
    supabase
      .from("partners")
      .select("id, name, kind, code, status, scope_state_id")
      .order("name"),
    admin.from("states").select("id, name"),
    admin.from("members").select("partner_id").neq("status", "deleted"),
    supabase
      .from("partnership_requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "new"),
  ]);
  const newRequests = requestsRes.count ?? 0;

  const stateName = new Map((statesRes.data ?? []).map((s) => [s.id, s.name]));
  const memberBy = new Map<string, number>();
  for (const row of membersRes.data ?? []) {
    if (row.partner_id) memberBy.set(row.partner_id, (memberBy.get(row.partner_id) ?? 0) + 1);
  }

  const partners = partnersRes.data ?? [];
  const activeCount = partners.filter((p) => p.status === "active").length;
  const broughtTotal = partners.reduce((sum, p) => sum + (memberBy.get(p.id) ?? 0), 0);

  const ceiling = (scopeStateId: string | null) =>
    scopeStateId ? (stateName.get(scopeStateId) ?? "Unknown state") : NATIONWIDE_LABEL;

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Partners</h1>
          <p className="mt-1 text-sm text-muted">
            {partners.length === 0
              ? "No partner organisations yet."
              : `${activeCount} of ${partners.length} active, ${broughtTotal.toLocaleString()} people brought in so far.`}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/app/admin/partners/requests"
            className="min-h-11 rounded-md border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Requests{newRequests > 0 ? ` (${newRequests} new)` : ""}
          </Link>
          <Link
            href="/app/admin/partners/new"
            className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            Onboard a partner
          </Link>
        </div>
      </div>

      {partners.length === 0 ? (
        <div className="mt-10">
          <EmptyState
            title="No partners yet"
            action={
              <Link
                href="/app/admin/partners/new"
                className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Onboard the first one
              </Link>
            }
          />
        </div>
      ) : (
        <>
          {/* Desktop: one row per partner. */}
          <div className="mt-8 hidden overflow-x-auto sm:block">
            <table className="w-full border-collapse text-sm">
              <caption className="sr-only">Partner organisations</caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-3 py-2 font-semibold">Partner</th>
                  <th className="px-3 py-2 font-semibold">Kind</th>
                  <th className="px-3 py-2 font-semibold">Ceiling</th>
                  <th className="px-3 py-2 font-semibold">Code</th>
                  <th className="px-3 py-2 text-right font-semibold">People</th>
                  <th className="px-3 py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {partners.map((p) => (
                  <tr key={p.id} className="border-b border-border">
                    <td className="px-3 py-3">
                      <Link
                        href={`/app/admin/partners/${p.id}`}
                        className="font-medium text-foreground underline-offset-4 hover:text-primary hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-muted">{PARTNER_KIND_LABELS[p.kind as PartnerKind]}</td>
                    <td className="px-3 py-3 text-muted">{ceiling(p.scope_state_id)}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{p.code}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-foreground">
                      {memberBy.get(p.id) ?? 0}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill active={p.status === "active"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: the same rows as cards. */}
          <ul className="mt-8 flex flex-col gap-3 sm:hidden">
            {partners.map((p) => (
              <li key={p.id} className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/app/admin/partners/${p.id}`}
                    className="text-base font-semibold text-foreground underline-offset-4 hover:text-primary hover:underline"
                  >
                    {p.name}
                  </Link>
                  <StatusPill active={p.status === "active"} />
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-xs text-muted">Kind</dt>
                    <dd className="text-foreground">{PARTNER_KIND_LABELS[p.kind as PartnerKind]}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Ceiling</dt>
                    <dd className="text-foreground">{ceiling(p.scope_state_id)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">Code</dt>
                    <dd className="font-mono text-xs text-foreground">{p.code}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">People</dt>
                    <dd className="tabular-nums text-foreground">{memberBy.get(p.id) ?? 0}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}

function StatusPill({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Active
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Inactive
    </span>
  );
}
