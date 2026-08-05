import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { AddUnitPanel } from "./add-unit-panel";

export const metadata: Metadata = {
  title: "Add a polling unit",
  robots: { index: false, follow: false },
};

const ADMIN_ROLES = ["national_admin", "state_admin", "lg_admin", "ward_admin", "unit_coordinator"];

// Admins add polling units the INEC seed missed (CR-0018). Pick the ward (locked
// to your own scope), search its existing units, and add one only if it is
// missing. RLS (0034) is the control; this page mirrors it.
export default async function AddPollingUnitPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; lga?: string; ward?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("role, state_id, lga_id, ward_id")
        .eq("id", user.id)
        .maybeSingle()
    : { data: null };

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Add a polling unit
        </h1>
        <p className="text-sm text-muted">Your role cannot add polling units.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const locked = {
    stateId: profile.state_id ?? undefined,
    lgaId: profile.lga_id ?? undefined,
    wardId: profile.ward_id ?? undefined,
  };
  // A unit/ward-scoped admin's ward is fixed; higher tiers choose one in scope.
  const wardId = locked.wardId ?? sp.ward ?? null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Add a polling unit
      </h1>
      <p className="mt-1 text-sm text-muted">
        For polling units missing from the register. Choose the ward, check it isn&apos;t already
        listed, then add it.
      </p>

      {!wardId ? (
        <div className="mt-6">
          <GeoPicker
            action="/app/geography/add-unit"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward }}
            depth="ward"
            locked={locked}
            submitLabel="Show units"
          />
        </div>
      ) : (
        await renderWard(wardId, Boolean(locked.wardId))
      )}
    </main>
  );
}

async function renderWard(wardId: string, wardLocked: boolean) {
  const supabase = await createClient();
  const { data: ward } = await supabase
    .from("wards")
    .select("id, name, lgas(name, states(name))")
    .eq("id", wardId)
    .maybeSingle();

  if (!ward) {
    return (
      <p className="mt-6 text-sm text-muted">
        That ward could not be found.{" "}
        <Link href="/app/geography/add-unit" className="font-semibold text-primary underline-offset-4 hover:underline">
          Start again
        </Link>
      </p>
    );
  }

  const lga = ward.lgas as { name?: string; states?: { name?: string } } | null;
  const wardLabel = ward.name;
  const path = [lga?.states?.name, lga?.name, ward.name].filter(Boolean).join(" › ");

  const { data: units } = await supabase
    .from("polling_units")
    .select("id, name, code")
    .eq("ward_id", ward.id)
    .order("name");

  return (
    <>
      <p className="mt-4 text-sm text-muted">
        Ward: <span className="font-medium text-foreground">{path}</span>
        {!wardLocked ? (
          <>
            {" "}
            <Link href="/app/geography/add-unit" className="font-semibold text-primary underline-offset-4 hover:underline">
              Change ward
            </Link>
          </>
        ) : null}
      </p>
      <AddUnitPanel wardId={ward.id} wardLabel={wardLabel} units={units ?? []} />
    </>
  );
}
