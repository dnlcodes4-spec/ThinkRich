# ADR-0018: Partner organisations and the `partner_id` tenancy model

- **Status:** Accepted <!-- Proposed | Accepted | Deprecated | Superseded by ADR-XXXX -->
- **Date:** 2026-09-05
- **Deciders:** Client (owner), engineer
- **Supersedes / Superseded by:** none
- **Related:** [CR-0026](../../project/change-requests/0026-partner-organisations-and-tenancy.md);
  builds on ADR-0005 (RLS boundary), ADR-0017 (super_admin), ADR-0015 (voter identity),
  ADR-0016 (everyone is a member), ADR-0011 (provisioned logins).

## Context

The movement wants to absorb ready-made constituencies: a politician's existing support base,
or a community group's membership. The people who bring those groups in (CR-0026 calls them
**partners**) will only do so if they keep a usable vantage over *their* people. A political
partner wants to organise a voting bloc "just like ThinkWinners does"; a community partner
wants a provable headcount of what they contributed.

Forces:

- **Isolation both ways.** A partner must not see or manage the core movement's members or
  staff, or any other partner's. The core geographic admin chain (national, state, LG, ward,
  unit) must not see partner members or staff in its lists.
- **But not a separate product.** A partner member is a full ThinkWinners member: real polling
  unit, counted in the movement total and the public live count, sees their area's candidates,
  has a login and the standard membership card. The wall is about individual visibility and
  management, not about counting or membership status.
- **The owner sees everything.** The super admin already returns `true` in every RLS scope
  function (ADR-0017) and must keep a single view across all partitions.
- **Two shapes of partner.** Political partners need the full seven-tier hierarchy scoped to
  their seat; community partners need a flat member list and a count.
- **One identity per person.** NIN and VIN are already globally unique (ADR-0015). A person
  must belong to exactly one world.
- **RLS is the authorization boundary (ADR-0005).** Whatever we choose is enforced in Postgres.

## Decision

We will introduce a **single tenancy dimension**, a nullable `partner_id` on `public.profiles`
and `public.members`, where `NULL` means the core movement and a non-null value names the row's
partner. We will add **one** new role, `partner_admin`, as the partner's apex (a scoped
superset of `national_admin`); every tier below it reuses the existing `user_role` values,
carrying the partner's id.

The RLS scope engine gains **one predicate**, applied in `private.profile_in_scope`,
`private.member_in_scope`, and the privileged write policies:

> a caller sees a row only if `row.partner_id IS NOT DISTINCT FROM private.current_partner_id()`,
> and `super_admin` continues to see every partition.

Because a core caller's `current_partner_id()` is `NULL` and every existing row's `partner_id`
is `NULL`, the predicate is a no-op for all current data.

Supporting decisions:

- **Geographic ceiling (v1): state-level or nationwide.** `partners.scope_state_id` (nullable;
  `NULL` = nationwide). A political partner's hierarchy and members must fall within it,
  enforced by a trigger. Exact senatorial-district / federal-constituency ceilings are a
  **deferred follow-up** using the `constituencies` construct.
- **Membership-number namespacing.** When `partner_id` is set, the number is
  `TWM-<PARTNER>-<STATE>-<LGA>-<seq>` with a per-`(partner_id, lga)` sequence. Core numbers are
  unchanged. `partners.code` is the short unique segment.
- **Immutability.** `members.partner_id` and `profiles.partner_id` are set once at insert and
  changed only by a deliberate super-admin "move" action.
- **Count semantics.** Partner members count in the public live count and the National
  dashboard total (unscoped aggregate queries), and are absent from the geographic
  drill-downs (which pass through `member_in_scope`).

## Options considered

1. **Single `partner_id` dimension, reuse the ladder (chosen).**
   - Pros: reuses registration, cards, change-requests, KYM, activity log, candidate views and
     every screen almost unchanged. Fully additive migration, no backfill. One new enum value.
     "Just like ThinkWinners does" is nearly free.
   - Cons: a wide RLS sweep. Every scope function and privileged policy must carry the
     predicate, and a single object that misses it is a cross-partition leak. Mitigated by a
     per-role RLS test matrix (CR-0026 T-099) as a merge gate.

2. **Physically separate `partner_*` tables (a parallel schema).**
   - Pros: hard isolation. A core policy literally cannot return a partner row.
   - Cons: duplicates the entire hierarchy and every workflow permanently; contradicts "partner
     members are full ThinkWinners members"; every count becomes a UNION; doubles the
     maintenance surface forever. Rejected as a large YAGNI violation.

3. **A distinct role per tier (`partner_state_admin`, `partner_leader`, and so on).**
   - Pros: core and partner roles can never be confused in code or policy.
   - Cons: six-plus new enum values, awkward `role_rank` ordering, wide app-map churn, for no
     isolation gain over the `partner_id` predicate (which is what actually partitions). Rejected.

## Consequences

**Positive:**

- The movement can onboard a partner and give them a working management world in one flow,
  without new subsystems.
- The owner's cross-cutting view (ADR-0017) extends to partners with no extra work.
- Growth from partners shows in the headline numbers immediately.
- Additive and reversible while no real partner exists (see CR-0026 §6).

**Negative / new obligations:**

- **Every future RLS object must consider `partner_id`.** This becomes a standing review item
  in [code-review.md](../../engineering/code-review.md) and the security model, alongside role
  scoping.
- The per-role RLS test matrix (T-099) is a hard merge gate for the sweep and for any later
  policy that touches `profiles` or `members`.
- `role_rank` now has a role (`partner_admin`) that only ever compares within its own
  partition; the peer special-case stays `super_admin`-only.
- The `constituencies`-based ceiling is a known, deferred gap: v1 over-approximates a seat by
  its state.
- CR-0014 (`completeMyMembership`) and the provisioning path must set `partner_id`; the
  duplicate-registration warning must recognise the cross-world case.
- Two count paths (unscoped totals vs scoped drill-downs) must each be tested so partner
  members stay counted-but-hidden.
