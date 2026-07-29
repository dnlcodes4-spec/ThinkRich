# ADR-0013: Elective offices as an admin-editable catalogue, with a constituency overlay

- **Status:** Accepted
- **Date:** 2026-07-28
- **Deciders:** DNLCodess
- **Relates to:** [ADR-0005](0005-rls-as-authorization-boundary.md) (RLS boundary),
  [ADR-0009](0009-type-system.md) (type system), [CR-0007](../../project/change-requests/0007-full-elective-office-coverage.md),
  supersedes the `candidate_level` enum from T-007
- **Research base:** [nigeria-elective-offices.md](../../project/nigeria-elective-offices.md)

## Context

T-007 shipped a candidate model with three offices baked into a Postgres enum:

```sql
create type public.candidate_level as enum ('presidential', 'state', 'lg');
```

plus three unique indexes enforcing one candidate per scope. CR-0007 asks for the full picture:
all seven elective office types, more than one candidate per race, and a national admin who can
add and correct positions that are not stable.

Three facts from the research make the enum untenable:

1. **Four of the seven office types have constituencies we cannot express.** Senate, House of
   Representatives and State Assembly seats sit on **senatorial districts, federal constituencies
   and state constituencies**. These are an overlay built from whole *wards*. They do not nest in
   our `state → lga → ward → polling_unit` tree and are not derivable from it. Lagos has 20 LGAs
   but 24 federal constituencies; Kano has 44 LGAs but 24. Councillor is the exception: its
   constituency is exactly one ward, which we already hold.
2. **The set of offices is not fixed.** The reserved-seats-for-women alteration would add 37
   Senate and 37 Reps seats. A bill to move LG elections from the SIECs to INEC is pending. State
   creation proposals recur. An enum change is a migration and a deploy; the client asked for
   corrections they can make themselves.
3. **Election dates move.** The Electoral Act 2026 pulled the 2027 general forward to 16 January
   and 6 February 2027. Eight states are off-cycle on separate four-year clocks. Osun's 2026 date
   has a live 8-vs-15 August discrepancy in the sources. Dates belong in a table an admin can fix,
   not in code.

`public.candidates` holds **0 rows**, so we can choose freely with no migration cost.

## Decision

**Model offices, parties, elections and constituencies as reference data owned by the national
admin. Model a candidacy as `(election, office, constituency-scope, person)`. Enforce who may edit
what by geographic containment in RLS, not by a role-to-office lookup table.**

### 1. Offices become a table, not an enum

`office_types` holds one row per elective office. The important column is
**`constituency_kind`**, which declares what geography a seat of this office is elected from:

| `key` | `constituency_kind` | Seats |
|---|---|---|
| `president` | `nation` | 1 |
| `senator` | `senatorial_district` | 109 |
| `house_of_reps` | `federal_constituency` | 360 |
| `governor` | `state` | 36 |
| `state_assembly` | `state_constituency` | 993 |
| `lg_chairman` | `lga` | 774 |
| `councillor` | `ward` | ~8,809 |

This single column is what makes the rest generic: scope validation, the member-facing resolver
and the permission check all read it instead of branching on a hard-coded office list. Adding an
eighth office is an insert, not a deploy.

`has_running_mate` records the other structural fact from the research: President/VP,
Governor/Deputy and Chairman/Vice are each **one joint ticket with one vote**, never separately
elected. It is a property of the office, so it lives on the office.

### 2. Constituencies are a first-class overlay, mapped by membership

`constituencies` (kind, name, state_id) plus two membership tables:

- `constituency_lgas` for the common case, a constituency made of whole LGAs
- `constituency_wards` for the split case, where a populous LGA is divided between two
  constituencies

A ward resolves to a constituency through `constituency_wards` if a row exists, otherwise through
its LGA in `constituency_lgas`. Ward-level rows override, so the exceptional case is the only one
that needs the tedious data.

