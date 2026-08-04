# CR-0013: Candidate coverage — easy upload UX + complete the mapping

- **Status:** Assessed <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer, meeting)
- **Date requested:** 2026-08-03
- **Channel:** meeting
- **Related:** confirms and extends [CR-0007](0007-full-elective-office-coverage.md) (decided by
  [ADR-0013](../../architecture/decisions/0013-elective-office-catalogue.md)); resolves the
  parked "candidate management = national-only" item from `test-results/actual.md` (#2);
  points at existing tasks **T-031b**, **T-029**, **T-030**.

## 1. What the client asked for

From a meeting, the client confirmed the seven elective positions the dashboard must cover:

1. President
2. Senator
3. Member of the House of Representatives
4. Governor
5. Members of the State House of Assembly
6. Local Government Chairman
7. Councillor (Ward)

> "…positions such as Councillor, LG Chairman, State House of Assembly and Senator cover
> wards / constituencies (a group of wards); President covers all wards/states/LGs, Governor a
> particular state and the LGs/wards in it. To show a member who to vote for, they need to know
> even who to vote for for the positions that are directly (or somewhat directly) connected to
> wards. So anyone uploading who-to-vote-for should be able to, in a very easy, smooth,
> user-friendly manner, include the wards or even LG that the person covers, so the system knows
> what to display for any member."

## 2. Why — the underlying need

The "who to vote for" feature is an **awareness** tool: a member should open it and see every
race that applies to *their* ward/LGA/state, including the sub-national legislative seats
(Senate, House of Reps, State Assembly, Councillor), not just the obvious President/Governor.
For that to work, two things must hold: (a) whoever uploads a candidate can attach them to the
right area effortlessly, and (b) the system knows which wards/LGAs each constituency contains so
it can match candidates to members.

## 3. Impact analysis

### This is largely CR-0007, already built — verified against the live database 2026-08-03

- All **7 office types** exist as data, each declaring its `constituency_kind`
  (nation / state / lga / ward / senatorial_district / federal_constituency / state_constituency).
  They match the client's list exactly.
- The **constituency catalogue** is loaded: 109 senatorial districts, 360 federal constituencies,
  990 state constituencies.
- Member matching is built: `candidacies_for_geography(state, lga, ward)` returns every applicable
  race for a member's geography (T-028).
- Both surfaces exist functionally: admin upload (`/app/admin/candidates`) and the member view
  (`/app/vote`) (T-029 / T-030, functional, pending design pass).

**Correcting the client's mental model (surfaced back to them):** the uploader does **not**
hand-pick wards/LGAs per candidate. They pick the **constituency**; the system already maps that
to its wards/LGAs. So "an easy way to set who a candidate covers" = a polished constituency
picker with a **live 'this covers these LGAs/wards' preview**, not a manual ward multi-select.
The client chose this approach on 2026-08-03.

### The genuine gap: the mapping data is incomplete (T-031b)

Coverage is only automatic if constituency→ward/LGA membership is complete. It is not
(verified 2026-08-03):

| Position | Constituency kind | Membership loaded | Effect today |
|---|---|---|---|
| Senator | senatorial_district | LGA links for **22 of 37 states** (427 LGAs, 5,017 wards) | Senate races show only in those 22 states |
| House of Reps | federal_constituency | **none** | **No member ever sees a House of Reps candidate** |
| State Assembly | state_constituency | **none** | **No member ever sees a State Assembly candidate** |
| President / Governor / LG Chairman / Councillor | nation / state / lga / ward | n/a (off the geography tree) | Work today |

No candidacies have been uploaded yet (0 rows), which is why this has not surfaced in use. But
the sub-national seats the client specifically cares about are exactly the ones currently blocked.

### Surfaces / roles

- **Admin app** `/app/admin/candidates` — the upload UX polish + coverage preview (T-029).
- **Member app** `/app/vote` — the geography-driven view design pass (T-030).
- **Roles:** unchanged. Upload stays **scoped** (national admin unscoped; state/LGA/ward admins
  confined to their own area), per CR-0007 §4a — see §4.
- **Public site:** unaffected.

### Data / schema impact

- **No schema change.** The model (ADR-0013) already supports everything asked. The work is
  **data completion** (constituency membership import, T-031b) + **UI polish** (T-029/T-030).
- **Migration required?** No. T-031b lands reference data via the existing idempotent importers,
  not a schema migration.

### Breaking change / invariants

- **Breaking change?** No.
- **Invariants at risk:** none new. Authorization (scoped RLS, ADR-0005) is **unchanged** — the
  client confirmed the current scoped model, so there is no RLS edit.

### Conflict resolved

`test-results/actual.md` #2 asked to "restrict candidate management to national admin only." The
client **reversed** this in the meeting: national admin uploads anywhere; state and lower admins
handle their own scope — i.e. **the current shipped model**. #2 is therefore closed **by decision,
with no code change**.

### Size

- T-031b (mapping): **medium**, gated on sourcing INEC delimitation documents (data, not UI).
- T-029 (upload UX + preview): **small–medium** (UI, needs visual sign-off).
- T-030 (member view polish): **small–medium** (UI, needs visual sign-off).

## 4. Decision

**Proceed.** No new schema, no authorization change. Deliver via the existing CR-0007 tasks,
refined:

- Keep upload **scoped** (client-confirmed).
- Add a **live coverage preview** to the upload form as a T-029 acceptance criterion.
- Treat **T-031b (mapping completion)** as the prerequisite for the client's actual goal, since
  House of Reps and State Assembly cannot display anything until it lands.

**Needs an ADR?** **No.** The structural decision is already ADR-0013; this CR neither changes the
model nor the security boundary.

## 4b. Manual constituency-membership editor (client decision, 2026-08-03)

State-constituency (State Assembly) membership cannot be sourced from the INEC workbook, and 17
federal-constituency states split an LGA and need ward-level data. Rather than block on sourcing a
new document, the client asked to **build the mapping in-app**: sourced offline, then a national
admin attaches the wards (or LGAs) of a constituency manually through the dashboard.

The **schema and authorization already support this** (verified live 2026-08-03): `constituency_wards`
(direct ward→constituency membership) and `constituency_lgas` exist, each with an enforce trigger that
**auto-fills `kind` and rejects cross-state membership**, and the `ward_constituencies` view already
prefers a direct ward row over the LGA-derived one. The RLS `catalogue_write` policy **already grants
a national admin insert/delete** on both tables (and `authenticated` holds the table grants). Verified
by a live allow/deny test: a national admin's insert succeeds (kind auto-filled); a non-admin's insert
is refused with `row violates row-level security policy`.

So T-031c is **not a schema or RLS change — it is UI-only**:

- **UI:** a national-admin editor to pick a constituency and check the wards/LGAs it contains
  (insert `{constituency_id, ward_id}`; the trigger fills the rest), with the live coverage preview
  shared with T-029.
- Scoped admins are **not** given this surface (catalogue stays national-only, consistent with
  CR-0007); the existing RLS already enforces that.
- A regression test mirroring the live allow/deny check belongs in `supabase/tests/`.

## 5. Plan

Tasks on the [task board](../task-board.md):

- [x] **T-031b (federal, done)** — Recovered federal-constituency LGA membership from the existing
  extract via maximal-munch; imported **16 states / 315 links** (3,556 wards, verified one-FC-per-ward).
  House of Reps now resolves in those states. Remaining senatorial aliases (15 states) and the 4
  alias-away federal states still open under this task.
- [ ] **T-031c** — Manual constituency-membership editor (RLS for national-admin writes +
  allow/deny tests; national-admin UI). Unblocks State Assembly and the split-LGA states. *(UI +
  RLS; visual sign-off.)* See §4b.
- [ ] **T-029** — Admin candidate upload: design pass **plus a live "this covers these LGAs/wards"
  preview** when a constituency is chosen, so the uploader can confirm coverage at a glance.
  *(UI, visual sign-off.)*
- [ ] **T-030** — Member "who to vote for": geography-driven view design pass; confirm all seven
  positions render for a member whose area has full mapping. *(UI, visual sign-off.)*

## 6. Rollback plan

- **UI (T-029/T-030):** isolated on their own branches; revert the commits.
- **Mapping data (T-031b):** imported via idempotent upserts keyed on natural keys; safe to
  re-run, and a bad batch can be deleted by constituency kind without touching the catalogue rows.
- No schema change means no down-migration is involved.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
