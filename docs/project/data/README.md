# Nigeria electoral geography — LGAs → Wards → Polling Units

Reference datasets for the **State → LGA → Ward → Polling Unit** hierarchy used by
[CR-0002](../change-requests/0002-polling-units-registration-and-live-count.md).
One directory per state (all 36 states + FCT), each containing
`<state>_polling_units.csv` and `.json`.

## Coverage & totals

**37/37 jurisdictions · 774 LGAs · 8,809 wards · 119,971 polling units.**

The **774** LGA count is exactly Nigeria's official number — confirming every LGA is represented.

| State | LGAs | Wards | Polling units | Source |
|-------|-----:|------:|--------------:|:------|
| Abia | 17 | 184 | 2,675 | 2019-SR |
| Adamawa | 21 | 226 | 2,609 | 2015-INEC |
| Akwa Ibom | 31 | 329 | 2,980 | 2015-INEC |
| Anambra | 21 | 326 | 4,608 | 2015-INEC |
| Bauchi | 20 | 212 | 4,072 | 2015-INEC |
| Bayelsa | 8 | 105 | 1,804 | 2015-INEC |
| Benue | 23 | 276 | 3,687 | 2015-INEC |
| Borno | 27 | 312 | 3,933 | 2015-INEC |
| Cross River | 18 | 193 | 2,283 | 2015-INEC |
| Delta | 25 | 270 | 3,624 | 2019-SR |
| Ebonyi | 13 | 171 | 1,785 | 2015-INEC |
| Edo | 18 | 192 | 2,627 | 2015-INEC |
| Ekiti | 16 | 177 | 2,195 | 2015-INEC |
| Enugu | 17 | 260 | 2,958 | 2015-INEC |
| FCT | 6 | 62 | 562 | 2015-INEC |
| Gombe | 11 | 114 | 2,218 | 2015-INEC |
| Imo | 27 | 305 | 3,523 | 2015-INEC |
| Jigawa | 27 | 287 | 3,527 | 2015-INEC |
| Kaduna | 23 | 255 | 5,101 | 2015-INEC |
| Kano | 44 | 484 | 8,074 | 2015-INEC |
| Katsina | 34 | 361 | 4,901 | 2015-INEC |
| Kebbi | 21 | 225 | 2,398 | 2015-INEC |
| Kogi | 21 | 239 | 2,548 | 2015-INEC |
| Kwara | 16 | 193 | 1,872 | 2015-INEC |
| Lagos | 20 | 245 | 8,462 | 2015-INEC |
| Nasarawa | 13 | 147 | 1,495 | 2015-INEC |
| Niger | 25 | 274 | 3,185 | 2015-INEC |
| Ogun | 20 | 236 | 3,213 | 2015-INEC |
| Ondo | 18 | 203 | 3,009 | 2015-INEC |
| Osun | 30 | 332 | 3,010 | 2015-INEC |
| Oyo | 33 | 351 | 4,783 | 2015-INEC |
| Plateau | 17 | 207 | 2,631 | 2015-INEC |
| Rivers | 23 | 319 | 4,442 | 2015-INEC |
| Sokoto | 23 | 244 | 3,035 | 2015-INEC |
| Taraba | 16 | 168 | 1,912 | 2015-INEC |
| Yobe | 17 | 178 | 1,714 | 2015-INEC |
| Zamfara | 14 | 147 | 2,516 | 2015-INEC |
| **TOTAL** | **774** | **8,809** | **119,971** | |

## Sources

- **2015-INEC** (35 jurisdictions): INEC _Directory of Polling Units_, Revised January 2015 —
  the official per-state PDFs from `inecnigeria.org` (e.g.
  `.../uploads/2019/02/PU_Directory_Revised_January_2015_<State>.pdf`). Extracted programmatically
  with `pdftotext -layout`.
