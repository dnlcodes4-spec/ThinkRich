# Move a Member Between Partitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the super admin one audited action to move a rank-and-file member between partitions (core movement, or any partner), reissuing their membership number in the destination.

**Architecture:** A `SECURITY DEFINER` RPC (`public.move_member_to_partition`) authorizes on `super_admin`, checks the destination is active and inside its ceiling, then flips `members.partner_id` + `profiles.partner_id` and mints a fresh membership number, all behind a transaction-local `app.partition_move` flag that the two relevant immutability triggers honour. A super-admin-only Server Action calls it from the member detail page and logs the move via the existing `logActivityAs` helper.

**Tech Stack:** Next.js 16 (App Router, Server Actions), Supabase Postgres + RLS, Zod, Vitest. Migrations are plain `.sql` files applied to the live project by the controller (Free plan, no branching, no local stack).

**Spec:** `docs/superpowers/specs/2026-09-09-move-member-between-partitions-design.md` (read it first, it carries the rationale and the decision table).

## Global Constraints

- **Migrations are files only.** Subagents write `supabase/migrations/*.sql` and `supabase/tests/*.sql` and NEVER call `apply_migration` / `execute_sql`. After a migration task passes review, the CONTROLLER applies it to the live project `jnkompitykukixbzmmkm` (dry-run in `BEGIN … ROLLBACK` first), then runs the task's SQL test via `execute_sql`.
- **Repo is a single npm package at the worktree root.** Gates: `npm run typecheck`, `npm test` (vitest), `npm run lint` from the root. Types file: `lib/database.types.ts` at root. Regenerating types is a controller step (MCP `generate_typescript_types`), not a subagent step.
- **No em dashes** anywhere (prose, comments, commit messages). Rewrite with a period, comma, or colon. Box-drawing `─` in SQL section headers matches house style and is fine.
- **Commit messages** end with `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`. This is a standing session instruction and every branch commit already carries it; do not drop it and do not amend prior commits over it. (It conflicts with AGENTS.md §2; the session instruction wins and squash-merge collapses it.)
- **Conventional Commits** for every commit: `type(scope): description`.
- **Membership-number format is fixed:** core `TWM-<STATE_CODE>-<LGA_CODE>-<seq6>`, partner `TWM-<PARTNER_CODE>-<STATE_CODE>-<LGA_CODE>-<seq6>`, `seq6 = lpad(n::text, 6, '0')`, `n` from `private.next_lga_seq(lga_id, partner_id)`. Copy the exact `format(...)` shape from `private.assign_membership_number()` in `supabase/migrations/0047_partner_membership_numbers.sql`.
- **RLS is the authorization boundary.** The Server Action re-checks `super_admin` only to return a friendly message; the RPC's own `private.current_user_role()` check is the real gate. Writes that need the service role (none here) use it; the RPC runs under the caller's client.
- **Members only.** A member whose linked login profile has a role other than `member` (a staffer) is rejected by the RPC. Moving staff or subtrees is explicitly out of scope.
- **UI visual sign-off is waived** for this work per the user's standing instruction this session. Still meet the design-system rules: tokens not raw hex/px, mobile-first, WCAG AA, no uppercase kicker labels.

---

## File Structure

- `supabase/migrations/0056_move_member_between_partitions.sql`: new. The `app.partition_move` guard added to `private.freeze_partner_id()` and `public.prevent_membership_number_change()` via `create or replace`, plus the new `public.move_member_to_partition(uuid, uuid)` RPC.
- `supabase/tests/move_member_test.sql`: new. One rolled-back transaction, 9 assertions.
- `lib/activity-meta.ts`: modify. Add `"member.moved"` to the `ActivityAction` union and `ACTION_META`.
- `app/app/members/[id]/move-actions.ts`: new. `moveMember` Server Action.
- `app/app/members/[id]/move-actions.test.ts`: new. Unit test for the action.
- `app/app/members/[id]/move-member.tsx`: new. Client component: button + confirm dialog + destination picker.
- `app/app/members/[id]/page.tsx`: modify. When the viewer is `super_admin`, load the active-partner list and render `<MoveMember>`.
- `CHANGELOG.md`, `docs/architecture/data-model.md`, `docs/architecture/security-model.md`, `docs/project/task-board.md`, `docs/project/change-requests/0026-partner-organisations-and-tenancy.md`, modify (Task 4).

