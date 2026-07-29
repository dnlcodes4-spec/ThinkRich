# CR-0009: VIN identity, role upgrades, uncapped leaders, membership card, KYM repair

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-07-29
- **Channel:** message
- **Related:** amends the ≤10-members rule set in [CR-0003](0003-ward-tier-and-leadership-model.md)
  and restated in [CR-0007 §4a](0007-full-elective-office-coverage.md); continues the
  "app code is stricter than the database" correction started in CR-0007 §4a;
  the role-upgrade model needs **ADR-0015**

## 1. What the client asked for

Seven items, in one message:

1. > "Before registering any admin, include voter card number to be passed in as part of the
   > information to be gathered."

2. > "Entering the voter card number where we are getting voter card number also known VIN should
   > follow this format: Sanitise the Input First: Users often type spaces or hyphens (e.g.
   > `90F5B-05EEB...` or `90F5B 05EEB...`). Strip all spaces and special characters before running
   > the validation test. Auto-Capitalisation: Force the input text field to transform all lowercase
   > letters to uppercase automatically, as VIN letters are always capitalised. Character Limit
   > (Length Constraint): Set the maximum length of the input field to 19 characters (excluding
   > spaces). Database Uniqueness: Set the VIN column in your database to UNIQUE to prevent the same
   > voter card number from being registered twice in your system."

3. > "Upgrade system that allows the admin above the intended person to be upgraded e.g polling unit
   > being able to upgrade a member to leader, we need to plan effectively for this system."

4. > "Registration of leader at any hierarchy level which means any admin above leader should be able
   > to register anyone to be a leader."

5. > "Leaders aren't capped to just 10 member registration, they can register more, but once they
   > reach 10, there has to be a congratulations message on their dashboard to reflect this."

6. > "The members card design is ready, there are two formats, one filled already to show how it is
   > meant to look like after it has been filled and the other empty that should actually be used.
   > It should be available to be downloaded any time on their respective dashboard."

   Artwork supplied: `public/cards/`, the filled sample and the blank template to render onto.

7. > "Leader Verification is not functional yet -> we need to decide on the flow for this if we
   > haven't already."

Four points clarified with the engineer on 2026-07-29 and treated as decided:

- **(7)** The KYM code flow exists; the complaint is that it does not work in practice, not that a
  different feature is wanted. Treat as a defect, not a new flow. See §3.6.
- **(3)** Promotion **keeps** the person's `members` row and their membership number, and gives them
  a `profiles` role alongside it. Membership number immutability is preserved.
- **(1/2)** VIN becomes **required for everyone**: admins, leaders and members.
- **(6)** Add a `gender` column and capture it at registration, so the card's GENDER line can be
  filled.

## 2. Why, the underlying need

The seven items are three separate needs wearing one message.

**Identity that can be trusted (1, 2, 7).** The movement's value to a candidate is that its members
are *real, verifiable voters*. NIN already deduplicates humans, but a NIN says nothing about whether
someone can vote. The VIN does, and it is the number a candidate's own agents can cross-check
against the INEC register. Requiring it of admins too closes the obvious gap: the people running
the structure are currently the only ones we hold no voter identity for. Item 7 is the same need at
the other end. A leader in the field needs to prove they are genuine, and today they cannot.

**A structure that can actually be staffed (3, 4, 5).** The hierarchy is fixed at seven levels but
the paths *into* it are missing. A unit coordinator who finds a capable member has no way to make
them a leader. A ward or LG admin who needs a leader in an unstaffed polling unit cannot create one.
And the ≤10 cap means a leader who is genuinely mobilising has to stop at ten and wait for someone
to create another leader. Every one of these is a growth brake, which is why they arrived together.

**Proof of membership the member can hold (6).** A membership number in a web app is not something
you show at a rally. The card is the artefact members actually wanted.

## 3. Impact analysis

### 3.1 VIN capture for admins, and the format rules (items 1, 2)

**Today.** `members.vin` is a plain nullable `text` with **no uniqueness, no format validation and no
normalisation** (`0004_identity.sql:59`). The registration form labels it *"Voter's ID number
(optional)"* (`register-form.tsx:116`) and the Zod schema is `z.string().trim().optional()`
(`register/actions.ts:26`). `profiles` has **no VIN column at all**, so no admin, coordinator or
leader account holds one.

**Two problems the literal ask does not anticipate.**

