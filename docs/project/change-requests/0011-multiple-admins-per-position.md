# CR-0011: More than one admin may hold the same position

- **Status:** Assessed <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-07-30
- **Channel:** message
- **Related:** ADR-0005 (database as the authorization boundary), CR-0003 (six-level leadership
  model), CR-0007 §4a and CR-0009 §3.2 (both corrected app code that was narrower than the
  database), ADR-0015 (role upgrades)

## 1. What the client asked for

> "There can be more than one admin for the same position e.g. multiple admins for the same
> position of the state admin, this should be the same for every admin."

So: two or more people may hold `state_admin` for the same state, `lg_admin` for the same LGA,
`ward_admin` for the same ward, `unit_coordinator` for the same polling unit, and the same at every
other tier.

## 2. Why — the underlying need

A position is a workload, not a seat. One person covering a whole state cannot register, verify and
support at that volume, and if they travel, fall ill or leave, the area stops. Allowing several
people to hold a position lets the client staff by capacity rather than by org chart, and removes
the single point of failure at every tier.

## 3. Impact analysis

**The headline finding: the platform already permits this. Nothing blocks it today.**

This was verified against the schema rather than assumed:

- **No uniqueness on position.** `public.profiles` carries `profiles_role_idx`,
  `profiles_state_id_idx`, `profiles_lga_id_idx`, `profiles_ward_id_idx` and
  `profiles_polling_unit_id_idx` — all **plain, non-unique** indexes (`0004_identity.sql:36-40`).
  The only unique index on the table is `profiles_vin_id_key` (`0024_voter_ids.sql:45`), which is
  per-person, not per-position. There is no `unique (role, state_id)` or equivalent anywhere in
  migrations 0001 through 0030, and no trigger that counts existing holders.
- **The authorization model is scope-and-rank, not seat-based.** `private.profile_in_scope()` and
  `private.role_rank()` (`0006_private_schema_hardening.sql`) ask *"is this row inside your area?"*
  and *"does it rank below you?"*. Neither asks *"is the seat taken?"*. `profiles_insert` therefore
  admits a second holder of a position exactly as readily as the first.
- **Provisioning has no seat check either.** `createAccount` (`app/app/admin/new-account/actions.ts`)
  enforces the same two rules and nothing more; `allowedTargets` (`tiers.ts`) is purely rank-based.

**This is a property of ADR-0005's design, not an accident.** Because authorization was expressed as
geographic containment plus rank rather than as occupancy of a named post, plurality came free. It
is the third time application code or expectation has turned out to be narrower than the database
(CR-0007 §4a, CR-0009 §3.2), and the first time the answer is "no change required".

- **Surfaces/flows affected:** none functionally. One **UI gap** (below) and one **documentation
  gap** are worth closing so the capability is visible and stays that way.
- **Data/schema impact:** **none.** No migration. The correct action is to *not* add a constraint.
- **Breaking change?** No.
- **Invariants at risk:** none. Specifically checked, and each holds unchanged:
  - **No privilege escalation.** `profiles_update` still requires the target to rank *strictly
    below* the caller, so two state admins of the same state **cannot** edit, deactivate or delete
    each other. Only a national admin can. This is the right posture — co-equal admins must not be
    able to remove one another — and it means "remove a co-admin" escalates one tier up. Flagged for
    the client as a consequence, not a defect.
  - **One profile per person.** `profiles.id` is the auth user id, so plurality is many people in
    one position, never one person holding a position twice.
  - **Member ownership stays singular.** A member has exactly one owning leader
    (`members.registered_by`), so nothing about member attribution, capacity or the membership
    number becomes ambiguous. Several coordinators over the same polling unit do not split a
    member's ownership.
  - **Audit remains attributable.** `activity_log` records `actor_id` per action, so with several
    admins at a position it still says which one acted.
- **Already plural where it matters.** Two places that route or count by position were checked and
  both handle many holders correctly: member correction requests notify **every** state admin of the
  member's state (`app/app/profile/change-request-actions.ts:62-76`), and the States admin page
  counts admins per state and shows the tally (`app/app/admin/states/page.tsx:42,72`).
- **Conflicts with spec or another CR?** None. CR-0003's six-level model describes tiers, never
  seat counts.
- **Size:** trivial.

### 3.1 The one real gap — co-admins are invisible to each other

The Team page lists only roles the caller *manages*, which is every role **strictly below** them
(`manageableRoles` → `allowedTargets`, `tiers.ts:47-58`). A peer at the caller's own tier is
therefore never shown. Two state admins for Ogun can both work today and neither has any way to
learn the other exists, which invites duplicated work and confused hand-offs.

RLS already permits the read, so closing this needs **no policy change**: for a `state_admin`
caller, `private.profile_in_scope()` matches any profile whose `state_id` equals theirs, and a peer
state admin's row does. (A national admin's row has `state_id is null`, so upward visibility is not
opened by this.) The fix is presentational: list peers **read-only**, with no management controls,
which is also the honest rendering of the permission model, since `profiles_update` forbids acting
on them.

### 3.2 Adjacent pre-existing issue, deliberately not bundled

`createAccount` sets `states.is_active = true` when a state admin is provisioned
(`actions.ts:206-209`), but nothing clears it when admins are deactivated or deleted. With one admin
per state this was already wrong; with several it is merely more visible (removing one of two
*should* leave the state active — removing the last should not). Out of scope here because it is a
lifecycle question about state activation, not about plurality. Captured as **T-057**.

## 4. Decision

**Proceed** — as a confirm-and-surface change, not a build. The literal request needs no code: the
capability exists and is exercised by the same policies that have always been in force. What is
worth doing is (a) pinning the behaviour with a regression test so nobody later "tidies up" by
adding a `unique (role, scope)` index and silently breaks the client's requirement, (b) stating the
invariant in the security model where a future reader will look for it, and (c) making co-admins
visible to each other.

**Needs an ADR?** **No.** This does not change an architectural decision, it confirms one. ADR-0005
already establishes scope-and-rank authorization in the database; plurality of position holders is a
consequence of it. Writing an ADR would imply a decision point that does not exist.

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [ ] T-055 — Regression test pinning plural position holders: two `state_admin`s in one state, two
      `lg_admin`s in one LGA, two `unit_coordinator`s over one polling unit; plus the refusals that
      must survive (peer cannot update peer; still no cross-scope or upward insert).
- [ ] T-056 — Surface co-admins read-only on the Team page (§3.1), and document the invariant in
      [security-model.md](../../architecture/security-model.md).
- [x] T-057 — State activation lifecycle: decide and implement what happens to `states.is_active`
      when a state loses its last active admin (§3.2). **Done.** Decided as §3.2 anticipated: losing
      one of several holders leaves the state open, losing the last one closes it. Enforced in the
      database (`supabase/migrations/0031_state_closes_without_admin.sql`) so no code path can forget
      it, and deliberately one-directional — the database only ever closes a state, never opens one.
      Prompted by the live symptom: Ogun and Oyo were drawn as active on the national map with no
      coordinator and nobody registered.

## 6. Rollback plan

Nothing to roll back at the data layer — there is no migration. T-055 is test-only. T-056 is a
revert of one commit; reverting it removes a read-only listing and restores no permission, because
none was granted.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_ — the client should be told two things: this works today, and
  removing a co-admin is done by the tier above, since equals cannot remove equals.
