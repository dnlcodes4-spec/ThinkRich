import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NEXT_TIER, roleLabel, type Role } from "@/app/app/admin/new-account/tiers";
import { setAdminStatus } from "./actions";

export const metadata: Metadata = {
  title: "Team",
  robots: { index: false, follow: false },
};

// The geography column + table for a managed role (all subordinates share a level).
const GEO: Partial<Record<Role, { col: "state_id" | "lga_id" | "ward_id" | "polling_unit_id"; table: "states" | "lgas" | "wards" | "polling_units" }>> = {
  state_admin: { col: "state_id", table: "states" },
  lg_admin: { col: "lga_id", table: "lgas" },
  ward_admin: { col: "ward_id", table: "wards" },
  unit_coordinator: { col: "polling_unit_id", table: "polling_units" },
  leader: { col: "polling_unit_id", table: "polling_units" },
};

// An admin views + deactivates the tier directly below them, within their scope.
export default async function TeamPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };
  const tier = me ? NEXT_TIER[me.role as Role] : undefined;

  if (!me || !tier) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Team</h1>
        <p className="text-sm text-muted">Your role does not manage a team.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const geo = GEO[tier.role]!;
  // RLS scopes this to the caller's own scope; filter to the direct tier below.
  const { data: team } = await supabase
    .from("profiles")
    .select("id, full_name, status, state_id, lga_id, ward_id, polling_unit_id")
    .eq("role", tier.role)
    .order("full_name");
  const rows = team ?? [];

  const ids = [...new Set(rows.map((r) => r[geo.col]).filter((v): v is string => !!v))];
  const { data: names } = ids.length
    ? await supabase.from(geo.table).select("id, name").in("id", ids)
    : { data: [] };
  const nameById = new Map((names ?? []).map((n) => [n.id, n.name]));

  const label = roleLabel(tier.role);
  const activeCount = rows.filter((r) => r.status === "active").length;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Your <span className="capitalize">{label}s</span>
      </h1>
      <p className="mt-1 text-sm text-muted">
        {activeCount} active. Deactivating one blocks their sign-in immediately.
      </p>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            No <span className="capitalize">{label}s</span> yet.{" "}
            <Link href="/app/admin/new-account" className="font-semibold text-primary underline-offset-4 hover:underline">
              Create one.
            </Link>
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-border rounded-card border border-border">
          {rows.map((r) => {
            const inactive = r.status !== "active";
            return (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{r.full_name}</p>
                  <p className="truncate text-xs text-muted">{nameById.get(r[geo.col] ?? "") ?? "—"}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={
                      inactive
                        ? "rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted"
                        : "rounded-full border border-success/30 bg-success-soft px-2.5 py-1 text-xs font-bold text-success"
                    }
                  >
                    {inactive ? "Inactive" : "Active"}
                  </span>
                  <form action={setAdminStatus}>
                    <input type="hidden" name="profile_id" value={r.id} />
                    <input type="hidden" name="active" value={inactive ? "true" : "false"} />
                    <button
                      type="submit"
                      className={
                        inactive
                          ? "min-h-9 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
                          : "min-h-9 rounded-md border border-danger/50 px-3 text-xs font-semibold text-danger transition-colors hover:bg-danger-soft"
                      }
                    >
                      {inactive ? "Reactivate" : "Deactivate"}
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
