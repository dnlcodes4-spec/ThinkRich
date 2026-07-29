# CR-0007: Full elective-office coverage, admin-maintained

- **Status:** Planned <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-07-28
- **Channel:** message
- **Related:** supersedes the office taxonomy in [CR-0004](0004-candidate-first-public-landing.md)
  and the `candidate_level` enum shipped in `0010_candidates.sql` (T-007);
  builds on the geography from [CR-0002](0002-polling-units-registration-and-live-count.md);
  research base is [nigeria-elective-offices.md](../nigeria-elective-offices.md);
  decided by **ADR-0013**

## 1. What the client asked for

> "The project is to be built fully, not for MVP. For positions that aren't stable, the national
> admin needs to be able to make additions and corrections. Members should be able to see all the
> possible candidates for the constituency or LG or ward selected, as well as overhead ones such
> as President, Governor."

Three clarifications confirmed:

1. **This is not a voting platform.** There is no in-app voting, no ballot casting, no tallying.
   The purpose is **awareness**: admins upload candidates, members see who is standing in their
   area. "All the possible candidates" means *everything that has been uploaded for that race*,
   not a scraped copy of INEC's full ballot.
2. **Geography first, other geographies available.** A member's own state / LGA / ward is the
   default view, and they can also look at other areas.
3. **Roles and permissions are enforced.** The national admin can do anything. Every other admin
   is confined to their own scope or constituency.
4. **The national admin is not scoped at all**, restated by the client on 2026-07-28:

   > "National admin should not be limited to any scope but can see, adjust, make changes if he
   > wants to at any level."

   This is broader than candidates and was applied across the app, not just this feature. See §4a.

## 2. Why, the underlying need

We currently model **3 of Nigeria's 7 elective office types** (`presidential`, `state`, `lg`) and
allow exactly **one candidate per scope**. That was a defensible MVP boundary: those three are the
only offices whose constituency is a whole unit of the geography we already hold. It is the wrong
boundary for a full build.

What is missing:

- **Senate (109), House of Representatives (360), State Assembly (993), Councillor (~8,809).**
  Four of the six legislative and local office types are unrepresentable today.
- **More than one candidate per race.** The `candidates_one_presidential` /
  `candidates_one_per_state` / `candidates_one_per_lga` unique indexes hard-code an endorsement
  model. "Show members all the uploaded candidates" cannot coexist with them.
