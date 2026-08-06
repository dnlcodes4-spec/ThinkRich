# Super Admin (Owner) Role — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `super_admin` role above `national_admin` that can create/deactivate/delete any admin (including national admins and peer super admins) and oversee the whole platform, reusing existing screens.

**Architecture:** `super_admin` is `role_rank` 0 (national = 1). Because every authorization barrier keys on `role_rank(target) > role_rank(caller)`, ranking it 0 unlocks acting on national admins once the role is added beside `national_admin` in every privileged RLS object and the app role maps. One deliberate exception (the "peer special-case") lets a super_admin act on another super_admin. Additive: enum value + function/policy/CHECK edits, no data migration.

**Tech Stack:** Next.js 16 (RSC, Server Actions), Supabase Postgres + RLS (`private` schema helpers), the Supabase MCP for applying migrations, SQL RLS tests (`supabase/tests/*.sql`), Vitest, Playwright.

## Global Constraints

- **Never edit an applied migration.** New forward migrations only; next numbers are **0039** and **0040**.
- **Apply migrations via the Supabase MCP** (`apply_migration`), never `supabase db push`.
- **Two migrations, in order.** Postgres cannot add an enum value and *use* it in the same transaction. Migration `0039` does only `ALTER TYPE … ADD VALUE`; `0040` (a separate apply) references it. Apply `0039` to prod first, then dry-run `0040` with `BEGIN…ROLLBACK`, then apply `0040`.
- **RLS is the authorization boundary (ADR-0005).** The app mirrors it; never rely on hiding a control.
- **Peer special-case is `super_admin`-only.** Only a super_admin may create/act on a super_admin; every other tier stays bound by strict `role_rank(target) > role_rank(caller)`.
- **`role_rank` is the single ordering source** (DB `private.role_rank`, mirrored by `ROLE_RANK` in `tiers.ts`). Keep them in lock-step: `super_admin` = 0.
- **No new screens.** Reuse Team + Give-app-access + the national dashboard.
- **Regenerate `lib/database.types.ts`** after the enum change or typecheck fails app-wide.
- **No AI co-author trailer.** Conventional Commits. **No em dashes** in code/UI copy. **UI sign-off before committing UI** (Task 6 screenshots).
- **Current ladder is post-`0038`** (CR-0019 reverted): `national_admin, state_admin, lg_admin, ward_admin, unit_coordinator, leader, member`. Do NOT reintroduce unit/registered_voter naming.

---

## File Structure

**New**
- `supabase/migrations/0039_super_admin_enum.sql` — `ALTER TYPE … ADD VALUE 'super_admin'`.
- `supabase/migrations/0040_super_admin_rls.sql` — `role_rank`, scope engine, policies, CHECK — add `super_admin` beside `national_admin`.
- `supabase/tests/super_admin_rls_test.sql` — allow/deny tests for the new tier.

**Modified**
- `lib/database.types.ts` (regenerate), `lib/terms.ts`, `app/app/admin/new-account/tiers.ts`, `components/app-shell/nav.ts`, `app/app/page.tsx`, `app/app/logs/page.tsx`.

---

## Task 1 (T-084): Migration 0039 — add the enum value

**Files:** Create `supabase/migrations/0039_super_admin_enum.sql`

**Interfaces:** Produces enum value `super_admin` on `public.user_role` (unused until 0040).

- [ ] **Step 1: Write the migration**

```sql
-- CR-0015 / ADR-0017: add the super_admin (owner) role above national_admin.
-- This migration ONLY adds the enum value. Postgres forbids using a new enum
-- value in the same transaction that adds it, so role_rank + policies that
-- reference 'super_admin' land in 0040 (a separate migration).
alter type public.user_role add value if not exists 'super_admin' before 'national_admin';
```

- [ ] **Step 2: Apply via MCP**

Run (MCP `apply_migration`, name `0039_super_admin_enum`). Then verify:
`select enumlabel from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='user_role' order by e.enumsortorder;`
Expected: `super_admin` appears first, then the existing 7.

- [ ] **Step 3: Regenerate types**

