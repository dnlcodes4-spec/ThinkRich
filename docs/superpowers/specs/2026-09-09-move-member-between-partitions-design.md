# Move a member between partitions (CR-0026, Chunk B)

- **Status:** Approved (design), pending implementation plan
- **Date:** 2026-09-09
- **Related:** CR-0026, ADR-0018 (partner organisations), migrations 0044-0055.
  Follow-up to the T-107 cross-partition duplicate-registration warning, which
  currently only *blocks* the "already registered elsewhere" case.

## 1. Problem

CR-0026 §1: "A person already registered in one world cannot be added by another
without being moved." NIN and VIN are globally unique, so a person exists in
exactly one partition (the core movement, or partner X, or partner Y). Today
there is no way to move them: `members.partner_id` is frozen by
`private.freeze_partner_id()` (0048) and `members.membership_number` by
`public.prevent_membership_number_change()` (0004). The only tool is manual SQL
against production.

This spec adds a controlled, audited, super-admin-only move.

## 2. Scope

**In scope (v1):** move one rank-and-file member between any two partitions
(core -> partner, partner -> core, partner -> partner), reissuing their
membership number in the destination partition and re-partitioning their login
if they have one.

**Out of scope:**

- Moving staff (any profile whose role is not `member`). The tool rejects them.
- Moving a subtree (a partner_admin and everyone under them). Not needed; a
  partner is deactivated, not migrated wholesale.
- Reassigning the members a moved leader had registered (leaders are staff, so
  this cannot arise in v1).
- Bulk moves. One member per call.

## 3. Decisions

| Question | Decision | Why |
|---|---|---|
| Who can be moved | Rank-and-file members only | Staff/subtree moves are rare and high-risk; start with the common case. |
| Membership number after the move | **Reissued** with the destination partition's prefix (`TWM-<CODE>-<STATE>-<LGA>-<seq>`, or `TWM-<STATE>-<LGA>-<seq>` for a move to core) | The client chose reissue over keeping the origin number. The number then always matches the person's current world. Accepts a one-time, deliberate exception to number immutability, gated behind a super-admin RPC. |
| Old number | Discarded, not reserved. The `(old_partner, lga)` sequence keeps its value, leaving a gap. | Sequences never roll back anywhere in this system; a gap is harmless. |
| Who can move | `super_admin` only | The only role that sees across partitions (every scope function returns true for it). |
| Geography | Unchanged by the move. If the destination partner has a `scope_state_id` and the member's `state_id` is not it, the move is **rejected**. | The ceiling is a hard boundary; a move cannot place someone outside it. |
| Activity-log history | Stays in the origin partition (rows carry the `partner_id` they were written with). The move itself is logged in the **destination** partition. | History describes what happened while they were in the old world; rewriting it would be dishonest. The destination admin sees the person's life from the move forward. |
| Their card | Server-rendered on demand (`/app/members/[id]/card`), so it picks up the new number automatically. A **printed** card goes stale; the confirm dialog says so. | No reprint pipeline exists; surfacing the caveat is enough. |
| Reversibility | A move can be repeated (including back). Each move mints a fresh number. | No special-casing needed. |

## 4. Architecture

### 4.1 Migration 0056 - a transaction-local bypass flag

Three `BEFORE UPDATE` trigger functions on `members` / `profiles` currently make
a move impossible. Rather than drop them, each gains one guard line at the top:

```sql
if current_setting('app.partition_move', true) = 'on' then return new; end if;
```

- `private.freeze_partner_id()` (backs `members_freeze_partner_id`,
  `profiles_freeze_partner_id`)
- `public.prevent_membership_number_change()` (backs
  `members_membership_number_immutable`)

`private.enforce_partner_ceiling()` is **not** bypassed: a move must still land
inside the destination ceiling, and the RPC sets `state_id`-consistent data, so
the trigger passes naturally. (The RPC also checks the ceiling explicitly first,
for a friendly error.)

The flag is set only by `move_member_to_partition`, with
`set_config('app.partition_move', 'on', true)` - the third argument makes it
transaction-local, so it is gone at commit/rollback and cannot leak to another
statement. `current_setting(..., true)` returns NULL (not an error) when unset,
so every normal write is unaffected.

### 4.2 `public.move_member_to_partition(p_member uuid, p_target_partner uuid)`

`SECURITY DEFINER`, `set search_path = ''`, granted to `authenticated`, returns
the new membership number (`text`). Raises on every failure (the calling Server
Action maps the messages).

Steps, all in one implicit transaction:

1. **Authorize.** `if private.current_user_role() <> 'super_admin' then raise
   exception 'only a super admin may move a member'`.
