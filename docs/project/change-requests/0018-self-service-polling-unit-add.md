# CR-0018: Self-service polling-unit add (search + dedupe + normalized create)

- **Status:** Assessed
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-08-05
- **Channel:** message
- **Related:** [ADR-0005](../../architecture/decisions/0005-authorization-in-the-database-rls.md); geography model (CR-0002)

## 1. What the client asked for

> "Not all polling units were captured. Create a page that lets admins add polling units
> that aren't there. It must be structured, with a search interface so they don't repeat an
> existing one. If the polling unit is not found, let them type it in manually, with an option
> to add it to the database so they don't have to type it again — but make sure it is added in
> a proper format."

## 2. Why — the underlying need

The seeded INEC directory (119,971 units) is incomplete. Registration and candidate mapping
are blocked wherever a real polling unit is missing. Admins on the ground need to add the
missing ones themselves, without creating duplicates or malformed entries.

## 3. Impact analysis

- **Surfaces/flows affected:** a new admin page (under `/app/geography`). Roles: the
  coordinator tiers + national, each **within their own scope**.
- **Data/schema impact:** no new table. A **scoped INSERT RLS policy** on `polling_units`
  (today only `geography_readable` SELECT exists — all writes are blocked). No hard unique
  index: 3 pre-existing duplicate name-groups exist in the seed, so a unique index would fail;
  dedupe is enforced in the app (case-insensitive, per ward) and the 3 dupes are logged as a
  data-cleanup follow-up.
- **Breaking change?** No — additive policy + new page.
- **Invariants at risk:** geography must stay trustworthy. Mitigations: (a) inserts are
  **scope-contained** by RLS (the new unit's ward must sit in the admin's area); (b) names are
  **normalised** server-side (trim, collapse whitespace, uppercased to match the INEC seed
  style); (c) a **case-insensitive dedupe** check refuses an existing unit and points to it.
- **Conflicts:** none.
- **Size:** small–medium (one policy migration, one action, one page).

## 4. Decision

**Proceed.** RLS is the control (ADR-0005): a scoped INSERT policy admits the coordinator
tiers to add a unit whose ward is inside their scope; the server action mirrors it, normalises,
and dedupes. Manual entry is allowed and always persisted (that IS "add to the database"), so
the same unit is never retyped.

**Needs an ADR?** No — no new structural model; extends the existing RLS pattern to a
reference table for a controlled, scoped write.

## 5. Plan

Tasks on the [task board](../task-board.md):

- [ ] T-063 — Migration: scoped `polling_units_insert` RLS policy; `lib/polling-unit.ts`
      name normaliser + tests.
- [ ] T-064 — `/app/geography/add-unit`: scope-locked state→LGA→ward picker, live search of
      existing units in that ward, and a "not listed? add it" create with dedupe + normalise.
- [ ] T-065 (follow-up) — resolve the 3 pre-existing duplicate polling-unit name groups, then
      consider a hard `unique (ward_id, lower(name))` index.

## 6. Rollback plan

- Page/action: revert the PR.
- RLS policy: down-migration `drop policy polling_units_insert on public.polling_units;`
  (returns the table to read-only).

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