Run: MCP `generate_typescript_types`; write the result to `lib/database.types.ts`.
Expected: `user_role` union includes `"super_admin"`.

- [ ] **Step 4: Typecheck (expected to still pass)**

Run: `rm -rf .next && npx tsc --noEmit`. Expected: PASS — no app code references `super_admin` yet, and `Record<Role, …>` maps are not yet exhaustive-checked against it because Task 3 adds those. If a `Record<Role,…>` (e.g. `ROLE_RANK`) now errors as missing the `super_admin` key, that is Task 3's job; proceed to commit this task's migration + types and let Task 3 fix the maps. (If it blocks, do Task 3's `tiers.ts`/`terms.ts` edits before committing — they are additive.)

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0039_super_admin_enum.sql lib/database.types.ts
git commit -m "feat(rls): add super_admin enum value [CR-0015]"
```

> Note: because `Record<Role,…>` maps in `tiers.ts` become non-exhaustive the moment the type includes `super_admin`, Tasks 1 and 3 are tightly coupled — if tsc blocks at Step 4, fold Task 3's `tiers.ts` + `terms.ts` edits into this commit.

---

## Task 2 (T-085): Migration 0040 — RLS sweep (introspect, then extend)

**Files:** Create `supabase/migrations/0040_super_admin_rls.sql`

**Interfaces:** Consumes the `super_admin` enum value (Task 1). Produces: `super_admin` treated as a superset of `national_admin` in every privileged object, plus the peer special-case in `profiles_insert`/`update`.

- [ ] **Step 1: Introspect the CURRENT prod definitions (do NOT guess)**

The objects below were restored by `0038`; confirm their exact current text before editing, via MCP `execute_sql`:

```sql
-- functions
select p.proname, pg_get_functiondef(p.oid)
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='private' and p.proname in
  ('role_rank','profile_in_scope','member_in_scope','candidacy_in_scope');
-- policies to extend
select tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname='public' and policyname in
  ('profiles_insert','profiles_update','members_insert','polling_units_insert',
   'activity_log_select_national')
   or (tablename in ('office_types','parties','elections','constituencies',
       'constituency_lgas','constituency_wards','election_office_types')
       and policyname='catalogue_write');
-- the CHECK
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.profiles'::regclass and conname='profiles_scope_matches_role';
```

Confirm each matches the SQL written below; if any differs, adjust the migration to extend the *actual* definition (add `super_admin`, keep everything else).

- [ ] **Step 2: Write the migration — functions (CREATE OR REPLACE; signatures unchanged, so no drops)**

```sql
-- CR-0015 / ADR-0017: super_admin is a superset of national_admin. Extend every
-- privileged object to treat it like national, plus a peer special-case so a
-- super_admin may create/manage other super_admins. Additive; no data change.

-- role_rank: super_admin outranks everyone (0).
create or replace function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'super_admin' then 0
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;

-- scope engines: super_admin sees everything, like national.
create or replace function private.profile_in_scope(p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid)
returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
    or case private.current_user_role()
      when 'super_admin'      then true
      when 'national_admin'   then true
      when 'state_admin'      then p_state = private.current_state_id()
      when 'lg_admin'         then p_lga = private.current_lga_id()
      when 'ward_admin'       then p_ward = private.current_ward_id()
      when 'unit_coordinator' then p_pu = private.current_polling_unit_id()
      else false
    end;
$$;
create or replace function private.member_in_scope(
  m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid
) returns boolean language sql stable set search_path = '' as $$
  select case private.current_user_role()
    when 'super_admin'      then true
    when 'national_admin'   then true
    when 'state_admin'      then m_state = private.current_state_id()
    when 'lg_admin'         then m_lga = private.current_lga_id()
    when 'ward_admin'       then m_ward = private.current_ward_id()
    when 'unit_coordinator' then m_pu = private.current_polling_unit_id()
    when 'leader'           then m_registered_by = (select auth.uid())
    when 'member'           then m_user_id = (select auth.uid())
    else false
  end;
$$;

-- candidacy writes: super_admin, like national, manages any candidacy.
create or replace function private.candidacy_in_scope(
  p_office uuid, p_state uuid, p_lga uuid, p_ward uuid, p_constituency uuid
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role public.user_role := private.current_user_role();
  v_kind public.constituency_kind; c_state uuid; c_lga uuid; c_ward uuid; n_lgas int;
begin
  if v_role in ('national_admin','super_admin') then return true; end if;
  if v_role is null or v_role not in ('state_admin','lg_admin','ward_admin') then return false; end if;
  select constituency_kind into v_kind from public.office_types where id = p_office;
  if v_kind is null then return false; end if;
  if v_kind = 'nation' then return false;
  elsif v_kind = 'state' then c_state := p_state;
  elsif v_kind = 'lga' then c_lga := p_lga; select state_id into c_state from public.lgas where id = p_lga;
  elsif v_kind = 'ward' then c_ward := p_ward;
    select w.lga_id, l.state_id into c_lga, c_state from public.wards w join public.lgas l on l.id = w.lga_id where w.id = p_ward;
  else select state_id into c_state from public.constituencies where id = p_constituency;
    select count(*) into n_lgas from public.constituency_lgas where constituency_id = p_constituency;
    if n_lgas = 1 and not exists (select 1 from public.constituency_wards where constituency_id = p_constituency) then
      select lga_id into c_lga from public.constituency_lgas where constituency_id = p_constituency; end if;
  end if;
  return case v_role
    when 'state_admin' then c_state is not null and c_state = private.current_state_id()
    when 'lg_admin'    then c_lga   is not null and c_lga   = private.current_lga_id()
    when 'ward_admin'  then c_ward  is not null and c_ward  = private.current_ward_id()
    else false end;
end;
$$;
```

- [ ] **Step 3: Write the migration — policies (ALTER POLICY; edits the expression only)**

```sql
-- profiles: allow super_admin, and the peer special-case (super may target any
-- role incl. super_admin; everyone else stays strictly-below).
alter policy profiles_insert on public.profiles with check (
  private.current_user_role() in
    ('super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator')
  and (private.current_user_role() = 'super_admin'
       or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
alter policy profiles_update on public.profiles using (
  (private.current_user_role() = 'super_admin'
   or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
) with check (
  (private.current_user_role() = 'super_admin'
   or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);

-- members_insert: add super_admin to the coordinator allowlist + the "any scope"
-- branch (like national). Confirm the exact 0033 shape in Step 1 and mirror it.
alter policy members_insert on public.members with check (
  (private.current_user_role() = 'leader' and registered_by = (select auth.uid())
     and polling_unit_id = private.current_polling_unit_id())
  or (private.current_user_role() = any (array['super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
    and (private.current_user_role() in ('super_admin','national_admin')
      or (private.current_user_role() = 'state_admin' and state_id = private.current_state_id())
      or (private.current_user_role() = 'lg_admin' and lga_id = private.current_lga_id())
      or (private.current_user_role() = 'ward_admin' and ward_id = private.current_ward_id())
      or (private.current_user_role() = 'unit_coordinator' and polling_unit_id = private.current_polling_unit_id()))
    and (registered_by = (select auth.uid())
      or exists (select 1 from public.profiles p where p.id = members.registered_by
                   and p.role = 'leader' and p.polling_unit_id = members.polling_unit_id)))
);

-- polling_units_insert: add super_admin (any ward). Confirm 0034 shape in Step 1.
alter policy polling_units_insert on public.polling_units with check (
  private.current_user_role() = any (array['super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
  and (private.current_user_role() in ('super_admin','national_admin')
    or exists (select 1 from public.wards w join public.lgas l on l.id = w.lga_id
      where w.id = polling_units.ward_id
        and (private.current_user_role() <> 'state_admin' or l.state_id = private.current_state_id())
        and (private.current_user_role() <> 'lg_admin' or w.lga_id = private.current_lga_id())
        and (private.current_user_role() <> 'ward_admin' or w.id = private.current_ward_id())
        and (private.current_user_role() <> 'unit_coordinator' or w.id = private.current_ward_id())))
);

-- elective-office catalogue: super_admin manages it, like national. Apply to each
-- table that has a catalogue_write policy (confirm the full list in Step 1).
alter policy catalogue_write on public.office_types using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.parties using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.elections using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.constituencies using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.constituency_lgas using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.constituency_wards using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));
alter policy catalogue_write on public.election_office_types using (private.current_user_role() in ('national_admin','super_admin')) with check (private.current_user_role() in ('national_admin','super_admin'));

-- activity_log: the owner reads the platform log too. Confirm the exact 0015
-- expression in Step 1 and add super_admin beside national_admin.
alter policy activity_log_select_national on public.activity_log using (
  exists (select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role in ('national_admin','super_admin')
            and p.status = 'active')
);
```

- [ ] **Step 4: Write the migration — the scope CHECK (drop + re-add; a CHECK can't be ALTERed)**

```sql
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'super_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'national_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'state_admin' then (state_id is not null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'lg_admin' then (state_id is not null and lga_id is not null and ward_id is null and polling_unit_id is null)
    when 'ward_admin' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is null)
    when 'unit_coordinator' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'leader' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'member' then true
    else null::boolean
  end
);
```

- [ ] **Step 5: Dry-run the whole migration on prod (`BEGIN…ROLLBACK`)**

Assemble Steps 2-4 into one script wrapped `BEGIN; … ROLLBACK;` and run via MCP `execute_sql`. Expected: completes with no error (validates the SQL + that `super_admin` is usable + the CHECK re-adds against existing rows). Nothing persists.

- [ ] **Step 6: Apply for real + regenerate types**

Apply via MCP `apply_migration` (name `0040_super_admin_rls`). Regenerate `lib/database.types.ts` (no shape change expected; confirm). Run `get_advisors` (security) — expect no new ERROR findings.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0040_super_admin_rls.sql lib/database.types.ts
git commit -m "feat(rls): super_admin is a superset of national + peer special-case [CR-0015]"
```

---

## Task 3 (T-086): App layer — role maps, nav, dashboard, logs

**Files:** Modify `lib/terms.ts`, `app/app/admin/new-account/tiers.ts`, `components/app-shell/nav.ts`, `app/app/page.tsx`, `app/app/logs/page.tsx`.

**Interfaces:** Consumes the `super_admin` type (Task 1). Produces: super_admin labelled, treated as a top-tier coordinator, and offered as a creatable/manageable role for a super caller.

- [ ] **Step 1: `lib/terms.ts`**

Add to `ROLE_LABELS`: `super_admin: "Super Admin",`. Add `super_admin` to `isCoordinator`:
```ts
export function isCoordinator(role: Role | string | null | undefined): boolean {
  return (
    role === "super_admin" ||
    role === "national_admin" ||
    role === "state_admin" ||
    role === "lg_admin" ||
    role === "ward_admin" ||
    role === "unit_coordinator"
  );
}
```

- [ ] **Step 2: `tiers.ts`** — rank/level/order + the peer special-case:
```ts
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 0,
  national_admin: 1, state_admin: 2, lg_admin: 3,
  ward_admin: 4, unit_coordinator: 5, leader: 6, member: 7,
};
export const ROLE_LEVEL: Record<Role, GeoLevel> = {
  super_admin: null, national_admin: null, state_admin: "state", lg_admin: "lga",
  ward_admin: "ward", unit_coordinator: "polling_unit", leader: "polling_unit", member: "polling_unit",
};
export const ROLE_ORDER: Role[] = [
  "super_admin", "national_admin", "state_admin", "lg_admin",
  "ward_admin", "unit_coordinator", "leader", "member",
];
```
And the peer special-case in `allowedTargets` (a super_admin may also target super_admin):
```ts
export function allowedTargets(role: Role): { role: Role; level: GeoLevel }[] {
  return ROLE_ORDER.filter(
    (r) => r !== "member" && (ROLE_RANK[r] > ROLE_RANK[role] || (role === "super_admin" && r === "super_admin")),
  ).map((r) => ({ role: r, level: ROLE_LEVEL[r] }));
}
```
`manageableRoles` derives from `allowedTargets`, so it inherits the special-case — no change there.

- [ ] **Step 3: `nav.ts`** — super_admin gets the national nav:
```ts
case "super_admin":
case "national_admin":
  return [...COORDINATOR_BASE, REGISTER, CANDIDATES, STATES, GEOGRAPHY, LOGS];
```
(Add `case "super_admin":` immediately above the existing `case "national_admin":`.)

- [ ] **Step 4: `app/app/page.tsx`** — treat super like national for the top-tier views. Change the national check:
```ts
const isNational = role === "national_admin" || role === "super_admin";
```
(`isCoordinator(role)` already routes super to `CoordinatorHome` via Task 1's `terms.ts`. The greeting reads `roleLabel(role)` → "Super Admin dashboard.")

- [ ] **Step 5: `app/app/logs/page.tsx`** — allow super to read the log. Replace the two national-only guards:
```ts
const isTop = me?.role === "national_admin" || me?.role === "super_admin";
if (isTop && me?.status !== "active") { /* the existing "add your VIN" block */ }
if (!isTop) { /* the existing "for the National Coordinator" block — reword to "for the National Coordinator or owner" */ }
```

- [ ] **Step 6: Typecheck + lint + build**

Run: `rm -rf .next && npx tsc --noEmit && npx eslint . && npm run build`. Expected: all green; every `Record<Role,…>` now exhaustive.

- [ ] **Step 7: Commit**

```bash
git add lib/terms.ts app/app/admin/new-account/tiers.ts components/app-shell/nav.ts app/app/page.tsx app/app/logs/page.tsx
git commit -m "feat(super-admin): label, top-tier nav/dashboard, peer targeting [CR-0015]"
```

---

## Task 4 (T-087): SQL RLS tests

**Files:** Create `supabase/tests/super_admin_rls_test.sql`

**Interfaces:** Consumes the deployed 0039+0040. Asserts the new tier's allow/deny rules.

- [ ] **Step 1: Write the test** (mirrors `supabase/tests/rls_test.sql`'s harness: seed auth users + geography + profiles, impersonate via `request.jwt.claims`, run in one `BEGIN … ROLLBACK`). Seed a `super_admin` (SU, no geo), a `national_admin` (NA), a `state_admin` (SA1), and members. Assertions:
  - **Read:** impersonating SU, `select count(*) from members` (scoped to the test's states) equals the national count (SU sees everything).
  - **SU may create a national_admin** (`insert into profiles (…, role='national_admin', state_id=null…)` succeeds).
  - **SU may create a peer super_admin** (`role='super_admin'`, all geo null) — succeeds (peer special-case).
  - **NA may NOT create a super_admin** (insert with `role='super_admin'` as NA → raises; caught → ok=false → assert denied).
  - **NA may NOT update a super_admin** (update SU's row as NA → denied).
  - **A state_admin may NOT create a national_admin or super_admin** (still strictly-below).
  - Seed profiles must satisfy `profiles_vin_required` (set `status='frozen'`, as `rls_test.sql` does, or give a VIN).

  Provide the full seed + assertions verbatim (follow `rls_test.sql` UUID/style conventions).

- [ ] **Step 2: Run it against prod (rolls back)**

Run via MCP `execute_sql` (the file wraps `begin … rollback`). Expected: `NOTICE: ALL SUPER_ADMIN RLS CHECKS PASSED`, no exception. If an assertion fails, fix the migration (Task 2) — the test is the spec.

- [ ] **Step 3: Commit**

```bash
git add supabase/tests/super_admin_rls_test.sql
git commit -m "test(rls): super_admin allow/deny (create/delete nationals + peers; escalation denied) [CR-0015]"
```

---

## Task 5 (T-088): Bootstrap seed (the owner account)

**Files:** none (one-time SQL against prod). Do NOT commit real emails/ids.

**Interfaces:** Consumes 0039+0040 applied. Produces: one `super_admin` account (the client).

- [ ] **Step 1: Confirm the target email with the human partner.** The client provides the email of the account to become the owner (an existing account is simplest — a national admin already has a VIN).

- [ ] **Step 2: Promote it (MCP `execute_sql`)** — clear geography (a super_admin carries none) and keep the existing VIN:

```sql
update public.profiles
   set role = 'super_admin', state_id = null, lga_id = null, ward_id = null, polling_unit_id = null
 where id = (select id from auth.users where email = '<CLIENT_EMAIL>')
returning id, role, status, vin_id;
```

Expected: one row, `role='super_admin'`, `vin_id` not null (if `status='active'`; the `profiles_vin_required` CHECK needs it). If the account is active with no VIN, either set `status='frozen'` first or have them add a VIN via the app; do not fabricate one.

- [ ] **Step 3: Verify** the promotion held and no rows violate the new CHECK:
`select role, count(*) from public.profiles group by role order by 1;` → one `super_admin`.

---

## Task 6 (T-088 verify): Gates + UI sign-off + PR

- [ ] **Step 1: Full gates** — `rm -rf .next && npx tsc --noEmit && npx eslint . && npm run build && npx vitest run`. All green.
- [ ] **Step 2: Re-run all SQL RLS tests** (`rls_test.sql`, `super_admin_rls_test.sql`) against prod. All pass.
- [ ] **Step 3: Advisors** — `get_advisors` security + performance. No new ERROR findings.
- [ ] **Step 4: Screenshots for UI sign-off** — sign in as the seeded super_admin (or a preview): the **Team** page lists national admins as manageable; **Give app access** shows "National Coordinator" and "Super Admin" in the role picker; the home reads "Super Admin dashboard" with the national map/logs. Show desktop + mobile, light + dark. **Wait for the human partner's approval before merging.**
- [ ] **Step 5: Docs** — set ADR-0017 → Accepted, tick CR-0015 tasks, add a `CHANGELOG.md` entry, and a `docs/engineering/learnings.md` note on the ADD VALUE two-migration constraint. Commit.
- [ ] **Step 6: PR** — Conventional title `feat: super admin (owner) role (CR-0015)`, body summarising the rank-0 approach + peer special-case + bootstrap, footer with the Claude Code line. Squash-merge after CI green + sign-off.

---

## Self-Review

**Spec coverage (CR-0015 / ADR-0017):**
- Enum value + rank 0 → Tasks 1, 2. ✓
- Superset-of-national RLS sweep (scope engine, profiles, members, polling_units, candidacy, catalogue, activity_log, CHECK) → Task 2. ✓
- Peer special-case (super may create/manage super) → Task 2 (policies) + Task 3 (`allowedTargets`). ✓
- No new UI; reuse Team + Give-app-access + national dashboard → Task 3 (nav/dashboard/logs) — Team + new-account use `manageableRoles`/`allowedTargets`, already covered. ✓
- Bootstrap by one-time prod seed → Task 5. ✓
- Two-migration ADD VALUE strategy + dry-run → Tasks 1, 2. ✓
- Tests (super reaches all; escalation denied) → Task 4. ✓

**Placeholder scan:** The `<CLIENT_EMAIL>` in Task 5 is a real runtime value supplied by the human partner, not a plan gap. The "confirm exact shape in Step 1" notes in Task 2 are correct engineering (the policies were restored by 0038 and must be read from prod, not guessed) — the target SQL is fully written; introspection only guards against drift.

**Type consistency:** `super_admin` is rank 0 in both `role_rank` (DB, Task 2) and `ROLE_RANK` (`tiers.ts`, Task 3). `ROLE_LABELS`, `ROLE_LEVEL`, `ROLE_ORDER`, `isCoordinator`, `navForRole`, and the `page.tsx`/`logs` guards all use the same `"super_admin"` token. `allowedTargets`'s special-case and the `profiles_insert`/`update` peer bypass express the same rule on both sides of the boundary.

**Known risks called out:** Tasks 1↔3 coupling (exhaustive `Record<Role>` maps) — fold together if tsc blocks. The RLS sweep must not miss a national-privileged spot (Step 1 introspection + Task 4 tests are the nets). Peer special-case is the escalation-critical change (explicit deny tests in Task 4).