---

## Task 1: Migration 0056 + the RPC + SQL test

**Files:**
- Create: `supabase/migrations/0056_move_member_between_partitions.sql`
- Create: `supabase/tests/move_member_test.sql`

**Interfaces:**
- Produces: `public.move_member_to_partition(p_member uuid, p_target_partner uuid) returns text`, the new membership number. Raises `exception` on: caller not `super_admin`; member missing / `deleted` / already in the target; member's login profile role is not `member`; target partner missing / not `active` / member's `state_id` outside `scope_state_id`.
- Produces: transaction-local GUC `app.partition_move` (`'on'` enables the bypass); honoured by `private.freeze_partner_id()` and `public.prevent_membership_number_change()`.
- Consumes: `private.next_lga_seq(uuid, uuid)`, `private.current_user_role()`, `private.current_partner_id()` (all exist).

- [ ] **Step 1: Read the current trigger-function bodies**

Open and read in full, so the `create or replace` reproduces them byte-for-byte apart from the one added guard line:
- `private.freeze_partner_id()`, current body in `supabase/migrations/0048_freeze_partner_id_insert_only.sql`.
- `public.prevent_membership_number_change()`, current body in `supabase/migrations/0004_identity.sql` (around line 88).
- `private.assign_membership_number()` and `private.next_lga_seq(uuid, uuid)`, in `supabase/migrations/0047_partner_membership_numbers.sql`, for the number `format(...)` shape.

- [ ] **Step 2: Write the migration**

Create `supabase/migrations/0056_move_member_between_partitions.sql`:

```sql
-- CR-0026 Chunk B: move a rank-and-file member between partitions.
--
-- partner_id (0048) and membership_number (0004) are both frozen on UPDATE. A
-- deliberate super-admin "move" is the one sanctioned exception. Rather than
-- drop those guards, they now yield to a transaction-local flag that only
-- public.move_member_to_partition sets:
--
--     set_config('app.partition_move', 'on', true)   -- true = transaction-local
--
-- current_setting('app.partition_move', true) returns NULL when unset (not an
-- error), so every normal write is unaffected. enforce_partner_ceiling is NOT
-- bypassed: a move must still land inside the destination ceiling.

-- ─────────── freeze_partner_id yields to a partition move ───────────
create or replace function private.freeze_partner_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.partition_move', true) = 'on' then
    return new;
  end if;
  if new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id is set at insert and never changed by update';
  end if;
  return new;
end;
$$;

-- ─────────── membership_number immutability yields to a partition move ───────────
create or replace function public.prevent_membership_number_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.partition_move', true) = 'on' then
    return new;
  end if;
  if new.membership_number is distinct from old.membership_number then
    raise exception 'membership_number is immutable and cannot be changed';
  end if;
  return new;
end;
$$;

-- ─────────── the move ───────────
create function public.move_member_to_partition(p_member uuid, p_target_partner uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m            public.members%rowtype;
  login_role   public.user_role;
  s_code       text;
  l_code       text;
  p_code       text;
  ceiling      uuid;
  target_status public.partner_status;
  n            integer;
  new_number   text;
  actor        uuid := (select auth.uid());
  actor_name   text;
  actor_role   public.user_role;
begin
  if private.current_user_role() is distinct from 'super_admin' then
    raise exception 'only a super admin may move a member between organisations';
  end if;

  select * into m from public.members where id = p_member;
  if not found then
    raise exception 'member not found';
  end if;
  if m.status = 'deleted' then
    raise exception 'a removed member cannot be moved';
  end if;
  if m.partner_id is not distinct from p_target_partner then
    raise exception 'that member is already in that organisation';
  end if;

  -- Members only. If this member has a login, its profile must be role 'member'.
  if m.user_id is not null then
    select role into login_role from public.profiles where id = m.user_id;
    if login_role is distinct from 'member' then
      raise exception 'staff accounts cannot be moved with this tool';
    end if;
  end if;

  if p_target_partner is not null then
    select status, scope_state_id into target_status, ceiling
      from public.partners where id = p_target_partner;
    if not found then
      raise exception 'destination organisation not found';
    end if;
    if target_status <> 'active' then
      raise exception 'destination organisation is not active';
    end if;
    if ceiling is not null and m.state_id is distinct from ceiling then
      raise exception 'the member is outside the destination organisation''s state ceiling';
    end if;
  end if;

  -- Mint the destination number (same shape as private.assign_membership_number).
  select code into s_code from public.states where id = m.state_id;
  select code into l_code from public.lgas   where id = m.lga_id;
  n := private.next_lga_seq(m.lga_id, p_target_partner);
  if p_target_partner is null then
    new_number := format('TWM-%s-%s-%s', s_code, l_code, lpad(n::text, 6, '0'));
  else
    select code into p_code from public.partners where id = p_target_partner;
    new_number := format('TWM-%s-%s-%s-%s', p_code, s_code, l_code, lpad(n::text, 6, '0'));
  end if;

  perform set_config('app.partition_move', 'on', true);

  update public.members
    set partner_id = p_target_partner, membership_number = new_number
    where id = p_member;

  update public.profiles
    set partner_id = p_target_partner
    where id = m.user_id;   -- no-op row count when user_id is null

  -- Audit row in the DESTINATION partition.
  select full_name, role into actor_name, actor_role from public.profiles where id = actor;
  insert into public.activity_log
    (actor_id, actor_name, actor_role, action, summary, subject_type, subject_id, state_id, partner_id)
  values
    (actor, coalesce(actor_name, 'Unknown'), actor_role, 'member.moved',
     format('Moved %s from %s to %s (%s becomes %s)',
            m.full_name,
            coalesce((select name from public.partners where id = m.partner_id), 'the core movement'),
            coalesce((select name from public.partners where id = p_target_partner), 'the core movement'),
            m.membership_number, new_number),
     'member', p_member, m.state_id, p_target_partner);

  return new_number;
end;
$$;

revoke all on function public.move_member_to_partition(uuid, uuid) from public, anon;
grant execute on function public.move_member_to_partition(uuid, uuid) to authenticated;
```

