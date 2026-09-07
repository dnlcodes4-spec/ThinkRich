# Partner Organisations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the super admin onboard affiliated **partner organisations** (political or community) that recruit their own people into ThinkWinners under their own banner, each with a self-contained management world walled off from the core geographic admin chain but visible to the super admin.

**Architecture:** A single nullable `partner_id` dimension on `public.profiles` and `public.members` (`NULL` = the core movement). One new role, `partner_admin`, is the partner's apex (a scoped superset of `national_admin`); every tier below reuses the existing `user_role` values, carrying the partner's id. The RLS scope engine gains one predicate: a caller sees a row only if `row.partner_id IS NOT DISTINCT FROM private.current_partner_id()`, and `super_admin` still sees every partition. Additive migrations, no backfill.

**Tech Stack:** Next.js 16 (RSC, Server Actions), Supabase Postgres + RLS (`private` schema helpers), the Supabase MCP for applying migrations, SQL RLS tests (`supabase/tests/*.sql`), Vitest, Playwright.

**Spec:**
- [docs/project/change-requests/0026-partner-organisations-and-tenancy.md](../../project/change-requests/0026-partner-organisations-and-tenancy.md)
- [docs/architecture/decisions/0018-partner-organisations-and-tenancy.md](../../architecture/decisions/0018-partner-organisations-and-tenancy.md)

## Global Constraints

- **Never edit an applied migration.** New forward migrations only. Next numbers: **0044**, **0045**, **0046**, **0047**.
- **Apply migrations via the Supabase MCP** (`apply_migration`), never `supabase db push`.
- **Three-way enum split.** Postgres cannot add an enum value and *use* it in the same transaction. `0044` does only `ALTER TYPE … ADD VALUE`; `0045`+ reference it (separate applies). Apply `0044` to prod first, then dry-run each later migration with `BEGIN … ROLLBACK` before applying.
- **RLS is the authorization boundary (ADR-0005).** The app mirrors the partition; never rely on hiding a control.
- **The partner predicate is `partner_id IS NOT DISTINCT FROM private.current_partner_id()`** — never `=` (that is NULL-unsafe and would open the core partition).
- **`partner_admin` is `role_rank` 8** (below `member` at 7 in numeric terms is wrong — see Task 3; it ranks *above* `national_admin` numerically only within its own partition). It must never create `super_admin`, `national_admin`, or any `partner_id IS NULL` row.
- **`role_rank` is the single ordering source** (DB `private.role_rank`, mirrored by `ROLE_RANK` in `app/app/admin/new-account/tiers.ts`). Keep them in lock-step.
- **Geographic ceiling v1 = state-level or nationwide** (`partners.scope_state_id`, `NULL` = nationwide). No constituency-level scoping in this plan.
- **Regenerate `lib/database.types.ts`** after every schema change or typecheck fails app-wide.
- **No AI co-author trailer.** Conventional Commits. **No em dashes** in code or UI copy. **No eyebrow/kicker labels** in UI. **UI sign-off before committing UI** (Tasks 8, 9).
- **Current ladder** (post-`0040`): `super_admin, national_admin, state_admin, lg_admin, ward_admin, unit_coordinator, leader, member`. Helpers live in `private` (schema `0006`).
- Membership-number format today: `TWM-<STATE>-<LGA>-<seq>`, per-LGA counter in `public.lga_member_counters` (`0007`).

---

## File Structure

**New**
- `supabase/migrations/0044_partner_admin_enum.sql` — `ALTER TYPE … ADD VALUE 'partner_admin'`.
- `supabase/migrations/0045_partners_table.sql` — `partners` table, `partner_id` columns, `private.current_partner_id()`, immutability + ceiling triggers.
- `supabase/migrations/0046_partner_rls.sql` — the scope-engine + policy + CHECK sweep.
- `supabase/migrations/0047_partner_membership_numbers.sql` — per-`(partner_id, lga)` counter and the namespaced format.
- `supabase/tests/partner_rls_test.sql` — the allow/deny matrix.
- `app/app/admin/partners/page.tsx` — super-admin Partners list.
- `app/app/admin/partners/new/page.tsx` + `actions.ts` — onboard a partner + first `partner_admin`.
- `app/app/admin/partners/[id]/page.tsx` — one partner: counts, staff, deactivate.
- `app/lib/partners.ts` — shared partner helpers (kind labels, code validation).

**Modified**
- `lib/database.types.ts` (regenerate), `lib/terms.ts`, `app/app/admin/new-account/tiers.ts`, `app/components/app-shell/nav.ts`, `app/app/page.tsx` (role home), `app/app/logs/page.tsx` (guard), `app/app/admin/new-account/actions.ts` + `tiers.ts` (scope cascade), `app/app/members/provision-login.ts`, the `completeMyMembership` action (CR-0014), the register action, the membership-card route handler.
- `supabase/tests/rls_test.sql`, `supabase/tests/role_change_test.sql` (regression: core behaviour unchanged with `partner_id IS NULL`).
- `docs/architecture/data-model.md`, `docs/architecture/security-model.md`, `docs/HANDBOOK.md`, `docs/project/roadmap.md`, `CHANGELOG.md`.

---

## Task 1 (T-094): ADR-0018 — already written

