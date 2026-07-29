import { createClient } from "@/lib/supabase/server";

export type GeoDepth = "state" | "lga" | "ward" | "polling_unit";
export type GeoSelection = { stateId?: string; lgaId?: string; wardId?: string; pollingUnitId?: string };

const ORDER: GeoDepth[] = ["state", "lga", "ward", "polling_unit"];
const reaches = (depth: GeoDepth, level: GeoDepth) => ORDER.indexOf(depth) >= ORDER.indexOf(level);

// A plain GET form: pick state, then LGA, then ward, then polling unit, down to
// `depth`. Submitting reloads the page with the choice in the URL, so it works
// without client JS and a selection is linkable.
//
// `locked` comes from the caller's OWN profile scope. A state admin has their
// state locked, so they never even see other states. A NATIONAL admin has
// nothing locked and gets the full cascade, which is the point: their scope is
// the country (see security-model.md).
export async function GeoPicker({
  action,
  selection,
  depth,
  locked,
  hiddenFields = {},
  submitLabel = "Show",
}: {
  action: string;
  selection: GeoSelection;
  depth: GeoDepth;
  locked: GeoSelection;
  hiddenFields?: Record<string, string>;
  submitLabel?: string;
}) {
  const supabase = await createClient();

  const stateId = locked.stateId ?? selection.stateId;
  const lgaId = locked.lgaId ?? selection.lgaId;
  const wardId = locked.wardId ?? selection.wardId;
  const puId = locked.pollingUnitId ?? selection.pollingUnitId;

  const [states, lgas, wards, units] = await Promise.all([
    locked.stateId ? null : supabase.from("states").select("id, name").order("name").then((r) => r.data ?? []),
    reaches(depth, "lga") && stateId && !locked.lgaId
      ? supabase.from("lgas").select("id, name").eq("state_id", stateId).order("name").then((r) => r.data ?? [])
      : null,
    reaches(depth, "ward") && lgaId && !locked.wardId
      ? supabase.from("wards").select("id, name").eq("lga_id", lgaId).order("name").then((r) => r.data ?? [])
      : null,
    reaches(depth, "polling_unit") && wardId && !locked.pollingUnitId
      ? supabase.from("polling_units").select("id, name").eq("ward_id", wardId).order("name").then((r) => r.data ?? [])
      : null,
  ]);

  const selectClass =
    "min-h-11 w-full rounded-sm border border-border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring";

  const field = (
    name: string,
    label: string,
    options: { id: string; name: string }[] | null,
    current: string | undefined,
    include: boolean,
  ) => {
    if (!include) return null;
    if (!options) return current ? <input key={name} type="hidden" name={name} value={current} /> : null;
    return (
      <label key={name} className="flex min-w-0 flex-1 flex-col gap-1.5">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <select name={name} defaultValue={current ?? ""} className={selectClass}>
          <option value="">Select {label.toLowerCase()}…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    );
  };

  return (
    <form method="get" action={action} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
      {Object.entries(hiddenFields).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      {field("state", "State", states, stateId, true)}
      {field("lga", "LGA", lgas, lgaId, reaches(depth, "lga"))}
      {field("ward", "Ward", wards, wardId, reaches(depth, "ward"))}
      {field("pu", "Polling unit", units, puId, reaches(depth, "polling_unit"))}
      <button
        type="submit"
        className="min-h-11 shrink-0 rounded-sm border border-border bg-surface-muted px-4 text-sm font-semibold text-foreground hover:bg-border"
      >
        {submitLabel}
      </button>
    </form>
  );
}