- **"Set the VIN column to UNIQUE" cannot be done with one constraint, because there will be two
  columns.** Admins live in `profiles`, members live in `members`. Postgres has no cross-table
  unique constraint, and a trigger that checks the other table is racy under concurrent inserts.
  A person can legitimately be both (a leader is also a member, see §3.3), so a naive per-table
  unique constraint would *also* wrongly reject their own second row.
  **Recommended shape:** a single `public.voter_ids` table with `vin text primary key`, and a
  nullable, unique FK from both `members` and `profiles`. Uniqueness is then a real database
  constraint over the whole system, enforced once, with no trigger and no race. Decided in
  **ADR-0015**.
- **"Required for everyone" cannot mean `NOT NULL` on `members.vin`.** Migration `0009` deliberately
  *dropped* the `NOT NULL` on `nin` and `date_of_birth` so that permanent deletion can erase PII
  while keeping the membership number as a tombstone (`0009_membership_lifecycle.sql:6-9`). A blanket
  `NOT NULL` on `vin` would make a deleted member unerasable.
  **Recommended shape:** required in the Zod schema at registration and provisioning, plus a
  **partial** constraint, `check (status = 'deleted' or vin_id is not null)`, so it binds live rows
  only. Same pattern the lifecycle design already relies on.

**Format.** The client's four rules are all client-and-server input handling, not schema:
sanitise (strip everything non-alphanumeric), uppercase, cap at 19 characters, then validate.
The client did not give the validation test itself; the Nigerian PVC VIN is 19 alphanumeric
characters, so the assumed rule is `^[0-9A-Z]{19}$` **after** sanitising. Normalisation must happen
**server-side as well as in the field**, or the uniqueness constraint is trivially defeated by
typing the same VIN with different punctuation. The `maxlength=19` on the input must be applied to
the *sanitised* value, not the raw one, or a user typing hyphens gets truncated mid-entry.

- **Surfaces:** `/app/register` (member), `/app/admin/new-account` (admins and leaders),
  `/app/members/[id]` (display), `change-request-fields.ts` (member-initiated corrections).
- **Migration required?** Yes.
- **Breaking?** **No, measured 2026-07-29 against the live project** (`jnkompitykukixbzmmkm`).
  `members` holds **3 rows, all test data**, client-confirmed as having no real members yet. All
  three carry a VIN, so there is nothing to chase, but **two of the three share the same VIN** and
  none matches the assumed format (lengths 10, 10 and 11 against the expected 19). So the
  expand → backfill → constrain dance is **not needed**: correct or clear the three fixture rows and
  enforce the real rule in a single migration. This is a one-time window that closes the moment real
  registration starts, which is an argument for doing §3.1 *before* launch rather than after.
- **Invariants at risk:** no-duplicate-registration is *strengthened*. PII erasure on permanent
  delete is at risk if this is done as a plain `NOT NULL`.
- **Size:** medium.

### 3.2 Leader registration at any tier (item 4)

**The database already allows this.** `profiles_insert` requires only that the target role rank
strictly below the caller's and sit inside the caller's scope (`0005_rls_policies.sql:109-113`).
A ward admin creating a leader satisfies both. The restriction is **application code contradicting
the database**, exactly the defect class corrected in CR-0007 §4a. `NEXT_TIER` in
[tiers.ts:57-62](../../../app/app/admin/new-account/tiers.ts) hard-codes each admin to precisely one
role below them, so only a unit coordinator may create a leader.

**Recommended fix is a simplification, not an addition.** Make `allowedTargets()` return *every role
strictly below the caller*, which is what `profiles_insert` already says. That also deletes the
national-admin special case, which becomes an instance of the general rule rather than a branch.

