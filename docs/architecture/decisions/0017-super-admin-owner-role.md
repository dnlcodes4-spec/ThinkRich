# ADR-0017: Super Admin (owner) role above National

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Client, engineering
- **Supersedes / Superseded by:** none; extends ADR-0012 (national-admin bootstrap), refines ADR-0005 (RLS as the authorization boundary)

## Context

The role ladder tops out at `national_admin` (`private.role_rank` = 1; `0038` restored
the CR-0003 ladder after CR-0019 was reverted). Every authorization barrier — the
`profiles_insert` / `profiles_update` policies, and the app's `allowedTargets` /
`manageableRoles` — is expressed as **`role_rank(target) > role_rank(caller)`** ("strictly
below"). A consequence is that a national admin can neither create nor remove another
national admin, and there is no single account with authority over the whole platform.

The client is the platform owner (CR-0015) and needs to appoint and remove admins at any
tier, including national, and oversee everything. Constraints: RLS is the authorization
boundary (ADR-0005); changes should be additive and low-risk after the CR-0019 revert;
Postgres cannot add an enum value and use it in the same transaction.

## Decision

We will add a `super_admin` role one tier above `national_admin`.

- **Rank.** `role_rank(super_admin) = 0`. Because every barrier keys on
  `role_rank(target) > role_rank(caller)`, rank 0 makes national (and all others)
  strictly below super_admin, so create/deactivate/delete of national admins is unlocked
  by the *existing* rules once `super_admin` is added to the role allowlists.
- **Superset of national.** `super_admin` is added **beside `national_admin`** in every
  place national is privileged: the scope engine (`profile_in_scope` / `member_in_scope`
  return true for super_admin — it sees everything), `profiles_insert` / `profiles_update`
  allowlists, `members_insert`, `polling_units_insert`, `candidacy_in_scope`, the
  elective-office `catalogue_write` policies, and the `activity_log` read policy. The
  `profiles_scope_matches_role` CHECK gains a `super_admin` case (all geography null).
- **Peer special-case.** `profiles_insert` / `profiles_update` become
  `current_user_role() = 'super_admin' OR role_rank(role) > role_rank(caller)`, and
  `allowedTargets` / `manageableRoles` include `super_admin` when the caller is a
  super_admin. So an owner may create and manage other owners; no lower tier can act on a
  super_admin (rank 0 outranks all).
- **No bespoke UI.** `super_admin` reuses the national dashboard, the **Team** page (which
  now lists national admins as manageable) and **Give app access** (which now offers
  National Coordinator and Super Admin). `isCoordinator`, `nav`, and the national-only
  views (`CoordinatorHome`, activity log) treat super_admin like national.
- **Bootstrap.** A one-time production seed promotes a chosen account to `super_admin`
  (clearing geography, ensuring a VIN), mirroring ADR-0012. No dev bootstrap page.
- **Migration in two steps.** Migration A: `ALTER TYPE user_role ADD VALUE 'super_admin'
  BEFORE 'national_admin'` (its own transaction; the value is unused, so harmless).
  Migration B (a separate transaction, after A commits): `role_rank`, the scope engine,
  the policies, and the CHECK — all referencing the now-committed value. B is dry-run on
  prod with `BEGIN…ROLLBACK` before applying, as CR-0019 established.

## Options considered

1. **New `super_admin` enum role at rank 0 (chosen).** Uses the existing rank machinery;
   additive; the "strictly below" barriers do the work. Cons: a wide (but mechanical) RLS
   sweep to add the role beside national everywhere; a deliberate peer special-case.
2. **A boolean `is_owner` flag on `profiles` instead of a role.** Avoids an enum change.
   Rejected: authorization is expressed through `role`/`role_rank` everywhere; a parallel
   flag would fork every policy into "role OR flag" checks, is easy to forget in one
   place, and muddies the single ordering source. A role is the honest model.
3. **A hard-coded owner email allowlist in app code.** Rejected for the same reason
   ADR-0012 rejected it: authorization must live in the database (RLS), not in a code
   constant the DB cannot see.
4. **Reuse `national_admin` and just relax "strictly below" to allow national↔national.**
   Rejected: it would let *any* national admin create/delete *any* other national admin,
   removing the single-owner authority the client asked for, and weakening the ladder.

## Consequences

**Positive**
- The owner can appoint/remove admins at any tier, including national and peers, and
  oversee the whole platform — through screens that already exist.
- Additive and low-risk: no data migration, no table change, existing roles untouched.
- Ordering stays governed by the single `role_rank` source; the new role slots in cleanly.

**Negative / obligations**
- A wide RLS sweep: `super_admin` must be added everywhere `national_admin` is privileged.
  Missing one spot silently under-powers the owner (caught by the allow/deny tests, which
  must assert super can reach each surface).
- The peer special-case is the one place the strict rank rule is relaxed; it must be
  scoped to `super_admin` only and is the highest-value target for the escalation tests.
- Generated types (`lib/database.types.ts`) must be regenerated after the enum change.
- The enum value cannot be dropped in place, so a full rollback recreates the type; an
  unused value is otherwise harmless.