**Files:** `docs/architecture/decisions/0018-partner-organisations-and-tenancy.md` (exists, Accepted).

- [ ] **Step 1: Confirm the ADR is committed on the feature branch.** No code. This task is the gate: T-097's RLS sweep must not merge before the ADR is reviewed by the user.

---

## Task 2 (T-095): Migration 0044 — add the `partner_admin` enum value

**Files:** Create `supabase/migrations/0044_partner_admin_enum.sql`. Modify `lib/database.types.ts`.

**Interfaces:**
- Produces: enum value `partner_admin` on `public.user_role` (unused until 0045+).

- [ ] **Step 1: Write the migration**

```sql
-- CR-0026 / ADR-0018: add the partner_admin role, the apex of a partner
-- organisation's own hierarchy. This migration ONLY adds the enum value;
-- Postgres forbids using a new enum value in the transaction that adds it, so
-- role_rank + policies that reference 'partner_admin' land in 0045/0046.
alter type public.user_role add value if not exists 'partner_admin' after 'super_admin';
```

- [ ] **Step 2: Apply via MCP** (`apply_migration`, name `0044_partner_admin_enum`). Verify:

```sql
select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid
where t.typname = 'user_role' order by e.enumsortorder;
```

Expected: `super_admin, partner_admin, national_admin, state_admin, lg_admin, ward_admin, unit_coordinator, leader, member`.

- [ ] **Step 3: Regenerate types.** MCP `generate_typescript_types`; write to `lib/database.types.ts`. Expected: `user_role` union includes `"partner_admin"`.

- [ ] **Step 4: Typecheck.** Run `cd app && rm -rf .next && npx tsc --noEmit`. If `Record<Role, …>` maps in `tiers.ts` / `terms.ts` now error as non-exhaustive, fold Task 6's `tiers.ts` + `terms.ts` edits into this commit (they are additive and safe). Otherwise proceed.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0044_partner_admin_enum.sql app/lib/database.types.ts
git commit -m "feat(rls): add partner_admin enum value [CR-0026]"
```

---

## Task 3 (T-096): Migration 0045 — `partners` table, `partner_id` columns, helpers, triggers

**Files:** Create `supabase/migrations/0045_partners_table.sql`. Modify `lib/database.types.ts`.

**Interfaces:**
- Produces:
  - table `public.partners (id uuid pk, name text, kind public.partner_kind, scope_state_id uuid null, code text unique, logo_url text null, status public.partner_status default 'active', created_by uuid, created_at timestamptz default now())`
  - enums `public.partner_kind` (`political`, `community`), `public.partner_status` (`active`, `inactive`)
  - `public.profiles.partner_id uuid null references public.partners(id)`
  - `public.members.partner_id uuid null references public.partners(id)`
  - `private.current_partner_id() returns uuid` — the caller's `profiles.partner_id`
  - trigger `partners_immutable_partner_id` on both tables (blocks UPDATE that changes a non-null `partner_id`)
  - trigger `enforce_partner_ceiling` on `profiles` and `members` (a partner row's `state_id` must equal `partners.scope_state_id` when that is non-null)

- [ ] **Step 1: Write the migration**

```sql
-- CR-0026 / ADR-0018: partner organisations. Additive only; every existing row
-- is core (partner_id null) and the RLS predicate added in 0046 is a no-op for
-- null = null.

create type public.partner_kind as enum ('political', 'community');
create type public.partner_status as enum ('active', 'inactive');

create table public.partners (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (length(btrim(name)) between 2 and 120),
  kind          public.partner_kind not null,
  scope_state_id uuid references public.states (id),          -- null = nationwide ceiling
  code          text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  logo_url      text,
  status        public.partner_status not null default 'active',
  created_by    uuid not null references auth.users (id),
  created_at    timestamptz not null default now()
);
alter table public.partners enable row level security;

-- super_admin manages partners; nobody else reads or writes the table.
create policy partners_super_all on public.partners
  for all
  using (private.current_user_role() = 'super_admin')
  with check (private.current_user_role() = 'super_admin');
-- a partner_admin may read only their own partner row (for branding / name).
create policy partners_own_select on public.partners
  for select
  using (id = private.current_partner_id());

alter table public.profiles add column partner_id uuid references public.partners (id);
alter table public.members  add column partner_id uuid references public.partners (id);
create index profiles_partner_id_idx on public.profiles (partner_id) where partner_id is not null;
create index members_partner_id_idx  on public.members  (partner_id) where partner_id is not null;

create function private.current_partner_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select partner_id from public.profiles where id = (select auth.uid());
$$;
grant execute on function private.current_partner_id() to anon, authenticated;

-- partner_id is set once at insert (like membership_number). Only the service
-- role (super-admin "move" action) may change it, and it bypasses this trigger.
create function private.freeze_partner_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.partner_id is not null and new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id is immutable once set';
  end if;
  return new;
end;
$$;
create trigger profiles_freeze_partner_id before update on public.profiles
  for each row execute function private.freeze_partner_id();
create trigger members_freeze_partner_id before update on public.members
  for each row execute function private.freeze_partner_id();

