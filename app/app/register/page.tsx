import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { RegisterMemberForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register a member",
  robots: { index: false, follow: false },
};

// Two callers, one form:
//   * a LEADER registers into their own polling unit, capped at 10 active members;
//   * the NATIONAL COORDINATOR registers into ANY polling unit (T-033), optionally
//     attributing the member to a leader there so they stay inside the chain.
// RLS (members_insert, 0019) is what actually decides; this page mirrors it.
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

  const isNational = profile?.role === "national_admin";
  const isLeader =
    !!profile &&
    profile.role === "leader" &&
    !!profile.state_id &&
    !!profile.lga_id &&
    !!profile.ward_id &&
    !!profile.polling_unit_id;

  if (!profile || (!isLeader && !isNational)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a member
        </h1>
        <p className="text-sm text-muted">
          Only leaders and the National Coordinator can register members.
        </p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  // A leader's polling unit is fixed; the national coordinator picks one.
  const pollingUnitId = isLeader ? profile.polling_unit_id! : (sp.pu ?? null);

  if (isNational && !pollingUnitId) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Register a member
        </h1>
        <p className="mt-2 text-sm text-muted">
          Choose the polling unit this member belongs to. You are not restricted to any area.
        </p>
        <div className="mt-6">
          <GeoPicker
            action="/app/register"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward, pollingUnitId: sp.pu }}
            depth="polling_unit"
            locked={{}}
            submitLabel="Continue"
          />
        </div>
      </main>
    );
  }

  // Resolve the full path from the polling unit, so the two callers converge.
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
          Register a member
        </h1>
        <p className="text-sm text-muted">That polling unit could not be found.</p>
        <Link href="/app/register" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Start again
        </Link>
      </main>
    );
  }

  const where = [state.name, lga.name, ward.name, unit.name].filter(Boolean).join(" › ");

  // Leaders in this polling unit, so the coordinator can keep the member inside
  // the chain instead of holding them personally.
  const { data: leaders } = isNational
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "leader")
        .eq("polling_unit_id", unit.id)
        .eq("status", "active")
        .order("full_name")
    : { data: null };

  const { count: activeCount } = isLeader
    ? await supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("registered_by", user!.id)
        .eq("status", "active")
    : { count: null };

  const CAP = 10;
  const count = activeCount ?? 0;
  const atCap = isLeader && count >= CAP;
  const pct = Math.min(100, Math.round((count / CAP) * 100));

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Register a member
      </h1>
      <p className="mt-2 text-sm text-muted">
        Registering into <span className="font-medium text-foreground">{where}</span>. A membership
        number is issued automatically.
        {isNational ? (
          <>
            {" "}
            <Link href="/app/register" className="font-semibold text-primary underline-offset-4 hover:underline">
              Change area
            </Link>
          </>
        ) : null}
      </p>

      {isLeader ? (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Active members</p>
              <p className="mt-1 font-display text-2xl font-semibold text-foreground">
                {count} <span className="text-base font-normal text-muted">of {CAP}</span>
              </p>
            </div>
          </div>
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
            {isNational ? (
              <>
                Activate it on the{" "}
                <Link href="/app/admin/states" className="font-semibold text-primary underline-offset-4 hover:underline">
                  states page
                </Link>{" "}
                and come back.
              </>
            ) : (
              "You can register members once your coordinator activates it."
            )}
          </p>
        </div>
      ) : atCap ? (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-foreground">You have reached your limit</p>
          <p className="mt-1 text-sm text-muted">
            You have {CAP} active members, the most a leader can hold. Contact your coordinator if
            you need to register more.
          </p>
        </div>
      ) : (
        <div className="mt-8">
          <RegisterMemberForm
            pollingUnitId={isNational ? unit.id : null}
            leaders={leaders ?? null}
          />
        </div>
      )}
    </main>
  );
}
