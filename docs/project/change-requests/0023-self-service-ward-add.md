# CR-0023: Admins can add a missing ward

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-08-15
- **Channel:** message
- **Related:** [CR-0018](0018-self-service-polling-unit-add.md) (the same counter-measure for polling units), [ADR-0005](../../architecture/decisions/0005-authorization-in-the-database-rls.md) (RLS is the control), [ADR-0017](../../architecture/decisions/0017-super-admin-owner-role.md) (super_admin sits beside national)

## 1. What the client asked for

> "The same way we integrated a counter-measure for non-existent polling units, do the exact same for wards."

## 2. Why — the underlying need

The ward seed can be incomplete, exactly like the polling-unit seed (CR-0018). When a
ward a coordinator needs is missing, there must be a scoped, self-service way to add it,
rather than the work stalling on a data import.

## 3. Impact analysis

- **Surfaces/flows affected:**
  - New page `/app/geography/add-ward` (search existing wards in an LGA, add if missing).
  - Inline "Can't find your ward? Add it" on the ward step of the `GeoPicker`, enabled in
    admin account creation (`/app/admin/new-account`) for ward-level targets.
  - Nav: "Add ward" for LGA-level and up.
- **Data/schema impact:** none. `wards` already has `unique (lga_id, name)` and an
  auto-assigned `ward_number` (0027). Only a new **RLS insert policy** is added.
- **Breaking change?** No. Additive policy + additive UI.
- **Invariants at risk:**
  - **Write authorization** on `wards`. This is an RLS change (ADR-0005), scope-contained:
    a ward is a child of an LGA, so LGA-level and up may create one within their own area;
    national/super anywhere. `ward_admin` and `unit_coordinator` are **not** admitted (they
    own a single ward, not the creation of siblings) — this is the one deliberate difference
    from the polling-unit roles, which sit one level lower.
  - No update/delete policy: editing/removing seeded geography stays out of reach.
  - Duplicate wards: refused case-insensitively by the action and by the DB `unique(lga_id, name)`.
- **Conflicts with another CR?** None.
- **Size:** small–medium (one RLS migration, a name-normalisation helper, one page + panel,
  one inline picker component, a nav entry, unit + RLS tests).

## 4. Decision

**Proceed.** Mirror CR-0018 for wards, with the roles moved one level up (LGA and above),
since a ward is a child of an LGA. Ward names are preserved in their mixed case (seed uses
place names like "Auna South"), unlike the uppercased polling-unit names.

**Needs an ADR?** No. No new authorization *model*: the scope-containment RLS pattern already
exists (0034 for polling units); this applies it to `wards`. Documented here + in the RLS test.

## 5. Plan

- [x] `supabase/migrations/0041_wards_admin_insert.sql` — the scoped `wards_insert` policy.
- [x] `lib/ward.ts` (+ `lib/ward.test.ts`) — name normalisation / dedupe key (case-preserving).
- [x] `app/app/geography/add-ward/` — page, panel, `addWard` action.
- [x] `components/geo-picker-add-ward.tsx` + `addWard` prop on `components/geo-picker.tsx`;
      enabled in `new-account` for ward-level targets.
- [x] Nav entry for super/national/state/LGA.
- [x] `supabase/tests/wards_insert_test.sql` — allow/deny RLS test.
- [ ] Apply `0041` to prod (dry-run `BEGIN…ROLLBACK` + run the allow/deny checks, then apply).

## 6. Rollback plan

- Forms/action/nav: revert the PR.
- RLS: `drop policy wards_insert on public.wards;` (a down-migration).

## 7. Outcome

- **Shipped in:** _pending_ (code complete + gated; migration `0041` awaiting apply).
- **Client confirmed:** _pending_.
