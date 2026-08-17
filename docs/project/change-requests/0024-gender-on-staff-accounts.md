# CR-0024: Capture gender on staff accounts (movement-wide gender stats)

- **Status:** Rejected (built, then reverted at the client's request) <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-08-15
- **Channel:** message
- **Related:** [CR-0014](0014-everyone-is-a-member.md) (everyone is a member; demographics were member-record-only), [CR-0017](0017-phone-numbers-and-coordinator-registration.md) (phone on every creation form)

## 1. What the client asked for

The Statistics gender breakdown only counted the ~9 people with a full voter record (all male), while the movement is ~89 people. The client wants gender to reflect the whole movement, so the chart is representative.

## 2. Why — the underlying need

Gender lived only on `members`. Staff accounts (leaders, coordinators, admins) are created through "Give app access", which never asked for gender, so 80 of 89 people had no gender at all and the chart looked skewed/empty.

## 3. Impact analysis

- **Surfaces/flows affected:** "Give app access" (`/app/admin/new-account`) gains a Gender field; the Statistics gender chart counts everyone.
- **Data/schema impact:** **new nullable column `gender`** on `public.profiles` (reusing the existing `public.gender` enum). Migration required. Nullable (expand/contract): existing staff stay valid and read as "Not recorded"; the app collects it on new writes.
- **Breaking change?** No. Additive column + one new required form field going forward.
- **Invariants at risk:** none. Gender is not an authorization input. A person who both holds a profile and a member record carries gender on both; Statistics counts each person once (member record first, else profile).
- **Conflicts:** none.
- **Size:** small (one migration, one form field + validation, one stats tweak).

## 4. Decision

**Proceed.** Add `profiles.gender`, collect it (required) on "Give app access", and compute the Statistics gender breakdown across the whole movement: each member record by its gender, plus each staff-without-a-record by their profile gender. Legacy staff show as "Not recorded" until re-captured; that is honest and improves as accounts are created.

**Needs an ADR?** No structural/authorization change.

## 5. Plan

- [x] `0042_profiles_gender.sql` — add nullable `gender` to `profiles`.
- [x] Regenerate/patch `lib/database.types.ts` for the new column.
- [x] "Give app access": Gender select + server validation + store on the profile.
- [x] Statistics: count gender across everyone; relabel the card to the whole movement.
- [ ] Apply `0042` to prod (dry-run `BEGIN…ROLLBACK`, then apply).

## 6. Rollback plan

- Form/action/stats: revert the PR.
- Column: `alter table public.profiles drop column gender;` (down-migration).

## 7. Outcome

- **Reverted.** Built and applied to prod (migration 0042), then the client decided gender should
  stay a **registered-voter demographic** rather than be captured on staff accounts. Migration 0043
  drops the column (no data loss — it was never populated), and the form/action/stats changes were
  removed. The gender chart keeps showing both Men and Women (even at 0), scoped to voter records.
- **Kept for history:** 0042 (add) + 0043 (revert) both stay in the ledger, per the CR-0019 precedent.
