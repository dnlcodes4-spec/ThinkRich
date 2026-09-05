# CR-0025: Email is a required field everywhere it is collected

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-09-05
- **Channel:** message
- **Related:** [CR-0017](0017-phone-numbers-and-coordinator-registration.md) (same shape — a contact field made mandatory on every form), [ADR-0011](../../architecture/decisions/) (email captured at registration), [ADR-0015](0009-vin-identity-role-upgrades-uncapped-leaders-and-membership-card.md) (VIN identity), migration [0030](../../../supabase/migrations/0030_member_email_case_insensitive.sql) (case-insensitive email uniqueness)

## 1. What the client asked for

> "For everywhere we are collecting email, make it a required field."

> (follow-up, 2026-09-05) "You are right with your assumptions. However, let's find a
> way to allow the necessary admins [to] know those that are without email and make it
> easy for them to edit and add those group of people."

Assumptions confirmed by the client: every member gets an app login provisioned at
registration; email stays unique; existing members without an email are left in place and
cleaned up through the new admin tooling below rather than a bulk backfill.

## 2. Why — the underlying need

Email is the channel for the member's own app login (temporary password delivery,
password reset) and for direct contact. Today it is optional at member registration,
so a large share of members have **no email on file** and therefore **no way to sign in
to the app themselves** and no reset path. The client wants every person captured going
forward to be reachable and login-capable from day one.

## 3. Impact analysis

- **Surfaces/flows affected:**
  - **Member registration** — `/app/register` ([register-form.tsx](../../../app/app/register/register-form.tsx),
    [actions.ts](../../../app/app/register/actions.ts)). **This is the only collection point where
    email is currently optional.** The "Login (optional)" fieldset loses the "optional" marker and
    its "add later" copy; the email input becomes required.
  - Already required (no change, audit only): admin creation `/app/admin/new-account`
    ([actions.ts:27](../../../app/app/admin/new-account/actions.ts)), dev bootstrap
    `/dev/national-admins` ([actions.ts:32](../../../app/dev/national-admins/actions.ts)),
    Think-Winners partnership lead form ([actions.ts:12](../../../app/think-winners/actions.ts)).
  - **Profile / member-edit change requests** — email is an editable field
    ([change-request-fields.ts:12](../../../app/app/members/change-request-fields.ts),
    [change-request-actions.ts:40](../../../app/app/profile/change-request-actions.ts)). Format is
    validated; "required" means an edit may not **clear** an existing email to blank.
  - KYM verify form collects no email — not affected.
  - **Members roster** `/app/members` ([page.tsx](../../../app/app/members/page.tsx)) — gains a
    "No email on file" filter + a count, so admins can find the gap. RLS already scopes the list.
  - **Member roster row + detail page** ([member-login-cell.tsx](../../../app/app/members/member-login-cell.tsx),
    [[id]/page.tsx](../../../app/app/members/[id]/page.tsx)) — today a member without an email shows a dead
    "No email" label. It becomes an inline "Add email" input that writes the address and provisions
    the login in one step.
- **Data/schema impact:** No new column. `members.email` already exists (migration 0007),
  nullable, with a partial unique index on `lower(email)`. Following the **CR-0017 precedent**:
  the column **stays nullable in the DB** (existing null rows remain valid — we cannot invent
  addresses for them), and the requirement is **enforced in the app** (Zod) on every new write.
  No migration strictly required. Optionally a later `CHECK` once backfilled — out of scope here.
- **Breaking change?** Behavioural, not data-breaking:
  1. **Every new member now gets an auth login provisioned at registration** (today
     `provisionMemberLogin` runs only `if (email)` —
     [actions.ts](../../../app/app/register/actions.ts)). With email mandatory this becomes
     unconditional, so the registrar is **always** shown a temporary password to hand over.
     Confirmed intended by the client (2026-09-05).
  2. **`members.email` is uniquely indexed.** A household or assistant sharing one address can
     currently skip email; once mandatory, the **second such registration fails** with "already
     in use". Phone was deliberately made non-unique in CR-0017 for exactly this reason; email
     **cannot** be, because Supabase Auth keys logins by email. This is a real field constraint
     to flag to the client.