-- a partner row must sit inside the partner's ceiling (state-level v1).
create function private.enforce_partner_ceiling()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ceiling uuid;
begin
  if new.partner_id is null then return new; end if;
  select scope_state_id into ceiling from public.partners where id = new.partner_id;
  if ceiling is not null and new.state_id is distinct from ceiling then
    raise exception 'row state % is outside partner ceiling %', new.state_id, ceiling;
  end if;
  return new;
end;
$$;
create trigger profiles_partner_ceiling before insert or update on public.profiles
  for each row execute function private.enforce_partner_ceiling();
create trigger members_partner_ceiling before insert or update on public.members
  for each row execute function private.enforce_partner_ceiling();
```

- [ ] **Step 2: Dry-run then apply** via MCP. Dry-run: wrap the file in `begin; … rollback;` through `execute_sql`; confirm no error. Then `apply_migration` name `0045_partners_table`.

- [ ] **Step 3: Verify additive-safety**

```sql
select count(*) from public.profiles where partner_id is not null;  -- expect 0
select count(*) from public.members  where partner_id is not null;  -- expect 0
```

- [ ] **Step 4: Regenerate types**, write to `lib/database.types.ts`. Expect `partners` row type + `partner_kind` / `partner_status` enums.

- [ ] **Step 5: Typecheck** `cd app && npx tsc --noEmit`. Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0045_partners_table.sql app/lib/database.types.ts
git commit -m "feat(partners): partners table, partner_id columns, ceiling triggers [CR-0026]"
```

---

## Task 4 (T-097): Migration 0046 — the RLS scope-engine sweep

**Files:** Create `supabase/migrations/0046_partner_rls.sql`.

**Interfaces:**
- Consumes: `private.current_partner_id()` (Task 3).
- Produces: `private.member_in_scope` and `private.profile_in_scope` gain a trailing `p_partner uuid` parameter and the partition predicate; `partner_admin` treated as `national_admin` *within its partition*; `members_select` / `members_update` / `profiles_select` / `profiles_insert` / `profiles_update` re-pointed at the new signatures; `profiles_scope_matches_role` CHECK gains the `partner_admin` shape.

- [ ] **Step 1: Introspect current policy bodies** so nothing is lost:

```sql
select policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename in ('members','profiles') order by tablename, policyname;
```

- [ ] **Step 2: Write the migration**

