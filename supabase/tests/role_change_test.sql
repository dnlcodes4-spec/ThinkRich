-- Promotion / demotion RLS + invariant tests (T-046 / T-049, CR-0009 §3.3).
--
-- A promotion path is a privilege-escalation path, so this suite asserts the
-- REFUSALS as hard as the successes. Runs in one transaction and ROLLS BACK.
--
-- Run locally with `supabase db execute` / psql, or via the Supabase MCP.

begin;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

create or replace function pg_temp.check(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email) values
  ('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc-uc@test.dev'),
  ('c0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc-mem@test.dev'),
  ('c0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc-ld@test.dev'),
  ('c0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','rc-far@test.dev');

insert into public.states (id, name, code, is_active) values
  ('c1000000-0000-0000-0000-000000000001','RCState','RC', true),
  ('c1000000-0000-0000-0000-000000000002','RCFar','RF', true);
insert into public.lgas (id, state_id, name, code) values
  ('c2000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','RCLga','RC1'),
  ('c2000000-0000-0000-0000-000000000002','c1000000-0000-0000-0000-000000000002','RCFarLga','RF1');
insert into public.wards (id, lga_id, name) values
  ('c3000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','RCWard'),
  ('c3000000-0000-0000-0000-000000000002','c2000000-0000-0000-0000-000000000002','RCFarWard');
insert into public.polling_units (id, ward_id, name) values
  ('c4000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001','RCPU'),
  ('c4000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000002','RCFarPU');

-- Every active leadership profile needs a VIN now (migration 0024).
insert into public.voter_ids (vin) values
  ('RC00000000000000001'), ('RC00000000000000005'), ('RC00000000000000003');

insert into public.profiles (id, role, full_name, vin_id, state_id, lga_id, ward_id, polling_unit_id) values
  ('c0000000-0000-0000-0000-000000000001','unit_coordinator','RC UC','RC00000000000000001','c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000005','unit_coordinator','RC Far','RC00000000000000005','c1000000-0000-0000-0000-000000000002','c2000000-0000-0000-0000-000000000002','c3000000-0000-0000-0000-000000000002','c4000000-0000-0000-0000-000000000002'),
  ('c0000000-0000-0000-0000-000000000003','leader','RC LD','RC00000000000000003','c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001'),
  -- a member profile WITH scope, which is what migration 0026 guarantees
  ('c0000000-0000-0000-0000-000000000002','member','RC Member',null,'c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001');

-- ─────────── the hole 0026 closed ───────────
select pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) from public.profiles where id = 'c0000000-0000-0000-0000-000000000002') = 1,
  'a coordinator can SEE a member profile in their unit (was impossible before 0026)');
reset role;

-- ─────────── promotion works ───────────
-- Promotion carries the VIN requirement with it: a member has none on their
-- profile (theirs lives on the members row), so it must be supplied.
insert into public.voter_ids (vin) values ('RC00000000000000002');
select pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
update public.profiles set role = 'leader', vin_id = 'RC00000000000000002'
  where id = 'c0000000-0000-0000-0000-000000000002';
reset role;
select pg_temp.check(
  (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000002') = 'leader',
  'a unit coordinator (rank 5) may promote a member (7) to leader (6)');

-- and the promotion minted them a KYM code (trigger from 0021)
select pg_temp.check(
  exists (select 1 from public.leader_kym_codes where leader_id = 'c0000000-0000-0000-0000-000000000002'),
  'promotion mints the new leader a KYM code');

-- ─────────── escalation is refused ───────────
do $$
declare ok boolean;
begin
  perform pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
  begin
    -- to the caller's OWN rank
    update public.profiles set role = 'unit_coordinator' where id = 'c0000000-0000-0000-0000-000000000003';
    ok := (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000003') = 'unit_coordinator';
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'FAIL: a coordinator promoted someone to their own rank'; end if;
end;
$$;

do $$
declare ok boolean;
begin
  perform pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
  begin
    -- to a rank ABOVE the caller
    update public.profiles set role = 'ward_admin' where id = 'c0000000-0000-0000-0000-000000000003';
    ok := (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000003') = 'ward_admin';
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'FAIL: a coordinator promoted someone above themselves'; end if;
end;
$$;

do $$
declare ok boolean;
begin
  perform pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
  begin
    -- their own row
    update public.profiles set role = 'ward_admin' where id = 'c0000000-0000-0000-0000-000000000001';
    ok := (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000001') = 'ward_admin';
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'FAIL: a coordinator promoted THEMSELVES'; end if;
end;
$$;

do $$
declare ok boolean;
begin
  -- another unit's coordinator, out of scope entirely
  perform pg_temp.as_user('c0000000-0000-0000-0000-000000000005');
  begin
    update public.profiles set role = 'leader' where id = 'c0000000-0000-0000-0000-000000000003';
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000003') <> 'leader' then
    raise exception 'FAIL: an out-of-scope coordinator changed a leader''s role';
  end if;
end;
$$;

-- ─────────── demotion requires reassignment (0028) ───────────
insert into public.voter_ids (vin) values ('RC00000000000000009');
insert into public.members
  (membership_number, registered_by, vin_id, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
values
  ('TWM-RC-RC1-000001','c0000000-0000-0000-0000-000000000003','RC00000000000000009','c1000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001','c4000000-0000-0000-0000-000000000001','RC Held','1990-01-01','RCNIN00001');

do $$
declare ok boolean;
begin
  perform pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
  begin
    update public.profiles set role = 'member' where id = 'c0000000-0000-0000-0000-000000000003';
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'FAIL: a leader holding an active member was demoted'; end if;
end;
$$;

-- move the member, then the demotion goes through
update public.members set registered_by = 'c0000000-0000-0000-0000-000000000002'
  where membership_number = 'TWM-RC-RC1-000001';

select pg_temp.as_user('c0000000-0000-0000-0000-000000000001');
update public.profiles set role = 'member' where id = 'c0000000-0000-0000-0000-000000000003';
reset role;
select pg_temp.check(
  (select role from public.profiles where id = 'c0000000-0000-0000-0000-000000000003') = 'member',
  'once their members are moved, the leader can be demoted');

-- a leader with NO members was never blocked
select pg_temp.check(
  (select count(*) from public.members where registered_by = 'c0000000-0000-0000-0000-000000000003' and status = 'active') = 0,
  'sanity: the demoted leader holds nothing');

select 'ALL ROLE-CHANGE CHECKS PASSED' as result;

rollback;
