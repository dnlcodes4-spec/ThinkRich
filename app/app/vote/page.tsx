import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  CANDIDATE_PHOTOS_BUCKET,
  KIND_LABEL,
  needsConstituencyData,
  type Candidacy,
  type ConstituencyKind,
} from "@/lib/offices";
import { CandidateCard } from "./candidate-card";
import { GeoPicker } from "@/components/geo-picker";

export const metadata: Metadata = {
  title: "Your candidates",
  robots: { index: false, follow: false },
};

// Awareness, not voting. Nothing here casts or counts anything: it shows the
// candidates that have been uploaded for every race that applies to a place,
// most local first. Defaults to the member's own geography; they can look at any
// other area too (CR-0007).
export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string; lga?: string; ward?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: member } = user
    ? await supabase.from("members").select("state_id, lga_id, ward_id").eq("user_id", user.id).maybeSingle()
    : { data: null };

  if (!member) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Your candidates</h1>
        <p className="text-sm text-muted">This area is for members.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  // Their own area unless they asked for another.
  const browsing = Boolean(sp.state || sp.lga || sp.ward);
  const stateId = sp.state ?? member.state_id;
  const lgaId = sp.ward ? undefined : (sp.lga ?? (sp.state ? undefined : member.lga_id));
  const wardId = sp.ward ?? (sp.state || sp.lga ? undefined : member.ward_id);

  const [{ data: rows }, { data: offices }, { data: parties }] = await Promise.all([
    supabase.rpc("candidacies_for_geography", {
      p_state_id: stateId ?? undefined,
      p_lga_id: lgaId ?? undefined,
      p_ward_id: wardId ?? undefined,
    }),
    supabase.from("office_types").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("parties").select("id, acronym, name"),
  ]);

  const partyMap = new Map((parties ?? []).map((p) => [p.id, p]));
  const byOffice = new Map<string, Candidacy[]>();
  for (const c of (rows ?? []) as Candidacy[]) {
    const list = byOffice.get(c.office_type_id) ?? [];
    list.push(c);
    byOffice.set(c.office_type_id, list);
  }

  const where = await placeName(wardId, lgaId, stateId);
  const pub = (path: string | null) =>
    path ? supabase.storage.from(CANDIDATE_PHOTOS_BUCKET).getPublicUrl(path).data.publicUrl : null;

  // Most local first: the councillor for their ward matters more to them than
  // the President, so reverse the catalogue's federal-first ordering.
  const ordered = [...(offices ?? [])].reverse();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Your candidates</h1>
      <p className="mt-1 text-sm text-muted">
        Everyone standing in {where}, closest to you first.
        {browsing ? (
          <>
            {" "}
            <Link href="/app/vote" className="font-semibold text-primary underline-offset-4 hover:underline">
              Back to my area
            </Link>
          </>
        ) : null}
      </p>

      <details className="mt-6 rounded-card border border-border bg-surface-muted p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">Look at another area</summary>
        <div className="mt-4">
          <GeoPicker
            action="/app/vote"
            selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward }}
            depth="ward"
            locked={{}}
            submitLabel="Show candidates"
          />
        </div>
      </details>

      <div className="mt-8 flex flex-col gap-8">
        {ordered.map((office) => {
          const list = byOffice.get(office.id) ?? [];
          const kind = office.constituency_kind as ConstituencyKind;
          const pending = list.length === 0 && needsConstituencyData(kind);
          return (
            <section key={office.id}>
              <h2 className="text-sm font-semibold text-accent">{office.title}</h2>
              {list.length > 0 ? (
                <div className="mt-3 flex flex-col gap-3">
                  {list.map((c) => (
                    <CandidateCard
                      key={c.id}
                      candidate={{
                        full_name: c.full_name,
                        party: c.party_id ? (partyMap.get(c.party_id)?.acronym ?? null) : null,
                        running_mate: c.running_mate_name,
                        running_mate_title: office.running_mate_title,
                        slogan: c.slogan,
                        photoUrl: pub(c.photo_url),
                        endorsed: c.is_endorsed,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-muted">
                  {pending
                    ? `We have not mapped ${KIND_LABEL[kind].toLowerCase()}s yet, so this race is not available.`
                    : "No candidate has been added for this seat yet."}
                </p>
              )}
            </section>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted">
        Candidates are added by the movement. This page is for information only.
      </p>
    </main>
  );
}

async function placeName(wardId?: string | null, lgaId?: string | null, stateId?: string | null) {
  const supabase = await createClient();
  if (wardId) {
    const { data } = await supabase.from("wards").select("name, lgas(name, states(name))").eq("id", wardId).maybeSingle();
    const lga = data?.lgas as { name?: string; states?: { name?: string } } | null;
    return [data?.name, lga?.name, lga?.states?.name].filter(Boolean).join(", ") || "your area";
  }
  if (lgaId) {
    const { data } = await supabase.from("lgas").select("name, states(name)").eq("id", lgaId).maybeSingle();
    const st = data?.states as { name?: string } | null;
    return [data?.name, st?.name].filter(Boolean).join(", ") || "your area";
  }
  if (stateId) {
    const { data } = await supabase.from("states").select("name").eq("id", stateId).maybeSingle();
    return data?.name ?? "your area";
  }
  return "your area";
}
