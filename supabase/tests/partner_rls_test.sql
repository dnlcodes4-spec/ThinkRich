-- RLS allow/deny tests for the partner partition [CR-0026 / ADR-0018, T-099].
--
-- The partition predicate added in 0046 is always
-- `partner_id is not distinct from private.current_partner_id()`: a core caller
-- (partner_id null) sees only core rows, a partner caller sees only that
-- partner's rows, and null never leaks across the boundary. partner_admin is
-- role_rank 1 (== national_admin) but confined to its own partition. 0047
-- namespaces partner membership numbers as TWM-<CODE>-<STATE>-<LGA>-<seq>. 0048
-- makes members/profiles.partner_id INSERT-only.
--
-- Mirrors supabase/tests/super_admin_rls_test.sql: one transaction, seeded via
-- auth.users + geography + public.profiles (staff 'frozen' to sidestep
-- profiles_vin_required), impersonation via request.jwt.claims, assertions that
-- raise on failure. Everything ROLLS BACK, so nothing persists.
--
-- Run via the Supabase MCP execute_sql (paste the whole file) or psql. A failed
-- assertion raises; a clean run ends with 'ALL PARTNER RLS CHECKS PASSED'.

begin;

-- ── auth users (profiles.id and members.user_id FK to auth.users) ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-su@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-na@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-sa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-lcore@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d5','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-sap1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d7','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-lp1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d8','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-mp1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000d9','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-pa2@test.dev'),
  -- pre-seeded FK targets for the write assertions (so a denial is RLS, not a missing FK)
  ('a0000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-sa-by-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-na-by-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-su-by-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-pa-by-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e5','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-p2-by-pa1@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-pa2-by-su@test.dev'),
  ('a0000000-0000-0000-0000-0000000000e7','00000000-0000-0000-0000-000000000000','authenticated','authenticated','p-new-sa-by-pa2@test.dev');

-- ── geography: S1 > L1 > W1 > PU1, plus a bare second state S2 ──
insert into public.states (id, name, code, is_active) values
  ('b0000000-0000-0000-0000-00000000d001','PartnerTeststate1','PT1', true),
  ('b0000000-0000-0000-0000-00000000d002','PartnerTeststate2','PT2', true);
insert into public.lgas (id, state_id, name, code) values
  ('c0000000-0000-0000-0000-00000000d001','b0000000-0000-0000-0000-00000000d001','PartnerLGA1','PLG1');
insert into public.wards (id, lga_id, name) values
  ('d0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','PartnerWard1');
insert into public.polling_units (id, ward_id, name) values
  ('e0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','PartnerPU1');

-- ── partners: P1 political + state-scoped to S1, P2 community + nationwide ──
insert into public.partners (id, name, kind, scope_state_id, code, created_by) values
  ('a1000000-0000-0000-0000-000000000001','Partner One','political','b0000000-0000-0000-0000-00000000d001','P1','a0000000-0000-0000-0000-0000000000d1'),
  ('a1000000-0000-0000-0000-000000000002','Partner Two','community', null,                                  'P2','a0000000-0000-0000-0000-0000000000d1');