- [ ] **Step 3: Write the SQL test**

Create `supabase/tests/move_member_test.sql`. Mirror the seed style of `supabase/tests/partner_rls_test.sql` (auth.users + geography + partners + voter_ids + profiles + members, one `begin; … rollback;`). Cover:

1. **core → state-scoped partner:** seed a core member with a login (profile role `member`) in the partner's ceiling state. Impersonate the super admin (`set_config('request.jwt.claims', …)`), call `public.move_member_to_partition(<member>, <partner>)`. Assert the return matches `^TWM-<PCODE>-<SCODE>-<LCODE>-000001$`, `members.partner_id` = the partner, `members.membership_number` = the return, and the login `profiles.partner_id` = the partner.
2. **partner → core:** call with `p_target_partner => null`. Assert the number is now `^TWM-<SCODE>-<LCODE>-\d{6}$` and both `partner_id`s are null.
3. **partner A → partner B:** both nationwide, assert `partner_id` = B and the number carries B's code.
4. **ceiling rejection:** member in state S2, target partner scoped to S1. Assert the call raises (wrap in `begin … exception when others then …`).
5. **non-super rejection:** impersonate a `national_admin`, assert the call raises.
6. **staff rejection:** a member row whose `user_id` points at a profile with role `state_admin`. Assert the call raises.
7. **same-partition rejection:** call with the member's current `partner_id`. Assert it raises.
8. **flag is transaction-local:** after a successful move in the same transaction, run a bare `update public.members set membership_number = 'TWM-X-Y-999999' where id = <member>` and assert THAT raises `membership_number is immutable` (proves `set_config(..., true)` did not leak past the RPC's statement).
9. **audit row:** assert exactly one `activity_log` row with `action = 'member.moved'` and `partner_id` = the destination of the last successful move.

End with `raise notice 'MOVE MEMBER: all checks passed';` then `rollback;`.

- [ ] **Step 4: Eyeball-validate (no DB access)**

Re-read the migration: every function has `set search_path = ''` and every table reference is schema-qualified; `next_lga_seq` is called with 2 args; the `format(...)` strings match 0047 exactly; `create function` (not `or replace`) for the new RPC so a re-run errors loudly (house pattern); the two `create or replace` bodies differ from their originals by exactly the one `if current_setting(...) then return new; end if;` block.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0056_move_member_between_partitions.sql supabase/tests/move_member_test.sql
git commit -m "feat(partners): move_member_to_partition RPC + partition-move bypass [CR-0026]"
```

- [ ] **Step 6: Report** what could not be verified without a database (the apply, the 9 assertions). The controller applies 0056 (dry-run first) and runs `move_member_test.sql` on prod, feeding any failure back as a fix-loop finding.

---

## Task 2: `member.moved` activity meta + the `moveMember` Server Action

**Files:**
- Modify: `lib/activity-meta.ts`
- Create: `app/app/members/[id]/move-actions.ts`
- Create: `app/app/members/[id]/move-actions.test.ts`

**Interfaces:**
- Consumes: `public.move_member_to_partition(p_member uuid, p_target_partner uuid) returns text` (Task 1).
- Produces: `moveMember(prev: MoveState, formData: FormData): Promise<MoveState>` where `type MoveState = { status: "idle" | "success" | "error"; message?: string; newNumber?: string }`. Form fields: `member_id` (uuid), `target` (either the literal `"core"` or a partner uuid).

- [ ] **Step 1: Add the action to the activity union**

In `lib/activity-meta.ts`, add `| "member.moved"` to the `ActivityAction` union (with the other `member.*` entries) and a matching `ACTION_META` row:

```ts
"member.moved": { label: "Voter moved", tone: "neutral" },
```

(Confirm the tone type accepts `"neutral"`, it is used by `partner.updated`.)

- [ ] **Step 2: Run typecheck to confirm the Record stays exhaustive**

Run: `npm run typecheck`
Expected: PASS (the `Record<ActivityAction, …>` forces the new key to exist).

- [ ] **Step 3: Write the failing action test**

Create `app/app/members/[id]/move-actions.test.ts`. Mirror the mocking style of `app/app/admin/partners/[id]/actions.test.ts` (mock `@/lib/supabase/server`'s `createClient`, and `@/lib/activity`). Cases:

```ts
// 1. a non-super caller is rejected before any rpc call
it("rejects a caller who is not a super admin", async () => {
  // createClient mock: auth.getUser -> a user; profiles select -> { role: "national_admin" }
  const res = await moveMember({ status: "idle" }, formDataOf({ member_id: UUID, target: "core" }));
  expect(res.status).toBe("error");
  expect(res.message).toMatch(/super admin/i);
  expect(rpcSpy).not.toHaveBeenCalled();
});

// 2. "core" maps to p_target_partner: null
it("passes null for a move to the core movement", async () => {
  // profiles select -> { role: "super_admin" }; rpc -> { data: "TWM-LA-IKJ-000007", error: null }
  const res = await moveMember({ status: "idle" }, formDataOf({ member_id: UUID, target: "core" }));
  expect(rpcSpy).toHaveBeenCalledWith("move_member_to_partition", { p_member: UUID, p_target_partner: null });
  expect(res).toEqual({ status: "success", message: expect.any(String), newNumber: "TWM-LA-IKJ-000007" });
});

// 3. a partner uuid is passed through, and an rpc error becomes a friendly message
it("surfaces an rpc error", async () => {
  // rpc -> { data: null, error: { message: "the member is outside the destination organisation's state ceiling" } }
  const res = await moveMember({ status: "idle" }, formDataOf({ member_id: UUID, target: PARTNER_UUID }));
  expect(rpcSpy).toHaveBeenCalledWith("move_member_to_partition", { p_member: UUID, p_target_partner: PARTNER_UUID });
  expect(res.status).toBe("error");
  expect(res.message).toMatch(/ceiling/i);
});
```

- [ ] **Step 4: Run the test, expect failure**

Run: `npm test -- move-actions`
Expected: FAIL (module `./move-actions` not found).

- [ ] **Step 5: Implement the action**

Create `app/app/members/[id]/move-actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivityAs } from "@/lib/activity";

