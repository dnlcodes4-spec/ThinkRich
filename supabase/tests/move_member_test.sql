-- CR-0026 Chunk B [migration 0056]: public.move_member_to_partition.
--
-- One super-admin RPC moves a rank-and-file member between partitions, reissuing
-- the membership number in the destination and re-partitioning the login. Behind
-- a transaction-local `app.partition_move` flag that freeze_partner_id and
-- prevent_membership_number_change honour; enforce_partner_ceiling is not
-- bypassed. Seed style mirrors partner_rls_test.sql. One transaction, rolled back.

begin;

-- ── auth users ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('c0000000-0000-4000-8000-00000000a001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-su@test.dev'),
  ('c0000000-0000-4000-8000-00000000a002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-na@test.dev'),
  ('c0000000-0000-4000-8000-00000000a003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-lead@test.dev'),
  ('c0000000-0000-4000-8000-00000000a010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-mcore@test.dev'),
  ('c0000000-0000-4000-8000-00000000a011','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-mp1@test.dev'),
  ('c0000000-0000-4000-8000-00000000a012','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-mp2@test.dev'),
  ('c0000000-0000-4000-8000-00000000a013','00000000-0000-0000-0000-000000000000','authenticated','authenticated','mv-mstaff@test.dev');

-- ── geography: S1 > L1 > W1 > PU1, and a bare S2 > L2 > W2 > PU2 ──
insert into public.states (id, name, code, is_active) values
  ('c1000000-0000-4000-8000-00000000a001','MoveStateOne','MV1', true),
  ('c1000000-0000-4000-8000-00000000a002','MoveStateTwo','MV2', true);
insert into public.lgas (id, state_id, name, code) values
  ('c2000000-0000-4000-8000-00000000a001','c1000000-0000-4000-8000-00000000a001','MoveLGA1','MVL1'),
  ('c2000000-0000-4000-8000-00000000a002','c1000000-0000-4000-8000-00000000a002','MoveLGA2','MVL2');
insert into public.wards (id, lga_id, name) values
  ('c3000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','MoveWard1'),
  ('c3000000-0000-4000-8000-00000000a002','c2000000-0000-4000-8000-00000000a002','MoveWard2');
insert into public.polling_units (id, ward_id, name) values
  ('c4000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','MovePU1'),
  ('c4000000-0000-4000-8000-00000000a002','c3000000-0000-4000-8000-00000000a002','MovePU2');

-- ── partners: P1 political + state-scoped to S1; P2, P3 community + nationwide ──
insert into public.partners (id, name, kind, scope_state_id, code, created_by) values
  ('ca000000-0000-4000-8000-00000000a001','Move Partner One','political','c1000000-0000-4000-8000-00000000a001','MVP1','c0000000-0000-4000-8000-00000000a001'),
  ('ca000000-0000-4000-8000-00000000a002','Move Partner Two','community', null,'MVP2','c0000000-0000-4000-8000-00000000a001'),
  ('ca000000-0000-4000-8000-00000000a003','Move Partner Three','community', null,'MVP3','c0000000-0000-4000-8000-00000000a001');

-- ── voter cards ──
insert into public.voter_ids (vin) values
  ('MVVINSTAFF000000001'),('MVVINMCORE000000001'),
  ('MVVINMPONE000000001'),('MVVINMPTWO000000001');

-- ── profiles ──
-- super_admin, a core national_admin, a core leader (registrar for the members),
-- one partner-P1 login for the P1 member, one member login for M_core, and one
-- STAFF profile (state_admin) whose id also backs a members row (test 6).
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, vin_id, status) values
  ('c0000000-0000-4000-8000-00000000a001','super_admin','MV_SU',null,null,null,null,null,null,'frozen'),
  ('c0000000-0000-4000-8000-00000000a002','national_admin','MV_NA',null,null,null,null,null,null,'frozen'),
  ('c0000000-0000-4000-8000-00000000a003','leader','MV_LEAD','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001',null,null,'frozen'),
  ('c0000000-0000-4000-8000-00000000a013','state_admin','MV_STAFF','c1000000-0000-4000-8000-00000000a001',null,null,null,null,'MVVINSTAFF000000001','frozen');
-- member-role login profiles (exempt from profiles_vin_required, and the
-- partition-ceiling trigger skips role='member', 0049)
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
  ('c0000000-0000-4000-8000-00000000a010','member','MV_MCORE_LOGIN','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001',null,'active'),
  ('c0000000-0000-4000-8000-00000000a011','member','MV_MP1_LOGIN','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001','ca000000-0000-4000-8000-00000000a001','active');

