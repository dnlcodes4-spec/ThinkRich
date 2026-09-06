import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { NotConfigured } from "@/components/ui/not-configured";
import { formatPhone } from "@/lib/phone";
import { NATIONWIDE_LABEL, PARTNER_KIND_LABELS, type PartnerKind } from "@/lib/partners";
import { setPartnerActive } from "./actions";

export const metadata: Metadata = {
  title: "Partner",
  robots: { index: false, follow: false },
};

// One partner organisation: how many people it has brought in, who runs it, and
// the switch that stops it. Deactivating does not delete anything; it closes the
// partner and its admins keep their records.
export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Partner</h1>
        <p className="text-sm text-muted">This area is for the super admin.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const admin = tryCreateAdminClient();
  if (!admin) return <NotConfigured title="Partner" />;

  const { data: partner } = await supabase
    .from("partners")
    .select("id, name, kind, code, status, scope_state_id, created_at")
    .eq("id", id)
    .maybeSingle();
  if (!partner) notFound();

  const [stateRes, membersRes, adminsRes] = await Promise.all([
    partner.scope_state_id
      ? admin.from("states").select("name").eq("id", partner.scope_state_id).maybeSingle()
      : Promise.resolve({ data: null }),
    admin.from("members").select("id", { count: "exact", head: true }).eq("partner_id", partner.id).neq("status", "deleted"),
    admin
      .from("profiles")
      .select("id, full_name, phone, status")
      .eq("partner_id", partner.id)
      .eq("role", "partner_admin")
      .order("full_name"),
  ]);

  const ceiling = partner.scope_state_id ? (stateRes.data?.name ?? "Unknown state") : NATIONWIDE_LABEL;
  const brought = membersRes.count ?? 0;
  const admins = adminsRes.data ?? [];
  const isActive = partner.status === "active";

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <Link
        href="/app/admin/partners"
        className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
      >
        Back to partners
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
            {partner.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {PARTNER_KIND_LABELS[partner.kind as PartnerKind]} partner,{" "}
            {partner.scope_state_id ? `capped at ${ceiling}` : "nationwide"}.
          </p>
        </div>
        {isActive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success">
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
            <span className="size-1.5 rounded-full bg-current" aria-hidden="true" /> Inactive
          </span>
        )}
      </div>

      <section className="mt-8 rounded-card border border-border bg-surface p-6">
        <p className="font-display text-4xl font-semibold tabular-nums text-foreground">
          {brought.toLocaleString()}
        </p>
        <p className="mt-1 text-sm text-muted">
          {brought === 1 ? "person brought in by this partner" : "people brought in by this partner"}
        </p>
      </section>

      <dl className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted">Code</dt>
          <dd className="mt-1 font-mono text-sm font-semibold text-foreground">{partner.code}</dd>
        </div>
        <div className="rounded-card border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted">Kind</dt>
          <dd className="mt-1 text-sm text-foreground">{PARTNER_KIND_LABELS[partner.kind as PartnerKind]}</dd>
        </div>
        <div className="rounded-card border border-border bg-surface px-4 py-3">
          <dt className="text-xs text-muted">Ceiling</dt>
          <dd className="mt-1 text-sm text-foreground">{ceiling}</dd>
        </div>
      </dl>

      <section className="mt-10">
        <h2 className="font-display text-lg font-semibold text-foreground">Who runs it</h2>
        {admins.length === 0 ? (
          <p className="mt-2 text-sm text-muted">
            This partner has no admin account. Onboarding creates one, so this is unusual.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-border rounded-card border border-border">
            {admins.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{a.full_name}</p>
                  <p className="truncate text-xs text-muted">{formatPhone(a.phone)}</p>
                </div>
                <span
                  className={
                    a.status === "active"
                      ? "rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success"
                      : "rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted"
                  }
                >
                  {a.status === "active" ? "Active" : "Inactive"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10 rounded-card border border-border bg-surface-muted p-5">
        <h2 className="text-sm font-semibold text-foreground">
          {isActive ? "Deactivate this partner" : "Reactivate this partner"}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {isActive
            ? "Closes the partner. Nothing already registered is deleted."
            : "Opens the partner again so its admins can keep registering people."}
        </p>
        <form action={setPartnerActive} className="mt-4">
          <input type="hidden" name="partner_id" value={partner.id} />
          <input type="hidden" name="active" value={isActive ? "false" : "true"} />
          <button
            type="submit"
            className={
              isActive
                ? "min-h-11 rounded-md border border-danger/50 px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger-soft"
                : "min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            }
          >
            {isActive ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </section>
    </main>
  );
}