- **Invariants at risk:**
  - Membership-number immutability, no-duplicate-registration (NIN/VIN): **unchanged**.
  - Email case-insensitive uniqueness (0030): **unchanged**, now hit more often (see above).
  - Soft-delete anonymisation nulls `email` ([lifecycle-actions.ts:203](../../../app/app/members/lifecycle-actions.ts)):
    **must stay working** — any future DB constraint must exclude `status = 'deleted'`. App-level
    enforcement sidesteps this.
  - **Direct edit bypasses the correction-request review flow.** Today no one edits a
    `members` field directly — members raise a `change_request`, an admin approves it
    ([detail-actions.ts:73](../../../app/app/members/detail-actions.ts)). The new "add email" tool
    writes `members.email` straight away. Contained by: **null → value only** (changing an existing
    address still goes through review), a **write gate** — the caller must have a non-`member`
    profile **and** the target member must be returned by an **RLS-scoped read** (so a leader may
    only fill in members they registered, an admin only within their geography — the same
    containment the roster list already relies on), `emailField()` validation, and an
    **activity-log entry** (`member.email_added`).
- **Conflicts with spec or another CR?** The registration form's own copy ("Login (optional)",
  "You can add this later") contradicts the new rule and must change. No conflict with other
  open CRs.
- **Size:** small–medium. The registration change is a one-liner; the admin tooling adds a
  roster filter, one server action, an inline form on the row and detail page, and tests.

## 4. Decision

- **Proceed / Reject / Defer:** **Proceed.** Client confirmed the assumptions and the
  leader-inclusive edit permission on 2026-09-05.
- **Needs an ADR?** **No.** No structural, authorization, or architectural change — it tightens
  one field's validation, mirroring CR-0017. The CR plus a regression test is the record.

### Open questions (non-blocking — defaults chosen, flag if wrong)

1. **Shared email addresses:** two people still cannot share one email (unique, required for
   login). Household/assistant cases are blocked on the second registration. **Default:** accept
   the limit; no special exception path.
2. **Who may add a missing email:** **decided 2026-09-05 — leaders too.** Anyone with a
   non-`member` role may add a missing email for members inside their own RLS scope (a leader:
   members they registered; an admin: their geography). Not just the `canReview` set.
3. **Finding the gap:** a roster filter + count is the mechanism. **Default:** no email digest /
   notification and no CSV export in this CR — add later if the volume warrants it.

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [ ] T-089 — Make email required in member registration (`/app/register`): Zod schema, form
  field required + relabel the fieldset (drop "optional" / "add later" copy), unconditional
  `provisionMemberLogin`; regression test for the required-field + always-provision behaviour.
- [ ] T-090 — Guard the profile/member email change-request path so an edit cannot blank an
  existing email; keep format validation.
- [ ] T-091 — "No email on file" filter + count on the members roster (`/app/members`):
  query narrows to `email is null` and excludes deleted; header shows "N of M members have no
  email". RLS scopes it per role.
- [ ] T-092 — Inline "Add email" for a member without one: new `addMemberEmail` server action
  (write gate = non-`member` role + target returned by RLS-scoped read, `emailField()`
  validation, null→value only, admin-client write, then `provisionMemberLogin`,
  `member.email_added` activity log, 23505 handling). Wire it into the roster row
  (`member-login-cell`) and the member detail page Email fact. Tests: authorized add + provision,
  out-of-scope denial, duplicate-email rejection.
- [ ] T-093 — Audit + document: confirm all other collection points already require email
  (admin new-account, national-admins, think-winners); update the registration-fields doc and
  `CHANGELOG.md`.

## 6. Rollback plan

Pure app-level change, no migration. Revert the PR(s) to restore email-optional registration
and remove the roster filter / add-email action. No data cleanup needed — emails and logins
created while the rule was active stay valid afterwards.

## 7. Outcome

- **Shipped in:** <PR / release / commit>
- **Client confirmed:** <yes/no + date>