```sql
-- CR-0026 / ADR-0018: partition the scope engine by partner_id. The predicate is
-- IS NOT DISTINCT FROM so core (null) callers match only core (null) rows.
-- partner_admin behaves as national_admin *inside its own partition*.
-- super_admin is unchanged: it still returns true for every partition.

drop policy members_select on public.members;
drop policy members_update on public.members;
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;

drop function private.member_in_scope(uuid, uuid, uuid, uuid, uuid, uuid);
drop function private.profile_in_scope(uuid, uuid, uuid, uuid, uuid);

create function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'super_admin' then 0 when 'partner_admin' then 1
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;
-- NOTE: partner_admin shares rank 1 with national_admin on purpose. The partition
-- predicate keeps the two apart; rank only orders tiers *within* a partition, and
-- a partner_admin creating a national_admin still fails role_rank(1) > role_rank(1) = false.

create function private.member_in_scope(
  m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid, m_partner uuid
) returns boolean language sql stable set search_path = '' as $$
  select private.current_user_role() = 'super_admin'
  or (
    m_partner is not distinct from private.current_partner_id()
    and case private.current_user_role()
      when 'partner_admin'    then true
      when 'national_admin'   then true
      when 'state_admin'      then m_state = private.current_state_id()
      when 'lg_admin'         then m_lga = private.current_lga_id()
      when 'ward_admin'       then m_ward = private.current_ward_id()
      when 'unit_coordinator' then m_pu = private.current_polling_unit_id()
      when 'leader'           then m_registered_by = (select auth.uid())
      when 'member'           then m_user_id = (select auth.uid())
      else false
    end
  );
$$;

create function private.profile_in_scope(
  p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid, p_partner uuid
) returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
  or private.current_user_role() = 'super_admin'
  or (
    p_partner is not distinct from private.current_partner_id()
    and case private.current_user_role()
      when 'partner_admin'    then true
      when 'national_admin'   then true
      when 'state_admin'      then p_state = private.current_state_id()
      when 'lg_admin'         then p_lga = private.current_lga_id()
      when 'ward_admin'       then p_ward = private.current_ward_id()
      when 'unit_coordinator' then p_pu = private.current_polling_unit_id()
      else false
    end
  );
$$;

create policy members_select on public.members for select using (
  private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
);
create policy members_update on public.members for update using (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
) with check (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
);

create policy profiles_select on public.profiles for select using (
  private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);
create policy profiles_insert on public.profiles for insert with check (
  private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
  and (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and (private.current_user_role() = 'super_admin' or role <> 'super_admin')
  and (private.current_user_role() = 'super_admin' or role <> 'partner_admin')
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);
create policy profiles_update on public.profiles for update using (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
) with check (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and (private.current_user_role() = 'super_admin' or role <> 'partner_admin')
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);

-- members_insert: partner staff insert members in their own partition. Extend the
-- existing 0040 body: add partner_admin to the allowlist + an "any scope in
-- partition" branch, and require partner_id match on every branch.
alter policy members_insert on public.members with check (
  partner_id is not distinct from private.current_partner_id()
  and (
    ((private.current_user_role() = 'leader') and (registered_by = (select auth.uid())) and (polling_unit_id = private.current_polling_unit_id()))
    or ((private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[]))
      and ((private.current_user_role() = any (array['super_admin','partner_admin','national_admin']::public.user_role[]))
        or ((private.current_user_role() = 'state_admin') and (state_id = private.current_state_id()))
        or ((private.current_user_role() = 'lg_admin') and (lga_id = private.current_lga_id()))
        or ((private.current_user_role() = 'ward_admin') and (ward_id = private.current_ward_id()))
        or ((private.current_user_role() = 'unit_coordinator') and (polling_unit_id = private.current_polling_unit_id())))
      and ((registered_by = (select auth.uid()))
        or (exists (select 1 from public.profiles p where p.id = members.registered_by and p.role = 'leader' and p.polling_unit_id = members.polling_unit_id and p.partner_id is not distinct from members.partner_id)))))
);

-- polling_units_insert: a partner's admins create polling units only inside their
-- ceiling state. Add partner_admin beside national but gate it on the ceiling.
alter policy polling_units_insert on public.polling_units with check (
  private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
  and (
    private.current_user_role() = any (array['super_admin','national_admin']::public.user_role[])
    or (private.current_user_role() = 'partner_admin' and exists (
        select 1 from public.wards w join public.lgas l on l.id = w.lga_id
        join public.partners pt on pt.id = private.current_partner_id()
        where w.id = polling_units.ward_id and (pt.scope_state_id is null or l.state_id = pt.scope_state_id)))
    or (exists (select 1 from (public.wards w join public.lgas l on l.id = w.lga_id)
      where w.id = polling_units.ward_id
        and ((private.current_user_role() <> 'state_admin') or (l.state_id = private.current_state_id()))
        and ((private.current_user_role() <> 'lg_admin') or (w.lga_id = private.current_lga_id()))
        and ((private.current_user_role() <> 'ward_admin') or (w.id = private.current_ward_id()))
        and ((private.current_user_role() <> 'unit_coordinator') or (w.id = private.current_ward_id())))))
);

-- the scope CHECK (drop + re-add; a CHECK cannot be ALTERed). partner_admin
-- carries no geography of its own (like national) but must carry a partner_id;
-- that partner_id requirement is a NOT NULL-style rule enforced here.
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'super_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is null)
    when 'partner_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is not null)
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

-- activity_log: a partner_admin reads only their partition's log; super/national
-- read all. (Assumes activity_log has or gains a partner_id column; if not, add
-- `alter table public.activity_log add column partner_id uuid references public.partners(id);`
-- and set it in the log-writing helper for partner-context actions.)
alter table public.activity_log add column if not exists partner_id uuid references public.partners (id);
drop policy if exists activity_log_select_national on public.activity_log;
create policy activity_log_select_scoped on public.activity_log for select using (
  exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.status = 'active'
    and (p.role in ('national_admin','super_admin')
      or (p.role = 'partner_admin' and public.activity_log.partner_id is not distinct from p.partner_id)))
);
```

- [ ] **Step 3: Dry-run on prod** with `BEGIN … ROLLBACK` via `execute_sql`. Fix any error before applying.

- [ ] **Step 4: Apply** via MCP, name `0046_partner_rls`.

- [ ] **Step 5: Smoke test as an existing core national admin** (unchanged behaviour):

```sql
set role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','<a real national_admin uuid>')::text, true);
select count(*) from public.members;   -- same number as before the migration
reset role;
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/0046_partner_rls.sql
git commit -m "feat(rls): partition the scope engine by partner_id [CR-0026]"
```

---

## Task 5 (T-098): Migration 0047 — partner-namespaced membership numbers

**Files:** Create `supabase/migrations/0047_partner_membership_numbers.sql`.

**Interfaces:**
- Consumes: `public.members.partner_id`, `public.partners.code`.
- Produces: `TWM-<PARTNER>-<STATE>-<LGA>-<seq>` for partner members (per `(partner_id, lga)` sequence); core format unchanged.

- [ ] **Step 1: Write the migration**

```sql
-- CR-0026 / ADR-0018: namespace membership numbers by partner. Core members keep
-- TWM-<STATE>-<LGA>-<seq>; partner members get TWM-<CODE>-<STATE>-<LGA>-<seq>
-- with a counter scoped to (partner_id, lga) so each partner's sequence starts at 1.

alter table public.lga_member_counters drop constraint lga_member_counters_pkey;
alter table public.lga_member_counters add column partner_id uuid references public.partners (id);
create unique index lga_member_counters_key
  on public.lga_member_counters (lga_id, coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid));

create or replace function private.next_lga_seq(p_lga uuid, p_partner uuid default null)
returns integer language sql security definer set search_path = '' as $$
  insert into public.lga_member_counters (lga_id, partner_id, seq) values (p_lga, p_partner, 1)
  on conflict (lga_id, coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set seq = public.lga_member_counters.seq + 1
  returning seq;
$$;

create or replace function private.assign_membership_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s_code text; l_code text; p_code text; n integer;
begin
  if new.membership_number is null or new.membership_number = '' then
    select code into s_code from public.states where id = new.state_id;
    select code into l_code from public.lgas   where id = new.lga_id;
    n := private.next_lga_seq(new.lga_id, new.partner_id);
    if new.partner_id is null then
      new.membership_number := format('TWM-%s-%s-%s', s_code, l_code, lpad(n::text, 6, '0'));
    else
      select code into p_code from public.partners where id = new.partner_id;
      new.membership_number := format('TWM-%s-%s-%s-%s', p_code, s_code, l_code, lpad(n::text, 6, '0'));
    end if;
  end if;
  return new;
end;
$$;

grant execute on function private.next_lga_seq(uuid, uuid) to authenticated;
```

