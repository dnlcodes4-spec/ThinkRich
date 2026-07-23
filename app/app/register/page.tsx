import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { RegisterMemberForm } from "./register-form";

export const metadata: Metadata = {
  title: "Register a member",
  robots: { index: false, follow: false },
};

// Leader-only. The proxy guarantees a session; RLS guarantees a non-leader can't
// actually insert. Geography is auto-loaded from the leader's own polling unit.
export default async function RegisterMemberPage() {
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

  const isLeader =
    !!profile &&
    profile.role === "leader" &&
    !!profile.state_id &&
    !!profile.lga_id &&
    !!profile.ward_id &&
    !!profile.polling_unit_id;

  if (!isLeader) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Register a member
        </h1>
        <p className="text-sm text-muted">
          Only leaders can register members. Your account is not a leader account.
        </p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const [{ data: pu }, { data: ward }, { data: lga }, { data: state }, { count: activeCount }] =
    await Promise.all([
      supabase.from("polling_units").select("name").eq("id", profile.polling_unit_id!).single(),
      supabase.from("wards").select("name").eq("id", profile.ward_id!).single(),
      supabase.from("lgas").select("name, code").eq("id", profile.lga_id!).single(),
      supabase.from("states").select("name, code, is_active").eq("id", profile.state_id!).single(),
      supabase
        .from("members")
        .select("*", { count: "exact", head: true })
        .eq("registered_by", user!.id)
        .eq("status", "active"),
    ]);

  const where = [state?.name, lga?.name, ward?.name, pu?.name].filter(Boolean).join(" › ");
  const CAP = 10;
  const count = activeCount ?? 0;
  const atCap = count >= CAP;
  const pct = Math.min(100, Math.round((count / CAP) * 100));
  const stateActive = !!state?.is_active;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Register a member
      </h1>
      <p className="mt-2 text-sm text-muted">
        Registering into your polling unit:{" "}
        <span className="font-medium text-foreground">{where}</span>. A membership number is issued
        automatically.
      </p>

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

      {!stateActive ? (
        <div className="mt-6 rounded-card border border-warning/40 bg-warning-soft p-5">
          <p className="text-sm font-semibold text-foreground">Registration is not open yet</p>
          <p className="mt-1 text-sm text-muted">
            {state?.name ?? "Your state"} has not been activated. You can register members once your
            coordinator activates it.
          </p>
        </div>
      ) : atCap ? (
        <div className="mt-6 rounded-card border border-border bg-surface p-5">
          <p className="text-sm font-semibold text-foreground">You have reached your limit</p>
          <p className="mt-1 text-sm text-muted">
            You have {CAP} active members, the most a leader can hold. Contact your coordinator if
            you need to register more.
          </p>
          <Link
            href="/app/members"
            className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            View your members
          </Link>
        </div>
      ) : (
        <div className="mt-8">
          <RegisterMemberForm />
        </div>
      )}
    </main>
  );
}
