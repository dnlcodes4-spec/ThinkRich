import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export const metadata: Metadata = {
  title: "Statistics",
  robots: { index: false, follow: false },
};

type Role = Database["public"]["Enums"]["user_role"];
type GeoCol = "state_id" | "lga_id" | "ward_id" | "polling_unit_id";

// The breakdown level is the one below the caller's role. Leaders / unit
// coordinators just see their totals (no geography breakdown).
const BREAKDOWN: Partial<Record<Role, { col: GeoCol; table: "states" | "lgas" | "wards" | "polling_units"; label: string }>> = {
  national_admin: { col: "state_id", table: "states", label: "Members by state" },
  state_admin: { col: "lga_id", table: "lgas", label: "Members by LGA" },
  lg_admin: { col: "ward_id", table: "wards", label: "Members by ward" },
  ward_admin: { col: "polling_unit_id", table: "polling_units", label: "Members by polling unit" },
};

// Counts are computed from the RLS-visible member rows (so scope needs no app
// logic). At national scale this would move to an aggregate RPC; fine for now.
export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!profile || profile.role === "member") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Statistics</h1>
        <p className="text-sm text-muted">This area is for leaders and admins.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const { data: members } = await supabase
    .from("members")
    .select("state_id, lga_id, ward_id, polling_unit_id, status");
  const rows = members ?? [];
  const active = rows.filter((r) => r.status === "active").length;
  const frozen = rows.filter((r) => r.status === "frozen").length;
  const deleted = rows.filter((r) => r.status === "deleted").length;

  const bd = BREAKDOWN[profile.role as Role];
  let breakdown: { name: string; count: number }[] = [];
  if (bd) {
    const counts = new Map<string, number>();
    for (const r of rows) {
      if (r.status !== "active") continue;
      const id = r[bd.col];
      if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    if (counts.size) {
      const { data: names } = await supabase.from(bd.table).select("id, name").in("id", [...counts.keys()]);
      const nameById = new Map((names ?? []).map((n) => [n.id, n.name]));
      breakdown = [...counts.entries()]
        .map(([id, count]) => ({ name: nameById.get(id) ?? "Unknown", count }))
        .sort((a, b) => b.count - a.count);
    }
  }

  let activeStates: number | null = null;
  if (profile.role === "national_admin") {
    const { count } = await supabase.from("states").select("*", { count: "exact", head: true }).eq("is_active", true);
    activeStates = count ?? 0;
  }

  const max = Math.max(1, ...breakdown.map((b) => b.count));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Statistics</h1>
      <p className="mt-1 text-sm text-muted">Active members in your scope, and how they break down.</p>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Active members" value={active} emphasis />
        <Stat label="Frozen" value={frozen} />
        <Stat label="Deleted" value={deleted} />
        {activeStates !== null ? (
          <Stat label="Active states" value={`${activeStates} / 37`} />
        ) : (
          <Stat label="Total records" value={rows.length} />
        )}
      </div>

      {bd ? (
        <section className="mt-10">
          <h2 className="text-sm font-semibold text-foreground">{bd.label}</h2>
          {breakdown.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No active members yet.</p>
          ) : (
            <ul className="mt-4 flex flex-col gap-2.5">
              {breakdown.map((b) => (
                <li key={b.name} className="grid grid-cols-[9rem_1fr_2.5rem] items-center gap-3 text-sm">
                  <span className="truncate text-foreground">{b.name}</span>
                  <span className="h-2.5 rounded-full bg-surface-muted">
                    <span
                      className="block h-full rounded-full bg-accent"
                      style={{ width: `${Math.round((b.count / max) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums font-medium text-foreground">{b.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </main>
  );
}

function Stat({ label, value, emphasis = false }: { label: string; value: number | string; emphasis?: boolean }) {
  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <p className={emphasis ? "font-display text-3xl font-semibold text-foreground" : "font-display text-2xl font-semibold text-foreground"}>
        {value}
      </p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