- **Surfaces:** `/app/admin/new-account` (role picker, and the geography cascade must go as deep as
  the chosen role rather than as deep as the caller's tier), `/app/admin/team` (`manageableRoles`).
- **Migration required?** No. Application code only.
- **Invariants at risk:** none. Role scoping is unchanged and still enforced in the database; this
  removes a UI limit that was never the security control.
- **Size:** small.

### 3.3 The upgrade system (item 3), the one with a real blocker

**Promotion is not an insert, it is an update, and it is currently refused by RLS.**

When a member is given a login, `provisionMemberLogin` creates three things: an `auth.users` row, a
`profiles` row with `role = 'member'`, and `members.user_id` linking them
([provision-login.ts:62-77](../../../app/app/members/provision-login.ts)). So a member with a login
*already has a profile*. Promotion is therefore `update profiles set role = 'leader', <scope>`.

That profile is created **with no scope columns at all**: no state, LGA, ward or polling unit,
because `profiles_scope_matches_role` permits `role = 'member'` to have none
(`0005_rls_policies.sql:17`). And `profiles_update`'s `USING` clause calls
`profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)` against those columns
(`0005_rls_policies.sql:114-116`). For a unit coordinator that evaluates
`null = current_polling_unit_id()` → `NULL` → not true, and `p_id = auth.uid()` is false.

**Consequence, verified by reading the policies: every member profile is invisible and unwritable to
every admin under RLS.** No admin can promote a member today, and this is not a missing UI; it is a
hole in the policy set. It also means member profiles are unreadable on the Team page. This was not
in the client's request and is the single most important finding in this CR.

**Confirmed in live data (2026-07-29):** both `role = 'member'` profiles in the project have
`state_id`, `lga_id`, `ward_id` and `polling_unit_id` all null, while every one of the ten admin and
leader profiles carries the scope its role requires. The hole is real, not theoretical.

**Recommended fix:** backfill scope columns onto `role = 'member'` profiles from their `members` row,
and set them at provisioning time going forward. `profile_in_scope` then works for member profiles
with no policy change, `enforce_profile_geography` already validates consistency
(`0005_rls_policies.sql:42-59`), and promotion becomes a plain scoped `update` **under the caller's
own credentials with no service role**, which is what ADR-0005 asks for.

**The rank rule already gives the client's "admin above the intended person" semantics for free.**
`profiles_update` checks rank on both the old and the new row, so an admin can only promote someone
to a level *still strictly below their own*. A unit coordinator (rank 5) promoting a member (7) to
leader (6) passes; the same coordinator promoting a leader to coordinator (5) fails, because
`5 > 5` is false. That is the correct invariant and it needs no new code.

**Open questions to settle in the ADR, not here:**

- **Demotion. Decided by the engineer on 2026-07-29** (the client delegated this one).
  **Demotion is supported, and a leader holding active members cannot be demoted until those members
  are moved.**

  The mechanism is already there: `profiles_update` checks rank on both the old and the new row, so
  an admin may demote anyone below them to any other level still below them, and cannot demote
  someone to their own rank or above. Nothing new is needed for *who may* demote.

  What is needed is a rule for the members left behind. `members.registered_by` is `on delete
  restrict` and not nullable, so they cannot simply be orphaned; and silently reassigning them
  destroys the recruitment history the whole structure is counted from. So: **the demoting admin
  must first move the leader's active members**, to another leader in the same polling unit or to
  themselves (migration `0019` already permits an admin to hold members directly). Enforced by a
  trigger, not just the UI, because it is a data-integrity rule.

  Rejected: auto-reassigning to the demoting admin (hides a real decision inside an unrelated
  action), and blocking demotion outright (leaves no way to correct a bad appointment).
- **A promoted member's old attribution.** They keep counting against the leader who registered
  them. With the cap gone (§3.4) this is harmless, and keeping it preserves the recruitment history.
- **Geography on promotion.** A leader profile requires the full state→LGA→ward→PU path; take it
  from the member's own row rather than asking the admin to re-enter it.

Impact:

- **Surfaces:** new promote action plus confirmation UI on `/app/members/[id]` and `/app/admin/team`;
  `activity_log` entry; the promoted person's dashboard changes role.
- **Migration required?** Yes, the member-profile scope backfill.
- **Breaking?** No. The backfill only fills columns that are currently null.
- **Invariants at risk:** **role scoping. This is the highest-risk item in the CR.** A promotion path
  is a privilege-escalation path by definition. It must be covered by RLS tests per role before it
  ships, not after.
- **Size:** large.

### 3.4 The ≤10 cap is lifted (item 5)

**This contradicts a documented structural claim in eleven places, and the client should know that.**
The cap is not just a trigger; "a leader manages exactly 10 members" is how the pyramid is described
throughout: [CR-0003](0003-ward-tier-and-leadership-model.md) (twice), `HANDBOOK.md:23` and `:164`,
`data-model.md:72` and `:156`, `security-model.md:23` and `:45`, `ADR-0005:11`, `overview.md:32`,
`BUILD-PLAN.md:31`, `ux-by-user-type.md:31`, and the public
`/think-winners/organization` page, which projects national numbers from it.

Lifting it is a reasonable call, since a hard stop on your best recruiters is a bad rule, but the
"1 leader × 10 members" arithmetic on the organization page stops describing reality the day it
ships. **Recommend: proceed, and restate the ten as a milestone rather than a ceiling** ("a leader's
first ten"), which is exactly what item 5's congratulations message implies. The docs sweep is part
of the work, not an afterthought.

**Mechanically this is small.** `private.enforce_leader_capacity()` was already narrowed to
registrars whose role is `leader` in migration `0019`; it now gets dropped, along with its trigger.
`rls_test.sql` and `elective_offices_rls_test.sql` both assert the cap and must be updated in the
same change, or CI goes red.

**Answered 2026-07-29: a permanent badge**, not a one-time celebration. So it is derived state, not
an event: the dashboard shows it whenever the leader's active member count is ten or more, and it
needs no per-leader "seen" record and no dismissal. Simpler than the dismissible version originally
recommended. It does mean the badge disappears if a leader drops back under ten (through opt-outs),
which is the honest behaviour for a derived badge.

- **Surfaces:** leader dashboard (`app/app/page.tsx`), the registration action's error mapping, the
  docs listed above, both RLS test suites.
- **Migration required?** Yes, drop the trigger and function.
- **Breaking?** No. It only permits what was previously refused.
- **Invariants at risk:** removes one deliberately. Nothing else depends on it for security; it was
  a business rule, never an authorization control.
- **Size:** small (code), medium (docs sweep).

### 3.5 Downloadable membership card (item 6)

The blank template is the render target; the filled sample is reference only. The card needs six
fields: **NAME, GENDER, STATE, L.G, WARD, Code**.

- **`gender` does not exist on `members`.** New nullable column plus a registration field. Note this
  makes gender a new category of PII we store, which the privacy documentation should acknowledge.
  Existing members render a blank GENDER line until they supply it via `change_requests`.
- **WARD renders as a number on the sample card** ("WARD: 12"). **The client answered "number" on
  2026-07-29, and we cannot honour it: there is no ward number in this system.** `public.wards`
  holds exactly `id, lga_id, name, created_at` (verified against the live database), and ward names
  are place names, not numbers: "Auna South", "Awkuzu III", "Gandi 'B'", "SI, (Lekki I)". Nothing in
  the 8,793 rows yields "12".

  Three ways forward, and this needs a client decision before T-048 can finish:

  1. **Print the ward name** (what we hold, today, for free). The card reads "WARD: Awkuzu III".
  2. **Source INEC's official ward codes** and add a `code` column to `wards`, mirroring what
     `polling_units.code` already does. This is a real data-import task on the scale of T-031, and
     it is the only option that produces a genuine ward number.
  3. **Number the wards ourselves**, e.g. by position within the LGA. **Recommend against.** It
     would be a number we invented that matches no INEC document, printed onto a card members
     present as identification, and it would silently renumber if ward data were ever re-imported.
     It also breaks the standard T-031 set for this repo: geography data is parsed from source
     documents, never model-generated.

  **Recommendation: (1) now, (2) as a separate task if the client wants true ward numbers.**
- **`members.status`** must gate this: a frozen or deleted member should not be able to download a
  current card.
- **Rendering approach.** Recommend server-side composition onto the supplied PNG, returned as a
  download from a Route Handler with the member's own authorization applied, not client-side canvas,
  which would ship the blank template plus every member's data to the browser and makes forgery
  trivial. Two consumers: the member's own dashboard, and a leader downloading cards for their
  members (`data-model.md:156` already promises the latter).
- **The two supplied files were duplicated** (verified by checksum: `Card 2.png` byte-identical to
  `Card empty.png`, `card 4.png` to `card filled.png`). Resolved when this CR was captured: kept one
  of each as `public/cards/membership-card-blank.png` (the render target) and
  `membership-card-sample-filled.png` (reference only).

Impact:

- **Surfaces:** member dashboard, leader roster, new route handler, registration form.
- **Migration required?** Yes, `gender`.
- **Breaking?** No.
- **Invariants at risk:** scoping. The download route must enforce that you can only fetch a card you
  are entitled to. It is a new data-egress surface and needs its own authorization test.
- **Size:** medium.

### 3.6 Leader verification (item 7), confirmed defects

The flow is built (`0014_leader_kym_codes.sql`, `/app/kym`), and reading it against the client's
"not functional" turns up four concrete faults, in descending order of likely blame:

1. **Nothing mints a code.** A leader has to find `/app/kym` themselves and press "Generate my code"
   ([kym/page.tsx:56-63](../../../app/app/kym/page.tsx)). **Confirmed in live data (2026-07-29):
   `leader_kym_codes` holds zero rows** against fourteen profiles, so not one leader or admin has
   ever had a code and *every* verification attempt has correctly returned "not verified". **This
   alone explains the report.** Fix: mint on provisioning, and backfill every existing leader and
   admin.
2. **Members cannot verify anyone.** Verification is leader-to-leader only. **Answered 2026-07-29:
   keep it that way, only a leader may verify another leader.** So this is not a fault, and the
   behaviour stands. Recorded here because the reasoning matters for anyone reading the code later:
   the restriction is a *product* choice, not a security boundary. Everything the lookup returns
   (name, role, state, LGA) is public-facing, so the gate lives in the Server Action, and
   `verify_kym_code` is granted to `authenticated` but explicitly revoked from `anon`. Opening it to
   members or the public later is a grant change plus rate limiting, not a redesign.
3. **Missing configuration guard.** Both KYM actions call `createAdminClient()` with no
   `isAdminConfigured()` check, unlike every other service-role caller in the codebase
   (`new-account/actions.ts:51`, `provision-login.ts:28`). On a deploy without
   `SUPABASE_SERVICE_ROLE_KEY` this throws an opaque 500 instead of the readable message
   `lib/supabase/admin.ts` exists to provide.
4. **`generateMyKymCode` cannot report failure.** It returns `void`; if all six collision retries
   fail, the user sees the button do nothing. It needs an action state like every other form here.

Impact:

- **Surfaces:** `/app/kym`, provisioning actions, a backfill migration.
- **Migration required?** Yes, to backfill codes for existing leaders and admins.
- **Breaking?** No.
- **Invariants at risk:** if verification opens to members or the public, the response must stay the
  same minimal public identity (name, role, area) it returns now, never the code table, never PII.
  Opening it publicly also needs rate limiting, which does not exist today.
- **Size:** small (faults 1, 3, 4) plus a decision on (2).

### 3.7 Conflicts with the spec or another CR

- **Item 5 contradicts CR-0003 and eleven documentation sites** (§3.4). Proceeding, with a docs sweep.
- **Item 1's "UNIQUE column" is not implementable as stated** (§3.1). Proceeding with a shared
  `voter_ids` table, which delivers the intent properly.
- **Item 3 depends on a policy hole the client does not know about** (§3.3) and cannot ship without
  fixing it.
- Everything else is additive.

### Size

**Large overall.** §3.2 and §3.6 are small and independent and can ship first; §3.1, §3.3 and §3.5
each carry a migration; §3.3 needs an ADR before any code.

## 4. Decision

**Proceed on all seven**, sequenced so the cheap independent wins land first and the two items that
touch authorization get an ADR and RLS tests before they go near `main`.

**Needs an ADR?** **Yes, ADR-0015**, covering two structural decisions that will outlive this CR:

1. **Where voter identity lives.** A shared `voter_ids` table referenced by both `members` and
   `profiles`, so system-wide VIN uniqueness is one real database constraint rather than a trigger.
2. **The role-upgrade model.** That a person is a persistent `members` row plus an optional
   `profiles` role, that promotion is a scoped `update` under the caller's own credentials rather
   than a service-role escape hatch, and that member profiles must therefore carry scope.

Written: [ADR-0015](../../architecture/decisions/0015-voter-identity-and-role-upgrades.md) (Proposed).

## 5. Plan

Tasks proposed for the [task board](../task-board.md), in the order they should be pulled:

- [ ] **T-038** — Repair KYM verification: mint a code at provisioning plus backfill existing
  leaders and admins, add the `isAdminConfigured()` guard, give `generateMyKymCode` a real action
  state. *(§3.6 faults 1, 3, 4. Independent of everything else; ship first.)*
- [ ] **T-039** — Any admin may create any role below them: generalise `allowedTargets()` to match
  `profiles_insert`, deepen the geography cascade to the target role, delete the national-admin
  special case. *(§3.2. Application code only.)*
- [ ] **T-040** — Lift the ≤10 cap: drop the trigger and function, update both RLS test suites, and
  sweep the eleven documentation sites to reframe ten as a milestone. *(§3.4.)*
- [ ] **T-041** — Leader's tenth-member congratulations on the dashboard, dismissible, tracked per
  leader. *(§3.4. UI, needs visual sign-off. Depends on T-040.)*
- [ ] **T-042** — **ADR-0015**: voter-identity storage and the role-upgrade model. *(Blocks T-043
  and T-045.)*
- [ ] **T-043** — Migration: `voter_ids` table, FKs from `members` and `profiles`, the partial
  constraint, server-side sanitise/uppercase/validate helper, VIN required in Zod for registration
  **and** account provisioning. Fixes the three fixture rows in the same migration.
  *(§3.1. Depends on T-042.)*
- [ ] ~~**T-044**~~ — **Dropped.** It existed to measure and backfill existing VINs before
  constraining. Measurement on 2026-07-29 showed 3 test rows and no real members, so the constraint
  goes in with T-043 and there is nothing to backfill.
- [ ] **T-045** — Migration: scope columns on member profiles plus backfill, closing the RLS hole in
  §3.3, with tests proving an admin can now see a member profile in scope and still cannot see one
  outside it. *(§3.3. Depends on T-042.)*
- [ ] **T-046** — Promote a member to leader (and an admin to any role below the caller): scoped
  action under the caller's own credentials, confirmation UI, activity-log entry, RLS tests per role.
  *(§3.3. UI, needs visual sign-off. Depends on T-045.)*
- [ ] **T-047** — Migration: `gender` on `members`, plus the registration field and the
  change-request field. *(§3.5.)*
- [ ] **T-048** — Membership card download: server-side render onto the blank template, authorized
  route handler, member dashboard and leader roster entry points, deduplicated artwork.
  *(§3.5. UI, needs visual sign-off. Depends on T-047.)*

- [ ] **T-049** — Demotion, with the "move their members first" rule enforced by a trigger plus a
  reassignment step in the UI. *(§3.3, decided 2026-07-29. UI, needs visual sign-off. Depends on
  T-046.)*

**Opening verification beyond leaders is closed, not deferred**: the client confirmed leaders-only
on 2026-07-29 (§3.6).

**One task is blocked on the client**: T-048 cannot print "WARD: 12" because no ward number exists
in the data (§3.5). It ships with the ward *name* unless the client funds an INEC ward-code import.

## 6. Rollback plan

- **T-038, T-039, T-041, T-046, T-048** — revert the commit. No schema involved except the KYM code
  backfill, which is additive and harmless if left in place.
- **T-040** — the cap is restorable by re-creating `private.enforce_leader_capacity()` and its
  trigger from `0019`. **One-way in practice:** any leader who exceeded ten while it was off would
  then be frozen at their current count, since the trigger blocks new inserts, not existing rows.
  Flagging that as the real cost of this change.
- **T-043** — `voter_ids`, its FKs and the partial constraint drop cleanly. Rolling back means
  dropping the constraint before the columns. Cheap while the only rows are fixtures; expensive once
  real registration starts, which is the argument for shipping it pre-launch.
- **T-045** — the backfill only fills nulls, so a down-migration nulling them again is safe as long
  as T-046 has not shipped.
- **T-047** — `gender` drops cleanly, at the cost of the collected values.

## 7. Outcome

All eleven planned tasks are built and verified against the live database. **T-044 was dropped**
(nothing to backfill), and **T-049** was added once the demotion rule was decided.

Verified live, each inside a transaction that rolled back:

- 12 of 12 leadership profiles hold a well-formed KYM code; the 2 members correctly hold none.
- A leader registered 15 members with the cap gone.
- All four privilege-escalation attempts are refused: promoting to the caller's own rank, above it,
  promoting themselves, and acting out of scope.
- A leader holding an active member cannot be demoted; once the member is moved, the demotion goes
  through.
- A member can neither read nor write `voter_ids`; a leader can insert.
- Both `role='member'` profiles now carry scope, where before neither did.

**Two things a reviewer should look at before this merges:**

1. **Visual sign-off is outstanding.** The user deferred it for this stretch. Surfaces that changed:
   the leader dashboard (milestone badge replaces the cap meter), registration (VIN + gender fields),
   account provisioning (VIN field), the team page (change-role control), the member dashboard and
   member detail (card download), and `/app/kym`.
2. **The ward number on the card is system-assigned** (§3.5). It is an ordinal within the LGA, not an
   INEC ward code, adopted on the client's direction after we flagged that no ward number exists in
   the data. It must never be presented as an official code.

- **Shipped in:** _pending PR_
- **Client confirmed:** _pending_
