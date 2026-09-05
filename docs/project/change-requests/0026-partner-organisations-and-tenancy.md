# CR-0026: Partner organisations (affiliated tenancy above the geographic hierarchy)

- **Status:** Captured <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-09-05
- **Channel:** message (relayed), refined in a design Q&A with the engineer on 2026-09-05
- **Related:** needs **ADR-0018** (this change). Builds on ADR-0017/CR-0015 (super_admin),
  ADR-0015/CR-0009 (voter identity, membership card), ADR-0016/CR-0014 (everyone is a member),
  ADR-0011 (provisioned logins), ADR-0005 (RLS is the authorization boundary).

## 1. What the client asked for

> "Now we need to proceed to the partnership. Its purpose is just to have someone like the
> super admin here who can manage all their members, however they are grouped into this. Note
> that each member will have their membership card as well."

Refined with the engineer on 2026-09-05 and treated as decided:

- **A partner is an affiliated organisation** that recruits its own people into ThinkWinners
  under its own banner. Two kinds:
  1. **Political** — a party coordinator or candidate for a seat (senator, federal rep,
     councillor, and so on) who "has members that he wants to vote him and wants to manage his
     members just like ThinkWinners does." This partner gets **the full hierarchical structure
     we already have** (its own state / LG / ward / unit admins, coordinators, leaders).
  2. **Community** — a non-political organisation that "just wants to bring his own community
     (members) to ThinkWinners" and "should be able to see how many people he has successfully
     brought" (so should the super admin). Flat: one partner admin, a member list, a count.
- **Walls.** A partner's members and staff **must not show to the ThinkWinners geographic
  admins** (national / state / LG / ward / unit). "The super admin should be able to see it
  clearly."
- **Partner members are still full ThinkWinners members**: real polling unit, counted in the
  movement total and the public live count, they see their area's candidates, they get a login
  and the standard membership card. The wall is about *individual visibility and management*,
  not about counting. Confirmed 2026-09-05: the National dashboard total and public live count
  **do** include partner members; a state admin drilling into their state's member list does
  **not** see them.
- **Geographic reach.** A political partner is **scoped to a ceiling the super admin sets at
  onboarding** (their seat). Their hierarchy only goes as deep as makes sense below that, and
  every member they register must fall inside it.
- **Logins:** partner members and partner staff get provisioned email + password accounts and
  use the same PWA, seeing only their partner's world.
- **Card:** the same ThinkWinners card for everyone, but the member's **unique code carries a
  segment that identifies the partner**.
- **Identity:** NIN and VIN stay required and globally unique, so **one person belongs to
  exactly one world** (the core movement, or partner X, or partner Y, never two). A person
  already registered in one world cannot be added by another without being moved. Confirmed
  intended. A member cannot sit under two partners.

## 2. Why, the underlying need

The movement grows faster if it can absorb ready-made constituencies: a politician's existing
support base, or a community group's membership. Those groups will only come in if their
leader keeps a usable vantage over *their* people (a political coordinator wants to organise a
voting bloc; a community organiser wants a provable headcount of what they contributed). At the
same time the movement cannot let an external partner see or touch the rest of its membership,
and the platform owner needs one clear view over all of it. So the request is really three
needs: **a self-contained management world per partner**, **a hard wall between that world and
the core movement's admin chain**, and **the owner's cross-cutting visibility**.

## 3. Impact analysis

### 3.1 The partition model

**Approach chosen (of three considered): a single `partner_id` dimension, reusing the existing
ladder.** A nullable `partner_id` on `profiles` and `members`, `NULL` meaning the core
movement. The partner's apex is one new role, `partner_admin`; `state_admin` … `leader` …
`member` beneath it are the same roles, carrying the partner's id. The RLS scope engine gains
one predicate: *you see a row only if its `partner_id` is not distinct from yours, and a core
geographic admin only ever sees `partner_id IS NULL`.* The super admin already returns `true`
in every scope function, so it sees every partition unchanged.

Rejected: physically separate `partner_*` tables (duplicates the entire hierarchy and every
workflow forever, contradicts "partner members are full ThinkWinners members", makes every
count a UNION). Rejected: a distinct role per tier (`partner_state_admin`, and so on) — six-plus
new enum values and awkward `role_rank` ordering for no isolation gain over the `partner_id`
predicate.

### 3.2 Surfaces and roles affected

- **New role** `partner_admin` on the `user_role` enum (a scoped superset of `national_admin`:
  everything a national admin does, confined to `partner_id = own` and within the partner's
  geographic ceiling; cannot create core admins, national admins, or super admins).
- **New super-admin surface: "Partners"** — list partners, onboard a partner (create the
  `partners` row and the first `partner_admin` account), see per-partner counts, deactivate.
- **Partner-admin experience** — the existing Team, registration, activity-log, change-request
  and candidate surfaces, scoped to the partner's world. A community partner gets a reduced
  view: members plus a "people brought" count, no sub-admin creation.
- **Core geographic admins** (national / state / LG / ward / unit): unchanged screens, but
  their member and profile lists now exclude every `partner_id IS NOT NULL` row.
