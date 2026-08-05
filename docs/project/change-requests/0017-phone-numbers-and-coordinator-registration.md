# CR-0017: Phone numbers on every form + coordinators can register members

- **Status:** Assessed <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-08-05
- **Channel:** message
- **Related:** [CR-0009](0009-vin-identity-role-upgrades-uncapped-leaders-and-membership-card.md) (leaders already uncapped), [ADR-0005](../../architecture/decisions/0005-authorization-in-the-database-rls.md) (RLS is the control)

## 1. What the client asked for

Two of the eight items from the 2026-08-05 feedback:

1. **"Phone number should be included for every form needed — both for creating any kind of admin, even down to registering a member."**
7. **"State or local coordinators, unit leaders should also be eligible to register members."**

## 2. Why — the underlying need

1. Every person in the movement needs a reachable phone number: it is the primary
   contact channel for grassroots mobilisation, and today it is captured **nowhere**.
7. Registration is currently bottlenecked on **leaders** (and the national coordinator).
   Coordinators supervise real people on the ground and must be able to register members
   directly, not only through a leader.

## 3. Impact analysis

- **Surfaces/flows affected:**
  - Admin creation: `/app/admin/new-account`, dev bootstrap `/dev/national-admins`.
  - Member registration: `/app/register` (leader + national today).
  - Roles gaining registration: `state_admin`, `lg_admin`, `ward_admin`, `unit_coordinator`.
- **Data/schema impact:** **new column `phone`** on `public.profiles` and `public.members`.
  Migration required. Nullable at first (expand/contract) so existing rows stay valid; the
  app requires it on new writes. Stored normalised (E.164-ish `+234…`).
- **Breaking change?** No, additive column, forms add a required field going forward.
- **Invariants at risk:**
  - **Registration authorization** widens. This is an RLS change on `members` INSERT
    (ADR-0005), not just UI. Must stay **scope-contained**: a coordinator may only register
    into their own geography, mirroring the existing containment for admin creation.
  - Membership-number immutability, no-duplicate-registration (NIN/VIN): **unchanged**.
  - Leader 10-cap: **already removed** (CR-0009, uncapped leaders), so coordinators are
    likewise uncapped. No cap logic to add.
- **Conflicts with another CR?** None. Independent of the membership/super-admin/verification
  work (CR-0014/0015/0016).
- **Size:** small–medium (one migration, a shared phone field, one RLS policy widening,
  and the register action's role gate).

## 4. Decision

**Proceed.** Two decisions locked with the client:
- **Phone required** on all creation forms; Nigerian format accepted as `0XXXXXXXXXX` or
  `+234XXXXXXXXXX`, normalised server-side to `+234…`. **Not unique** (households/shared lines).
- **Registrars:** leader + national (today) **plus** state, LGA, ward and unit coordinators.
  Each registers **only within their own scope**; they may attribute the member to a leader in
  that polling unit or hold the member themselves (same shape as the national-admin flow today).

**Needs an ADR?** No. No structural/authorization *model* change; the RLS pattern (scope
containment) already exists, this widens which roles it admits. Documented here + in the RLS test.

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [ ] T-060 — Migration: `phone` on `profiles` + `members`; a shared `lib/phone.ts`
      (normalise/validate) with unit tests.
- [ ] T-061 — Add the phone field to all creation forms (new-account, dev bootstrap, register)
      + server validation.
- [ ] T-062 — Widen member-registration authorization to the four coordinator roles: RLS
      policy on `members` INSERT + the `/app/register` role gate and geography handling, with
      allow/deny RLS tests.

## 6. Rollback plan

- Forms/action: revert the PR.
- RLS widening: a down-migration restoring the previous `members` INSERT policy.
- `phone` column: harmless to leave in place (nullable); drop via down-migration if truly needed.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
