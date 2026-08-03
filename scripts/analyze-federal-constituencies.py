#!/usr/bin/env python3
"""ANALYSIS ONLY (T-031b): can we derive federal-constituency LGA membership from
the already-extracted composition text, held to the same exact-partition gate the
senatorial mapping uses? Writes nothing to the database. Reports per-state whether
federal constituencies partition that state's LGAs cleanly (whole-LGA states) or
split an LGA (needs INEC ward-level data, left unmapped).

Reuses the deterministic normalisation/matching rules from extract-constituencies.py.
"""
from __future__ import annotations
import collections, difflib, json, re
from pathlib import Path

DATA = Path("docs/project/data/constituencies")
DB_STATE_NAME = {"FCT": "FEDERAL CAPITAL TERRITORY"}


def norm_lga(value: str) -> str:
    text = str(value).upper().replace("&", " AND ")
    text = re.sub(r"\bL\.?\s?[GA]\.?\s?A\.?S?\b", " ", text)
    text = re.sub(r"[^A-Z0-9]+", " ", text)
    for word, initial in (("NORTH","N"),("SOUTH","S"),("EAST","E"),("WEST","W"),("CENTRAL","C")):
        text = re.sub(rf"\b{word}\b", initial, text)
    return re.sub(r"\s+", " ", text).strip()


def fragments(name: str, composition: str) -> list[str]:
    """Break the name+composition into the smallest atoms, splitting on every
    separator (/, comma, and, &). Maximal-munch (below) recombines adjacent atoms
    back into real LGAs, so over-splitting here is safe and under-splitting is not."""
    comp = re.sub(r"THE ENTIRE GEOGRAPHICAL AREAS? OF( THE)?( PRESENT)?", " ", str(composition).upper())
    text = f"{name} / {comp}"
    text = re.sub(r"\bL\.?\s?[GA]\.?\s?A\.?S?\b", " ", text.upper())
    parts = re.split(r"/|,|\s+&\s+|\s+AND\s+", text)
    return [p.strip(" .") for p in parts if p.strip(" .")]


def main() -> int:
    consts = json.loads((DATA / "constituencies.json").read_text())
    lgas = json.loads((DATA / "lgas.json").read_text())
    federal = [c for c in consts if c["kind"] == "federal_constituency"]

    pool_by_state: dict[str, dict[str, dict]] = collections.defaultdict(dict)
    for lga in lgas:
        pool_by_state[lga["state"].upper()][norm_lga(lga["lga"])] = lga

    def munch(state: str, frags: list[str]):
        """Walk the fragments, greedily taking the LONGEST run of adjacent atoms
        that matches a real LGA. Disambiguates 'Aba North'/'Aba South' (two LGAs)
        from 'Askira'/'Uba' ('ASKIRA/UBA', one LGA) with no guessing."""
        pool = pool_by_state[DB_STATE_NAME.get(state, state).upper()]
        ids, unresolved, close = [], [], []
        i = 0
        while i < len(frags):
            took = False
            for w in (3, 2, 1):  # longest run first
                if i + w > len(frags):
                    continue
                key = norm_lga(" ".join(frags[i:i + w]))
                if key and key in pool:
                    ids.append(pool[key]["id"]); i += w; took = True; break
            if took:
                continue
            # single-atom fuzzy fallback (name drift), same rule as senatorial
            key = norm_lga(frags[i])
            hit = None
            if key:
                cm = difflib.get_close_matches(key, list(pool), n=2, cutoff=0.80)
                if cm:
                    best = difflib.SequenceMatcher(None, key, cm[0]).ratio()
                    second = difflib.SequenceMatcher(None, key, cm[1]).ratio() if len(cm) > 1 else 0.0
                    if len(cm) == 1 or best - second > 0.05:
                        hit = pool[cm[0]]; close.append((frags[i], hit["lga"], round(best, 3)))
            if hit:
                ids.append(hit["id"])
            elif key:
                unresolved.append(frags[i])
            i += 1
        return ids, unresolved, close

    grouped = collections.defaultdict(list)
    for c in federal:
        grouped[c["state"]].append(c)

    clean, split_or_partial, unresolved_states = [], [], []
    federal_links: list[dict] = []
    total_states = 0
    for state, rows in sorted(grouped.items()):
        total_states += 1
        db_state = DB_STATE_NAME.get(state, state).upper()
        all_ids = {l["id"] for l in pool_by_state[db_state].values()}
        claimed, unresolved, close = [], [], []
        for c in rows:
            ids, unres, cl = munch(state, fragments(c["name"], c["composition"]))
            claimed += sorted(set(ids))  # dedupe within an FC; dupes ACROSS FCs = split
            unresolved += unres
            close += cl
        dupes = [x for x, n in collections.Counter(claimed).items() if n > 1]
        missing = all_ids - set(claimed)
        if set(claimed) == all_ids and not dupes and not unresolved:
            clean.append((state, len(rows), len(all_ids), close))
            # record the verified FC→LGA links, keyed by name (env-portable), like senatorial
            id_to_lga = {l["id"]: l for l in pool_by_state[db_state].values()}
            for c in rows:
                ids, _, _ = munch(state, fragments(c["name"], c["composition"]))
                for lga_id in sorted(set(ids)):
                    federal_links.append({"code": c["code"],
                                          "state": id_to_lga[lga_id]["state"],
                                          "lga": id_to_lga[lga_id]["lga"]})
        elif unresolved and not dupes and not missing:
            unresolved_states.append((state, sorted(set(unresolved))))
        else:
            split_or_partial.append((state, len(rows), len(all_ids), len(missing), len(dupes), sorted(set(unresolved))))

    print(f"FEDERAL CONSTITUENCY analysis — {len(federal)} FCs across {total_states} states\n")
    print(f"✅ CLEAN whole-LGA partition (safe to map): {len(clean)} states")
    for st, nfc, nlga, close in clean:
        note = f"  ({len(close)} close-name matches)" if close else ""
        print(f"   {st}: {nfc} FCs = {nlga} LGAs{note}")
    print(f"\n⚠️  SPLIT LGA or partial (needs ward-level data): {len(split_or_partial)} states")
    for st, nfc, nlga, miss, dup, unres in split_or_partial:
        print(f"   {st}: {nfc} FCs vs {nlga} LGAs — missing {miss}, claimed-twice {dup}" + (f", unresolved {unres}" if unres else ""))
    print(f"\n❓ NAME-DRIFT only (alias table would fix): {len(unresolved_states)} states")
    for st, unres in unresolved_states:
        print(f"   {st}: {unres}")

    mapped_lgas = sum(n for _, _, n, _ in clean)
    (DATA / "federal-lgas.json").write_text(json.dumps(federal_links, indent=1))
    print(f"\nWrote {len(federal_links)} verified FC→LGA links across {len(clean)} states to federal-lgas.json")
    print(f"Projected: {len(clean)} states unlock House of Reps; {len(unresolved_states)} more need a small alias table; "
          f"{len(split_or_partial)} split LGAs and need INEC ward-level data.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