- [ ] **Step 2: Dry-run, apply** via MCP name `0047_partner_membership_numbers`.

- [ ] **Step 3: Verify core generation is unchanged** — insert a throwaway core member in a `begin … rollback` and confirm the number still matches `^TWM-[A-Z]{2}-[A-Z0-9]+-\d{6}$`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0047_partner_membership_numbers.sql
git commit -m "feat(partners): partner-namespaced membership numbers [CR-0026]"
```

---

## Task 6 (T-100): App layer — role maps and navigation

**Files:** Modify `app/app/admin/new-account/tiers.ts`, `app/lib/terms.ts`, `app/components/app-shell/nav.ts`, `app/app/logs/page.tsx`, `app/app/page.tsx`.

**Interfaces:**
- Consumes: `Role` now includes `"partner_admin"`.
- Produces: `partner_admin` is ranked, labelled ("Partner Admin"), navigable (same set as `national_admin` minus `STATES`/`GEOGRAPHY`/core `LOGS` semantics), and treated as a national-tier guard pass *scoped to the partner*.

- [ ] **Step 1: `tiers.ts`** — add `partner_admin` to `ROLE_RANK` (`1`), `ROLE_LEVEL` (`null`), `ROLE_ORDER` (after `super_admin`). In `allowedTargets`, a `partner_admin` may target every role strictly below rank 1 (state_admin … leader) but never `super_admin`, `partner_admin`, or `national_admin`. Add a guard: `partner_admin`'s targets are the same list `national_admin` gets minus `national_admin` itself.

```ts
export const ROLE_RANK: Record<Role, number> = {
  super_admin: 0,
  partner_admin: 1,
  national_admin: 1,
  state_admin: 2, lg_admin: 3, ward_admin: 4, unit_coordinator: 5, leader: 6, member: 7,
};
```

Update `allowedTargets` so the `role === "super_admin"` peer branch is not extended to `partner_admin`, and add `&& r !== "national_admin" && r !== "partner_admin"` when the caller is `partner_admin`.

- [ ] **Step 2: `terms.ts`** — add `partner_admin: "Partner Admin"` to `ROLE_LABELS`; add `partner_admin` to `isCoordinator` (true); do **not** add it to `isNationalTier` (that admits core-wide authority; a partner admin is partition-wide, not nation-wide). Add a new `isPartnerScoped(role)` returning `role === "partner_admin"` for guards that need it.

- [ ] **Step 3: `nav.ts`** — add a `case "partner_admin":` returning `[...COORDINATOR_BASE, REGISTER]` (no `STATES`, no `GEOGRAPHY`, no `CANDIDATES` catalogue, no core `LOGS`). If the partner is `community` kind the shell further trims to Home + Members + a count tile (decide in Task 9; nav can stay full and the pages guard).

- [ ] **Step 4: `logs/page.tsx`** — the guard currently admits `isNationalTier`. Leave that; the RLS policy from Task 4 already scopes a `partner_admin`'s log reads to their partition, so allowing them onto the page shows only their own rows. Add `|| role === "partner_admin"` to the guard.

- [ ] **Step 5: `app/page.tsx`** (role home) — route `partner_admin` to the same coordinator home component `national_admin` uses. The counts on that home already come from RLS-scoped queries, so a partner admin sees their partition's totals automatically.

- [ ] **Step 6: Typecheck + unit tests**

```bash
cd app && npx tsc --noEmit && npx vitest run tiers terms
```

Add a Vitest case in `app/app/admin/new-account/tiers.test.ts`:

```ts
it("partner_admin can target state_admin..leader but never national/super/partner", () => {
  const targets = allowedTargets("partner_admin").map((t) => t.role);
  expect(targets).toEqual(["state_admin","lg_admin","ward_admin","unit_coordinator","leader"]);
});
```

- [ ] **Step 7: Commit**

```bash
git add app/app/admin/new-account/tiers.ts app/lib/terms.ts app/components/app-shell/nav.ts app/app/logs/page.tsx app/app/page.tsx app/app/admin/new-account/tiers.test.ts
git commit -m "feat(partners): role maps, nav and guards for partner_admin [CR-0026]"
```

---

## Task 7 (T-099): SQL RLS test matrix

**Files:** Create `supabase/tests/partner_rls_test.sql`. Modify `supabase/tests/rls_test.sql` and `supabase/tests/role_change_test.sql` (regression asserts core is unchanged).

**Interfaces:**
- Consumes: everything from Tasks 3 and 4.

- [ ] **Step 1: Write `partner_rls_test.sql`** modelled exactly on `supabase/tests/super_admin_rls_test.sql` (one `begin … rollback`, `auth.users` + geography + `profiles` seeded `frozen`, impersonation via `request.jwt.claims`, assertions raise on failure). Seed:
  - Partner **P1** (`political`, `scope_state_id = S1`, `code = 'P1'`), Partner **P2** (`community`, nationwide, `code = 'P2'`).
  - Core: `national_admin NA`, `state_admin SA_S1`, `leader L_core` in `S1>L1>W1>PU1`, member `M_core`.
  - P1: `partner_admin PA1`, `state_admin SA_P1` (state S1), `leader L_p1` in PU1, member `M_p1`.
  - P2: `partner_admin PA2`, member `M_p2`.
  - `super_admin SU`.

- [ ] **Step 2: Assertions** (each raises on failure):

| # | Actor | Action | Expected |
|---|-------|--------|----------|
| 1 | `NA` (core national) | count `members` | sees `M_core` only, **not** `M_p1` / `M_p2` |
| 2 | `SA_S1` (core state) | select `M_p1` | 0 rows (partner member hidden from core geo admin) |
| 3 | `PA1` | count `members` | sees `M_p1` only, not `M_core` / `M_p2` |
| 4 | `PA1` | select `profiles` where id = `NA` | 0 rows |
| 5 | `PA1` | insert `profiles` role `state_admin`, `partner_id = P1`, state S1 | **allowed** |
| 6 | `PA1` | insert `profiles` role `national_admin` | **denied** (`role_rank` 1 > 1 false) |
| 7 | `PA1` | insert `profiles` role `super_admin` | **denied** |
| 8 | `PA1` | insert `profiles` role `partner_admin`, `partner_id = P1` | **denied** (only super_admin creates partner_admin) |
| 9 | `PA1` | insert `profiles` `partner_id = P2` | **denied** (`partner_id` predicate) |
| 10 | `PA1` | insert `members` `partner_id = null` | **denied** |
| 11 | `PA1` | insert `members` `partner_id = P1`, state S1 | **allowed**, number matches `^TWM-P1-` |
| 12 | `PA1` | insert `members` `partner_id = P1`, state **S2** (outside ceiling) | **denied** (ceiling trigger) |
| 13 | `L_p1` | select `members` | sees only members they registered, all in P1 |
| 14 | `M_p1` | select `members` | sees only their own row |
| 15 | `SU` | count `members` | sees all three (`M_core`, `M_p1`, `M_p2`) |
| 16 | `SU` | insert `profiles` role `partner_admin`, `partner_id = P2` | **allowed** |
| 17 | `PA2` (community) | insert `profiles` role `state_admin` | **allowed by RLS** (kind is a UI limit, not an RLS one) documented, not asserted as denied |
| 18 | update `M_core` set `partner_id = P1` as `SU` via authenticated (not service) | **denied** (`freeze_partner_id`; only service-role move) |
| 19 | `PA1` update `M_p1` set `partner_id = P2` | **denied** |
| 20 | `NA` | select `partners` | 0 rows (only super_admin + own partner_admin read `partners`) |

- [ ] **Step 3: Run** via MCP `execute_sql` (paste the file). A clean run prints the final `raise notice 'ALL PARTNER RLS CHECKS PASSED'`.

- [ ] **Step 4: Regression** — re-run `supabase/tests/rls_test.sql`, `role_change_test.sql`, `super_admin_rls_test.sql`, `kym_test.sql` unchanged. All must still pass (core data has `partner_id IS NULL`, predicate is a no-op).

- [ ] **Step 5: Commit**

```bash
git add supabase/tests/partner_rls_test.sql
git commit -m "test(rls): partner partition allow/deny matrix [CR-0026]"
```

---

## Task 8 (T-101): Super-admin "Partners" surface  — UI, needs visual sign-off

**Files:** Create `app/app/admin/partners/page.tsx`, `app/app/admin/partners/new/page.tsx`, `app/app/admin/partners/new/actions.ts`, `app/app/admin/partners/[id]/page.tsx`, `app/lib/partners.ts`. Modify `app/components/app-shell/nav.ts` (add a `PARTNERS` nav item for `super_admin` only).

**Interfaces:**
- Consumes: `partners` table, `partners_super_all` policy, `createAdminClient()` for provisioning the first `partner_admin` (service role, mirrors `app/app/admin/new-account/actions.ts`).
- Produces: `onboardPartner(input)` server action.

- [ ] **Step 1: `app/lib/partners.ts`** — `PARTNER_KIND_LABELS`, `partnerCodeSchema` (Zod: `/^[A-Z0-9]{2,6}$/`), `partnerOnboardSchema` (name, kind, scopeStateId nullable, code, adminFullName, adminEmail).

- [ ] **Step 2: Failing test** `app/app/admin/partners/new/actions.test.ts`:

```ts
it("rejects a non-super_admin caller", async () => {
  // mock the supabase client to return role 'national_admin'
  await expect(onboardPartner(validInput)).rejects.toThrow(/super admin/i);
});
it("normalises the code to uppercase and validates the shape", () => {
  expect(partnerOnboardSchema.parse({ ...base, code: "abc1" }).code).toBe("ABC1");
});
```

- [ ] **Step 3: Implement `onboardPartner`** in `actions.ts`:
  1. `isAdminConfigured()` guard (as `new-account/actions.ts:51`).
  2. Verify caller is `super_admin` (read own profile).
  3. Zod-validate + normalise the input.
  4. Insert the `partners` row under the caller's own credentials (RLS `partners_super_all` allows it), `created_by = caller`.
  5. With the **admin client**: create the `auth.users` account (email, a random password, email-confirm), then insert the `profiles` row `role = 'partner_admin'`, `partner_id = <new>`, `status = 'active'`, `full_name`.
  6. Write an `activity_log` row (`partner_id` set).
  7. Return the partner id.

- [ ] **Step 4: `partners/page.tsx`** — server component, `super_admin` guard, table of partners (name, kind, ceiling state, code, member count via `select count from members where partner_id = …`, status), a "Onboard a partner" button. Mobile: card list (design system rule).

- [ ] **Step 5: `partners/new/page.tsx`** — the onboard form (name, kind radio, ceiling state select with "Nationwide" option, code, first admin name + email). Uses design tokens, mobile-first, WCAG AA.

- [ ] **Step 6: `partners/[id]/page.tsx`** — one partner: headline count ("people brought"), its `partner_admin`(s), a Deactivate action (sets `status = 'inactive'`).

- [ ] **Step 7: `nav.ts`** — add `const PARTNERS: NavItem = { href: "/app/admin/partners", label: "Partners", icon: "team", short: "Partners" }` and append it to the `case "super_admin":` return only (not `national_admin`).

- [ ] **Step 8: Gates + screenshots**

```bash
cd app && npx tsc --noEmit && npx vitest run partners && npx playwright test partners
```

Then run the app, sign in as the super admin, screenshot `/app/admin/partners`, `/app/admin/partners/new`, and a partner detail page, **desktop + mobile, light + dark**. Post them and **wait for the user's explicit approval** before committing.

- [ ] **Step 9: Commit** (after approval)

```bash
git add app/app/admin/partners app/lib/partners.ts app/components/app-shell/nav.ts
git commit -m "feat(partners): super-admin onboarding and oversight surface [CR-0026]"
```

---

## Task 9 (T-102): Partner-admin scoped experience  — UI, needs visual sign-off

**Files:** Modify the coordinator home component (`app/app/page.tsx` sub-tree), `app/app/admin/team/page.tsx`, `app/app/admin/new-account/*` (scope cascade), `app/app/register/*`. Create `app/app/(partner)/…` only if a distinct community view is needed.

**Interfaces:**
- Consumes: `private.current_partner_id()` is implicit in RLS; the app just needs to not assume "national = whole country".

- [ ] **Step 1:** Audit every screen a `partner_admin` reaches (Team, Give app access, Register, Members, Corrections, Stats, Activity). For each, confirm the data query is RLS-scoped (no service-role reads that would cross the partition) and no copy says "nationwide" / "whole movement" for this role. Fix labels via `terms.ts` helpers.

- [ ] **Step 2:** `new-account` geography cascade — when the caller is `partner_admin` with a `scope_state_id`, the state picker is pinned to that state (or free if nationwide). Reuse `scopeColumnsToClear` / `ROLE_LEVEL`.

- [ ] **Step 3:** Community-kind trim — if `partners.kind = 'community'`, hide "Give app access" and "Team" from the nav and guard those routes (a community partner has no sub-admins). Show a prominent "People brought" count on the home. Political-kind gets the full coordinator set.

- [ ] **Step 4:** Failing Playwright test `app/e2e/partner-admin.spec.ts`: a political `partner_admin` sees Team + Register; registers a member; that member appears in their Members list; the same member is **not** visible to a seeded core state admin. A community `partner_admin` sees the count and no Team link.

- [ ] **Step 5:** Implement to green.

- [ ] **Step 6:** Gates + screenshots (desktop + mobile, light + dark) for the partner-admin home (both kinds), Team, Register. Post and **wait for approval**.

- [ ] **Step 7: Commit** (after approval)

```bash
git commit -m "feat(partners): partner-admin scoped dashboard and community trim [CR-0026]"
```

---

## Task 10 (T-103): Partner members and staff into the membership + card + provisioning path

**Files:** Modify `app/app/members/provision-login.ts`, the `completeMyMembership` action (CR-0014, find via `grep -rn "completeMyMembership" app`), the register action (`app/app/register/actions.ts`), the membership-card route handler (`grep -rn "membership-card" app`).

- [ ] **Step 1:** `provision-login.ts` — when provisioning a login for a partner member, copy `members.partner_id` onto the new `profiles` row. When promoting/creating partner staff, set `partner_id` from the acting partner admin's own `partner_id`.

- [ ] **Step 2:** `completeMyMembership` — a staff member's own membership row inherits `partner_id` from their `profiles` row (a partner's `state_admin` gets a `partner_id` member row, so their card carries the partner code).

- [ ] **Step 3:** register action — accept `partner_id` only from server-derived context (`private.current_partner_id()` equivalent: read the caller's profile), never from the client payload. Reject if the caller is core but a `partner_id` is present, and vice-versa.

- [ ] **Step 4:** card route handler — the `Code` line already renders `membership_number`, which now carries the partner segment. Confirm the blank-template layout has room for the longer string; if not, shrink the font for partner numbers. No branding change (same ThinkWinners card, per CR-0026).

- [ ] **Step 5:** duplicate-registration warning — in the register pre-check, when a NIN/VIN already exists, the friendly message distinguishes: same partition ("already registered") vs different partition ("this person is already registered under another organisation or the core movement, and cannot be added here"). The DB `voter_ids` PK still hard-blocks it.

- [ ] **Step 6:** Tests — unit test the register action rejects a client-supplied `partner_id`; e2e: a partner member downloads a card and the Code shows `TWM-<CODE>-…`.

- [ ] **Step 7: Commit**

```bash
git commit -m "feat(partners): partner_id through provisioning, membership and cards [CR-0026]"
```

---

## Task 11 (T-104): Count integrity  — totals include partner members, drill-downs exclude them

**Files:** `grep -rn "count" app/app/**/stats* app/**/*live* app/**/*count*` and the public Think-Winners live-count endpoint (`grep -rn "live" app/app/\(marketing\) app/app/think-winners` or similar).

- [ ] **Step 1:** Identify the two paths:
  - **Unscoped totals** — the public live count and the National dashboard total. These should count every `members` row regardless of `partner_id`. If they run as an RLS-scoped `national_admin` query they now *exclude* partner members, which is wrong. Switch them to a `SECURITY DEFINER` count function `public.movement_member_count()` that counts all `status = 'active'` members, or run them with the service role.
  - **Scoped drill-downs** — a state admin's member list / per-state tallies. These pass through `member_in_scope` and now correctly exclude partner members. No change.

- [ ] **Step 2:** Failing test `supabase/tests/partner_counts_test.sql`: seed 1 core + 1 partner active member; assert `public.movement_member_count()` returns 2; assert a core `state_admin`'s `select count(*) from members where state_id = …` returns 1.

- [ ] **Step 3:** Implement the definer function + point the public count and National total at it.

- [ ] **Step 4:** Screenshot the National dashboard total and the public live count before/after seeding a partner member (they should rise). Post for sign-off since the National dashboard is UI.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(partners): movement totals count partner members; drill-downs do not [CR-0026]"
```