export type MoveState = {
  status: "idle" | "success" | "error";
  message?: string;
  newNumber?: string;
};

const schema = z.object({
  member_id: z.string().uuid(),
  target: z.union([z.literal("core"), z.string().uuid()]),
});

export async function moveMember(_prev: MoveState, formData: FormData): Promise<MoveState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "You must be signed in." };

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (me?.role !== "super_admin") {
    return { status: "error", message: "Only a super admin can move a member between organisations." };
  }

  const parsed = schema.safeParse({
    member_id: formData.get("member_id"),
    target: formData.get("target"),
  });
  if (!parsed.success) return { status: "error", message: "Choose a destination." };

  const targetPartner = parsed.data.target === "core" ? null : parsed.data.target;

  const { data: newNumber, error } = await supabase.rpc("move_member_to_partition", {
    p_member: parsed.data.member_id,
    p_target_partner: targetPartner,
  });

  if (error || !newNumber) {
    return { status: "error", message: error?.message ?? "Could not move the member. Please try again." };
  }

  await logActivityAs(user.id, {
    action: "member.moved",
    summary: `Moved a voter to ${targetPartner ? "another organisation" : "the core movement"} (new number ${newNumber})`,
    subjectType: "member",
    subjectId: parsed.data.member_id,
    partnerId: targetPartner,
  });

  revalidatePath(`/app/members/${parsed.data.member_id}`);
  return { status: "success", message: "Member moved.", newNumber: newNumber as string };
}
```

Note: the RPC already writes the authoritative audit row in the destination partition (Task 1 step 2). This second `logActivityAs` mirrors every other Server Action in the app and is best-effort; it is acceptable that a move produces one RPC-written row plus, when logging succeeds, one action-layer row. If review objects to the duplication, drop the `logActivityAs` call and keep only the RPC row.

- [ ] **Step 6: Run tests + typecheck + lint**

Run: `npm test -- move-actions && npm run typecheck && npm run lint`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add lib/activity-meta.ts app/app/members/[id]/move-actions.ts app/app/members/[id]/move-actions.test.ts
git commit -m "feat(partners): moveMember server action + member.moved activity [CR-0026]"
```

