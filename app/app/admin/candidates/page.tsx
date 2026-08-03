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
import { CandidateForm } from "./candidate-form";
import { GeoPicker } from "@/components/geo-picker";
import { deleteCandidacy } from "./actions";
import { CandidateTabs } from "./tabs";

export const metadata: Metadata = {
  title: "Manage candidates",
  robots: { index: false, follow: false },
};

// Which office kinds a role may manage. This MIRRORS private.candidacy_in_scope
// (0017); the database is still the authority and will refuse anything this
// misses. LG and ward admins are not offered the overlay offices: a federal or
// senatorial constituency is normally larger than their scope.
function manageableKinds(role: string): ConstituencyKind[] {
  switch (role) {
    case "national_admin":
      return ["nation", "state", "lga", "ward", "senatorial_district", "federal_constituency", "state_constituency"];
    case "state_admin":
      return ["state", "lga", "ward", "senatorial_district", "federal_constituency", "state_constituency"];
    case "lg_admin":
      return ["lga", "ward"];
    case "ward_admin":
      return ["ward"];
    default:
      return [];
  }
}

const depthFor = (kind: ConstituencyKind) =>
  kind === "state" ? ("state" as const) : kind === "lga" ? ("lga" as const) : ("ward" as const);

export default async function ManageCandidatesPage({
  searchParams,
}: {
  searchParams: Promise<{ office?: string; state?: string; lga?: string; ward?: string; edit?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role, state_id, lga_id, ward_id").eq("id", user.id).maybeSingle()
    : { data: null };

  const kinds = profile ? manageableKinds(profile.role) : [];
  if (!profile || kinds.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Manage candidates</h1>
        <p className="text-sm text-muted">Your role does not manage candidates.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  const [{ data: offices }, { data: elections }, { data: parties }, { data: mine }] = await Promise.all([
    supabase.from("office_types").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("elections").select("id, name, election_date").eq("is_active", true).order("election_date"),
    supabase.from("parties").select("id, name, acronym").eq("is_active", true).order("acronym"),
    supabase.rpc("candidacies_i_manage"),
  ]);

  const managed = (mine ?? []) as Candidacy[];
  const available = (offices ?? []).filter((o) => kinds.includes(o.constituency_kind));
  const office = available.find((o) => o.id === sp.office) ?? null;

  // A scoped admin's geography is fixed by their own profile; only the levels
  // below their scope are theirs to choose.
  const locked = {
    stateId: profile.state_id ?? undefined,
    lgaId: profile.lga_id ?? undefined,
    wardId: profile.ward_id ?? undefined,
  };

  const kind = office?.constituency_kind as ConstituencyKind | undefined;
  const depth = kind ? depthFor(kind) : "state";
  const chosenGeoId =
    kind === "nation" ? null
    : kind === "state" ? (locked.stateId ?? sp.state ?? null)
    : kind === "lga" ? (locked.lgaId ?? sp.lga ?? null)
    : kind === "ward" ? (locked.wardId ?? sp.ward ?? null)
    : null;

  const officeMap = new Map((offices ?? []).map((o) => [o.id, o]));
  const partyMap = new Map((parties ?? []).map((p) => [p.id, p]));
  const editing = managed.find((c) => c.id === sp.edit) ?? null;

  const whereLabel = await describeGeography(kind, chosenGeoId);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Manage candidates</h1>
      <p className="mt-1 text-sm text-muted">
        Add the candidates your members should know about. You can only manage races inside your own area.
      </p>

      <CandidateTabs showAreas={profile.role === "national_admin"} />

      {/* ── existing ── */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-accent">Candidates you manage</h2>
        {managed.length === 0 ? (
          <p className="mt-3 text-sm text-muted">None yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {managed.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-surface px-4 py-3">
                <span className="text-sm font-semibold text-foreground">{c.full_name}</span>
                <span className="text-xs text-muted">{officeMap.get(c.office_type_id)?.title ?? "Office"}</span>
                {c.party_id ? <span className="text-xs text-muted">{partyMap.get(c.party_id)?.acronym}</span> : null}
                {c.is_endorsed ? <span className="text-xs font-semibold text-accent">Our candidate</span> : null}
                <span className="text-xs text-muted">{c.is_published ? "Visible" : "Draft"}</span>
                <span className="ml-auto flex items-center gap-3">
                  <Link
                    href={`/app/admin/candidates?office=${c.office_type_id}&edit=${c.id}`}
                    className="text-xs font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    Edit
                  </Link>
                  <form action={deleteCandidacy}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" className="text-xs font-semibold text-danger underline-offset-4 hover:underline">
                      Remove
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── pick an office ── */}
      <section className="mt-10">
        <h2 className="text-sm font-semibold text-accent">Add a candidate</h2>
        <form method="get" className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end">
          <label className="flex min-w-0 flex-1 flex-col gap-1.5">
            <span className="text-sm font-semibold text-foreground">Office</span>
            <select
              name="office"
              defaultValue={office?.id ?? ""}
              className="min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring"
            >
              <option value="">Select office…</option>
              {available.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.title}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="min-h-11 shrink-0 rounded-sm border border-border bg-surface-muted px-4 text-sm font-semibold text-foreground hover:bg-border"
          >
            Continue
          </button>
        </form>
      </section>

      {/* ── pick the area, then the details ── */}
      {office && kind ? (
        needsConstituencyData(kind) ? (
          <p className="mt-6 rounded-card border border-border bg-surface-muted p-4 text-sm text-muted">
            {office.title} seats are elected from {KIND_LABEL[kind].toLowerCase()}s. We have not loaded
            INEC&apos;s constituency delimitation yet, so there is nothing to choose from. This unlocks
            once that data is imported.
          </p>
        ) : (
          <>
            {kind !== "nation" ? (
              <section className="mt-6">
                <GeoPicker
                  action="/app/admin/candidates"
                  selection={{ stateId: sp.state, lgaId: sp.lga, wardId: sp.ward }}
                  depth={depth}
                  locked={locked}
                  hiddenFields={{ office: office.id }}
                  submitLabel="Choose area"
                />
              </section>
            ) : null}

            {kind === "nation" || chosenGeoId ? (
              <section className="mt-8 rounded-card border border-border bg-surface p-5">
                <CandidateForm
                  officeTypeId={office.id}
                  officeTitle={office.title}
                  hasRunningMate={office.has_running_mate}
                  runningMateTitle={office.running_mate_title}
                  geoId={chosenGeoId}
                  whereLabel={whereLabel}
                  elections={(elections ?? []).map((e) => ({ id: e.id, label: `${e.name} (${e.election_date})` }))}
                  parties={(parties ?? []).map((p) => ({ id: p.id, label: `${p.acronym} — ${p.name}` }))}
                  existing={
                    editing
                      ? {
                          id: editing.id,
                          full_name: editing.full_name,
                          running_mate_name: editing.running_mate_name,
                          party_id: editing.party_id,
                          slogan: editing.slogan,
                          bio: editing.bio,
                          is_endorsed: editing.is_endorsed,
                          is_published: editing.is_published,
                        }
                      : null
                  }
                  photoUrl={
                    editing?.photo_url
                      ? supabase.storage.from(CANDIDATE_PHOTOS_BUCKET).getPublicUrl(editing.photo_url).data.publicUrl
                      : null
                  }
                />
              </section>
            ) : null}
          </>
        )
      ) : null}
    </main>
  );
}

async function describeGeography(kind: ConstituencyKind | undefined, id: string | null): Promise<string> {
  if (!kind) return "";
  if (kind === "nation") return "Nigeria";
  if (!id) return "";
  const supabase = await createClient();
  if (kind === "state") {
    const { data } = await supabase.from("states").select("name").eq("id", id).maybeSingle();
    return data?.name ?? "";
  }
  if (kind === "lga") {
    const { data } = await supabase.from("lgas").select("name").eq("id", id).maybeSingle();
    return data?.name ?? "";
  }
  if (kind === "ward") {
    const { data } = await supabase.from("wards").select("name").eq("id", id).maybeSingle();
    return data?.name ?? "";
  }
  const { data } = await supabase.from("constituencies").select("name").eq("id", id).maybeSingle();
  return data?.name ?? "";
}
