import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GeoPicker } from "@/components/geo-picker";
import { AddWardPanel } from "./add-ward-panel";

export const metadata: Metadata = {
  title: "Add a ward",
  robots: { index: false, follow: false },
};

const ADMIN_ROLES = ["super_admin", "national_admin", "state_admin", "lg_admin"];

// LGA-level admins and up add wards the seed missed (mirrors CR-0018 for wards).
// Pick the LGA (locked to your own scope), search its existing wards, and add one
// only if it is missing. RLS (0041) is the control; this page mirrors it.
export default async function AddWardPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; lga?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, state_id, lga_id").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Add a ward</h1>
        <p className="text-sm text-muted">Your role cannot add wards.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const locked = {
    stateId: profile.state_id ?? undefined,
    lgaId: profile.lga_id ?? undefined,
  };
  // An LGA-scoped admin's LGA is fixed; higher tiers choose one in scope.
  const lgaId = locked.lgaId ?? sp.lga ?? null;

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Add a ward</h1>
      <p className="mt-1 text-sm text-muted">
        For wards missing from the register. Choose the LGA, check it isn&apos;t already listed, then add it.
      </p>

      {!lgaId ? (
        <div className="mt-6">
          <GeoPicker
            action="/app/geography/add-ward"
            selection={{ stateId: sp.state, lgaId: sp.lga }}
            depth="lga"
            locked={locked}
            submitLabel="Show wards"
          />
        </div>
      ) : (
        await renderLga(lgaId, Boolean(locked.lgaId))
      )}
    </main>
  );
}

async function renderLga(lgaId: string, lgaLocked: boolean) {
  const supabase = await createClient();
  const { data: lga } = await supabase
    .from("lgas")
    .select("id, name, states(name)")
    .eq("id", lgaId)
    .maybeSingle();

  if (!lga) {
    return (
      <p className="mt-6 text-sm text-muted">
        That LGA could not be found.{" "}
        <Link href="/app/geography/add-ward" className="font-semibold text-primary underline-offset-4 hover:underline">
          Start again
        </Link>
      </p>
    );
  }

  const state = lga.states as { name?: string } | null;
  const path = [state?.name, lga.name].filter(Boolean).join(" › ");

  const { data: wards } = await supabase
    .from("wards")
    .select("id, name")
    .eq("lga_id", lga.id)
    .order("name");

  return (
    <>
      <p className="mt-4 text-sm text-muted">
        LGA: <span className="font-medium text-foreground">{path}</span>
        {!lgaLocked ? (
          <>
            {" "}
            <Link href="/app/geography/add-ward" className="font-semibold text-primary underline-offset-4 hover:underline">
              Change LGA
            </Link>
          </>
        ) : null}
      </p>
      <AddWardPanel lgaId={lga.id} lgaLabel={lga.name} wards={wards ?? []} />
    </>
  );
}
