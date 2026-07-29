import type { Database } from "@/lib/database.types";

export type OfficeType = Database["public"]["Tables"]["office_types"]["Row"];
export type Candidacy = Database["public"]["Tables"]["candidacies"]["Row"];
export type ConstituencyKind = Database["public"]["Enums"]["constituency_kind"];

export const CANDIDATE_PHOTOS_BUCKET = "candidate-photos";

// Which geography column a candidacy fills, decided entirely by the office. The
// database enforces this too (private.enforce_candidacy_scope); this is the UI
// mirroring it, never the authority. See ADR-0013.
export type ScopeField = "state_id" | "lga_id" | "ward_id" | "constituency_id" | null;

export function scopeFieldFor(kind: ConstituencyKind): ScopeField {
  switch (kind) {
    case "nation":
      return null;
    case "state":
      return "state_id";
    case "lga":
      return "lga_id";
    case "ward":
      return "ward_id";
    default:
      return "constituency_id";
  }
}

export const KIND_LABEL: Record<ConstituencyKind, string> = {
  nation: "Nigeria",
  state: "State",
  lga: "LGA",
  ward: "Ward",
  senatorial_district: "Senatorial district",
  federal_constituency: "Federal constituency",
  state_constituency: "State constituency",
};

// The three kinds that need INEC delimitation data we do not hold yet (T-030).
// Surfaces that offer these offices must say so rather than show an empty list.
export function needsConstituencyData(kind: ConstituencyKind): boolean {
  return (
    kind === "senatorial_district" ||
    kind === "federal_constituency" ||
    kind === "state_constituency"
  );
}

export function scopeValuesFor(
  kind: ConstituencyKind,
  ids: { stateId?: string | null; lgaId?: string | null; wardId?: string | null; constituencyId?: string | null },
): Pick<Candidacy, "state_id" | "lga_id" | "ward_id" | "constituency_id"> {
  const empty = { state_id: null, lga_id: null, ward_id: null, constituency_id: null };
  const field = scopeFieldFor(kind);
  if (!field) return empty;
  const value =
    field === "state_id" ? ids.stateId
    : field === "lga_id" ? ids.lgaId
    : field === "ward_id" ? ids.wardId
    : ids.constituencyId;
  return { ...empty, [field]: value ?? null };
}
