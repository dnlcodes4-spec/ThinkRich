import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/app-shell/icons";

export const metadata: Metadata = {
  title: "Geography",
  robots: { index: false, follow: false },
};

type Params = { state?: string; lga?: string; ward?: string; q?: string };

// A read-only drill-down through the geography reference data (states -> LGAs ->
// wards -> polling units), so a National Coordinator can eyeball that the import
// is complete and correct. Geography is world-readable to signed-in users (RLS);
// this page is gated to national admins because it spans the whole country.
export default async function GeographyPage({ searchParams }: { searchParams: Promise<Params> }) {
  const { state, lga, ward, q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim().replace(/[%,()*\\]/g, "").slice(0, 60);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (me?.role !== "national_admin") {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-4 px-6 py-16">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Geography</h1>
        <p className="text-sm text-muted">This area is for the National Coordinator.</p>
        <Link href="/app" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to your area
        </Link>
      </main>
    );
  }

  // Names for the breadcrumb (only for the levels currently drilled into).
  const [stateRow, lgaRow, wardRow] = await Promise.all([
    state ? supabase.from("states").select("name").eq("id", state).maybeSingle() : Promise.resolve({ data: null }),
    lga ? supabase.from("lgas").select("name").eq("id", lga).maybeSingle() : Promise.resolve({ data: null }),
    ward ? supabase.from("wards").select("name").eq("id", ward).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const tally = (rows: { k: string | null }[] | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.k) m.set(r.k, (m.get(r.k) ?? 0) + 1);
    return m;
  };
  const href = (p: Params) => {
    const sp = new URLSearchParams();
    if (p.state) sp.set("state", p.state);
    if (p.lga) sp.set("lga", p.lga);
    if (p.ward) sp.set("ward", p.ward);
    const s = sp.toString();
    return s ? `/app/geography?${s}` : "/app/geography";
  };

  // Resolve the current level and its rows.
  type Level = "states" | "lgas" | "wards" | "polling_units";
  let level: Level;
  let rows: { id: string; name: string; code?: string | null; childCount?: number; active?: boolean; href?: string }[] = [];
  let childNoun = "";

  if (ward) {
    level = "polling_units";
    childNoun = "polling unit";
    let qy = supabase.from("polling_units").select("id, name, code").eq("ward_id", ward);
    if (q) qy = qy.ilike("name", `%${q}%`);
    const { data } = await qy.order("name").limit(2000);
    rows = (data ?? []).map((r) => ({ id: r.id, name: r.name, code: r.code }));
  } else if (lga) {
    level = "wards";
    childNoun = "ward";
    let qy = supabase.from("wards").select("id, name").eq("lga_id", lga);
    if (q) qy = qy.ilike("name", `%${q}%`);
    const { data } = await qy.order("name").limit(2000);
    const wards = data ?? [];
    const { data: pu } = wards.length
      ? await supabase.from("polling_units").select("ward_id").in("ward_id", wards.map((w) => w.id))
      : { data: [] };
    const puBy = tally((pu ?? []).map((r) => ({ k: r.ward_id })));
    rows = wards.map((w) => ({ id: w.id, name: w.name, childCount: puBy.get(w.id) ?? 0, href: href({ state, lga, ward: w.id }) }));
  } else if (state) {
    level = "lgas";
    childNoun = "LGA";
    let qy = supabase.from("lgas").select("id, name, code").eq("state_id", state);
    if (q) qy = qy.ilike("name", `%${q}%`);
    const { data } = await qy.order("name").limit(2000);
    const lgas = data ?? [];
    const { data: wd } = lgas.length
      ? await supabase.from("wards").select("lga_id").in("lga_id", lgas.map((l) => l.id))
      : { data: [] };
    const wdBy = tally((wd ?? []).map((r) => ({ k: r.lga_id })));
    rows = lgas.map((l) => ({ id: l.id, name: l.name, code: l.code, childCount: wdBy.get(l.id) ?? 0, href: href({ state, lga: l.id }) }));
  } else {
    level = "states";
    childNoun = "state";
    let qy = supabase.from("states").select("id, name, code, is_active");
    if (q) qy = qy.ilike("name", `%${q}%`);
    const { data } = await qy.order("name");
    const states = data ?? [];
    const { data: lgd } = await supabase.from("lgas").select("state_id");
    const lgBy = tally((lgd ?? []).map((r) => ({ k: r.state_id })));
    rows = states.map((s) => ({ id: s.id, name: s.name, code: s.code, active: s.is_active, childCount: lgBy.get(s.id) ?? 0, href: href({ state: s.id }) }));
  }

  const childLabel: Record<Level, string> = {
    states: "LGAs",
    lgas: "wards",
    wards: "polling units",
    polling_units: "",
  };

  const crumbs = [
    { label: "Nigeria", href: href({}) },
    ...(state ? [{ label: stateRow.data?.name ?? "State", href: href({ state }) }] : []),
    ...(lga ? [{ label: lgaRow.data?.name ?? "LGA", href: href({ state, lga }) }] : []),
    ...(ward ? [{ label: wardRow.data?.name ?? "Ward", href: href({ state, lga, ward }) }] : []),
  ];

  const count = rows.length;
  const capped = count >= 2000;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">Geography</h1>
      <p className="mt-1 text-sm text-muted">
        Browse the imported geography to check it is complete and correct.
      </p>

      <nav aria-label="Breadcrumb" className="mt-6 flex flex-wrap items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <span key={c.href} className="flex items-center gap-1.5">
              {i > 0 ? <Icon name="chevron" className="size-4 -rotate-90 text-muted" /> : null}
              {last ? (
                <span className="font-semibold text-foreground">{c.label}</span>
              ) : (
                <Link href={c.href} className="text-primary underline-offset-4 hover:underline">
                  {c.label}
                </Link>
              )}
            </span>
          );
        })}
      </nav>

      <p className="mt-4 text-sm text-muted">
        {capped ? "2,000+" : count.toLocaleString("en-NG")} {count === 1 ? childNoun : `${childNoun}s`}
        {q ? <> matching &ldquo;{q}&rdquo;</> : null}
        {level !== "polling_units" && !q ? (
          <> &middot; each shows its number of {childLabel[level]}</>
        ) : null}
        .
      </p>

      <form method="get" className="mt-3 flex flex-wrap gap-2">
        {state ? <input type="hidden" name="state" value={state} /> : null}
        {lga ? <input type="hidden" name="lga" value={lga} /> : null}
        {ward ? <input type="hidden" name="ward" value={ward} /> : null}
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder={`Search ${childNoun}s by name`}
          aria-label={`Search ${childNoun}s`}
          className="min-h-11 flex-1 rounded-md border border-border bg-surface px-3 text-base text-foreground placeholder:text-muted focus:outline-2 focus:outline-offset-1 focus:outline-ring"
        />
        <button type="submit" className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover">
          Search
        </button>
        {q ? (
          <Link href={href({ state, lga, ward })} className="inline-flex min-h-11 items-center justify-center rounded-md border border-ring px-4 text-sm font-semibold text-foreground transition-colors hover:bg-surface-muted">
            Clear
          </Link>
        ) : null}
      </form>

      {count === 0 ? (
        <div className="mt-8 rounded-card border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted">
            {q ? `No ${childNoun}s match “${q}”.` : `No ${childNoun}s found.`}
          </p>
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-border rounded-card border border-border">
          {rows.map((r) => {
            const inner = (
              <>
                <div className="flex min-w-0 items-center gap-2.5">
                  {r.code ? (
                    <span className="shrink-0 rounded bg-surface-muted px-1.5 py-0.5 font-mono text-xs text-muted">
                      {r.code}
                    </span>
                  ) : null}
                  <span className="truncate text-sm font-medium text-foreground">{r.name}</span>
                  {r.active ? (
                    <span className="shrink-0 rounded-full border border-success/30 bg-success-soft px-2 py-0.5 text-xs font-bold text-success">
                      Active
                    </span>
                  ) : null}
                </div>
                {r.href ? (
                  <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
                    {r.childCount?.toLocaleString("en-NG")} {childLabel[level]}
                    <Icon name="chevron" className="size-4 -rotate-90" />
                  </span>
                ) : null}
              </>
            );
            return (
              <li key={r.id}>
                {r.href ? (
                  <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-surface-muted">
                    {inner}
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 px-4 py-3">{inner}</div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {capped ? (
        <p className="mt-3 text-xs text-muted">Showing the first 2,000. Use search to narrow down.</p>
      ) : null}
    </main>
  );
}