**We ship this empty.** The real INEC delimitation is not something we can invent, and
[docs/project/data](../../project/data/README.md) sets the standard: parsed from source documents,
never model-generated. Sourcing it is T-031. Until then, the three office types that depend on it
simply return no races, which is honest rather than wrong.

### 3. Permission is geographic containment, computed in the database

An admin may write a candidacy **if and only if the candidacy's constituency is contained within
the admin's own scope**. National admin's scope is the country, so they can do anything, which is
exactly what the client asked for. No table maps roles to offices.

This falls out correctly without special cases:

| Caller | Can manage |
|---|---|
| `national_admin` | everything |
| `state_admin` | governorship, state assembly, senate and reps seats in their state, and every LG chairman and councillor race inside it |
| `lg_admin` | chairman of their LGA, councillors in its wards. **Not** a federal constituency, which is larger than their LGA |
| `ward_admin` | councillor of their ward |
| `unit_coordinator`, `leader`, `member` | nothing (read only) |

The containment test is one `security definer` function, `private.candidacy_in_scope(...)`, used by
the insert, update and delete policies. It resolves a candidacy's scope down to a set of LGAs and
asks whether the caller's scope covers it.

### 4. Reads are open to signed-in users; publication is the gate

Members may read any **published** candidacy, in any geography. That is what "geography first,
other geographies available as options" requires, and campaign content is meant to be seen.
`is_published` lets an admin stage a record before members see it. Unpublished rows are visible
only to admins who could edit them.

### 5. Candidacies attach to an election

`elections` (name, election_date, scope, state_id) exists so that off-cycle states, corrected
dates and successive cycles are data. A candidacy without an election has nowhere to live once
2027 passes.

## Options considered

1. **Extend the enum to seven values, keep everything else (rejected).** Cheapest today. Fails on
   all three drivers: still cannot express constituencies, still needs a deploy to change, still
   has no dates. Would be re-done within a cycle.
2. **Offices as a table, constituencies denormalised onto wards (rejected).** Put
   `senatorial_district_id`, `federal_constituency_id`, `state_constituency_id` directly on
   `wards`. Faster to query, and tempting. Rejected because it puts three nullable overlay FKs on
   an 8,793-row reference table that is otherwise pure INEC tree data, and because it cannot
   represent a constituency before its wards are mapped. The membership tables keep the tree clean
   and let a constituency exist with partial mapping.
3. **A `role_office_permissions` table (rejected).** Explicit, greppable, and immediately wrong at
   the edges: it cannot express "an LG admin may edit a councillor race but only in their own
   wards". Containment answers that for free, and cannot drift out of sync with the geography.
4. **Chosen: catalogue + overlay + containment.**

## Consequences

**Good**

- The national admin can add offices, parties, elections and constituencies without an engineer.
- Every office type is expressible, including the four we could not model before.
- Multiple candidates per race, which CR-0007 requires and the old unique indexes forbade.
- One permission rule covers all seven offices and every tier, and it lives in the database, so it
  holds for any client (ADR-0005).
- Off-cycle states and moved election dates stop being a code concern.

**Costs and risks**

- **More tables and more joins.** The member view goes from three point reads to one resolver
  call. Mitigated by `candidacies_for_ward()`, a single `stable` SQL function.
- **The constituency overlay is empty on day one.** Senate, Reps and State Assembly races show
  nothing until T-031. This is a visible gap and must be stated in the UI, not hidden.
- **Containment is more subtle than equality.** A wrong predicate leaks write access across states.
  This buys a dedicated RLS test per role per office type in T-028, which is the right trade but
  is real work.
- **Reference data is now editable, so it can be edited wrongly.** Every catalogue write is
  recorded in `activity_log`, and catalogue tables use soft deactivation (`is_active`) rather than
  hard deletes, so a mistake is reversible.

## Follow-ups

- **T-031** sources the real delimitation. Until it lands, this ADR is only half realised.
- Our polling-unit reference data is a generation behind (119,971 held vs 176,846 in use). Out of
  scope here, but it limits any polling-unit-level targeting. Tracked separately.