2. **Load + validate the member.** Row exists, `status <> 'deleted'`, and
   `partner_id is distinct from p_target_partner` (else "already in that
   organisation"). Reject if the member has a `user_id` whose profile role is
   not `member` - i.e. a staffer with a member record (defensive; the member
   table itself has no role, so this is checked via `profiles`).
3. **Validate the destination.** If `p_target_partner is not null`: the partner
   exists, `status = 'active'`, and (`scope_state_id is null` or
   `scope_state_id = <member>.state_id`).
4. **Move.** `perform set_config('app.partition_move', 'on', true);` then:
   - `n := private.next_lga_seq(<member>.lga_id, p_target_partner);`
   - compute the new number: `TWM-<CODE>-<STATE>-<LGA>-<nnnnnn>` when
     `p_target_partner` is not null (CODE from `public.partners.code`), else
     `TWM-<STATE>-<LGA>-<nnnnnn>`. Reuse the exact `format(...)` /
     `lpad(n::text, 6, '0')` shape from `private.assign_membership_number()`
     (0047) so core and partner numbers stay byte-identical to trigger-issued
     ones.
   - `update public.members set partner_id = p_target_partner,
     membership_number = <new> where id = p_member;`
   - `update public.profiles set partner_id = p_target_partner where id =
     <member>.user_id;` (no-op when `user_id` is null).
5. **Log.** One `public.activity_log` insert, inside the RPC so it is atomic
   with the data change: `action = 'member.moved'`, `partner_id =
   p_target_partner` (the destination), `subject_id = p_member`, `subject_type =
   'member'`, summary naming the member, the old number and the new one, and the
   origin/destination worlds. `actor_id` = `auth.uid()`, `actor_name` /
   `actor_role` read from the caller's `profiles` row.
6. Return the new number.

**Counter safety:** `next_lga_seq` already `insert ... on conflict do update set
seq = seq + 1 returning seq`, keyed on `(lga_id, coalesce(partner_id, <nil>))`,
so a move into a `(partner, lga)` pair that has no counter row yet starts at 1,
and one that does increments. No change needed there.

### 4.3 Server Action - `app/app/members/[id]/move-actions.ts`

`moveMember(prev, formData)` -> `{ status, message?, newNumber? }`.

- Re-check `super_admin` in the action (mirror the pattern in
  `partners/[id]/actions.ts` `requireSuperAdmin`) so a non-super gets a clean
  message instead of a raw RPC error.
- Parse `member_id` (uuid) and `target` from the form. `target` is either the
  literal `"core"` or a partner uuid; map `"core"` -> `null`.
- Call `supabase.rpc('move_member_to_partition', { p_member, p_target_partner })`
  under the **caller's** client (the RPC's own `super_admin` check is the real
  gate; the definer function still runs as its owner but authorizes by
  `current_user_role()`).
- On success: `revalidatePath('/app/members/[id]')`, return the new number. The
  move is logged inside the RPC (4.2 step 5), so the action writes no log.

### 4.4 UI - `app/app/members/[id]/page.tsx` + a client component

Visible only when the viewer is `super_admin` (the page already loads the
viewer's role for other gates).

- A "Move to another organisation" button opens a dialog (reuse the existing
  dialog/confirm primitives - see `change-role-button.tsx`,
  `partners/[id]/manage.tsx`).
- Destination picker: "The core movement" plus every `active` partner (name +
  kind). Fetched in the page's server component, passed to the client
  component. Exclude the member's current partition from the list.
- The dialog states plainly: a new membership number will be issued in the
  chosen organisation; the member's digital card updates automatically; any
  printed card becomes out of date; their sign-in is unaffected.
- On success, show the new number and let the page revalidate.

Tokens only, mobile-first, matches the surrounding member-detail layout. Visual
sign-off is waived for this work per the standing instruction from the user this
session.

## 5. Security / invariants

- **Partition isolation holds.** The move is the *only* sanctioned way
  `partner_id` changes after insert, it is super-admin-only, and it is one member
  at a time. No RLS policy changes.
- **Number immutability** becomes "immutable except by a logged super-admin
  move." `data-model.md` invariant 1 and `security-model.md` are updated to say
  so. The `prevent_membership_number_change` trigger still blocks every other
  path.
- **Ceiling** is still enforced by trigger and re-checked by the RPC.
- **No duplicate registration.** Unchanged - NIN/VIN stay globally unique; the
  move relocates the single row rather than creating a second.
- **Audit.** Every move is one `activity_log` row in the destination partition,
  naming both numbers. The origin partition's admin sees the member simply
  disappear from their lists (RLS), which is correct.

## 6. Testing

`supabase/tests/move_member_test.sql` - one transaction, rolled back, seed style
from `partner_rls_test.sql`:

1. super_admin moves a **core** member into a state-scoped partner -> number
   becomes `TWM-<CODE>-<STATE>-<LGA>-000001`, `members.partner_id` and the
   login `profiles.partner_id` both set.
2. super_admin moves a **partner** member to the core movement -> number becomes
   `TWM-<STATE>-<LGA>-<seq>`, both `partner_id`s null.
3. super_admin moves a member from **partner A to partner B**.
4. Move into a partner whose `scope_state_id` != the member's state -> **rejected**.
5. Move by a **national_admin** -> rejected ("only a super admin").
6. Move a member whose login profile role is `state_admin` (staffer) -> rejected.
7. Move a member into the partition they are already in -> rejected.
8. After a successful move, the `app.partition_move` flag is unset (a normal
   `update members set membership_number = ...` in the same transaction still
   raises).
9. `activity_log` has exactly one `member.moved` row, `partner_id` = destination.

Plus a Server Action unit test (`move-actions.test.ts`) mirroring
`partners/[id]/actions.test.ts`: non-super rejected; `"core"` maps to
`p_target_partner: null`; a successful RPC returns `newNumber`.

## 7. Docs to update in the same change

- `CHANGELOG.md` - the move tool.
- `docs/architecture/data-model.md` - invariant 1 (number immutable *except by a
  super-admin partition move*), and note `move_member_to_partition` in the
  functions table.
- `docs/architecture/security-model.md` - the partner-partition section: the one
  sanctioned `partner_id` mutation, and the `app.partition_move` flag.
- `docs/project/task-board.md` - move the task to Done.
- CR-0026 §7 outcome / a one-line note that Chunk B shipped.

## 8. Rollback

- Code: revert the branch's squash merge.
- DB: migration 0056 is `create or replace` on three existing trigger functions
  (re-add the pre-0056 bodies from git) plus one new function
  (`drop function move_member_to_partition`). No schema change, no data change.
  Any members already moved keep their reissued numbers - correct and harmless.
- Take a project snapshot before applying 0056, per the CR-0015/0019 pattern.
</content>