-- ── members ──
-- M_core: core, S1, with a member login. M_p1: partner P1, S1, with a member login.
-- M_p2: partner P2, S2 (nationwide partner). M_staff: user_id points at the
-- state_admin profile (a staffer with a member record).
insert into public.members
  (id, registered_by, user_id, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
  ('cf000000-0000-4000-8000-00000000a010','c0000000-0000-4000-8000-00000000a003','c0000000-0000-4000-8000-00000000a010','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001', null,'MoveMemberCore','1990-01-01','MVNINCORE01','MVVINMCORE000000001'),
  ('cf000000-0000-4000-8000-00000000a011','c0000000-0000-4000-8000-00000000a001','c0000000-0000-4000-8000-00000000a011','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001','ca000000-0000-4000-8000-00000000a001','MoveMemberP1','1990-01-01','MVNINP101','MVVINMPONE000000001'),
  ('cf000000-0000-4000-8000-00000000a012','c0000000-0000-4000-8000-00000000a001', null,'c1000000-0000-4000-8000-00000000a002','c2000000-0000-4000-8000-00000000a002','c3000000-0000-4000-8000-00000000a002','c4000000-0000-4000-8000-00000000a002','ca000000-0000-4000-8000-00000000a002','MoveMemberP2','1990-01-01','MVNINP201','MVVINMPTWO000000001'),
  ('cf000000-0000-4000-8000-00000000a013','c0000000-0000-4000-8000-00000000a001','c0000000-0000-4000-8000-00000000a013','c1000000-0000-4000-8000-00000000a001','c2000000-0000-4000-8000-00000000a001','c3000000-0000-4000-8000-00000000a001','c4000000-0000-4000-8000-00000000a001', null,'MoveMemberStaff','1990-01-01','MVNINSTAFF01','MVVINSTAFF000000001');

create or replace function pg_temp.as_user(sub text) returns void language plpgsql as $$
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
end $$;

do $$
declare
  rv text; ok boolean; n int;
  su   text := 'c0000000-0000-4000-8000-00000000a001';
  na   text := 'c0000000-0000-4000-8000-00000000a002';
  p1   uuid := 'ca000000-0000-4000-8000-00000000a001';
  p2   uuid := 'ca000000-0000-4000-8000-00000000a002';
  p3   uuid := 'ca000000-0000-4000-8000-00000000a003';
  m_core  uuid := 'cf000000-0000-4000-8000-00000000a010';
  m_p1    uuid := 'cf000000-0000-4000-8000-00000000a011';
  m_p2    uuid := 'cf000000-0000-4000-8000-00000000a012';
  m_staff uuid := 'cf000000-0000-4000-8000-00000000a013';
begin
  -- 5. non-super is rejected (do this first, before any successful move)
  perform pg_temp.as_user(na);
  begin
    rv := public.move_member_to_partition(m_core, p1); ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'FAIL [5]: a national_admin moved a member'; end if;

  -- 6. staff (member row backed by a state_admin profile) is rejected
  perform pg_temp.as_user(su);
  begin
    rv := public.move_member_to_partition(m_staff, p1); ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'FAIL [6]: a staff account was moved'; end if;

  -- 7. same-partition is rejected
  begin
    rv := public.move_member_to_partition(m_p1, p1); ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'FAIL [7]: moved a member into its current partition'; end if;

  -- 4. ceiling rejection: M_p2 sits in S2; P1 is scoped to S1
  begin
    rv := public.move_member_to_partition(m_p2, p1); ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'FAIL [4]: moved a member outside the destination ceiling'; end if;

  -- 1. core -> state-scoped partner P1 (M_core is in S1, inside the ceiling)
  rv := public.move_member_to_partition(m_core, p1);
  if rv !~ '^TWM-MVP1-MV1-MVL1-[0-9]{6}$' then
    raise exception 'FAIL [1]: number % is not TWM-MVP1-MV1-MVL1-nnnnnn', rv;
  end if;
  select membership_number into rv from public.members where id = m_core;
  if rv !~ '^TWM-MVP1-' then raise exception 'FAIL [1]: members.membership_number not updated (%)', rv; end if;
  select partner_id::text into rv from public.members where id = m_core;
  if rv is distinct from p1::text then raise exception 'FAIL [1]: members.partner_id not set'; end if;
  select partner_id::text into rv from public.profiles where id = 'c0000000-0000-4000-8000-00000000a010';
  if rv is distinct from p1::text then raise exception 'FAIL [1]: login profiles.partner_id not set'; end if;

  -- 2. partner P1 -> core movement
  rv := public.move_member_to_partition(m_p1, null);
  if rv !~ '^TWM-MV1-MVL1-[0-9]{6}$' then
    raise exception 'FAIL [2]: number % is not a core TWM-MV1-MVL1-nnnnnn', rv;
  end if;
  select coalesce(partner_id::text,'<null>') into rv from public.members where id = m_p1;
  if rv <> '<null>' then raise exception 'FAIL [2]: members.partner_id not cleared'; end if;
  select coalesce(partner_id::text,'<null>') into rv from public.profiles where id = 'c0000000-0000-4000-8000-00000000a011';
  if rv <> '<null>' then raise exception 'FAIL [2]: login profiles.partner_id not cleared'; end if;

  -- 3. partner A (P2) -> partner B (P3), both nationwide
  rv := public.move_member_to_partition(m_p2, p3);
  if rv !~ '^TWM-MVP3-MV2-MVL2-[0-9]{6}$' then
    raise exception 'FAIL [3]: number % does not carry P3 code / S2 / L2', rv;
  end if;
  select partner_id::text into rv from public.members where id = m_p2;
  if rv is distinct from p3::text then raise exception 'FAIL [3]: members.partner_id not = P3'; end if;

  -- 8. the flag is transaction-local: a bare membership_number update still raises
  begin
    update public.members set membership_number = 'TWM-X-Y-999999' where id = m_core; ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'FAIL [8]: app.partition_move leaked past the RPC'; end if;

  -- 9. one audit row per successful move, in the destination partition.
  -- Read as the DB owner (no RLS): activity_log_select_scoped needs an *active*
  -- profile and this test's super_admin is seeded 'frozen' (profiles_vin_required).
  perform set_config('role','none',true);
  select count(*) into n from public.activity_log where action = 'member.moved';
  if n <> 3 then raise exception 'FAIL [9]: expected 3 member.moved rows, got %', n; end if;
  select count(*) into n from public.activity_log
    where action = 'member.moved' and subject_id = m_p2 and partner_id = p3;
  if n <> 1 then raise exception 'FAIL [9]: the P2->P3 move is not logged in P3''s partition'; end if;

  raise notice 'MOVE MEMBER: all checks passed';
end $$;

rollback;
