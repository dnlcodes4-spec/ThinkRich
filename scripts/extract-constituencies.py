#!/usr/bin/env python3
"""Extract Nigeria's electoral constituencies from INEC's own workbook (T-031).

Source
------
INEC, "Name of Senatorial Districts, Federal and State Constituencies Nationwide"
https://www.inecnigeria.org/wp-content/uploads/2019/02/Name-of-Senatorial-DistrictsFederal-and-State-Constituencies-Nationwide-1.xls
(Excel 97-2003, authored 2010-12-15, last saved 2011-03-10.)

Nothing here is hand-transcribed or model-generated: every constituency name and
code is read from that workbook. Where a name in the workbook has to be matched
against an LGA in our database, the match is either exact or a deterministic
close-match that is written to `unresolved-review.json` for a human to confirm.

Why the workbook is awkward
---------------------------
It is a hand-made spreadsheet. State headers sit in column A on some sheets and
column D on others, and appear variously as "ADAMAWA", "  BENUE", "ABIA," and
"AKWA - IBOM". Three state-constituency codes are missing a slash
("SC/076GM"). The parser is deliberately tolerant of all of this and then
validates the result against facts that are independently known.

Usage
-----
    python3 -m venv .venv && .venv/bin/pip install xlrd
    .venv/bin/python scripts/extract-constituencies.py <path-to.xls> <out-dir>
"""

from __future__ import annotations

import collections
import difflib
import json
import re
import sys
from pathlib import Path

import xlrd  # type: ignore

CANON_STATES = {
    "ABIA", "ADAMAWA", "AKWA IBOM", "ANAMBRA", "BAUCHI", "BAYELSA", "BENUE", "BORNO",
    "CROSS RIVER", "DELTA", "EBONYI", "EDO", "EKITI", "ENUGU", "GOMBE", "IMO", "JIGAWA",
    "KADUNA", "KANO", "KATSINA", "KEBBI", "KOGI", "KWARA", "LAGOS", "NASARAWA", "NIGER",
    "OGUN", "ONDO", "OSUN", "OYO", "PLATEAU", "RIVERS", "SOKOTO", "TARABA", "YOBE", "ZAMFARA",
}
STATE_ALIASES = {
    "NASSARAWA": "NASARAWA",
    "FCT": "FCT", "F C T": "FCT", "FCT ABUJA": "FCT", "ABUJA": "FCT",
    "FEDERAL CAPITAL TERRITORY": "FCT",
}
# Our `states` table spells the FCT out in full.
DB_STATE_NAME = {"FCT": "FEDERAL CAPITAL TERRITORY"}

SHEETS = {
    "senatorial_district": "SEN. DIST.",
    "federal_constituency": "FED. CONST.",
    "state_constituency": "STATE CONST.",
}
# Codes look like SD/001/AB, FC/001/AB, SC/01/AB. Three rows in the source drop
# the final slash, so it is optional here.
CODE_RE = re.compile(r"^(SC|FC|SD)\s*/\s*\d{1,3}\s*/?\s*[A-Z]{0,3}$", re.I)


def squash(value) -> str:
    return re.sub(r"\s+", " ", str(value)).strip()


def canon_state(value) -> str | None:
    """A header cell to a canonical state, tolerating punctuation and spacing."""
    text = re.sub(r"[^A-Z ]", " ", squash(value).upper())
    text = re.sub(r"\s+", " ", text).strip()
    if text in CANON_STATES:
        return text
    return STATE_ALIASES.get(text)