---

## Task 3: Member-detail UI

**Files:**
- Create: `app/app/members/[id]/move-member.tsx`
- Modify: `app/app/members/[id]/page.tsx`

**Interfaces:**
- Consumes: `moveMember`, `MoveState` (Task 2).
- Produces: `<MoveMember memberId={string} currentPartnerId={string | null} currentNumber={string} partners={{ id: string; name: string; kind: "political" | "community" }[]} />`.

- [ ] **Step 1: Read the existing dialog pattern**

Read `app/app/admin/team/change-role-button.tsx` and `app/app/admin/partners/[id]/manage.tsx` for the repo's `"use client"` + `useActionState` + dialog/confirm convention, the token classes, and how a temp-result (e.g. a new password) is shown after success.

- [ ] **Step 2: Build the client component**

Create `app/app/members/[id]/move-member.tsx` (`"use client"`):
- A button "Move to another organisation".
- Opening it reveals a `<form action={formAction}>` (from `useActionState(moveMember, { status: "idle" })`) with:
  - a hidden `member_id` input,
  - a `<select name="target">` whose options are "The core movement" (value `core`, shown only when `currentPartnerId` is not null) followed by every partner in `partners` except the one whose `id === currentPartnerId`, labelled `"{name} ({kind})"`,
  - body copy, verbatim intent: a new membership number will be issued in the chosen organisation; the voter's digital card updates automatically; a printed card becomes out of date; their sign-in is not affected,
  - a submit button "Move voter".
- On `state.status === "success"`: show `state.message` and "New membership number: {state.newNumber}".
- On `state.status === "error"`: show `state.message` via the repo's `FormError` (see other forms).
- Tokens only (`text-foreground`, `text-muted`, `border-border`, `rounded-card`, `bg-surface`, `min-h-11`), no raw hex/px, no uppercase kicker label, works light and dark.

- [ ] **Step 3: Wire it into the page**

In `app/app/members/[id]/page.tsx`:
- The page already reads `me.role`. When `me.role === "super_admin"`, also fetch the destination list and the member's current `partner_id`:

```ts
const canMove = me.role === "super_admin";
const { data: partnerRows } = canMove
  ? await supabase.from("partners").select("id, name, kind").eq("status", "active").order("name")
  : { data: null };
```

- Add `partner_id` to the member `.select(...)` on line ~33 so the component can exclude the current partition.
- Render `<MoveMember memberId={member.id} currentPartnerId={member.partner_id} currentNumber={member.membership_number} partners={partnerRows ?? []} />` in a sensible spot near the other member-detail admin controls, inside the `canMove` guard.

