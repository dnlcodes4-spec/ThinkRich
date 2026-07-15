-- RLS allow/deny tests for the identity/membership model (T-001b).
-- Seeds a mini hierarchy, impersonates each role via request.jwt.claims, and
-- asserts visibility + write rules + the trigger invariants. Everything runs in
-- one transaction and ROLLS BACK, so no test data persists.
--
-- Run locally with `supabase db execute` / psql, or via the Supabase MCP.
-- A failed assertion raises an exception; a clean run means all checks passed.

begin;

-- ── auth users (profiles.id FKs to auth.users) ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','na@test.dev'),
  ('a0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa1@test.dev'),
  ('a0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa2@test.dev'),
  ('a0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lg1@test.dev'),
  ('a0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wa1@test.dev'),
  ('a0000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','uc1@test.dev'),
  ('a0000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ld1@test.dev'),
  ('a0000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ld2@test.dev'),
  ('a0000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ldb@test.dev'),
  ('a0000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','lds2@test.dev'),
  -- targets for the provisioning tests (so denials are RLS, not FK)
  ('a0000000-0000-0000-0000-0000000000fe','00000000-0000-0000-0000-000000000000','authenticated','authenticated','goodlg@test.dev'),
  ('a0000000-0000-0000-0000-0000000000ff','00000000-0000-0000-0000-000000000000','authenticated','authenticated','escalate@test.dev');

-- ── geography: S1>L1>W1>{P1,P1b}, S2>L2>W2>P2 ──
insert into public.states (id, name, code, is_active) values
  ('b0000000-0000-0000-0000-000000000001','Teststate1','T1', true),
  ('b0000000-0000-0000-0000-000000000002','Teststate2','T2', true);
insert into public.lgas (id, state_id, name, code) values
  ('c0000000-0000-0000-0000-000000000001','b0000000-0000-0000-0000-000000000001','LGA1','LG1'),
  ('c0000000-0000-0000-0000-000000000002','b0000000-0000-0000-0000-000000000002','LGA2','LG2');
insert into public.wards (id, lga_id, name) values
  ('d0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','Ward1'),
  ('d0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','Ward2');
insert into public.polling_units (id, ward_id, name) values
  ('e0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','PU1'),
  ('e0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000001','PU1b'),
  ('e0000000-0000-0000-0000-000000000003','d0000000-0000-0000-0000-000000000002','PU2');

-- ── profiles (full geographic path per level) ──
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id) values
  ('a0000000-0000-0000-0000-000000000001','national_admin','NA', null,null,null,null),
  ('a0000000-0000-0000-0000-000000000002','state_admin','SA1','b0000000-0000-0000-0000-000000000001',null,null,null),
  ('a0000000-0000-0000-0000-000000000003','state_admin','SA2','b0000000-0000-0000-0000-000000000002',null,null,null),
  ('a0000000-0000-0000-0000-000000000004','lg_admin','LG1','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001',null,null),
  ('a0000000-0000-0000-0000-000000000005','ward_admin','WA1','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001',null),
  ('a0000000-0000-0000-0000-000000000006','unit_coordinator','UC1','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000007','leader','LD1','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000008','leader','LD2','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000009','leader','LDb','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002'),
  ('a0000000-0000-0000-0000-00000000000a','leader','LDS2','b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003');

-- ── members (M1,M2 in P1 by LD1/LD2; M3 in P1b by LDb; M4 in P2 by LDS2) ──
insert into public.members
  (id, membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin) values
  ('f0000000-0000-0000-0000-000000000001','TWM-T1-LG1-000001','a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','M1','1990-01-01','NIN0000001'),
  ('f0000000-0000-0000-0000-000000000002','TWM-T1-LG1-000002','a0000000-0000-0000-0000-000000000008','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','M2','1990-01-01','NIN0000002'),
  ('f0000000-0000-0000-0000-000000000003','TWM-T1-LG1-000003','a0000000-0000-0000-0000-000000000009','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','M3','1990-01-01','NIN0000003'),
  ('f0000000-0000-0000-0000-000000000004','TWM-T2-LG2-000001','a0000000-0000-0000-0000-00000000000a','b0000000-0000-0000-0000-000000000002','c0000000-0000-0000-0000-000000000002','d0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000003','M4','1990-01-01','NIN0000004');

