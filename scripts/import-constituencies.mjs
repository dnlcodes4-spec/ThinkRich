// Idempotent import of the electoral-constituency overlay (T-031).
//
// Loads docs/project/data/constituencies/*.json into public.constituencies and
// public.constituency_lgas using the service role (reference data is
// world-readable but service-role-write only). Safe to re-run: every write is an
// upsert on the table's natural key.
//
// What lands, and what does not:
//   * All 1,459 constituencies (109 senatorial, 360 federal, 990 state) with
//     their INEC names and codes. Verified against known counts by
//     scripts/extract-constituencies.py.
//   * Senatorial LGA membership ONLY for the states where the three districts
//     partition the state's LGAs exactly. Everything else is left unmapped
//     rather than guessed; see unresolved-review.json.
//
// Usage:  node scripts/import-constituencies.mjs

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const DATA_DIR = "docs/project/data/constituencies";

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

const norm = (s) => String(s).trim().toUpperCase();

const { data: states, error: stErr } = await supabase.from("states").select("id, name");
if (stErr) throw stErr;
const stateIdByName = new Map(states.map((s) => [norm(s.name), s.id]));

const { data: lgas, error: lgErr } = await supabase.from("lgas").select("id, name, state_id");
if (lgErr) throw lgErr;
const lgaIdByKey = new Map(lgas.map((l) => [`${l.state_id}::${norm(l.name)}`, l.id]));

// ── constituencies ──
const rows = JSON.parse(readFileSync(join(DATA_DIR, "constituencies.json"), "utf8"));
const payload = [];
const missingStates = new Set();
for (const r of rows) {
  const stateId = stateIdByName.get(norm(r.state));
  if (!stateId) {
    missingStates.add(r.state);
    continue;
  }
  payload.push({ kind: r.kind, state_id: stateId, name: r.name, code: r.code });
}

for (let i = 0; i < payload.length; i += 500) {
  const chunk = payload.slice(i, i + 500);
  const { error } = await supabase
    .from("constituencies")
    .upsert(chunk, { onConflict: "state_id,kind,name", ignoreDuplicates: true });
  if (error) throw error;
}
console.log(`constituencies: ${payload.length} upserted`);
if (missingStates.size) console.warn("  unmatched states:", [...missingStates]);

// ── senatorial LGA membership ──
const { data: saved, error: cErr } = await supabase
  .from("constituencies")
  .select("id, code")
  .eq("kind", "senatorial_district");
if (cErr) throw cErr;
const conIdByCode = new Map(saved.map((c) => [c.code, c.id]));
const conStateById = new Map(
  payload
    .filter((p) => p.kind === "senatorial_district")
    .map((p) => [conIdByCode.get(p.code), p.state_id]),
);

const links = JSON.parse(readFileSync(join(DATA_DIR, "senatorial-lgas.json"), "utf8"));
const linkPayload = [];
const unmatched = [];
for (const l of links) {
  const conId = conIdByCode.get(l.code);
  const stateId = conStateById.get(conId);
  const lgaId = stateId ? lgaIdByKey.get(`${stateId}::${norm(l.lga)}`) : null;
  if (!conId || !lgaId) {
    unmatched.push(l);
    continue;
  }
  // `kind` is filled by the enforce_constituency_membership trigger.
  linkPayload.push({ constituency_id: conId, lga_id: lgaId, kind: "senatorial_district" });
}

for (let i = 0; i < linkPayload.length; i += 500) {
  const chunk = linkPayload.slice(i, i + 500);
  const { error } = await supabase
    .from("constituency_lgas")
    .upsert(chunk, { onConflict: "constituency_id,lga_id", ignoreDuplicates: true });
  if (error) throw error;
}
console.log(`senatorial LGA links: ${linkPayload.length} upserted`);
if (unmatched.length) console.warn(`  unmatched links: ${unmatched.length}`, unmatched.slice(0, 5));

const review = JSON.parse(readFileSync(join(DATA_DIR, "unresolved-review.json"), "utf8"));
const notVerified = Object.keys(review.states_not_verified ?? {});
console.log(
  `\nStates WITHOUT senatorial LGA mapping (${notVerified.length}/37): ${notVerified.join(", ")}`,
);
console.log("Senate races resolve for members only in the mapped states. See");
console.log(`${DATA_DIR}/unresolved-review.json before extending this.`);
