import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusPill } from "@/components/ui/status-pill";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { Icon, type IconName } from "@/components/app-shell/icons";
import { isCoordinator, roleLabel } from "@/lib/terms";
import { NigeriaMap, type StateDatum } from "@/components/map/nigeria-map";

// Protected landing, now a role-aware home. The proxy redirects unauthenticated
// users to /login before this renders; the page still reads the user + profile
// itself, because the proxy is an optimistic check, not the authorization
// boundary (RLS is, ADR-0005). Every query below is RLS-scoped to the caller.
export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  const role = profile?.role ?? "member";
  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0];

  if (role === "leader") return <LeaderHome userId={user?.id} firstName={firstName} />;
  if (isCoordinator(role)) return <CoordinatorHome role={role} firstName={firstName} />;
  return <MemberHome userId={user?.id} firstName={firstName} />;
}

// ---------- Shared bits ----------

function Greeting({ firstName, sub }: { firstName: string; sub: string }) {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        {firstName ? `Welcome back, ${firstName}.` : "Welcome back."}
      </h1>
      <p className="mt-1 text-sm text-muted">{sub}</p>
    </div>
  );
}

function Tile({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: IconName;
  label: string;
  desc?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-ring hover:bg-surface-muted"
    >
      <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon name={icon} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{label}</p>
        {desc ? <p className="mt-0.5 text-sm text-muted">{desc}</p> : null}
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const inner = (
    <>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link
      href={href}
      className="rounded-card border border-border bg-surface p-5 transition-colors hover:border-ring hover:bg-surface-muted"
    >
      {inner}
    </Link>
  ) : (
    <div className="rounded-card border border-border bg-surface p-5">{inner}</div>
  );
}

// ---------- Member ----------

async function MemberHome({ userId, firstName }: { userId?: string; firstName: string }) {
  const supabase = await createClient();
  const { data: me } = userId
    ? await supabase
        .from("members")
        .select("membership_number, status")
        .eq("user_id", userId)
        .maybeSingle()
    : { data: null };

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub="Your membership at a glance." />

      {me ? (
        <div className="mt-6 flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5">
          <div className="min-w-0">
            <p className="text-sm text-muted">Membership ID</p>
            <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-foreground">
              {me.membership_number}
            </p>
          </div>
          <StatusPill status={me.status} />
        </div>
      ) : null}

      <Link
        href="/app/vote"
        className="mt-4 flex items-center gap-4 rounded-card border border-primary/25 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
      >
        <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
          <Icon name="vote" className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">Who to vote for</p>
          <p className="mt-0.5 text-sm text-muted">
            See the candidates the movement is backing in your area.
          </p>
        </div>
        <Icon name="chevron" className="size-5 -rotate-90 text-muted" />
      </Link>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Tile href="/app/profile" icon="profile" label="My details" desc="View your information" />
        <Tile
          href="/app/notifications"
          icon="bell"
          label="Notifications"
          desc="Updates from the movement"
        />
      </div>

      <div className="mt-6">
        <InstallPrompt />
      </div>
    </main>
  );
}

// ---------- Leader ----------

