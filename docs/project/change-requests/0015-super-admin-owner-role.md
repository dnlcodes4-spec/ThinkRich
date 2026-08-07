# CR-0015: Super Admin (owner) role

- **Status:** Assessed
- **Requested by:** Client (meeting)
- **Date requested:** 2026-08-06
- **Channel:** meeting (relayed)
- **Related:** ADR-0017 (this change), ADR-0012 (national-admin bootstrap — the pattern reused), ADR-0005 (RLS)

## 1. What the client asked for

> "The client wants to have his own super admin dashboard so he can oversee everyone
> and create any kind of admin including national admin, delete them, etc."

## 2. Why — the underlying need

There is currently no role above `national_admin`. National admins cannot create or
remove other national admins (the "strictly below" rule), so the platform owner has no
in-app way to appoint or remove the top tier, nor a single vantage over the whole
system. The client is the platform owner and needs that authority.

## 3. Decision — scope (locked with the client)

- **New role `super_admin`** ("Super Admin" on screen), one tier **above**
  `national_admin`. It is a **superset of National**: it does everything a national
  admin does (register, candidates, states, geography, activity log, whole-country
  view) **and** can create / deactivate / delete **any** admin, including national
  admins and other super admins.
- **`role_rank(super_admin) = 0`** (national = 1). Because every authorization barrier
  keys on `role_rank(role) > role_rank(caller)`, ranking super_admin at 0 makes
  national (and everyone) strictly below it — so create/deactivate/delete of national
  admins is unlocked by the existing rules, once `super_admin` is added to the role
  allowlists and app maps.
- **Owner can appoint peers.** A super_admin may create/manage other super_admins.
  This needs a deliberate special-case, because the strict `>` rule would otherwise
  stop a rank-0 acting on another rank-0. No one below a super_admin can ever act on
  one (rank 0 outranks all).
- **No bespoke dashboard.** Reuse the existing surfaces: the **Team** page now lists
  national admins as manageable, and **Give app access** offers "National Coordinator"
  and "Super Admin" in the role picker. The owner also sees the national dashboard
  (map, active states, activity log).
- **Bootstrap:** a one-time production seed (promote a chosen account to `super_admin`),
  mirroring ADR-0012. No dev page.

## 4. Impact analysis

- **Surfaces/flows affected:** the `user_role` enum; `role_rank`; the RLS scope engine
  and policies (`profiles`, `members`, `polling_units`, candidacy + elective-office
  catalogue, `activity_log`); the scope CHECK; the app role maps (`terms.ts`,
  `tiers.ts`), `nav.ts`, `CoordinatorHome`, and the activity-log page guard. **No new
  screens.**
- **Data/schema impact:** additive enum value + function/policy/CHECK updates. **No data
  migration, no table change.**
- **Breaking change?** No. Purely additive — existing roles are unaffected.
- **Invariants at risk:**
  - *Privilege escalation* — the new peer special-case must be tight: **only** a
    super_admin may create/act-on a super_admin; everyone else is still bound by the
    strict rank rule. Covered by RLS allow/deny tests.
  - *Owner lock-out / self-harm* — the existing "never act on self" guard in team
    actions prevents a lone owner deleting themselves.
  - RLS remains the authorization boundary (ADR-0005); the app mirrors it.
- **Conflicts with spec or another CR?** None. Sits above the CR-0003 ladder; complements
  ADR-0012.
- **Size:** medium (a wide but additive RLS sweep + small app-layer changes + a seed).

## 5. Plan

Proposed task breakdown (added to the [task board](../task-board.md) once the plan is
approved):

- [ ] T-084 — Migration A: `ALTER TYPE user_role ADD VALUE 'super_admin' BEFORE 'national_admin'`.
- [ ] T-085 — Migration B: `role_rank` (super=0), scope engine (`profile_in_scope` /
      `member_in_scope` → super sees all), `profiles_insert`/`update` (allowlist + peer
      special-case), `members_insert` / `polling_units_insert` / `candidacy_in_scope` /
      `catalogue_write` / `activity_log` read, and the `profiles_scope_matches_role`
      CHECK — each adding `super_admin` beside `national_admin`. Dry-run B on prod
      (`BEGIN…ROLLBACK`) before applying.
- [ ] T-086 — App layer: `terms.ts` (label, `isCoordinator`), `tiers.ts` (rank/level/order
      + peer special-case in `allowedTargets`/`manageableRoles`), `nav.ts`,
      `CoordinatorHome` + `logs` guard treat super like national. Regenerate types.
- [ ] T-087 — SQL RLS tests: super sees all; super creates/deletes a national and a peer
      super; a national cannot act on a super.
- [ ] T-088 — Bootstrap seed: promote the client's account to `super_admin`
      (clear geo, ensure VIN). Verify + screenshots (Team, role picker) for UI sign-off.

## 6. Rollback plan

- **Code:** revert the branch's squash-merge.
- **DB:** the changes are additive. To back out, reapply the pre-change function/policy
  definitions (from git) and re-scope/rename any seeded super_admin back to
  national_admin. The enum value cannot be dropped in place, but an unused enum value is
  harmless (leave it, or recreate the type only if strictly necessary). Take a snapshot
  before the prod apply, as with CR-0019.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
