import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { RegisterMemberForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register a voter",
  robots: { index: false, follow: false },
};

// Who registers, and how the polling unit is chosen (CR-0017 item 7):
//   * a LEADER or UNIT COORDINATOR registers into their OWN polling unit (fixed);
//   * a WARD / LGA / STATE coordinator picks a polling unit WITHIN their scope;
//   * the NATIONAL COORDINATOR picks any polling unit.
// Every non-leader may attribute the member to a leader in that polling unit so
// they stay inside the chain. RLS (members_insert, 0033) is what actually decides;
// this page mirrors it.
const FIXED_PU_ROLES = ["leader", "unit_coordinator"];
const CHOOSE_PU_ROLES = ["ward_admin", "lg_admin", "state_admin", "national_admin", "super_admin"];

export default async function RegisterMemberPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; lga?: string; ward?: string; pu?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, state_id, lga_id, ward_id, polling_unit_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  const role = profile?.role ?? "";
  const fixedPu = FIXED_PU_ROLES.includes(role);
  const choosePu = CHOOSE_PU_ROLES.includes(role);

  if (!profile || (!fixedPu && !choosePu)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a voter
        </h1>
        <p className="text-sm text-muted">Your role cannot register voters.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  if (fixedPu && !profile.polling_unit_id) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a voter
        </h1>
        <p className="text-sm text-muted">
          Your account has no polling unit set, so you cannot register members yet. Contact your
          coordinator.
        </p>
      </main>
    );
  }

  // A fixed-PU registrar uses their own; everyone else picks one, constrained to
  // their own scope by the locked levels below.
  const pollingUnitId = fixedPu ? profile.polling_unit_id! : (sp.pu ?? null);

  if (choosePu && !pollingUnitId) {
    const locked = {
      stateId: profile.state_id ?? undefined,
      lgaId: profile.lga_id ?? undefined,
      wardId: profile.ward_id ?? undefined,
    };
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Register a voter
        </h1>
        <p className="mt-2 text-sm text-muted">
          Choose the polling unit this member belongs to, within your area.
        </p>
        <div className="mt-6">
          <GeoPicker
            action="/app/register"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward, pollingUnitId: sp.pu }}
            depth="polling_unit"
            locked={locked}
            submitLabel="Continue"
            addPollingUnit
          />
        </div>
      </main>
    );
  }

  // Resolve the full path from the polling unit, so every caller converges.
  const { data: unit } = await supabase
    .from("polling_units")
    .select("id, name, ward_id")
    .eq("id", pollingUnitId!)
    .maybeSingle();
  const { data: ward } = unit
    ? await supabase.from("wards").select("id, name, lga_id").eq("id", unit.ward_id).maybeSingle()
    : { data: null };
  const { data: lga } = ward
    ? await supabase.from("lgas").select("id, name, state_id").eq("id", ward.lga_id).maybeSingle()
    : { data: null };
  const { data: state } = lga
    ? await supabase.from("states").select("id, name, is_active").eq("id", lga.state_id).maybeSingle()
    : { data: null };

  if (!unit || !ward || !lga || !state) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a voter
        </h1>
        <p className="text-sm text-muted">That polling unit could not be found.</p>
        <Link href="/app/register" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Start again
        </Link>
      </main>
    );
  }

  const where = [state.name, lga.name, ward.name, unit.name].filter(Boolean).join(" › ");

  // Leaders in this polling unit, so any non-leader registrar can keep the member
  // inside the chain instead of holding them personally.
  const { data: leaders } =
    role !== "leader"
      ? await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "leader")
          .eq("polling_unit_id", unit.id)
          .eq("status", "active")
          .order("full_name")
      : { data: null };

  // A leader's own tally. Since CR-0009 / migration 0023 ten is a milestone, not a
  // ceiling, so this is shown for encouragement and never blocks registration.
  const { count: activeCount } = role === "leader"
    ? await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("registered_by", user!.id)
        .eq("status", "active")
    : { count: null };

  const MILESTONE = 10;
  const count = activeCount ?? 0;
  const pct = Math.min(100, Math.round((count / MILESTONE) * 100));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Register a voter
      </h1>
      <p className="mt-2 text-sm text-muted">
        Registering into <span className="font-medium text-foreground">{where}</span>. A membership
        number is issued automatically.
        {choosePu ? (
          <>
            {" "}
            <Link href="/app/register" className="font-semibold text-primary underline-offset-4 hover:underline">
              Change area
            </Link>
          </>
        ) : null}
      </p>

      {role === "leader" ? (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-sm text-muted">Active voters</p>
          <p className="mt-1 font-display text-2xl font-semibold text-foreground">
            {count} <span className="text-base font-normal text-muted">towards {MILESTONE}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
        </div>
      ) : null}

      {!state.is_active ? (
        <div className="mt-6 rounded-card border border-warning/40 bg-warning-soft p-5">
          <p className="text-sm font-semibold text-foreground">Registration is not open yet</p>
          <p className="mt-1 text-sm text-muted">
            {state.name} has not been activated.{" "}
            {role === "national_admin" ? (
              <>
                Activate it on the{" "}
                <Link href="/app/admin/states" className="font-semibold text-primary underline-offset-4 hover:underline">
                  states page
                </Link>{" "}
                and come back.
              </>
            ) : (
              "You can register voters once it is activated."
            )}
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <RegisterMemberForm
            pollingUnitId={fixedPu ? null : unit.id}
            leaders={leaders ?? null}
          />
        </div>
      )}
    </main>
  );
}
