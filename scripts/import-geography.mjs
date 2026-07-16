// One-time (idempotent) geography import: loads the per-state polling-unit JSON in
// docs/project/data/<state>/<state>_polling_units.json into public.lgas / wards /
// polling_units using the service role (reference data is world-readable but
// service-role-write only). Safe to re-run: every write uses upsert with
// ignoreDuplicates on the table's natural unique key.
//
// Usage:  node scripts/import-geography.mjs [state-slug ...]
//         (no args = all 37 states)

import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DATA_DIR = "docs/project/data";

// --- env (parse .env.local; standalone node doesn't load it) ---
const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const DIR_OVERRIDE = { fct: "Federal Capital Territory" };

// --- state slug -> id ---
const { data: states, error: stErr } = await supabase.from("states").select("id, name");
if (stErr) throw stErr;
const stateBySlug = new Map(states.map((s) => [slug(s.name), s.id]));
const stateIdForDir = (dir) => stateBySlug.get(slug(DIR_OVERRIDE[dir] ?? dir));

// Retry on transient failures (e.g. "fetch failed") with linear backoff.
async function withRetry(label, fn) {
  let lastErr;
  for (let attempt = 1; attempt <= 6; attempt++) {
    try {
      const res = await fn();
      if (res?.error) throw new Error(res.error.message);
      return res;
    } catch (e) {
      lastErr = e;
      if (attempt < 6) await new Promise((r) => setTimeout(r, attempt * 1000));
    }
  }
  throw new Error(`${label} failed after retries: ${lastErr?.message ?? lastErr}`);
}

async function upsertIgnore(table, rows, onConflict) {
  for (let i = 0; i < rows.length; i += 1000) {
    const chunk = rows.slice(i, i + 1000);
    await withRetry(`upsert ${table}`, () =>
      supabase.from(table).upsert(chunk, { onConflict, ignoreDuplicates: true }),
    );
  }
}

// De-duplicate names within a parent (the schema requires unique names per parent);
// real INEC data has occasional repeats, which we disambiguate with the code.
function dedupeByName(items) {
  const seen = new Set();
  return items.map(({ name, code }) => {
    let n = name;
    if (seen.has(n)) n = `${name} [${code}]`;
    let k = 2;
    while (seen.has(n)) n = `${name} [${code}-${k++}]`;
    seen.add(n);
    return { name: n, code };
  });
}

const targets = process.argv.slice(2);
const dirs = (targets.length ? targets : readdirSync(DATA_DIR))
  .filter((d) => existsSync(join(DATA_DIR, d, `${d}_polling_units.json`)));

let totals = { lgas: 0, wards: 0, pus: 0 };

for (const dir of dirs) {
  const stateId = stateIdForDir(dir);
  if (!stateId) {
    console.warn(`! skip ${dir}: no matching state`);
    continue;
  }
  const data = JSON.parse(readFileSync(join(DATA_DIR, dir, `${dir}_polling_units.json`), "utf8"));

  // LGAs
  const lgaEntries = Object.entries(data); // [lgaName, {code, wards}]
  const lgaRows = dedupeByName(lgaEntries.map(([name, v]) => ({ name, code: v.code }))).map((r) => ({
    state_id: stateId,
    name: r.name,
    code: r.code,
  }));
  await upsertIgnore("lgas", lgaRows, "state_id,name");
  const { data: lgaDb } = await withRetry("select lgas", () =>
    supabase.from("lgas").select("id, name").eq("state_id", stateId),
  );
  const lgaId = new Map(lgaDb.map((l) => [l.name, l.id]));

  let sWards = 0;
  let sPus = 0;
  // Re-derive the (possibly de-duplicated) LGA names in the same order.
  const lgaNamesDeduped = lgaRows.map((r) => r.name);
  for (let li = 0; li < lgaEntries.length; li++) {
    const [, lgaVal] = lgaEntries[li];
    const parentLgaId = lgaId.get(lgaNamesDeduped[li]);
    if (!parentLgaId) throw new Error(`missing lga id for ${dir} ${lgaNamesDeduped[li]}`);

    const wardEntries = Object.entries(lgaVal.wards ?? {}); // [wardName, {code, polling_units}]
    const wardRows = dedupeByName(wardEntries.map(([name, v]) => ({ name, code: v.code }))).map(
      (r) => ({ lga_id: parentLgaId, name: r.name }),
    );
    await upsertIgnore("wards", wardRows, "lga_id,name");
    const { data: wardDb } = await withRetry("select wards", () =>
      supabase.from("wards").select("id, name").eq("lga_id", parentLgaId),
    );
    const wardId = new Map(wardDb.map((w) => [w.name, w.id]));
    sWards += wardRows.length;

    const wardNamesDeduped = wardRows.map((r) => r.name);
    const puRows = [];
    for (let wi = 0; wi < wardEntries.length; wi++) {
      const [, wardVal] = wardEntries[wi];
      const parentWardId = wardId.get(wardNamesDeduped[wi]);
      if (!parentWardId) throw new Error(`missing ward id for ${dir} ${wardNamesDeduped[wi]}`);
      const pus = dedupeByName((wardVal.polling_units ?? []).map((p) => ({ name: p.name, code: p.code })));
      for (const p of pus) puRows.push({ ward_id: parentWardId, name: p.name, code: p.code });
    }
    await upsertIgnore("polling_units", puRows, "ward_id,name");
    sPus += puRows.length;
  }

  totals.lgas += lgaRows.length;
  totals.wards += sWards;
  totals.pus += sPus;
  console.log(`✓ ${dir}: ${lgaRows.length} LGAs, ${sWards} wards, ${sPus} PUs`);
}

console.log(`\nDone. Source rows processed: ${totals.lgas} LGAs, ${totals.wards} wards, ${totals.pus} PUs`);
