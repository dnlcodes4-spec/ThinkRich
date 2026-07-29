# ADR-0015: Voter identity storage and the role-upgrade model

- **Status:** Proposed <!-- Proposed | Accepted | Deprecated | Superseded by ADR-XXXX -->
- **Date:** 2026-07-29
- **Deciders:** DNLCodess
- **Relates to:** [ADR-0005](0005-rls-as-authorization-boundary.md) (RLS is the authorization
  boundary), [ADR-0012](0012-national-admin-bootstrap.md) (why privilege-granting surfaces are
  restricted), [CR-0009](../../project/change-requests/0009-vin-identity-role-upgrades-uncapped-leaders-and-membership-card.md)
- **Supersedes / Superseded by:** none

## Context

CR-0009 asks for two things that look unrelated and turn out to share a root: the client wants a
**voter card number (VIN) held for every person in the system, unique**, and an **upgrade path** so
an admin can promote the person below them (a unit coordinator making one of their members a leader).

Both run into the same fact about the current data model: **a person is represented by up to two
rows, in two tables, and nothing states which one is authoritative.**

- `public.members` is the membership record. It holds the immutable membership number, the
  geography, and the identifying PII (`nin` unique, `vin` free text).
- `public.profiles` is the login/role record, one row per `auth.users`. Admins and leaders have one.
  Members have one **only if** someone provisioned them a login, in which case
  `provisionMemberLogin` also links `members.user_id`
  ([provision-login.ts:62-77](../../../app/app/members/provision-login.ts)).

Three consequences follow, and they are the forces this ADR has to resolve.

**1. VIN uniqueness has no single home.** Admins are only in `profiles`; members are only in
`members`; a leader is legitimately both. Postgres has no cross-table unique constraint, and a
trigger reading the sibling table is racy under concurrent inserts (two transactions each see no
conflict, both commit). The client's literal instruction, "set the VIN column to UNIQUE", is not
implementable as one constraint.

**2. `members.vin` cannot be `NOT NULL`.** Migration `0009` deliberately dropped `NOT NULL` from
`nin` and `date_of_birth` so permanent deletion can erase PII while keeping the membership number as
a tombstone. A required VIN must therefore be a constraint that exempts deleted rows.

**3. Member profiles carry no scope, and are therefore invisible to RLS.** `provisionMemberLogin`
inserts a `profiles` row with `role = 'member'` and no geography, which
`profiles_scope_matches_role` permits (`0005_rls_policies.sql:17`). But `profiles_select` and
`profiles_update` both delegate to `profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)`
(`0005_rls_policies.sql:103-120`), which for a unit coordinator evaluates
`null = current_polling_unit_id()` → `NULL`. **So no admin can read or write any member profile.**
Verified against the live project on 2026-07-29: both `role = 'member'` profiles have all four scope
columns null, while all twelve admin and leader profiles carry the scope their role requires.

This last point is what makes promotion a decision rather than a feature. Promotion is naturally
`update profiles set role = 'leader'`, and that statement is currently refused for every member.

Timing constraint: the live project holds **3 member rows, all test fixtures**, client-confirmed as
having no real members. Anything invasive is nearly free today and expensive after launch.

## Decision

**We will treat `members` as the record of the person and `profiles` as the record of their access,
give voter identity its own table, and make promotion an ordinary scoped `UPDATE` that RLS permits
on its own.**

Concretely, four commitments:

### 1. Voter identity lives in `public.voter_ids`

```
create table public.voter_ids (vin text primary key, created_at timestamptz not null default now());
```

`members.vin_id` and `profiles.vin_id` become nullable FKs to it, each with its own `UNIQUE` index.
System-wide uniqueness is then a **primary key**: one real constraint, no trigger, no race, and it
holds across both tables by construction. The per-table `UNIQUE` prevents two rows in the same table
claiming one VIN, while a person who is both a member and a leader references the same `voter_ids`
row from each, which is correct rather than a violation.

### 2. VIN is required by constraint, not by `NOT NULL`

```
alter table public.members add constraint members_vin_required
  check (status = 'deleted' or vin_id is not null);
```

Live rows must have one; erased rows may not. `profiles` gets the equivalent. Because there are no
real members yet, this ships **enforced from day one** rather than through expand → backfill →
contract.

### 3. VIN is normalised server-side before it is stored, never only in the field

A single helper is the only way a VIN enters the database: strip every non-alphanumeric character,
uppercase, then validate against `^[0-9A-Z]{19}$`. Client-side sanitising and `maxlength` are a
convenience for typing, **not** the control. Normalising only in the browser would let the same card
be stored as `90F5B05EEB...` and `90F5B-05EEB...`, defeating the primary key entirely.

