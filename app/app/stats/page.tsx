import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { isNationalTier } from "@/lib/terms";
import { GrowthChart, TierLadder, DistributionBars, SegmentedBar, Sparkline, MiniMeter } from "@/components/stats/charts";

export const metadata: Metadata = {
  title: "Statistics",
  robots: { index: false, follow: false },
};

type Role = Database["public"]["Enums"]["user_role"];
type GeoCol = "state_id" | "lga_id" | "ward_id" | "polling_unit_id";

const pct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

// The geographic breakdown is the level directly below the caller. Leaders and
// unit coordinators have no sub-level, so they get totals + growth only.
const BREAKDOWN: Partial<Record<Role, { col: GeoCol; table: "states" | "lgas" | "wards" | "polling_units"; label: string }>> = {
  national_admin: { col: "state_id", table: "states", label: "By state" },
  super_admin: { col: "state_id", table: "states", label: "By state" },
  state_admin: { col: "lga_id", table: "lgas", label: "By LGA" },
  lg_admin: { col: "ward_id", table: "wards", label: "By ward" },
  ward_admin: { col: "polling_unit_id", table: "polling_units", label: "By polling unit" },
};

// Movement makeup, senior tier first. Gold = the owner, navy shades = the admin
// hierarchy, green = the grassroots (leaders and the voters they bring in), so
// the ladder reads as a structure, not a random spread. Short tier names keep
// the rows tidy; the card title supplies the context.
const TIER_STYLE: { role: Role; short: string; color: string }[] = [
  { role: "super_admin", short: "Super Admin", color: "var(--color-gold-700)" },
  { role: "national_admin", short: "National", color: "var(--color-navy-800)" },
  { role: "state_admin", short: "State", color: "var(--color-navy-600)" },
  { role: "lg_admin", short: "LGA", color: "var(--color-navy-500)" },
  { role: "ward_admin", short: "Ward", color: "var(--color-navy-400)" },
  { role: "unit_coordinator", short: "Unit", color: "var(--color-navy-300)" },
  { role: "leader", short: "Leaders", color: "var(--color-green-600)" },
];

const WEEKS = 12;
const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const MS_30D = 30 * 24 * 60 * 60 * 1000;
const LEADER_CAP = 10;

// Bucket people into the last 12 weekly windows, seed the cumulative series with
// everyone who joined earlier, and count the last 30 days. Kept out of the
// component body so the (impure) clock read does not run during render.
function computeGrowth(items: { created_at: string }[]): {
  weeks: { label: string; count: number }[];
  priorTotal: number;
  new30: number;
  cumSeries: number[];
  weeklyCounts: number[];
} {
  const now = Date.now();
  const buckets = Array.from({ length: WEEKS }, () => 0);
  let priorTotal = 0;
  let new30 = 0;
  for (const p of items) {
    const t = new Date(p.created_at).getTime();
    if (now - t <= MS_30D) new30 += 1;
    const w = Math.floor((now - t) / MS_WEEK);
    if (w < 0) continue;
    if (w < WEEKS) buckets[WEEKS - 1 - w] += 1;
    else priorTotal += 1;
  }
  const weeks = buckets.map((count, i) => ({
    label: new Date(now - (WEEKS - 1 - i) * MS_WEEK).toLocaleDateString("en-GB", { day: "numeric", month: "short" }),
    count,
  }));
  const cumSeries: number[] = [];
  let running = priorTotal;
  for (const c of buckets) {
    running += c;
    cumSeries.push(running);
  }
  return { weeks, priorTotal, new30, cumSeries, weeklyCounts: buckets };
}