---

## Task 12 (T-105): Docs sweep

**Files:** `docs/architecture/data-model.md`, `docs/architecture/security-model.md`, `docs/HANDBOOK.md`, `docs/project/roadmap.md`, `CHANGELOG.md`.

- [ ] **Step 1:** `data-model.md` — add `partners` to the entity list; add `partner_id` to `profiles` and `members`; add the `partner_admin` role to the enum note; add an invariant: "partner_id is set once and immutable; a person belongs to exactly one world; partner members count in movement totals but are hidden from the geographic admin chain."
- [ ] **Step 2:** `security-model.md` — document the partition predicate as a second scoping axis beside role/geography, and the standing rule that every new `profiles`/`members` policy must carry it.
- [ ] **Step 3:** `HANDBOOK.md` — a short "Partner organisations" section (what they are, the two kinds, the wall, the super admin's view).
- [ ] **Step 4:** `roadmap.md` — add the partner work as its own line (Phase 2.5 or under Phase 2), note the deferred constituency-level ceiling as an open item.
- [ ] **Step 5:** `CHANGELOG.md` — an entry under Unreleased.
- [ ] **Step 6: Commit**

```bash
git commit -m "docs(partners): data model, security model, handbook, roadmap, changelog [CR-0026]"
```

---

## Self-Review

**Spec coverage:**
- Two partner kinds → Tasks 3 (`partner_kind`), 8, 9 (community trim). ✓
- Full hierarchy for political partners → Task 4 (`partner_admin` behaves as national in-partition), 6, 9. ✓
- Walled off from geographic admins → Task 4 (predicate), Task 7 assertions 1, 2. ✓
- Partner members are full members (polling unit, count, candidates, card, login) → Tasks 5, 10, 11. ✓
- Super admin sees everything → Task 4 (`super_admin` short-circuit), Task 7 assertion 15. ✓
- Geographic ceiling set at onboarding → Task 3 (`scope_state_id` + trigger), Task 8. ✓
- Logins + same PWA → Task 6 (nav), Task 9, Task 10. ✓
- Same card with a partner code in the number → Tasks 5, 10. ✓
- NIN/VIN global uniqueness → unchanged (ADR-0015); Task 10 step 5 covers the message. ✓
- One person, one world → Task 3 (`freeze_partner_id`), Task 7 assertions 18, 19. ✓
- Counts include but drill-downs exclude → Task 11. ✓

**Known deferrals (from the spec, intentional):** constituency-level ceiling; whether a community partner ever gets sub-admins (assumed no, revisit if the client asks).

**Type consistency:** `private.member_in_scope` / `private.profile_in_scope` gain exactly one trailing `uuid` param, updated at every call site in Task 4. `ROLE_RANK` keys match the DB `private.role_rank` case. `partnerOnboardSchema` shape is the single source for the onboard action and form.

---

## Execution Handoff

Plan saved to `docs/superpowers/plans/2026-09-05-partner-organisations.md`.

**Open the RLS design (Task 4) for the user before applying `0046` to prod** — it is the highest-risk migration and the ADR gate (Task 1) applies.
