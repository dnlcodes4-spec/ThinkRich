# Lagos State electoral geography (LGAs → Wards → Polling Units)

Reference dataset for the **State → LGA → Ward → Polling Unit** hierarchy used by
[CR-0002](../../change-requests/0002-polling-units-registration-and-live-count.md).
Companion to [../ogun/](../ogun/), [../oyo/](../oyo/), [../ekiti/](../ekiti/).

## Files

| File | Description |
|------|-------------|
| `lagos_polling_units.csv` | Flat rows: `state, lga_code, lga_name, ward_code, ward_name, pu_code, pu_name` |
| `lagos_polling_units.json` | Nested `LGA → ward → polling_units[]` (each with `code`, `name`) |

## Source (authoritative)

**INEC — _Directory of Polling Units_, Lagos State, Revised January 2015.**
`https://www.inecnigeria.org/wp-content/uploads/2019/02/PU_Directory_Revised_January_2015_Lagos.pdf`

Extracted programmatically from the PDF (`pdftotext -layout`), not hand-transcribed or
model-generated.

## Totals

| | Count |
|---|---|
| LGAs | **20** |
| Wards (Registration Areas) | **245** |
| Polling units | **8,462** |

## Verification performed

Cross-checked against INEC's **own** figures in the same PDF:

- The 245 per-ward `TOTAL PUs:` values printed in the PDF **sum to 8,462**, and each matches the
  parsed per-ward row count **in document order**.
- All 20 LGAs match the PDF's state summary table on both **# of RAs** and **# of PUs**.
- **No duplicate codes** within any ward; no empty names or fields.
- JSON and CSV are mutually consistent (20 / 245 / 8,462).

### Note on non-contiguous PU codes (this is correct, not a bug)

Three wards in **Badagry** LGA have gaps in INEC's own polling-unit numbering — the PDF itself skips
a code:

| Ward | Declared PUs | Numbering |
|------|--------------|-----------|
| Keta-East (05) | 30 | 001–025, **027–031** (026 skipped) |
| Ikoga (09) | 11 | 001–010, **012** (011 skipped) |
| Iya-Afin (11) | 8 | **002–009** (001 skipped) |

These gaps are present in the source PDF and were preserved verbatim; the per-ward row counts still
equal INEC's declared totals (30 / 11 / 8), so **no rows were dropped or invented**. If a synthetic
sequential index is needed downstream, generate it separately — do not assume `pu_code` is gapless.

## Important caveat — 2015 delimitation, not post-2022

Reflects the **8,462** polling units as of the **January 2015** revision. INEC's **2022** nationwide
expansion added polling units not captured here; the new PUs are not published as a single
downloadable named directory (only via the online PU Locator / IREV). Source separately and update
this file if the post-2022 set is required.