- [ ] **Step 4: Gates**

Run: `npm run typecheck && npm run lint && npm test`
Expected: all pass (unit test count unchanged from Task 2; this task adds no tests, the behaviour is covered by Task 2's action test and Task 1's SQL test).

- [ ] **Step 5: Commit**

```bash
git add app/app/members/[id]/move-member.tsx app/app/members/[id]/page.tsx
git commit -m "feat(partners): move-member control on the voter detail page [CR-0026]"
```

---

## Task 4: Docs

**Files:**
- Modify: `CHANGELOG.md`, `docs/architecture/data-model.md`, `docs/architecture/security-model.md`, `docs/project/task-board.md`, `docs/project/change-requests/0026-partner-organisations-and-tenancy.md`

- [ ] **Step 1: CHANGELOG**, under `## [Unreleased] / ### Added`, one entry: the super admin can now move a rank-and-file member between the core movement and a partner (or between partners); a new membership number is issued in the destination, the login is re-partitioned, and the move is logged in the destination partition. Migration 0056, RPC `move_member_to_partition`.

- [ ] **Step 2: `data-model.md`**
  - Invariant 1 (membership number): append "`, except by a logged super-admin partition move (`public.move_member_to_partition`), which reissues it in the destination partition`".
  - Functions table: add a row for `public.move_member_to_partition(member, target) → text`, "Super-admin only. Moves one member between partitions: reissues the membership number, re-partitions the login, logs the move. The one sanctioned `partner_id` / `membership_number` mutation."

- [ ] **Step 3: `security-model.md`**, in the partner-partition section, add: `partner_id` and `membership_number` are frozen after insert; the single exception is `public.move_member_to_partition`, a `SECURITY DEFINER` RPC that authorizes on `super_admin`, enforces the destination ceiling, and runs behind the transaction-local `app.partition_move` flag (unset for every other write).

- [ ] **Step 4: `task-board.md`**, add the task under Done: **T-110** (or the next free number, check the file), "Move a member between partitions (CR-0026 Chunk B)", one-paragraph summary matching the CHANGELOG entry, noting migration 0056 and `supabase/tests/move_member_test.sql`.

- [ ] **Step 5: CR-0026**, in `## 7. Outcome`, add a line: "Chunk B (move a member between partitions) shipped <date>: `move_member_to_partition` RPC, migration 0056."

- [ ] **Step 6: Gates + commit**

Run: `npm run typecheck && npm test` (docs-only, should be unchanged).

```bash
git add CHANGELOG.md docs/
git commit -m "docs(partners): document the move-member-between-partitions tool [CR-0026]"
```

---

## Self-Review

**Spec coverage:**
- §4.1 bypass flag + trigger guards → Task 1 step 2.
- §4.2 RPC (all 6 numbered steps) → Task 1 step 2. Authorize, validate member, validate destination, move, log, return: all present.
- §4.3 Server Action → Task 2 step 5.
- §4.4 UI → Task 3.
- §5 invariants / docs → Task 4 steps 2-3.
- §6 testing: 9 SQL assertions → Task 1 step 3; action unit test → Task 2 step 3.
- §7 docs list → Task 4 (all five files).
- §8 rollback → no task needed (it is a revert + `drop function` + re-apply old bodies from git; noted in the migration's own header comment implicitly).

**Placeholder scan:** SQL test bodies are described assertion-by-assertion with the exact regex/columns to check rather than pasted verbatim, acceptable because the seed scaffold is "mirror `partner_rls_test.sql`" and each assertion names its exact check. All code steps for the migration and the action have full code blocks.

**Type consistency:** `MoveState` shape identical in Task 2 interface, step 5, and Task 3 interface. `moveMember(prev, formData)` signature consistent. `move_member_to_partition(p_member, p_target_partner)` arg names identical in Task 1, Task 2 test, Task 2 impl. `"member.moved"` string identical in Task 1 (SQL insert), Task 2 (union + meta + action).

---

## Execution Handoff

Recommended: **subagent-driven-development**, Task 1 is a migration the controller must apply and test on prod between tasks, which fits the controller/subagent split. Tasks 2-4 are ordinary.