-- ─────────────────── helper to run a member-count check as a user ───────────────────
create or replace function pg_temp.expect_member_count(sub text, expected int, label text)
returns void language plpgsql as $$
declare n int;
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  select count(*) into n from public.members;
  perform set_config('role', 'none', true);
  if n <> expected then
    raise exception 'RLS FAIL [%]: expected % members, got %', label, expected, n;
  end if;
end;
$$;

-- ── read hierarchy (allow/deny by scope) ──
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000001', 4, 'national sees all');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000002', 3, 'state1 sees its 3');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000003', 1, 'state2 sees its 1');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000004', 3, 'lg1 sees ward members');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000005', 3, 'ward1 sees pu members');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000006', 2, 'coordinator sees only PU1');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000007', 1, 'leader1 sees only own');
select pg_temp.expect_member_count('a0000000-0000-0000-0000-000000000008', 1, 'leader2 sees only own');

-- ─────────────────── write rules + escalation + triggers ───────────────────
do $$
declare ok boolean;
begin
  -- leader LD1 may register a member in their own PU
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000007"}', true);
  insert into public.members (membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
    values ('TWM-T1-LG1-000010','a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','New','1990-01-01','NIN0000010');
  perform set_config('role', 'none', true);

  -- leader LD1 may NOT register into a different PU (P1b)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000007"}', true);
  begin
    insert into public.members (membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('TWM-T1-LG1-000011','a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000002','Bad','1990-01-01','NIN0000011');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: leader registered into a PU that is not theirs'; end if;

  -- a ward admin (non-leader) may NOT insert a member
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000005"}', true);
  begin
    insert into public.members (membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('TWM-T1-LG1-000012','a0000000-0000-0000-0000-000000000005','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Bad2','1990-01-01','NIN0000012');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: non-leader inserted a member'; end if;

  -- privilege escalation: SA1 may NOT create a state_admin (same level)
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002"}', true);
  begin
    insert into public.profiles (id, role, full_name, state_id)
      values ('a0000000-0000-0000-0000-0000000000ff','state_admin','Escalate','b0000000-0000-0000-0000-000000000001');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role', 'none', true);
  if ok then raise exception 'RLS FAIL: state admin created a same-level admin (escalation)'; end if;

  -- ... but SA1 MAY create an lg_admin within their state
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', '{"sub":"a0000000-0000-0000-0000-000000000002"}', true);
  insert into public.profiles (id, role, full_name, state_id, lga_id)
    values ('a0000000-0000-0000-0000-0000000000fe','lg_admin','GoodLG','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001');
  perform set_config('role', 'none', true);

  -- trigger: membership_number is immutable
  begin
    update public.members set membership_number = 'CHANGED' where id = 'f0000000-0000-0000-0000-000000000001';
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'INVARIANT FAIL: membership_number was mutable'; end if;

  -- trigger: age < 18 rejected
  begin
    insert into public.members (membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('TWM-T1-LG1-000013','a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000001','e0000000-0000-0000-0000-000000000001','Minor', current_date - interval '10 years','NIN0000013');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'INVARIANT FAIL: under-18 member was accepted'; end if;

  -- trigger: geography must be consistent (ward not in lga)
  begin
    insert into public.members (membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('TWM-T1-LG1-000014','a0000000-0000-0000-0000-000000000007','b0000000-0000-0000-0000-000000000001','c0000000-0000-0000-0000-000000000001','d0000000-0000-0000-0000-000000000002','e0000000-0000-0000-0000-000000000001','BadGeo','1990-01-01','NIN0000014');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'INVARIANT FAIL: inconsistent geography was accepted'; end if;

  raise notice 'ALL RLS + INVARIANT CHECKS PASSED';
end;
$$;

rollback;
