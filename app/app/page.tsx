import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
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
  if (isCoordinator(role))
    return <CoordinatorHome role={role} firstName={firstName} userId={user?.id} />;
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

// ---------- Membership summary (shared) ----------

type OwnMember = {
  id: string;
  membership_number: string;
  status: import("@/lib/database.types").Database["public"]["Enums"]["member_status"];
};

// The caller's own membership row, looked up by their auth id. Every account holds
// one now (CR-0014): base-tier members from registration, staff from the
// self-service onboarding flow.
async function fetchOwnMember(userId?: string): Promise<OwnMember | null> {
  if (!userId) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("members")
    .select("id, membership_number, status")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

// Membership ID + downloadable card, shown on every role's home (CR-0009 §3.5 for
// members, extended to all members incl. staff by CR-0014). The card link is hidden
// while frozen or removed, matching the route, which refuses those regardless.
function MembershipSummary({ member }: { member: OwnMember }) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4 rounded-card border border-border bg-surface p-5">
        <div className="min-w-0">
          <p className="text-sm text-muted">Membership ID</p>
          <p className="mt-0.5 font-mono text-lg font-semibold tracking-tight text-foreground">
            {member.membership_number}
          </p>
        </div>
        <StatusPill status={member.status} />
      </div>
      {member.status === "active" ? (
        <a
          href={`/app/members/${member.id}/card`}
          className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 transition-colors hover:bg-surface-muted"
        >
          <span className="grid size-11 shrink-0 place-items-center rounded-md bg-surface-muted text-foreground">
            <Icon name="profile" className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground">Membership card</p>
            <p className="mt-0.5 text-sm text-muted">Download your card to save or print.</p>
          </div>
          <Icon name="chevron" className="size-5 -rotate-90 text-muted" />
        </a>
      ) : null}
    </div>
  );
}

// "Everyone in the movement" (CR-0014): count every base member plus every staff
// person, once. Staff gain a member row when they complete onboarding; until then
// they are counted from their profile, so the total reflects the whole movement
// immediately instead of waiting on each person to self-onboard. All three reads
// are RLS-scoped to the caller, so the figure is correct per role (an area
// coordinator counts only their area). At national scale this would move to an
// aggregate RPC; the row counts are small today.
async function movementTotal(supabase: Awaited<ReturnType<typeof createClient>>): Promise<number> {
  const [{ count: memberCount }, staffRes, onboardedRes] = await Promise.all([
    supabase.from("members").select("*", { count: "exact", head: true }).neq("status", "deleted"),
    supabase.from("profiles").select("id").neq("role", "member"),
    supabase.from("members").select("user_id").neq("status", "deleted").not("user_id", "is", null),
  ]);
  const onboarded = new Set((onboardedRes.data ?? []).map((r) => r.user_id));
  const staffWithoutMembership = (staffRes.data ?? []).filter((p) => !onboarded.has(p.id)).length;
  return (memberCount ?? 0) + staffWithoutMembership;
}

// ---------- Member ----------

