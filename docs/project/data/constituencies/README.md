# Nigeria electoral constituencies (the overlay)

The **senatorial districts, federal constituencies and state constituencies** that Senate, House of
Representatives and State Assembly seats are elected from (T-031, [CR-0007](../../change-requests/0007-full-elective-office-coverage.md),
[ADR-0013](../../../architecture/decisions/0013-elective-office-catalogue.md)).

This is a **separate overlay** on the geography tree, not a level of it. A federal constituency is
built from whole wards and may split a populous LGA (Lagos has 20 LGAs but 24 federal
constituencies), so it cannot be derived from `ward.lga_id`. See
[the research](../../nigeria-elective-offices.md#32-the-overlay-that-does-not-nest-read-this-before-modelling).

## Coverage

| | Rows | LGA membership |
|---|---:|---|
| Senatorial districts | **109** | **22 of 37 states** mapped (427 LGA links) |
| Federal constituencies | **360** | none yet |
| State constituencies | **990** | none yet, and not derivable from this source |
| **Total** | **1,459** | |

**5,017 of 8,793 wards** currently resolve to a senatorial district. Senate races appear for members
in the mapped states and nowhere else. Reps and State Assembly races cannot resolve for anyone yet:
the constituencies exist and an admin can attach candidates to them, but no member's ward maps to
one, so `candidacies_for_geography()` will not return them.

## Source

**INEC, _Name of Senatorial Districts, Federal and State Constituencies Nationwide_**
`https://www.inecnigeria.org/wp-content/uploads/2019/02/Name-of-Senatorial-DistrictsFederal-and-State-Constituencies-Nationwide-1.xls`
Excel 97-2003, authored 2010-12-15, last saved 2011-03-10.

Extracted programmatically by [`scripts/extract-constituencies.py`](../../../../scripts/extract-constituencies.py).
Nothing is hand-transcribed or model-generated. Every name and code is read from that workbook.

**Vintage matters.** The workbook is from 2010/2011. Senatorial districts and federal
constituencies have not been redelimited since 1996, so those are current. The state-constituency
sheet lists **990**; INEC ran the 2023 election on **993**. Treat the state-constituency list as
close but not authoritative for the current cycle.

## Verification

The parse is checked against facts known independently of the workbook, and the extractor exits
non-zero if any fail:

- Senatorial: 109 rows, **exactly 3 per state and 1 for the FCT**.
- Federal: 360 rows, with FCT = 2, Lagos = 24, Kano = 24.
- State: every state within the constitutional **24 to 40** (s.91), and the **FCT absent** (it has
  no House of Assembly).
- No duplicate codes.

**LGA membership uses a stronger check.** A state's three senatorial districts must **partition
that state's LGAs exactly**: every LGA claimed once, none left over, none claimed twice. Only
states that pass are written to `senatorial-lgas.json`. 22 of 37 pass. The other 15 are left
unmapped rather than half-mapped, because a wrong mapping would silently show a member the wrong
senator.

## Why 15 states are unmapped

Not missing data: **name drift**. Our `lgas` table comes from INEC's *2015* polling-unit directory,
this workbook is from *2010*, and the two spell the same LGA differently:

| This workbook (2010) | Our `lgas` table (2015) |
|---|---|
| `OHAFIA` | `ISIAMA OHAFIA` |
| `ESIT EKET` | `ESIT EKET (UQUO)` |
| `SAPELE` | `SAPELE SAPELE` |
| `YALA` | `YALA CROSS` |
| `K/HAUSA` | `KAFIN HAUSA` |
| `DAWAKIN` | `DAWAKI KUDU` **or** `DAWAKI TOFA` (genuinely ambiguous) |

Finishing this means a **reviewed alias table** for roughly 40 to 60 LGA names, confirmed by a
human against INEC's own list. The extractor already produces the shortlist.

## Files

| File | Contents |
|---|---|
| `constituencies.json` | All 1,459: `kind`, `state`, `name`, `code`, and INEC's raw `composition` text |
| `senatorial-lgas.json` | 427 verified links, keyed by **state + LGA name** (not by our UUIDs, so it imports into any environment) |
| `unresolved-review.json` | Every close (non-exact) match with its score, plus each unverified state and the names that defeated it. **Start here to extend coverage.** |

## Regenerating and importing

```bash
python3 -m venv .venv && .venv/bin/pip install xlrd
.venv/bin/python scripts/extract-constituencies.py <path-to.xls> docs/project/data/constituencies

node scripts/import-constituencies.mjs     # idempotent upserts, service role
```

The extractor needs a `lgas.json` (`[{state, lga, id}]`) in the output directory to do the LGA
matching; without it, it still emits the constituency list and skips membership. It is not
committed because it is a dump of our own database.

## What would complete this

1. **The alias table** above, unlocking senatorial mapping for the remaining 15 states.
2. **Federal constituency membership.** The workbook's `composition` is prose ("The entire
   Geographical Areas of Aba North and Aba South L.G.As") and the constituency *name* is usually
   the slash-joined LGA names, so both are parseable, but each needs the same reviewed matching.
3. **State constituency membership.** Not possible from this source: its `composition` says only
   "Part of the LGA", "The entire LGA" or "Ward 01 – 06" and never names the LGA. This needs INEC's
   ward-level delimitation, a different document.
