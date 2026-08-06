import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { MembershipForm } from "./membership-form";

export const metadata: Metadata = {
  title: "Complete your membership",
  robots: { index: false, follow: false },
};

// Everyone is a member (CR-0014). A staff account completes their OWN membership
// here: they pick their home polling unit and supply their personal details, and
// `completeMyMembership` creates the member row keyed to that home registration.
// Base-tier members already have a membership from registration, so they are sent
// back to their area.
export default async function CompleteMembershipPage({
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
    ? await supabase.from("profiles").select("role, full_name").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!profile) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Complete your membership
        </h1>
        <p className="text-sm text-muted">You must be signed in.</p>
      </main>
    );
  }

  // Base-tier members get their membership at registration, not here.
  if (profile.role === "member") redirect("/app");

  // Already a member? Point them at their card instead of registering again.
  const { data: existing } = user
    ? await supabase
        .from("members")
        .select("id, membership_number, status")
        .eq("user_id", user.id)
        .maybeSingle()
    : { data: null };

  if (existing) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          You&apos;re already a member
        </h1>
        <p className="mt-2 text-sm text-muted">
          Membership number{" "}
          <span className="font-mono font-semibold text-foreground">{existing.membership_number}</span>.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {existing.status === "active" ? (
            <a
              href={`/app/members/${existing.id}/card`}
              className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
            >
              Download your card
            </a>
          ) : null}
          <Link
            href="/app"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-5 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted"
          >
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  // Step 1: choose the home polling unit (anywhere; this is where they vote, not
  // where they administer). Reuses the geo picker with its inline "add unit".
  const pollingUnitId = sp.pu ?? null;
  if (!pollingUnitId) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
          Complete your membership
        </h1>
        <p className="mt-2 text-sm text-muted">
          You&apos;re a member of the movement too. Choose your home polling unit, the one where
          you&apos;re registered to vote.
        </p>
        <div className="mt-6">
          <GeoPicker
            action="/app/account/membership"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward, pollingUnitId: sp.pu }}
            depth="polling_unit"
            locked={{}}
            submitLabel="Continue"
            addPollingUnit
          />
        </div>
      </main>
    );
  }

  // Resolve the chosen path for a confirmation line.
  const { data: unit } = await supabase
    .from("polling_units")
    .select("id, name, ward_id")
    .eq("id", pollingUnitId)
    .maybeSingle();
  const { data: ward } = unit
    ? await supabase.from("wards").select("id, name, lga_id").eq("id", unit.ward_id).maybeSingle()
    : { data: null };
  const { data: lga } = ward
    ? await supabase.from("lgas").select("id, name, state_id").eq("id", ward.lga_id).maybeSingle()
    : { data: null };
  const { data: state } = lga
    ? await supabase.from("states").select("id, name").eq("id", lga.state_id).maybeSingle()
    : { data: null };

  if (!unit || !ward || !lga || !state) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Complete your membership
        </h1>
        <p className="text-sm text-muted">That polling unit could not be found.</p>
        <Link
          href="/app/account/membership"
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
        >
          Start again
        </Link>
      </main>
    );
  }

  const where = [state.name, lga.name, ward.name, unit.name].filter(Boolean).join(" › ");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Complete your membership
      </h1>
      <p className="mt-2 text-sm text-muted">
        Home area: <span className="font-medium text-foreground">{where}</span>. A membership number
        is issued automatically.{" "}
        <Link
          href="/app/account/membership"
          className="font-semibold text-primary underline-offset-4 hover:underline"
        >
          Change area
        </Link>
      </p>

      <div className="mt-8">
        <MembershipForm pollingUnitId={unit.id} defaultFullName={profile.full_name ?? ""} />
      </div>
    </main>
  );
}