async function MemberHome({ userId, firstName }: { userId?: string; firstName: string }) {
  const me = await fetchOwnMember(userId);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub="Your membership at a glance." />

      {me ? <MembershipSummary member={me} /> : null}

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
  const me = await fetchOwnMember(userId);

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

  // Ten is a MILESTONE, not a limit (CR-0009 §3.4). The cap and its database
  // trigger are gone; a leader may register as many members as they can reach.
  // The client asked for a congratulations message at ten, as a permanent badge,
  // so it is derived from the count rather than stored as an event: no "seen"
  // record, no dismissal. It follows that it also disappears if a leader drops
  // back under ten through opt-outs, which is the honest behaviour for a badge
  // that means "you currently hold ten or more".
  const MILESTONE = 10;
  const count = total ?? 0;
  const reachedMilestone = count >= MILESTONE;
  const pct = Math.min(100, Math.round((count / MILESTONE) * 100));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub="Register and manage the voters in your care." />

      {me ? <MembershipSummary member={me} /> : null}

      <div className="mt-6 rounded-card border border-border bg-surface p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted">Voters registered</p>
            <p className="mt-1 font-display text-3xl font-semibold text-foreground">
              {count}
              {reachedMilestone ? null : (
                <span className="text-lg font-normal text-muted"> of {MILESTONE}</span>
              )}
            </p>
          </div>
          <Link
            href="/app/register"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
          >
            <Icon name="register" className="size-5" />
            Register a voter
          </Link>
        </div>
        {reachedMilestone ? null : (
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        )}
        {reachedMilestone ? (
          <div className="mt-4 rounded-card border border-success/40 bg-success-soft p-4">
            <p className="font-display text-lg font-semibold text-foreground">
              Congratulations, {firstName}.
            </p>
            <p className="mt-1 text-sm text-foreground/80">
              You have registered {count} voters and passed your first ten. Keep going: there is no
              limit on how many people you can bring into the movement.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold tracking-tight text-foreground">
            Recent voters
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
          <div className="mt-3">
            <EmptyState
              title="No voters yet"
              description="Register your first voter to get started."
            />
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

async function CoordinatorHome({
  role,
  firstName,
  userId,
}: {
  role: string;
  firstName: string;
  userId?: string;
}) {
  const supabase = await createClient();
  const me = await fetchOwnMember(userId);

  const members = await movementTotal(supabase);

  const { count: pending } = await supabase
    .from("change_requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  const isNational = role === "national_admin" || role === "super_admin";

  // National sees the whole country on a map. Counts are grouped in memory from
  // the RLS-visible rows, so no scope logic lives here; at national scale this
  // would move to an aggregate RPC.
  let mapData: StateDatum[] = [];
  if (isNational) {
    const [statesRes, memberRows, staffRows, leaderRows] = await Promise.all([
      supabase.from("states").select("id, name, is_active"),
      supabase.from("members").select("state_id, user_id").neq("status", "deleted"),
      supabase.from("profiles").select("id, state_id").neq("role", "member"),
      supabase.from("profiles").select("state_id").eq("role", "leader"),
    ]);
    const tally = (rows: { state_id: string | null }[] | null) => {
      const m = new Map<string, number>();
      for (const r of rows ?? []) if (r.state_id) m.set(r.state_id, (m.get(r.state_id) ?? 0) + 1);
      return m;
    };
    // Everyone in the movement, by state: member records plus staff who have not
    // recorded a membership yet, placed by their assigned state. Mirrors
    // movementTotal()'s "members + staff-without-record" so the map matches the
    // headline. National/super admins have no state, so they count in the total
    // (the panel) but sit on no state.
    const onboarded = new Set(
      (memberRows.data ?? []).map((r) => r.user_id).filter((v): v is string => !!v),
    );
    const peopleBy = tally(memberRows.data);
    for (const p of staffRows.data ?? []) {
      if (p.state_id && !onboarded.has(p.id)) peopleBy.set(p.state_id, (peopleBy.get(p.state_id) ?? 0) + 1);
    }
    const leaderBy = tally(leaderRows.data);
    mapData = (statesRes.data ?? []).map((s) => ({
      name: s.name,
      members: peopleBy.get(s.id) ?? 0,
      leaders: leaderBy.get(s.id) ?? 0,
      active: !!s.is_active,
    }));
  }

  const { count: activeStates } = isNational
    ? await supabase.from("states").select("*", { count: "exact", head: true }).eq("is_active", true)
    : { count: null };

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <Greeting firstName={firstName} sub={`${roleLabel(role)} dashboard.`} />

      {me ? <MembershipSummary member={me} /> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label={isNational ? "Members" : "Members in your area"}
          value={members}
          hint={isNational ? "Everyone in the movement" : "Everyone in your area"}
          href="/app/members"
        />
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
          <p className="mt-1 text-sm text-muted">Everyone in the movement, by state; the total is in the panel.</p>
          <div className="mt-4">
            {/* The map colours states by everyone in the movement (member records
                plus staff placed by their assigned state); the Nationwide headline
                is the true movement total, matching the card above. National and
                super admins have no state, so they count in the total but not on
                any state. */}
            <NigeriaMap data={mapData} nationwideMembers={members} />
          </div>
        </section>
      ) : null}

      <h2 className="mt-8 font-display text-xl font-semibold tracking-tight text-foreground">
        Quick actions
      </h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile
          href="/app/admin/new-account"
          icon="access"
          label="Give app access"
          desc="Set up a new account"
        />
        <Tile
          href="/app/notifications"
          icon="bell"
          label="Send announcement"
          desc="Message members in your area"
        />
        <Tile href="/app/kym" icon="verify" label="Verify a leader" desc="Confirm a leader is genuine" />
      </div>
    </main>
  );
}
