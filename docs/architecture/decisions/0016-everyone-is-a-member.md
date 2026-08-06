# ADR-0016: Everyone is a member — staff hold a membership keyed to home registration

- **Status:** Accepted
- **Date:** 2026-08-06
- **Deciders:** Client, engineering
- **Supersedes / Superseded by:** none (builds on ADR-0015)

## Context

The platform models two kinds of records for a person:

- a **profile** (`profiles`, 1:1 with an auth user) carrying their **role** and **admin
  scope** (the geography they administer), and
- a **member** record (`members`) carrying a person's **registration** as a voter: home
  geography (state/LGA/ward/polling unit), NIN, VIN, date of birth, gender, and an immutable
  membership number `TWM-<STATE>-<LGA>-<seq>`, from which the membership card is rendered.

ADR-0015 already established that one person may hold **both** — a leadership profile and a
membership record — linked by the shared auth user id (`members.user_id = profiles.id`).

Today only base-tier users have a `members` row, so counts and cards cover only them. The
client wants **everyone** (admins, coordinators, leaders) to be a member: to hold a real
membership record + number + downloadable card, and to be included in the movement counts.

The obstacle is geography. A membership card and number require a **ward** (and LGA/state).
A person's **admin scope** does not supply this above the ward tier — a National Coordinator
administers the whole country and has no ward on their profile. So a membership cannot be
derived from admin scope.

## Decision

We will treat **every account as a member**, with a staff person's membership keyed to their
**personal home voter registration**, not their admin scope.

- Every person with `role <> 'member'` also gets a `members` row linked by `user_id`, holding
  their **home** state/LGA/ward/polling unit + NIN + VIN + DOB + gender. Their membership
  number and card derive from this row. This is orthogonal to the admin scope on their
  profile (a National Coordinator's profile has null scope; their member row has their home
  ward).
- Staff create this record through a **self-service onboarding prompt** after login (mirroring
  the existing password/VIN prompts), backed by a server action `completeMyMembership` that
  uses the service-role client **strictly scoped to `user_id = auth.uid()`** — it can only
  ever create the caller's own membership. The action validates and normalises input (age ≥ 18,
  NIN, VIN), **dedupes** against any existing row (by `user_id`, else NIN/VIN) to preserve the
  no-duplicate-registration invariant, inserts the row (`registered_by = self`; the number is
  assigned by the existing trigger), and sets `profile.vin_id` + `status='active'` — absorbing
  the standalone VIN prompt for staff.
- **Counts** become the movement total: because staff now hold member rows, the existing
  members-table counts include them with no counting logic change. Area counts therefore count
  people whose **home** is in that area; the National total is the true movement total.

No schema change is required: the `members` table, its triggers, and RLS already support this.
`members_select` lets a person read their own row (so the existing card route works for staff);
`sync_member_profile_scope` only rewrites base-tier profiles, so a staff member row never
disturbs admin scope.

## Options considered

1. **Membership keyed to home registration, self-service creation (chosen).** Resolves the
   geography gap for every tier, reuses the membership/number/card machinery unchanged, needs
   no migration. Cons: an area count now means "members whose home is here", a subtle shift;
   staff must complete an onboarding step.
2. **Membership derived from admin scope.** Simpler for leaders/unit coordinators (they have a
   ward) but leaves LGA/State/National admins with no ward, hence no valid number or card.
   Rejected: fails the client's "everyone" requirement.
3. **Assign staff a nominal/HQ geography.** Give higher tiers a placeholder ward so a card can
   render. Rejected: fabricates civic data, pollutes ward counts, and a card showing a fake
   ward is worse than honest home data.
4. **Fix only the count (union of profiles + members), no staff cards.** Smallest change, but
   the client explicitly asked for staff cards. Rejected as insufficient.

## Consequences

**Positive**

- Every person is a member with a card; counts reflect the movement's real size.
- Zero schema/RLS change — low risk, fast, nothing to reverse in the database.
- Reuses the membership number generator, card renderer, and card route as-is.
- The self-service path (`user_id = caller` only) cannot be used to register anyone else,
  preserving the no-duplicate and scoping invariants.

**Negative / obligations**

- A new onboarding step for staff, and existing staff are prompted on next login.
- "Members in your area" shifts meaning to home-based membership; documented and relabelled.
- A person's home registration data (NIN/VIN/DOB) must be collected and is sensitive; it is
  handled server-side through the caller-scoped action, never widened to the client.
- The service-role action is a privileged path; its safety rests on the hard `user_id =
  auth.uid()` constraint, which must be preserved in any future edit.