- **Anything that changes.** Election dates move (the Electoral Act 2026 pulled the 2027 general
  forward to 16 Jan / 6 Feb 2027; Osun's off-cycle date has a live 8-vs-15 August conflict).
  Constituency boundaries get redrawn. The reserved-seats-for-women bill would take the Senate from
  109 to 146. None of this is expressible when offices are a Postgres enum and dates are absent.

## 3. Impact analysis

### Surfaces and flows affected

- **Data model:** the largest schema addition since identity. See §4.
- **Member app:** `/app/vote` currently renders three hard-coded cards. Becomes a geography-driven
  list of every race that applies, plus a geography selector.
- **Admin app:** `/app/admin/candidates` currently manages one record. Becomes scoped CRUD over
  candidacies, plus national-admin-only CRUD over the reference catalogue (offices, parties,
  elections, constituencies).
- **Public site:** unaffected.

### Data and schema impact

Replaces `candidates` (`candidate_level` enum, one row per scope) with a catalogue-driven model:
`office_types`, `parties`, `elections`, `constituencies` (+ LGA/ward membership), `candidacies`.

- **Breaking change?** **Technically yes, in practice no.** `public.candidates` holds **0 rows**
  in production (verified 2026-07-28). Nothing to migrate or backfill. The old table and enum are
  dropped in the same migration that creates the new model.
- **Migration required?** Yes, three: `0016` schema + seed, `0017` RLS + resolver, `0018` the scope-echo helpers the admin UI reads.

### Invariants at risk

- **RLS as the authorization boundary (ADR-0005)** must extend to a scope shape the existing
  helpers do not cover. `member_in_scope` compares a single geography column; a candidacy's scope
  can be a constituency spanning many LGAs. Needs a new containment predicate, and RLS tests.
- **Role scoping.** A state admin must not be able to touch another state's races. A constituency
  is the new way to get that wrong.
- Membership numbers, NIN dedup, the 10-members-per-leader rule: **unaffected**.

### Known gap, called out deliberately

The **ward-to-constituency mapping does not exist as data we hold**, and cannot be derived from
`ward.lga_id` (see [the research](../nigeria-elective-offices.md#32-the-overlay-that-does-not-nest-read-this-before-modelling)).
Senatorial districts, federal constituencies and state constituencies are an overlay on wards.

We are **not fabricating it**. The schema ships with zero constituency rows, the model degrades
cleanly (those office types simply show no races until data lands), and sourcing the real INEC
delimitation is its own task (**T-031**) with its own importer, held to the same standard as
[docs/project/data](../data/README.md): parsed from source documents, never model-generated.

### Size

**Large.** Schema + RLS is medium; admin CRUD and the member view are each medium; the
delimitation import is medium and independent.

## 4. Decision

**Proceed**, with offices as **data, not an enum**. Rationale, alternatives and consequences are
in **ADR-0013**. Summary of the shape:

| Table | Holds | Maintained by |
|---|---|---|
| `office_types` | The 7 elective offices, each declaring what geography its constituency is | National admin |
| `parties` | INEC-registered parties (name, acronym, colour, logo) | National admin |
| `elections` | A dated election event, national or per-state, so off-cycle states work | National admin |
| `constituencies` | Senatorial districts, federal and state constituencies | National admin |
| `constituency_lgas` / `constituency_wards` | Which LGAs/wards make up a constituency | National admin |
| `candidacies` | A person standing for one office, in one constituency, in one election | Scoped admins |

**Needs an ADR?** **Yes, ADR-0013.** Turning a closed enum into an admin-editable catalogue, and
adding a second geography overlay beside the existing tree, is a structural decision that will
outlive this CR.

## 4a. The national admin is unscoped

Audited every RLS policy and every role gate in the app. The **database already treated the
national admin as unscoped** (`member_in_scope`, `profile_in_scope` and `candidacy_in_scope` all
short-circuit to `true` for them). The limits were in **application code contradicting the
database**:

| Surface | Was | Now |
|---|---|---|
| Create an account | `NEXT_TIER` allowed the national admin **only** to create a State Admin | They pick **any** role below them (State Admin, LG Admin, Ward Admin, Unit Coordinator, Leader) at **any** geography, via a full state → LGA → ward → polling-unit cascade. Other admins are unchanged: next tier, own scope |
| Team | Listed and could deactivate/delete **only** State Admins | A level switcher across every tier; they can act on any of them. Other admins unchanged |
| Candidates nav | Hidden from Ward Admins | Shown, since a Ward Admin owns their ward's councillor race |
| Candidates, catalogue | Already unscoped for the national admin | Unchanged |

The provisioning check is now two explicit rules, matching `profiles_insert`: the target role must
rank strictly below the caller's, and the target's geographic path must sit inside the caller's own
scope. **For the national admin the second rule is vacuous**, because they have no scope fields
set, so any path passes. Nothing special-cases them; they fall out of the general rule.

### Registering members (T-033, client answered 2026-07-28: yes)

`members_insert` admitted only a `leader`, writing into their own polling unit. The client
confirmed the national admin should be able to register a member, so migration `0019`:

- **Opens `members_insert`** to the national admin, in **any** polling unit, with `registered_by`
  being either themselves or a leader who actually sits in that polling unit. The second form is
  offered first in the UI, so the member normally stays inside the leadership chain; the first is
  the escape hatch for a polling unit that has no leader yet.
- **Corrects the ≤10 cap.** `enforce_leader_capacity()` counted by `registered_by` regardless of
  role, so it would have capped the national admin at ten members. The invariant is *"a **leader**
  may hold at most 10 active members"*, so the function now checks the registrar's role and applies
  only to leaders. A member attributed to a leader still counts against that leader.

Verified under a real national-admin JWT: insert into a far-off polling unit **allowed**;
attribution to a leader in that leader's own polling unit **allowed**; attribution to a leader from
a **different** polling unit **refused**; twelve members held by the national admin **allowed**;
an eleventh attributed to a leader **refused**.

### One limit deliberately left in place

This is **not** a scope limit, so the instruction does not reach it, and it protects the system
from itself. Flagging rather than changing:

- **A national admin cannot create or edit another national admin.** Enforced by the rank rule in
  `profiles_insert` / `profiles_update`. This is [ADR-0012](../../architecture/decisions/0012-national-admin-bootstrap.md)
  working as designed: the mint-a-national-admin surface must not exist in production, or a single
  compromised account becomes an unlimited one with no higher authority able to revoke it.
  **Recommend keeping.** Additional national admins stay a deliberate DBA action.

## 5. Plan

Tasks on the [task board](../task-board.md):

- [ ] **T-027** — Migration `0016`: office catalogue, parties, elections, constituencies,
  candidacies. Drops `candidates` + `candidate_level` (0 rows).
- [ ] **T-028** — Migration `0017`: containment RLS + `candidacies_for_geography()` resolver + RLS tests.
- [ ] **T-029** — Admin: scoped candidacy CRUD + national-admin catalogue management. *(UI, needs
  visual sign-off.)*
- [ ] **T-030** — Member: geography-driven candidate view with a geography selector, replacing the
  three hard-coded cards. *(UI, needs visual sign-off.)*
- [ ] **T-031** — Source and import the INEC constituency delimitation (109 senatorial districts,
  360 federal, 993 state) with ward/LGA membership. Independent of T-027 to T-030.
- [ ] **T-032** — Remove the stray `Seed LGA` row (Lagos, code `SEED`) and its member counter.
  Found while inspecting the live DB for this CR; it inflates every geography count by one.

## 6. Rollback plan

- **Schema:** `0016` and `0017` are reversible by a down-migration for as long as `candidacies`
  holds no rows the client cares about. `candidates` was empty, so nothing is lost by reverting.
- **UI:** T-029 and T-030 are isolated on their own branches; revert the commits.
- **Reference data:** seeds are idempotent upserts keyed on natural keys, safe to re-run or delete.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