async function LeaderHome({ userId, firstName }: { userId?: string; firstName: string }) {
  const supabase = await createClient();

  const { count: total } = userId
    ? await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("registered_by", userId)
        .neq("status", "deleted")
    : { count: 0 };

  const { data: recent } = userId
    ? await supabase
        .from("members")
        .select("id, full_name, membership_number, status, created_at")
        .eq("registered_by", userId)
        .neq("status", "deleted")
        .order("created_at", { ascending: false })
        .limit(5)
    : { data: [] };

  const CAP = 10;
  const count = total ?? 0;
  const atCap = count >= CAP;
  const pct = Math.min(100, Math.round((count / CAP) * 100));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub="Register and manage the members in your care." />

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Members registered</p>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">
              {count} <span className="text-lg font-normal text-muted">of {CAP}</span>
            </p>
          </div>
          {atCap ? (
            <span className="rounded-md bg-surface-muted px-3 py-2 text-sm font-semibold text-muted">
              Limit reached
            </span>
          ) : (
            <Link
              href="/app/register"
              className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              <Icon name="register" className="size-5" />
              Register a member
            </Link>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
          <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
        </div>
        {atCap ? (
          <p className="mt-3 text-sm text-muted">
            You have reached the 10-member limit. Contact your coordinator if you need to register
            more.
          </p>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Recent members
          </h2>
          <Link
            href="/app/members"
            className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View all
          </Link>
        </div>
        {recent && recent.length > 0 ? (
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/app/members/${m.id}`}
                  className="flex items-center justify-between gap-3 rounded-card border border-border bg-surface p-4 transition-colors hover:border-ring hover:bg-surface-muted"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{m.full_name}</p>
                    <p className="truncate font-mono text-xs text-muted">{m.membership_number}</p>
                  </div>
                  <StatusPill status={m.status} />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-3 rounded-card border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted">
              No members yet. Register your first member to get started.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Tile href="/app/kym" icon="verify" label="Verify a leader" desc="Confirm a leader is genuine" />
        <Tile href="/app/stats" icon="overview" label="Overview" desc="Your registration numbers" />
      </div>
    </main>
  );
}

// ---------- Coordinator ----------

async function CoordinatorHome({ role, firstName }: { role: string; firstName: string }) {
  const supabase = await createClient();

  const { count: members } = await supabase
    .from("members")
    .select("*", { count: "exact", head: true })
    .neq("status", "deleted");

  const { count: pending } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const isNational = role === "national_admin";

  // National sees the whole country on a map. Counts are grouped in memory from
  // the RLS-visible rows, so no scope logic lives here; at national scale this
  // would move to an aggregate RPC.
  let mapData: StateDatum[] = [];
  if (isNational) {
    const [statesRes, memberRows, leaderRows] = await Promise.all([
      supabase.from("states").select("id, name, is_active"),
      supabase.from("members").select("state_id").neq("status", "deleted"),
      supabase.from("profiles").select("state_id").eq("role", "leader"),
    ]);
    const tally = (rows: { state_id: string | null }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) if (r.state_id) m.set(r.state_id, (m.get(r.state_id) ?? 0) + 1);
      return m;
    };
    const memberBy = tally(memberRows.data);
    const leaderBy = tally(leaderRows.data);
    mapData = (statesRes.data ?? []).map((s) => ({
      name: s.name,
      members: memberBy.get(s.id) ?? 0,
      leaders: leaderBy.get(s.id) ?? 0,
      active: !!s.is_active,
    }));
  }

  const { count: activeStates } = isNational
    ? await supabase.from("states").select("*", { count: "exact", head: true }).eq("is_active", true)
    : { count: null };

  const canCandidates = role === "national_admin" || role === "state_admin" || role === "lg_admin";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub={`${roleLabel(role)} dashboard.`} />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Members in your area" value={members ?? 0} href="/app/members" />
        <Stat
          label="Correction requests"
          value={pending ?? 0}
          hint={pending && pending > 0 ? "Waiting for review" : "Nothing waiting"}
          href="/app/corrections"
        />
        {isNational ? (
          <Stat label="Active states" value={activeStates ?? 0} href="/app/admin/states" />
        ) : (
          <Stat label="Overview" value="View" hint="Registration trends" href="/app/stats" />
        )}
      </div>

      {isNational ? (
        <section className="mt-8">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Across the country
          </h2>
          <p className="mt-1 text-sm text-muted">
            Members by state. Select a state for its numbers.
          </p>
          <div className="mt-4">
            <NigeriaMap data={mapData} />
          </div>
        </section>
      ) : null}

      <h2 className="mt-8 font-display text-xl font-semibold tracking-tight text-foreground">
        Quick actions
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile href="/app/members" icon="members" label="Members" desc="Search and manage" />
        <Tile
          href="/app/corrections"
          icon="inbox"
          label="Correction requests"
          desc="Review what members asked to fix"
        />
        <Tile
          href="/app/admin/new-account"
          icon="access"
          label="Give app access"
          desc="Set up a new account"
        />
        <Tile href="/app/admin/team" icon="team" label="Team" desc="Your coordinators and leaders" />
        <Tile href="/app/stats" icon="overview" label="Statistics" desc="Numbers across your area" />
        <Tile href="/app/kym" icon="verify" label="Verify a leader" desc="Confirm a leader is genuine" />
        {canCandidates ? (
          <Tile
            href="/app/admin/candidates"
            icon="candidates"
            label="Who to vote for"
            desc="Manage the candidates members see"
          />
        ) : null}
        {isNational ? (
          <Tile href="/app/admin/states" icon="states" label="States" desc="Activate and manage states" />
        ) : null}
      </div>
    </main>
  );
}