def norm_lga(value) -> str:
    """Normalise an LGA name for comparison (compass words to initials)."""
    text = str(value).upper().replace("&", " AND ")
    text = re.sub(r"\bL\.?\s?[GA]\.?\s?A\.?S?\b", " ", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    for word, initial in (("NORTH", "N"), ("SOUTH", "S"), ("EAST", "E"),
                          ("WEST", "W"), ("CENTRAL", "C")):
        text = re.sub(rf"\b{word}\b", initial, text)
    return re.sub(r"\s+", " ", text).strip()


def parse_sheet(book, sheet_name: str) -> list[dict]:
    sheet = book.sheet_by_name(sheet_name)
    rows: list[dict] = []
    current_state: str | None = None
    for r in range(sheet.nrows):
        cells = [squash(sheet.cell_value(r, c)) for c in range(sheet.ncols)]
        code_index = next((i for i, c in enumerate(cells) if CODE_RE.match(c)), None)
        if code_index is None:
            # No code on this row, so it may be a state header. Headers appear in
            # different columns across sheets, so check every cell.
            for cell in cells:
                state = canon_state(cell)
                if state:
                    current_state = state
                    break
            continue
        name = cells[code_index - 1] if code_index > 0 else ""
        if not name or re.fullmatch(r"[\d.]+", name):
            continue
        rows.append({
            "state": current_state,
            "name": name,
            "code": cells[code_index].upper().replace(" ", ""),
            "composition": cells[code_index + 1] if code_index + 1 < len(cells) else "",
        })
    return rows


def split_composition(text: str) -> list[str]:
    """Senatorial composition is COMMA separated.

    Never split on '/': plenty of real LGAs contain one (ASKIRA/UBA,
    KOLOKUMA/OPOKUMA, URUE OFFONG/ORUKO), and splitting there invents LGAs that
    do not exist.
    """
    cleaned = re.sub(r"\bL\.?\s?[GA]\.?\s?A\.?S?\b", " ", str(text).upper())
    parts = re.split(r",|\s+&\s+|\s+AND\s+", cleaned)
    return [p.strip(" .") for p in parts if p.strip(" .")]


def main() -> int:
    if len(sys.argv) < 3:
        print(__doc__)
        return 2
    xls_path, out_dir = Path(sys.argv[1]), Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)

    book = xlrd.open_workbook(str(xls_path))
    parsed = {kind: parse_sheet(book, sheet) for kind, sheet in SHEETS.items()}

    # ── validate the parse against independently known facts ──
    problems: list[str] = []
    sd_by_state = collections.Counter(r["state"] for r in parsed["senatorial_district"])
    if len(parsed["senatorial_district"]) != 109:
        problems.append(f"senatorial: {len(parsed['senatorial_district'])} rows, expected 109")
    for state, n in sd_by_state.items():
        expected = 1 if state == "FCT" else 3
        if n != expected:
            problems.append(f"senatorial: {state} has {n}, expected {expected}")
    if len(parsed["federal_constituency"]) != 360:
        problems.append(f"federal: {len(parsed['federal_constituency'])} rows, expected 360")
    fc_by_state = collections.Counter(r["state"] for r in parsed["federal_constituency"])
    for state, expected in (("FCT", 2), ("LAGOS", 24), ("KANO", 24)):
        if fc_by_state.get(state) != expected:
            problems.append(f"federal: {state} has {fc_by_state.get(state)}, expected {expected}")
    sc_by_state = collections.Counter(r["state"] for r in parsed["state_constituency"])
    for state, n in sc_by_state.items():
        # Constitution s.91: a House of Assembly has 24 to 40 members.
        if not (24 <= n <= 40):
            problems.append(f"state constituency: {state} has {n}, outside the 24..40 range")
    if "FCT" in sc_by_state:
        problems.append("state constituency: FCT listed, but the FCT has no House of Assembly")

    constituencies = [
        {"kind": kind, "state": DB_STATE_NAME.get(r["state"], r["state"]),
         "name": r["name"], "code": r["code"], "composition": r["composition"]}
        for kind, rows in parsed.items() for r in rows
    ]
    (out_dir / "constituencies.json").write_text(json.dumps(constituencies, indent=1))

    # ── senatorial districts to LGAs, verified by exact partition ──
    lga_file = out_dir / "lgas.json"
    senatorial_lgas: list[dict] = []
    review: list[dict] = []
    verified_states: list[str] = []
    unverified: dict[str, dict] = {}

    if lga_file.exists():
        lgas = json.loads(lga_file.read_text())
        pool_by_state: dict[str, dict[str, dict]] = collections.defaultdict(dict)
        for lga in lgas:
            pool_by_state[lga["state"].upper()][norm_lga(lga["lga"])] = lga

        def match(state: str, token: str):
            pool = pool_by_state[DB_STATE_NAME.get(state, state).upper()]
            key = norm_lga(token)
            if not key:
                return None
            if key in pool:
                return pool[key]
            close = difflib.get_close_matches(key, list(pool), n=2, cutoff=0.80)
            if close:
                best = difflib.SequenceMatcher(None, key, close[0]).ratio()
                second = difflib.SequenceMatcher(None, key, close[1]).ratio() if len(close) > 1 else 0.0
                if len(close) == 1 or best - second > 0.05:
                    review.append({"state": state, "source_text": token,
                                   "matched_lga": pool[close[0]]["lga"], "score": round(best, 3)})
                    return pool[close[0]]
            return None

        grouped = collections.defaultdict(list)
        for r in parsed["senatorial_district"]:
            grouped[r["state"]].append(r)

        for state, rows in grouped.items():
            claimed: list[str] = []
            unresolved: list[str] = []
            per_district: dict[str, list[str]] = {}
            for r in rows:
                ids = []
                for token in split_composition(r["composition"]):
                    hit = match(state, token)
                    if hit:
                        ids.append(hit["id"])
                    else:
                        unresolved.append(token)
                per_district[r["code"]] = ids
                claimed += ids
            db_state = DB_STATE_NAME.get(state, state).upper()
            all_ids = {l["id"] for l in pool_by_state[db_state].values()}
            dupes = [x for x, c in collections.Counter(claimed).items() if c > 1]
            # The three senatorial districts of a state must partition that
            # state's LGAs exactly: every LGA once, none left over, none twice.
            if set(claimed) == all_ids and not dupes and not unresolved:
                verified_states.append(state)
                id_to_lga = {l["id"]: l for l in pool_by_state[db_state].values()}
                for code, ids in per_district.items():
                    for lga_id in ids:
                        # Keyed by NAME, not by our database's UUIDs: the dataset
                        # has to be importable into any environment.
                        senatorial_lgas.append({
                            "code": code,
                            "state": id_to_lga[lga_id]["state"],
                            "lga": id_to_lga[lga_id]["lga"],
                        })
            else:
                unverified[state] = {
                    "unmapped_lgas": len(all_ids - set(claimed)),
                    "claimed_twice": len(dupes),
                    "unrecognised_names": sorted(set(unresolved)),
                }

    (out_dir / "senatorial-lgas.json").write_text(json.dumps(senatorial_lgas, indent=1))
    (out_dir / "unresolved-review.json").write_text(json.dumps(
        {"close_matches_needing_confirmation": review, "states_not_verified": unverified},
        indent=1))

    print(f"constituencies: {len(constituencies)}")
    for kind, rows in parsed.items():
        print(f"  {kind}: {len(rows)}")
    print(f"senatorial LGA links: {len(senatorial_lgas)} across {len(verified_states)}/37 verified states")
    print(f"close matches needing confirmation: {len(review)}")
    if problems:
        print("\nPARSE VALIDATION PROBLEMS:")
        for p in problems:
            print("  -", p)
        return 1
    print("\nparse validation: OK")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
