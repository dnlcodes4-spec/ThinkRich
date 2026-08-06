# CR-0014: Everyone is a member (staff hold real memberships + cards)

- **Status:** Assessed
- **Requested by:** Client (meeting)
- **Date requested:** 2026-08-06
- **Channel:** meeting (relayed)
- **Related:** ADR-0016 (this change), ADR-0015 (voter identity — a person may hold both a leadership profile and a membership record), CR-0009 (membership card)

## 1. What the client asked for

> "What is currently being counted as member is only the actual 'members', but it
> shouldn't be so. Everyone is a member at one level or another, even the admins.
> Give staff a real membership, and they must have their own membership card,
> downloadable in their own dashboard and in the members app as well."

So: every person with an account (admins, coordinators, leaders) is a member of the
movement, holds a real membership record + number, and can download a membership card.
The counts shown around the app must reflect this, not only the base tier.

## 2. Why — the underlying need

- **Accurate scale.** The movement's real size includes its organisers. Counting only
  the base tier under-reports it and reads as if staff are outside the movement.
- **Belonging + utility.** Staff are members too; a membership card is both recognition
  and a practical credential they can show.

## 3. Impact analysis

- **Surfaces/flows affected:** the app shell (a new onboarding prompt), every role's
  home (surface the card + ID), the account page, and the movement counts on the
  coordinator/national home.
- **Data/schema impact:** **none.** The `members` table already supports a person holding
  both a leadership profile and a membership record, linked by `user_id` (ADR-0015). Staff
  simply gain a `members` row. No new columns, enums, or RLS changes.
- **Breaking change?** No. Additive; base-tier members are unaffected.
- **Invariants at risk:**
  - *No duplicate registration* — a person must end up with exactly one membership.
    Enforced by `members.user_id` unique + the unique `nin`/`vin_id` indexes; the
    onboarding action matches an existing row (by `user_id`, else NIN/VIN) before creating.
  - *Membership number immutable* — unchanged; the existing trigger assigns it.
  - *Role scoping* — the staff member row uses the person's HOME geography and never
    rewrites their admin scope (`sync_member_profile_scope` only touches base-tier
    profiles). RLS remains the boundary.
- **Conflicts with spec or another CR?** None. Complements CR-0009's card and ADR-0015.
- **Size:** medium (code-only).

### Decisions locked with the client

- **Membership basis:** a staff person's membership + card use their **personal home
  voter registration** (home state/LGA/ward/polling unit + NIN/DOB/VIN), **separate from
  their admin scope**. This resolves the fact that higher-tier admins have no ward.
- **Data collection:** a **self-service onboarding prompt** after login (like the existing
  "add your voter's card" prompt), not required at account creation.
- **Counts:** **one combined movement total** — once staff hold member rows the existing
  members-table counts include them; the National total becomes the true movement total.
- **Existing staff:** **prompted on next login** to complete their membership (no bulk
  backfill).

## 4. Decision

- **Proceed.** Reflects the movement's real structure, low risk (code-only), reuses the
  existing membership machinery.
- **Needs an ADR?** **Yes → ADR-0016** (records the "a person is both staff and a member,
  membership keyed to home registration" model and the self-service creation path).

## 5. Plan

Proposed task breakdown (added to the [task board](../task-board.md) once the plan is approved):

- [ ] T-072 — `completeMyMembership` server action (admin client, strictly `user_id = caller`):
      validate + normalise (adult, NIN, VIN, phone optional), dedupe by user_id/NIN/VIN,
      insert the home-geography member row, set `profile.vin_id` + `status='active'`.
- [ ] T-073 — "Complete your membership" onboarding prompt in the app shell for staff
      accounts lacking a member row (mirrors the VIN/password prompts); geo picker for home PU.
- [ ] T-074 — Surface Membership ID + card download on Leader and Coordinator homes and the
      account page (fetch caller's own member row by `user_id`).
- [ ] T-075 — Count/label sweep: relabel to the movement total; verify National total now
      counts staff + voters; adjust the map tally as needed.
- [ ] T-076 — Tests (action validation unit tests; e2e onboarding + card for a staff role) + gates.

## 6. Rollback plan

- **Code:** revert the branch's squash-merge.
- **Data:** staff member rows created via onboarding are ordinary `members` rows; if the
  feature is withdrawn, they can be left in place (harmless) or removed by `user_id` for
  profiles whose `role <> 'member'`. No schema to reverse.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
