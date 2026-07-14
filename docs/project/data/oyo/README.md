# Oyo State electoral geography (LGAs → Wards → Polling Units)

Reference dataset for the **State → LGA → Ward → Polling Unit** hierarchy used by
[CR-0002](../../change-requests/0002-polling-units-registration-and-live-count.md).
Companion to [../ogun/](../ogun/), [../lagos/](../lagos/), [../ekiti/](../ekiti/).

## Files

| File | Description |
|------|-------------|
| `oyo_polling_units.csv` | Flat rows: `state, lga_code, lga_name, ward_code, ward_name, pu_code, pu_name` |
| `oyo_polling_units.json` | Nested `LGA → ward → polling_units[]` (each with `code`, `name`) |

## Source (authoritative)

**INEC — _Directory of Polling Units_, Oyo State, Revised January 2015.**
`https://www.inecnigeria.org/wp-content/uploads/2019/02/PU_Directory_Revised_January_2015_Oyo.pdf`

Extracted programmatically from the PDF (`pdftotext -layout`), not hand-transcribed or
model-generated.

## Totals

| | Count |
|---|---|
| LGAs | **33** |
| Wards (Registration Areas) | **351** |
| Polling units | **4,783** |

## Verification performed

Cross-checked against INEC's **own** figures in the same PDF:

- The 351 per-ward `TOTAL PUs:` values printed in the PDF **sum to 4,783**, and each matches the
  parsed per-ward row count **in document order**.
- All 33 LGAs match the PDF's state summary table on both **# of RAs** and **# of PUs**.
- Every ward's polling-unit codes run **contiguously 1..N**.
- **No duplicate codes** within any ward; no empty names or fields.
- JSON and CSV are mutually consistent (33 / 351 / 4,783).

## Important caveat — 2015 delimitation, not post-2022

Reflects the **4,783** polling units as of the **January 2015** revision. INEC's **2022** nationwide
expansion added polling units not captured here; the new PUs are not published as a single
downloadable named directory (only via the online PU Locator / IREV). Source separately and update
this file if the post-2022 set is required.