- **App layer:** `app/app/admin/new-account/tiers.ts` (`ROLE_RANK`, `ROLE_LEVEL`, `ROLE_ORDER`,
  `allowedTargets`, `manageableRoles`, `scopeColumnsToClear`), `terms.ts`, `nav.ts`, the role
  home components and the `logs` guard, `lib/database.types.ts` (regenerate).
- **Membership card / provisioning** (CR-0009, CR-0014): the card's Code line shows the
  partner-namespaced number; provisioning and `completeMyMembership` must set `partner_id`.
- **Counts:** the public live count and the National dashboard total must keep counting partner
  members; the geographic drill-downs must stop. These are different query paths and each needs
  its own test.
- **Activity log:** partner actions carry `partner_id`; the super admin sees all, a partner
  admin sees only their own.
- **KYM verification:** partner leaders get codes too; verification is scoped within a partner.

### 3.3 Data / schema impact — migration required, additive

- **New enum value** `partner_admin` on `public.user_role` (its own migration/transaction, as
  with `super_admin` in `0039`).
- **New table `public.partners`**: `id`, `name`, `kind` (`political` | `community`),
  `scope_state_id` (nullable FK to `states`; `NULL` = nationwide ceiling — see §3.5),
  `code` (short, unique, used in membership numbers), `logo_url?`, `status`
  (`active` | `inactive`), `created_by`, `created_at`.
- **`partner_id uuid` nullable FK to `partners`** on `public.profiles` and `public.members`.
  `NULL` on every existing row; no backfill.
- **`private.current_partner_id()`** helper (mirrors `current_state_id()`), plus the
  partner predicate added to `private.profile_in_scope`, `private.member_in_scope`, and the
  `members_insert` / `polling_units_insert` / `profiles_insert` / `profiles_update` policies.
- **`profiles_scope_matches_role` CHECK**: add the `partner_admin` row shape (partner_id not
  null, geo columns null). A partner profile's scope must also sit within its partner's
  ceiling: that is a cross-row rule, so it goes in a trigger (like `enforce_profile_geography`),
  not the CHECK.
- **Immutability triggers**: `members.partner_id` and `profiles.partner_id` are set once and
  never rewritten except by a deliberate super-admin "move" action (mirrors membership-number
  immutability).
- **Membership number**: `private.assign_membership_number()` gains a partner branch,
  `TWM-<PARTNER>-<STATE>-<LGA>-<seq>`, and the per-LGA counter becomes per `(partner_id, lga)`
  (add `partner_id` to `lga_member_counters`, `NULL` for core).
- **No data migration.** Existing rows are all core (`partner_id IS NULL`); the predicate is
  written so `NULL = NULL` behaves exactly as today.

### 3.4 Breaking change?

**No, additive.** New nullable column, new table, new enum value, no destructive step. But the
RLS sweep is **wide** (every scope function and privileged policy gains the predicate), which is
the same risk profile as CR-0015: a single object that misses the predicate is a cross-partition
leak. This lives or dies on the RLS test matrix (§5, T-099).

### 3.5 Geographic ceiling granularity — a decision for the ADR

A senatorial district or federal constituency is not one geographic level (a senatorial
district spans several LGAs within one state; a federal constituency spans wards across LGAs).
The `constituencies` construct from the elective-office schema (`constituency_lgas`,
`constituency_wards`) can express these, but wiring the partner scope engine through it is a
real piece of work.

**Recommendation, agreed with the engineer on 2026-09-05: v1 ceiling is state-level or
nationwide** (`partners.scope_state_id`, `NULL` = nationwide). A senator's partner is scoped to
their state, which is a safe over-approximation of their seat. Exact constituency-level ceilings
are a **follow-up** (a `partners.scope_constituency_id` path) once the base tenancy is proven.

### 3.6 Invariants at risk

- **Partition isolation (highest risk).** A partner admin must never read or write a
  `partner_id IS NULL` row, a core geographic admin must never see a partner row, and no
  partner may see another partner. Every scope function and privileged policy must carry the
  predicate. Covered by T-099.
- **Privilege escalation.** `partner_admin` must not create `super_admin`, `national_admin`, or
  any core admin, and must not reach outside its ceiling. Enforced by the `role_rank` rule, the
  `profiles_insert` allowlist, the partner predicate, and the ceiling trigger together, tested
  per role.