// Counts come from the RLS-visible rows, so scope needs no app logic. At
// national scale this would move to an aggregate RPC; fine at this size.
export default async function StatsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
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

  const role = profile.role as Role;
  const isLeader = role === "leader";

  const [{ data: memberRows }, { data: staffRows }] = await Promise.all([
    supabase.from("members").select("state_id, lga_id, ward_id, polling_unit_id, status, created_at, gender, user_id"),
    supabase.from("profiles").select("id, state_id, lga_id, ward_id, polling_unit_id, role, status, created_at").neq("role", "member"),
  ]);
  const members = memberRows ?? [];
  const staff = staffRows ?? [];

  // --- The movement (everyone), mirroring the dashboard's movementTotal + map:
  // member records that are not removed, plus staff who have not recorded a
  // membership of their own yet. This is the population behind the totals, the
  // growth series, and the geographic breakdown.
  const liveMembers = members.filter((m) => m.status !== "deleted");
  const onboarded = new Set(liveMembers.map((m) => m.user_id).filter((v): v is string => !!v));
  const staffPending = staff.filter((s) => !onboarded.has(s.id));

  const everyone: { created_at: string; active: boolean; geo: Record<GeoCol, string | null> }[] = [
    ...liveMembers.map((m) => ({
      created_at: m.created_at,
      active: m.status === "active",
      geo: { state_id: m.state_id, lga_id: m.lga_id, ward_id: m.ward_id, polling_unit_id: m.polling_unit_id },
    })),
    ...staffPending.map((s) => ({
      created_at: s.created_at,
      active: s.status === "active",
      geo: { state_id: s.state_id, lga_id: s.lga_id, ward_id: s.ward_id, polling_unit_id: s.polling_unit_id },
    })),
  ];

  const total = everyone.length;
  const activeCount = everyone.filter((p) => p.active).length;
  const leaderCount = staff.filter((s) => s.role === "leader").length;

  const { weeks, priorTotal, new30, cumSeries, weeklyCounts } = computeGrowth(everyone);

  // --- Movement makeup by tier: every staff profile by role, plus base
  // registered voters (member records not tied to a staff account).
  const staffIds = new Set(staff.map((s) => s.id));
  const baseVoters = liveMembers.filter((m) => !m.user_id || !staffIds.has(m.user_id)).length;
  const byRole = new Map<Role, number>();
  for (const s of staff) byRole.set(s.role as Role, (byRole.get(s.role as Role) ?? 0) + 1);
  const composition = [
    ...TIER_STYLE.map((t) => ({ label: t.short, value: byRole.get(t.role) ?? 0, color: t.color })),
    { label: "Voters", value: baseVoters, color: "var(--color-green-300)" },
  ];

  // --- Geographic breakdown (everyone by the level below the caller).
  const bd = BREAKDOWN[role];
  let breakdown: { name: string; count: number }[] = [];
  if (bd) {
    const counts = new Map<string, number>();
    for (const p of everyone) {
      const id = p.geo[bd.col];
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

  // --- Member health + demographics (registered-voter records only; these
  // fields do not exist for staff).
  const health = [
    { label: "Active", value: members.filter((m) => m.status === "active").length, color: "var(--color-success)" },
    { label: "Paused", value: members.filter((m) => m.status === "frozen").length, color: "var(--color-gold-500)" },
    { label: "Removed", value: members.filter((m) => m.status === "deleted").length, color: "var(--color-ink-300)" },
  ];
  const gender = [
    { label: "Men", value: liveMembers.filter((m) => m.gender === "male").length, color: "var(--color-navy-500)" },
    { label: "Women", value: liveMembers.filter((m) => m.gender === "female").length, color: "var(--color-gold-600)" },
    { label: "Not recorded", value: liveMembers.filter((m) => !m.gender).length, color: "var(--color-ink-200)" },
  ];

  let activeStates: number | null = null;
  if (isNationalTier(role)) {
    const { count } = await supabase.from("states").select("*", { count: "exact", head: true }).eq("is_active", true);
    activeStates = count ?? 0;
  }

  return (
    <main className="app-fade-in mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Statistics</h1>
      <p className="mt-1 text-sm text-muted">
        {isLeader
          ? "Your members, and how your registrations are growing."
          : "Everyone in your movement, how it is growing, and how it breaks down."}
      </p>

      {/* KPI row */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label={isLeader ? "Your members" : "Total movement"} value={total.toLocaleString()}>
          <Sparkline data={cumSeries} color="var(--color-navy-600)" id="total" />
        </KpiCard>
        <KpiCard label="Active" value={activeCount.toLocaleString()}>
          <MiniMeter value={activeCount} max={total} color="var(--color-success)" caption={`${pct(activeCount, total)}% of the movement`} />
        </KpiCard>
        <KpiCard label="New in 30 days" value={new30.toLocaleString()}>
          <Sparkline data={weeklyCounts} color="var(--color-gold-600)" id="new" />
        </KpiCard>
        {isLeader ? (
          <KpiCard label="Toward your cap" value={`${Math.min(total, LEADER_CAP)} / ${LEADER_CAP}`}>
            <MiniMeter value={Math.min(total, LEADER_CAP)} max={LEADER_CAP} color="var(--color-gold-600)" caption="max 10 per leader" />
          </KpiCard>
        ) : activeStates !== null ? (
          <KpiCard label="Active states" value={activeStates}>
            <MiniMeter value={activeStates} max={37} color="var(--color-navy-500)" caption="of 37 states open" />
          </KpiCard>
        ) : (
          <KpiCard label="Leaders" value={leaderCount.toLocaleString()}>
            <MiniMeter value={leaderCount} max={total} color="var(--color-green-600)" caption={`${pct(leaderCount, total)}% of the movement`} />
          </KpiCard>
        )}
      </div>

      {/* Growth + makeup */}
      <div className={`mt-6 grid gap-6 ${isLeader ? "" : "lg:grid-cols-5"}`}>
        <Card title="Growth" hint="Movement size over time" className={isLeader ? "" : "lg:col-span-3"}>
          <GrowthChart weeks={weeks} priorTotal={priorTotal} />
        </Card>
        {!isLeader ? (
          <Card title="Movement makeup" hint="Everyone by tier" className="lg:col-span-2">
            <TierLadder rows={composition} />
          </Card>
        ) : null}
      </div>

      {/* Geographic breakdown */}
      {bd ? (
        <Card title={bd.label} hint="Everyone in the movement" className="mt-6">
          {breakdown.length === 0 ? (
            <p className="mt-3 text-sm text-muted">No one registered yet.</p>
          ) : (
            <DistributionBars items={breakdown} />
          )}
        </Card>
      ) : null}

      {/* Member health + demographics (registered voters) */}
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <Card title="Voter records" hint="Registered-voter health">
          <SegmentedBar segments={health} emptyLabel="No voter records yet." />
        </Card>
        <Card title="Gender" hint="Registered voters">
          <SegmentedBar segments={gender} emptyLabel="No voter records yet." />
        </Card>
      </div>
    </main>
  );
}

function KpiCard({ label, value, children }: { label: string; value: number | string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[8.5rem] flex-col rounded-card border border-border bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.9rem] font-semibold leading-none text-foreground">{value}</p>
      <div className="mt-auto pt-3">{children}</div>
    </div>
  );
}

function Card({
  title,
  hint,
  className = "",
  children,
}: {
  title: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-card border border-border bg-surface p-5 ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {hint ? <span className="text-xs text-muted">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}
