import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { type ConstituencyKind } from "@/lib/offices";
import { isNationalTier } from "@/lib/terms";
import { CandidateTabs } from "../tabs";
import { SeatPicker } from "./seat-picker";
import { AreaEditor } from "./area-editor";

export const metadata: Metadata = {
  title: "Constituency areas",
  robots: { index: false, follow: false },
};

// T-031c (CR-0013 §4b). National-admin-only editor to set which wards make up a
// seat, for the ones whose membership isn't derivable from the geography tree
// (State Assembly, and split-LGA federal seats). RLS is the real gate; this page
// also refuses non-national roles up front.
const EDITABLE_KINDS: ConstituencyKind[] = [
  "senatorial_district",
  "federal_constituency",
  "state_constituency",
];

// Plain-language names for the three seat kinds (mirrors seat-picker).
const SEAT_LABEL: Partial<Record<ConstituencyKind, string>> = {
  senatorial_district: "Senate",
  federal_constituency: "House of Representatives",
  state_constituency: "State Assembly",
};

export default async function ConstituencyAreasPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (!isNationalTier(profile?.role)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
          Constituency areas
        </h1>
        <p className="text-sm text-muted">Only the national admin can set constituency areas.</p>
        <Link href="/app/admin/candidates" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to candidates
        </Link>
      </main>
    );
  }

  const [{ data: stateRows }, { data: seatRows }] = await Promise.all([
    supabase.from("states").select("id, name").order("name"),
    supabase.from("constituencies").select("id, name, kind, state_id").in("kind", EDITABLE_KINDS).order("name"),
  ]);
  const states = stateRows ?? [];
  const seats = (seatRows ?? []) as { id: string; name: string; kind: string; state_id: string }[];
  const selected = sp.c ? seats.find((s) => s.id === sp.c) ?? null : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Constituency areas
      </h1>
      <p className="mt-1 max-w-prose text-sm text-muted">
        Some seats, like Senate, House of Representatives and State Assembly, cover a group of wards.
        Set which wards each seat covers, and members in those wards will see the right people to vote
        for. Pick a seat below, tick its wards, and save.
      </p>

      <CandidateTabs showAreas />

      <SeatPicker
        states={states}
        seats={seats}
        initial={selected ? { state: selected.state_id, kind: selected.kind, c: selected.id } : undefined}
      />

      {selected ? (
        <SelectedArea
          supabase={supabase}
          seat={selected}
          label={SEAT_LABEL[selected.kind as ConstituencyKind] ?? "Seat"}
        />
      ) : null}
    </main>
  );
}

async function SelectedArea({
  supabase,
  seat,
  label,
}: {
  supabase: Awaited<ReturnType<typeof createClient>>;
  seat: { id: string; name: string; kind: string; state_id: string };
  label: string;
}) {
  const [{ data: lgaRows }, { data: directRows }, { data: lgaMembership }] = await Promise.all([
    supabase.from("lgas").select("id, name, wards(id, name)").eq("state_id", seat.state_id).order("name"),
    supabase.from("constituency_wards").select("ward_id").eq("constituency_id", seat.id),
    supabase.from("constituency_lgas").select("lga_id").eq("constituency_id", seat.id),
  ]);

  const lgas = (lgaRows ?? []).map((l) => ({
    id: l.id,
    name: l.name,
    wards: ((l.wards as { id: string; name: string }[]) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
  }));
  const initialWardIds = (directRows ?? []).map((r) => r.ward_id);
  const coveredLgaIds = new Set((lgaMembership ?? []).map((r) => r.lga_id));
  const lgaCoveredWardIds = lgas
    .filter((l) => coveredLgaIds.has(l.id))
    .flatMap((l) => l.wards.map((w) => w.id));

  return (
    <section className="mt-8">
      <div className="rounded-card border border-border bg-surface-muted px-4 py-3">
        <p className="text-sm font-semibold text-foreground">
          {seat.name} <span className="font-normal text-muted">· {label}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted">Tick every ward that is part of this seat, then save.</p>
      </div>
      <AreaEditor
        constituencyId={seat.id}
        lgas={lgas}
        initialWardIds={initialWardIds}
        lgaCoveredWardIds={lgaCoveredWardIds}
      />
    </section>
  );
}