-- ── profiles ──
-- Core staff (partner_id null); P1 staff (partner_id = P1); P2 staff (partner_id = P2).
-- partner_admin carries NO geography and a partner_id (mirrors national_admin);
-- state_admin carries state only; leader carries the full path
-- (profiles_scope_matches_role). Staff are 'frozen' to sidestep
-- profiles_vin_required.
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
  -- core
  ('a0000000-0000-0000-0000-0000000000d1','super_admin',   'SU',    null, null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000d2','national_admin', 'NA',    null, null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000d3','state_admin',    'SA_S1', 'b0000000-0000-0000-0000-00000000d001', null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000000d4','leader',         'L_core','b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001', null, 'frozen'),
  -- P1
  ('a0000000-0000-0000-0000-0000000000d5','partner_admin',  'PA1',   null, null, null, null, 'a1000000-0000-0000-0000-000000000001', 'frozen'),
  ('a0000000-0000-0000-0000-0000000000d6','state_admin',    'SA_P1', 'b0000000-0000-0000-0000-00000000d001', null, null, null, 'a1000000-0000-0000-0000-000000000001', 'frozen'),
  ('a0000000-0000-0000-0000-0000000000d7','leader',         'L_p1',  'b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001', 'a1000000-0000-0000-0000-000000000001', 'frozen'),
  -- P2
  ('a0000000-0000-0000-0000-0000000000d9','partner_admin',  'PA2',   null, null, null, null, 'a1000000-0000-0000-0000-000000000002', 'frozen');

-- member M_p1's own login profile (role member): carries the full path AND
-- partner_id = P1, so private.current_partner_id() resolves to P1 when M_p1
-- impersonates (assertion 14). role='member' is exempt from profiles_vin_required.
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
  ('a0000000-0000-0000-0000-0000000000d8','member','M_p1_login','b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000001','active');

-- ── voter_ids: members_vin_required forces every active member to carry a vin_id ──
insert into public.voter_ids (vin) values
  ('PRTNRVINCORE0000001'),
  ('PRTNRVINP1000000001'),
  ('PRTNRVINP2000000001');

-- ── members: M_core (core), M_p1 (P1, with a login), M_p2 (P2) ──
-- M_core and M_p2 get explicit membership numbers; M_p1 lets the 0047 trigger
-- assign one so assertion 11's sibling format check has a real neighbour.
insert into public.members
  (id, membership_number, registered_by, user_id, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
  ('f0000000-0000-0000-0000-00000000d001','TWM-PT1-PLG1-090001','a0000000-0000-0000-0000-0000000000d4', null,                                   'b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001', null,                                   'M_core','1990-01-01','PRTNNINCORE01','PRTNRVINCORE0000001'),
  ('f0000000-0000-0000-0000-00000000d003','TWM-P2-PT1-PLG1-090001','a0000000-0000-0000-0000-0000000000d9', null,                                 'b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000002','M_p2','1990-01-01','PRTNNINP2001','PRTNRVINP2000000001');
insert into public.members
  (id, registered_by, user_id, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
  ('f0000000-0000-0000-0000-00000000d002','a0000000-0000-0000-0000-0000000000d7','a0000000-0000-0000-0000-0000000000d8','b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000001','M_p1','1990-01-01','PRTNNINP1001','PRTNRVINP1000000001');

-- ─────────── helper: member-count as a given user, scoped to this test's states ───────────
create or replace function pg_temp.expect_member_count(sub text, expected int, label text)
returns void language plpgsql as $$
declare n int;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  select count(*) into n from public.members
   where state_id in ('b0000000-0000-0000-0000-00000000d001','b0000000-0000-0000-0000-00000000d002');
  perform set_config('role', 'none', true);
  if n <> expected then
    raise exception 'RLS FAIL [%]: expected % members, got %', label, expected, n;
  end if;
end;
$$;

-- ═══════════════════ read-partition assertions ═══════════════════

-- 1. NA (core national) sees only M_core, not M_p1 / M_p2.
select pg_temp.expect_member_count('a0000000-0000-0000-0000-0000000000d2', 1, '1: core national sees core member only');

-- 3. PA1 sees only M_p1, not M_core / M_p2.
select pg_temp.expect_member_count('a0000000-0000-0000-0000-0000000000d5', 1, '3: partner_admin sees own partition only');

-- 15. SU sees all three.
select pg_temp.expect_member_count('a0000000-0000-0000-0000-0000000000d1', 3, '15: super_admin sees every partition');

do $$
declare n int; bad int;
begin
  -- 2. SA_S1 (core state admin) cannot see a partner member.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d3')::text, true);
  select count(*) into n from public.members where id = 'f0000000-0000-0000-0000-00000000d002';
  perform set_config('role','none',true);
  if n <> 0 then raise exception 'RLS FAIL [2]: core state_admin saw a partner member (% rows)', n; end if;

  -- 4. PA1 cannot see a core profile (NA).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  select count(*) into n from public.profiles where id = 'a0000000-0000-0000-0000-0000000000d2';
  perform set_config('role','none',true);
  if n <> 0 then raise exception 'RLS FAIL [4]: partner_admin saw a core profile (% rows)', n; end if;

  -- 13. L_p1 sees only members they registered, all inside P1.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d7')::text, true);
  select count(*) into n from public.members;
  select count(*) into bad from public.members where partner_id is distinct from 'a1000000-0000-0000-0000-000000000001';
  perform set_config('role','none',true);
  if n <> 1 then raise exception 'RLS FAIL [13]: L_p1 saw % members, expected 1', n; end if;
  if bad <> 0 then raise exception 'RLS FAIL [13]: L_p1 saw % non-P1 members', bad; end if;

  -- 14. M_p1 sees only their own row.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d8')::text, true);
  select count(*) into n from public.members;
  perform set_config('role','none',true);
  if n <> 1 then raise exception 'RLS FAIL [14]: M_p1 saw % members, expected 1 (own row)', n; end if;

  -- 20. NA cannot read public.partners (only super_admin + a partner's own partner_admin).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d2')::text, true);
  select count(*) into n from public.partners;
  perform set_config('role','none',true);
  if n <> 0 then raise exception 'RLS FAIL [20]: core national_admin read % partner rows', n; end if;

  raise notice 'read-partition assertions (1,2,3,4,13,14,15,20) passed';
end;
$$;

-- ═══════════════════ write assertions: profile provisioning ═══════════════════
do $$
declare ok boolean; n int; v_num text;
begin
  -- 5. PA1 may create a state_admin inside its own partition.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  insert into public.profiles (id, role, full_name, state_id, partner_id, status)
    values ('a0000000-0000-0000-0000-0000000000e1','state_admin','NewSAByPA1','b0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000001','frozen');
  perform set_config('role','none',true);
  select count(*) into n from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e1';
  if n <> 1 then raise exception 'RLS FAIL [5]: PA1 could not create a partner state_admin'; end if;

  -- 6. PA1 may NOT create a national_admin (role_rank 1 > 1 is false).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.profiles (id, role, full_name, partner_id, status)
      values ('a0000000-0000-0000-0000-0000000000e2','national_admin','NewNAByPA1','a1000000-0000-0000-0000-000000000001','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [6]: partner_admin created a national_admin'; end if;

  -- 7. PA1 may NOT create a super_admin.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.profiles (id, role, full_name, status)
      values ('a0000000-0000-0000-0000-0000000000e3','super_admin','NewSUByPA1','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [7]: partner_admin created a super_admin'; end if;

  -- 8. PA1 may NOT create another partner_admin (only super_admin mints partner_admin).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.profiles (id, role, full_name, partner_id, status)
      values ('a0000000-0000-0000-0000-0000000000e4','partner_admin','NewPAByPA1','a1000000-0000-0000-0000-000000000001','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [8]: partner_admin created another partner_admin'; end if;

  -- 9. PA1 may NOT create a profile in a different partition (partner_id = P2).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.profiles (id, role, full_name, state_id, partner_id, status)
      values ('a0000000-0000-0000-0000-0000000000e5','state_admin','NewP2ByPA1','b0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000002','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [9]: partner_admin wrote into another partition'; end if;
  select count(*) into n from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e5';
  if n <> 0 then raise exception 'RLS FAIL [9]: cross-partition profile row exists'; end if;

  -- 16. SU may create a partner_admin for P2.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d1')::text, true);
  insert into public.profiles (id, role, full_name, partner_id, status)
    values ('a0000000-0000-0000-0000-0000000000e6','partner_admin','NewPA2BySU','a1000000-0000-0000-0000-000000000002','frozen');
  perform set_config('role','none',true);
  select count(*) into n from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e6';
  if n <> 1 then raise exception 'RLS FAIL [16]: super_admin could not create a partner_admin'; end if;

  -- 17. PA2 (community kind) may create a state_admin in its partition.
  -- community-kind is a UI/product limit (T-102), not an RLS boundary; RLS
  -- correctly allows this. Asserted as a SUCCESS, not a denial.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d9')::text, true);
  insert into public.profiles (id, role, full_name, state_id, partner_id, status)
    values ('a0000000-0000-0000-0000-0000000000e7','state_admin','NewSAByPA2','b0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000002','frozen');
  perform set_config('role','none',true);
  select count(*) into n from public.profiles where id = 'a0000000-0000-0000-0000-0000000000e7';
  if n <> 1 then raise exception 'RLS FAIL [17]: community-kind partner_admin blocked by RLS (should be a UI limit only)'; end if;

  raise notice 'profile-provisioning assertions (5,6,7,8,9,16,17) passed';
end;
$$;

-- ═══════════════════ write assertions: member insert / partition move ═══════════════════
do $$
declare ok boolean; n int; v_num text; v_partner uuid;
begin
  -- 10. PA1 may NOT insert a core member (partner_id null).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
      values ('a0000000-0000-0000-0000-0000000000d5','b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001', null, 'BadCoreByPA1','1990-01-01','PRTNNINBAD10', null);
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [10]: partner_admin inserted a core member'; end if;

  -- 11. PA1 inserts a member in its own partition (P1, inside ceiling state S1).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  insert into public.members (id, registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
    values ('f0000000-0000-0000-0000-00000000d011','a0000000-0000-0000-0000-0000000000d5','b0000000-0000-0000-0000-00000000d001','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000001','NewMemberByPA1','1990-01-01','PRTNNINNEW11', null);
  perform set_config('role','none',true);
  select membership_number into v_num from public.members where id = 'f0000000-0000-0000-0000-00000000d011';
  if v_num is null or v_num !~ '^TWM-P1-' then
    raise exception 'RLS FAIL [11]: partner member number % does not match ^TWM-P1-', v_num;
  end if;

  -- 12. PA1 may NOT insert a P1 member outside the partner ceiling (state S2).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
      values ('a0000000-0000-0000-0000-0000000000d5','b0000000-0000-0000-0000-00000000d002','c0000000-0000-0000-0000-00000000d001','d0000000-0000-0000-0000-00000000d001','e0000000-0000-0000-0000-00000000d001','a1000000-0000-0000-0000-000000000001','OutsideCeiling','1990-01-01','PRTNNINBAD12', null);
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [12]: partner member accepted outside the partner ceiling'; end if;

  -- 18. SU, impersonated as authenticated (NOT service role), may NOT pull a core
  -- member into a partition by UPDATE (0048 freeze_partner_id: insert-only).
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d1')::text, true);
  begin
    update public.members set partner_id = 'a1000000-0000-0000-0000-000000000001'
      where id = 'f0000000-0000-0000-0000-00000000d001';
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [18]: authenticated super_admin moved a member between partitions'; end if;
  select partner_id into v_partner from public.members where id = 'f0000000-0000-0000-0000-00000000d001';
  if v_partner is not null then raise exception 'RLS FAIL [18]: M_core.partner_id changed to %', v_partner; end if;

  -- 19. PA1 may NOT move its own member into another partition.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','a0000000-0000-0000-0000-0000000000d5')::text, true);
  begin
    update public.members set partner_id = 'a1000000-0000-0000-0000-000000000002'
      where id = 'f0000000-0000-0000-0000-00000000d002';
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL [19]: partner_admin moved a member into another partition'; end if;
  select partner_id into v_partner from public.members where id = 'f0000000-0000-0000-0000-00000000d002';
  if v_partner is distinct from 'a1000000-0000-0000-0000-000000000001' then
    raise exception 'RLS FAIL [19]: M_p1.partner_id changed to %', v_partner;
  end if;

  raise notice 'member-write assertions (10,11,12,18,19) passed';
end;
$$;

do $$
begin
  raise notice 'ALL PARTNER RLS CHECKS PASSED';
end;
$$;

rollback;