- **No duplicate registration.** *Strengthened.* Global NIN/VIN uniqueness (ADR-0015) now also
  means one-world membership. The friendly pre-registration warning must recognise the
  cross-world case ("this person is already registered under another organisation or the core
  movement").
- **Membership number immutable.** Preserved. The format gains a partner segment but is still
  assigned once by the trigger and never updated.
- **Partner assignment immutable.** New invariant: `partner_id` is fixed at insert, changed
  only by an explicit super-admin move.
- **Movement count integrity.** Partner members count in the public and National totals but not
  in geographic drill-downs. Two query paths, two tests.
- **RLS remains the authorization boundary (ADR-0005).** The app mirrors the partition; it is
  never the sole control.

### 3.7 Conflicts with the spec or another CR

- **CR-0014 (everyone is a member).** Partner staff also need a member row and a card; those
  rows carry the partner's id. `completeMyMembership` and the provisioning path must set
  `partner_id`. Compatible, needs extending.
- **CR-0020 (voter vs member terminology).** Partner counts use "member" language.
- **ADR-0017 (super_admin peer rule).** The peer special-case stays `super_admin`-only;
  `partner_admin` is strictly below national in `role_rank` and never a peer of anyone core.
- No contradiction with the leadership model: a partner's hierarchy is a parallel instance of
  it, not a change to it.

### 3.8 Size

**Large, arguably its own roadmap phase.** Comparable to CR-0009 and CR-0015 combined: an enum
change, a new table, a wide RLS sweep with a full test matrix, membership-number namespacing,
two new UI areas (super-admin Partners, partner-admin scoping), and a docs sweep. The
independent early wins (enum, table, helper) can land first; the RLS sweep needs the ADR and
the test matrix before it goes near `main`.

## 4. Decision

- **Proceed**, on Approach A (single `partner_id` dimension, one new `partner_admin` role,
  reuse the ladder). Sequenced so the additive schema lands first and the RLS sweep gets the
  ADR and the per-role test matrix before merge.
- **Needs an ADR? Yes → ADR-0018**, covering: the `partner_id` partition model, the single new
  apex role, the geographic-ceiling design (state-level v1, constituency-level as a documented
  follow-up), membership-number namespacing, and the count semantics (partner members counted
  in totals, hidden from geographic drill-downs). Offer to run `/adr`.

## 5. Plan

Tasks proposed for the [task board](../task-board.md), in pull order:

- [ ] **T-094** — **ADR-0018**: the partner tenancy model. Blocks T-097 onward.
- [ ] **T-095** — Migration A: `alter type public.user_role add value 'partner_admin'` (own
      transaction), regenerate `lib/database.types.ts`.
- [ ] **T-096** — Migration B (additive): `partners` table, `partner_id` on `profiles` and
      `members` (nullable, no backfill), `private.current_partner_id()`, the `partner_id`
      immutability triggers, and the ceiling-enforcement trigger.
- [ ] **T-097** — Migration C (RLS sweep): partner predicate into `profile_in_scope`,
      `member_in_scope`, `members_insert`, `polling_units_insert`, `profiles_insert`,
      `profiles_update`, `activity_log` read, and the `profiles_scope_matches_role` CHECK
      (`partner_admin` shape). Dry-run on prod with `BEGIN … ROLLBACK` before applying.
- [ ] **T-098** — Membership-number namespacing: `(partner_id, lga)` counter,
      `TWM-<PARTNER>-<STATE>-<LGA>-<seq>` when `partner_id` is set; core format unchanged.
- [ ] **T-099** — SQL RLS test matrix: every role × {in-partner, cross-partner, core-admin vs
      partner row, partner-admin vs core row}, plus the privilege-escalation attempts
      (`partner_admin` creating a national/super/core admin, acting outside its ceiling).
- [ ] **T-100** — App layer: `tiers.ts`, `terms.ts`, `nav.ts`, role maps, role-home and `logs`
      guards treat `partner_admin` as a partner-scoped national; regenerate types.
- [ ] **T-101** — Super-admin **Partners** surface: list, onboard (partner row + first
      `partner_admin` account + kind + ceiling + code), per-partner counts, deactivate. UI,
      needs visual sign-off.
- [ ] **T-102** — Partner-admin scoping: Team / registration / activity log / change requests
      scoped to the partner world; the reduced community-partner view (members + "brought"
      count). UI, needs visual sign-off.
- [ ] **T-103** — Extend CR-0014 membership + card + provisioning for partner members and
      staff: partner segment on the card's Code line, `partner_id` set on provisioning and
      `completeMyMembership`, cross-world duplicate warning copy.
- [ ] **T-104** — Count integrity: verify and test that the public live count and the National
      total include partner members while geographic drill-downs exclude them.
- [ ] **T-105** — Docs sweep: `data-model.md`, `security-model.md`, `HANDBOOK.md`, the roadmap
      (new phase?), `CHANGELOG.md`.

**One item deferred by design:** exact constituency-level ceilings for political partners
(§3.5). v1 ships with a state-level or nationwide ceiling.

## 6. Rollback plan

- **Code:** revert the branch's squash-merge.
- **DB:** every change is additive.
  - The `partner_id` columns, `partners`, the counter change, and the helper drop cleanly while
    the only partner rows are test data. Cheap before any real partner is onboarded, which is
    the argument for shipping the schema pre-launch of the feature.
  - The RLS sweep is reverted by reapplying the pre-change function and policy definitions from
    git (the predicate is `partner_id IS NOT DISTINCT FROM …`, which for all-core data is a
    no-op, so a partial rollback is safe).
  - The enum value cannot be dropped in place; an unused `partner_admin` value is harmless.
  - Take a project snapshot before the prod apply, as with CR-0015/CR-0019.
- **Data:** a partner and its world can be deactivated (`partners.status = 'inactive'`) without
  deletion; its members remain valid membership records.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