- **2019-SR** (Abia, Delta): INEC's 2015 directory for these two is not published on inecnigeria.org.
  Data instead comes from the **2019 _Registered Voters & Voting Points_** tables mirrored by the
  Situation Room (`situationroomng.org/.../ABIA.pdf`, `.../DELTA.pdf`). This is a **different vintage
  and format** — a flat table keyed by a `STATE/LGA/RA/PU` delimitation code — and it additionally
  carries **`regd_voters`** and **`voting_points`** columns (present only in the Abia/Delta files).

Nothing here is hand-transcribed or model-generated; every row is parsed from the source documents.

## Verification

**2015-INEC states** were cross-checked against INEC's **own** figures inside each PDF:

- The per-ward `TOTAL PUs:` values printed in the document sum to the state total **and** match the
  parsed per-ward counts **in document order**.
- Every LGA matches the PDF's state summary table (# of RAs and # of PUs).
- No duplicate PU codes within any ward; no empty names/fields; multi-line PU names are re-joined.

**2019-SR states (Abia, Delta)** were verified by internal consistency (there is no summary table):

- S/N column is sequential 1..N with no gaps.
- Every `lga_code`/`ward_code` maps 1:1 to a single name; PU codes are contiguous 1..N per ward.
- No duplicate codes; no empty names.

## Known caveats (source quirks, faithfully preserved — not extraction errors)

- **2015 vintage.** The 2015-INEC figures predate INEC's **2022** nationwide PU expansion. The newer
  PUs are only exposed via INEC's online PU Locator / IREV, not a downloadable directory.
- **Bauchi / Jigawa — INEC's own arithmetic.** The state **summary table** disagrees with the sum of
  the **detailed per-ward totals** by a small amount (Bauchi summary = detail **+2**; Jigawa = detail
  **−1**). We use the detailed listing (the actual PUs) as ground truth. Counts above are the detail.
- **Lagos — numbering gaps.** Three Badagry wards skip a PU code in INEC's own numbering (see
  [lagos/README.md](lagos/README.md)). `pu_code` is therefore not guaranteed gapless.
- **Delta — 5 Warri South West (LGA 25) ward labels.** Wards `25/02, 25/03, 25/04, 25/09, 25/10`
  have a mangled source layout (each PU is a distinct Ijaw community with no shared prefix). The
  **ward_code is correct**, but the **ward_name** label for these five may reflect a polling-unit
  location rather than the canonical INEC ward name — **verify these five names manually** before
  relying on them. All PU codes/names and voter counts for these wards are intact.
- **Naming.** INEC codes label two Ogun LGAs "Egbado North/South"; these are today's
  **Yewa North/South**.

## File schema

CSV columns: `state, lga_code, lga_name, ward_code, ward_name, pu_code, pu_name`
(Abia & Delta add `regd_voters, voting_points`). JSON is nested `LGA → ward → polling_units[]`.
Codes are the INEC LGA / RA (ward) / PU codes, zero-padded.

## Importing into the database (T-018)

```bash
node scripts/import-geography.mjs            # all 37 states
node scripts/import-geography.mjs lagos fct  # specific state slug(s)
```

Reads the per-state **JSON** and upserts into `lgas` / `wards` / `polling_units` with the service
role (reference data is world-readable, service-role-write only). Reads `NEXT_PUBLIC_SUPABASE_URL`
and `SUPABASE_SERVICE_ROLE_KEY` from `.env.local`. **Idempotent** — every write is an upsert with
`ignoreDuplicates` on the table's natural key, so re-running is safe and resumes after a failure.

Two schema-driven adjustments (the tables enforce `unique(parent, name)`):

- **Same-named wards in an LGA** collapse to one record — the name-keyed JSON already merges them
  (their polling units are kept). 16 wards nationwide; DB ward total is therefore ~8,793, not 8,809.
- **Same-named polling units in a ward** are disambiguated with a ` [code]` suffix (1,235 rows).
  **No polling unit is dropped** — the DB PU total matches the source's 119,971 exactly.

Verify a run against the totals table above rather than the raw row count.