### 4. Member profiles carry scope, and promotion is a scoped `UPDATE`

`role = 'member'` profiles get `state_id`, `lga_id`, `ward_id` and `polling_unit_id`, copied from the
person's `members` row at provisioning time and backfilled for existing rows. No policy changes:
`profile_in_scope` starts working for member profiles because its inputs stop being null, and
`enforce_profile_geography` (`0005_rls_policies.sql:42-59`) already validates that the path is
internally consistent.

Promotion then runs **under the caller's own credentials with no service-role client**, and the
existing `profiles_update` policy is the whole authorization rule. Its rank test already delivers
exactly the semantics the client asked for ("the admin above the intended person"), because it
checks rank on both the old and the new row: a unit coordinator (rank 5) may promote a member (7) to
leader (6), and may **not** promote a leader to coordinator, since `5 > 5` is false. No new policy,
no new predicate, no exception for this path.

## Options considered

### Where voter identity lives

1. **A shared `voter_ids` table (chosen).** Uniqueness is a primary key spanning both tables by
   construction. Cons: one extra join to display a VIN, and an extra insert on registration. Both
   trivial.
2. **A `vin` column on each table, each `UNIQUE`, plus a cross-checking trigger.** Rejected: racy
   under concurrency, and it wrongly rejects the legitimate case of one person holding both a member
   row and a leader profile.
3. **Store VIN only on `members`, and require every admin to also have a member row.** Genuinely
   tempting, and it would unify identity completely. Rejected for now: it would make every admin a
   member with a membership number, inflating every member count in the product and on the public
   organization page. That is a product decision the client has not made, and it can still be
   adopted later on top of this ADR.
4. **Store VIN only on `profiles`.** Rejected: most members never get a login, so most members would
   have nowhere to put one.

### How promotion works

1. **Backfill scope onto member profiles; promotion is a scoped `UPDATE` (chosen).** Keeps ADR-0005
   intact, since the database remains the authorization boundary and the app adds no privilege it
   does not already have. Also fixes the unrelated bug that member profiles are missing from the
   Team page. Cons: needs a migration, and every future writer of a member profile must remember to
   set scope. Mitigated by making it the provisioning helper's job in one place.
2. **A service-role Server Action that re-checks authorization in code.** Rejected. It would work,
   and the repo has precedent for it in provisioning, but a promotion path is a privilege-escalation
   path: putting it behind a client that bypasses RLS means the only thing standing between a member
   and a leader role is an `if` statement in TypeScript. ADR-0005 exists to prevent exactly this.
   The RLS hole in §3 of the Context is a reason to *fix* the policy inputs, not to route around them.
3. **A `SECURITY DEFINER` promote function.** Rejected as unnecessary. It is option 2's escape hatch
   in SQL clothing, and once member profiles carry scope, the ordinary policy already permits the
   statement.
4. **Delete the member profile and insert a leader profile.** Rejected: it would orphan
   `members.user_id`, break the person's login, and lose the `auth.users` row's history for no gain.

## Consequences

- **+ VIN uniqueness is a real database guarantee**, not application discipline, and it survives
  concurrent registration.
- **+ Promotion needs no new authorization code.** The rank rule the client described already exists
  and is already tested; this ADR makes its inputs valid.
- **+ A latent bug is fixed on the way past.** Member profiles become visible to their admins,
  which they should always have been.
- **+ Erasure still works.** Requiring a VIN by partial constraint keeps permanent deletion able to
  null PII while retaining the membership-number tombstone.
- **− Two writes on registration.** A VIN must be upserted into `voter_ids` before the member row
  references it. Both go in one transaction; a duplicate surfaces as a foreign-key/unique error that
  the Server Action maps to "that voter card is already registered", the same shape as the existing
  NIN duplicate handling.
- **− A new invariant to remember.** Any code inserting a `profiles` row must set scope. Enforcing
  it in the check constraint would be stronger, but tightening
  `profiles_scope_matches_role` for `role = 'member'` is deferred until the backfill has run and
  nothing writes a scopeless member profile.
- **− Promotion becomes a privilege-escalation surface by definition.** Obligation: RLS tests per
  role, asserting both that a legitimate promotion succeeds **and** that promoting to or above the
  caller's own rank fails, before it merges. Not after.
- **Deliberately out of scope:** **demotion**, which needs a rule for reassigning the demoted
  leader's members, and whether admins should also hold membership numbers (option 3 above). Both
  are follow-ups, not blockers.
- **Timing:** the VIN work is close to free while `members` holds 3 fixture rows and becomes a
  migration against live PII afterwards. Recommend shipping it before launch.
