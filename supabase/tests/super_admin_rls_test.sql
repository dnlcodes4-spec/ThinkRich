-- RLS allow/deny tests for the super_admin (owner) role [CR-0015 / ADR-0017].
-- super_admin is role_rank 0 (national_admin = 1): a superset of national that
-- can create/delete ANY admin, including other national_admins AND other
-- super_admins (the "peer special-case" carved into profiles_insert/update).
-- Mirrors the harness style of supabase/tests/rls_test.sql: one transaction,
-- seeded via auth.users + geography + public.profiles (frozen, to sidestep
-- profiles_vin_required), impersonation via request.jwt.claims, assertions
-- that raise on failure. Everything ROLLS BACK, so nothing persists.
--
-- Run locally with `supabase db execute` / psql, or via the Supabase MCP.
-- A failed assertion raises an exception; a clean run means all checks passed.

begin;

-- ── auth users (profiles.id FKs to auth.users) ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','su@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','na@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ld1@test.dev'),
  -- targets for the provisioning tests (so denials are RLS, not a missing FK)
  ('a0000000-0000-0000-0000-0000000000c5','00000000-0000-0000-0000-000000000000','authenticated','authenticated','goodna@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','goodsu@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c7','00000000-0000-0000-0000-000000000000','authenticated','authenticated','esc-na-by-na@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','esc-su-by-na@test.dev'),
  ('a0000000-0000-0000-0000-0000000000c9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','esc-na-by-sa@test.dev'),
  ('a0000000-0000-0000-0000-0000000000ca','00000000-0000-0000-0000-000000000000','authenticated','authenticated','esc-su-by-sa@test.dev');

-- ── geography: S1 > L1 > W1 > PU1 ──
insert into public.states (id, name, code, is_active) values
  ('b0000000-0000-0000-0000-000000009001','SuperTeststate','ST1', true);
insert into public.lgas (id, state_id, name, code) values
  ('c0000000-0000-0000-0000-000000009001','b0000000-0000-0000-0000-000000009001','SuperLGA','SLG1');
insert into public.wards (id, lga_id, name) values
  ('d0000000-0000-0000-0000-000000009001','c0000000-0000-0000-0000-000000009001','SuperWard');
insert into public.polling_units (id, ward_id, name) values
  ('e0000000-0000-0000-0000-000000009001','d0000000-0000-0000-0000-000000009001','SuperPU1');

-- ── profiles ──
-- super_admin and national_admin carry NO geography; state_admin carries
-- state only; leader carries the full path (profiles_scope_matches_role).
-- All staff profiles are seeded 'frozen' to sidestep profiles_vin_required
-- (that CHECK only applies to active non-member profiles).
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, status) values
  ('a0000000-0000-0000-0000-0000000000c1','super_admin','SU', null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000c2','national_admin','NA', null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000c3','state_admin','SA1','b0000000-0000-0000-0000-000000009001', null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000c4','leader','LD1','b0000000-0000-0000-0000-000000009001','c0000000-0000-0000-0000-000000009001','d0000000-0000-0000-0000-000000009001','e0000000-0000-0000-0000-000000009001', 'frozen');

-- ── voter_ids: members_vin_required forces an active member to carry a vin_id ──
insert into public.voter_ids (vin) values
  ('SUPERVIN00000000001'),
  ('SUPERVIN00000000002');

-- ── members (M1, M2 in PU1, registered by LD1) ──
insert into public.members
  (id, membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin, vin_id) values
  ('f0000000-0000-0000-0000-000000009001','TWM-ST1-SLG1-090001','a0000000-0000-0000-0000-0000000000c4','b0000000-0000-0000-0000-000000009001','c0000000-0000-0000-0000-000000009001','d0000000-0000-0000-0000-000000009001','e0000000-0000-0000-0000-000000009001','SuperM1','1990-01-01','SUPNIN0001','SUPERVIN00000000001'),
  ('f0000000-0000-0000-0000-000000009002','TWM-ST1-SLG1-090002','a0000000-0000-0000-0000-0000000000c4','b0000000-0000-0000-0000-000000009001','c0000000-0000-0000-0000-000000009001','d0000000-0000-0000-0000-000000009001','e0000000-0000-0000-0000-000000009001','SuperM2','1990-01-01','SUPNIN0002','SUPERVIN00000000002');

-- ─────────────────── helper: member-count check as a given user ───────────────────
-- Counts only THIS test's members (the one seeded state), so the assertion
-- doesn't depend on how much real data happens to exist when the suite runs.
create or replace function pg_temp.expect_member_count(sub text, expected int, label text)
returns void language plpgsql as $$
declare n int;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  select count(*) into n from public.members
   where state_id = 'b0000000-0000-0000-0000-000000009001';
  perform set_config('role', 'none', true);
  if n <> expected then
    raise exception 'RLS FAIL [%]: expected % members, got %', label, expected, n;
  end if;
end;
$$;

-- ── 1. SU reads everything (like national) ──
select pg_temp.expect_member_count('a0000000-0000-0000-0000-0000000000c1', 2, 'super_admin sees all');

-- ─────────────────── writes: creates, peer special-case, escalation denials ───────────────────
do $$
declare ok boolean; v_full_name text;
begin
  -- 2. SU may create a national_admin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c1"}', true);
  insert into public.profiles (id, role, full_name, status)
    values ('a0000000-0000-0000-0000-0000000000c5','national_admin','GoodNA','frozen');
  perform set_config('role', 'none', true);

  -- 3. SU may create a peer super_admin (the special-case)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c1"}', true);
  insert into public.profiles (id, role, full_name, status)
    values ('a0000000-0000-0000-0000-0000000000c6','super_admin','GoodSU','frozen');
  perform set_config('role', 'none', true);

  -- 4. NA may NOT create a super_admin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c2"}', true);
  begin
    insert into public.profiles (id, role, full_name, status)
      values ('a0000000-0000-0000-0000-0000000000c8','super_admin','EscSUByNA','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: national_admin created a super_admin (escalation)'; end if;

  -- 5. NA may NOT update a super_admin (row must be invisible/blocked to NA)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c2"}', true);
  update public.profiles set full_name = 'HACKED' where id = 'a0000000-0000-0000-0000-0000000000c1';
  perform set_config('role', 'none', true);
  select full_name into v_full_name from public.profiles where id = 'a0000000-0000-0000-0000-0000000000c1';
  if v_full_name <> 'SU' then raise exception 'RLS FAIL: national_admin updated a super_admin profile'; end if;

  -- 6. NA may NOT create another national_admin (unchanged strict-rank rule; regression guard)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c2"}', true);
  begin
    insert into public.profiles (id, role, full_name, status)
      values ('a0000000-0000-0000-0000-0000000000c7','national_admin','EscNAByNA','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: national_admin created another national_admin (escalation)'; end if;

  -- 7a. SA1 (state_admin) may NOT create a national_admin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c3"}', true);
  begin
    insert into public.profiles (id, role, full_name, status)
      values ('a0000000-0000-0000-0000-0000000000c9','national_admin','EscNABySA','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: state_admin created a national_admin (escalation)'; end if;

  -- 7b. SA1 (state_admin) may NOT create a super_admin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-0000000000c3"}', true);
  begin
    insert into public.profiles (id, role, full_name, status)
      values ('a0000000-0000-0000-0000-0000000000ca','super_admin','EscSUBySA','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: state_admin created a super_admin (escalation)'; end if;

  raise notice 'ALL SUPER_ADMIN RLS CHECKS PASSED';
end;
$$;

rollback;
