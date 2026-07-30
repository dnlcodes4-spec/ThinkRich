-- State activation invariant tests (0031_state_closes_without_admin.sql).
--
-- The rule has two halves and both must hold: a state closes when its last State
-- Coordinator is gone, and it does NOT close for anything else. The second half
-- matters as much as the first, because over-closing would silently block
-- registration in a state that is legitimately open.
--
-- Runs in one transaction and ROLLS BACK.
-- Run locally with `supabase db execute` / psql, or via the Supabase MCP.

begin;

create or replace function pg_temp.check(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;

create or replace function pg_temp.is_open(state uuid)
returns boolean language sql as $$
  select is_active from public.states where id = state;
$$;

create or replace function pg_temp.closures(state uuid)
returns bigint language sql as $$
  select count(*) from public.activity_log
   where action = 'state.deactivated' and state_id = state;
$$;

-- ─────────────────────────── fixtures ───────────────────────────

insert into auth.users (id, instance_id, aud, role, email) values
  ('d0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa-one@test.dev'),
  ('d0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa-two-a@test.dev'),
  ('d0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa-two-b@test.dev'),
  ('d0000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa-lead@test.dev'),
  ('d0000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sa-move@test.dev');

insert into public.states (id, name, code, is_active) values
  ('d1000000-0000-0000-0000-000000000001','SAOne','S1', true),   -- one coordinator
  ('d1000000-0000-0000-0000-000000000002','SATwo','S2', true),   -- two coordinators
  ('d1000000-0000-0000-0000-000000000003','SAOpen','S3', true),  -- open by hand, no coordinator
  ('d1000000-0000-0000-0000-000000000004','SAFrom','S4', true),  -- coordinator moves away from here
  ('d1000000-0000-0000-0000-000000000005','SALand','S5', true);  -- and lands here
insert into public.lgas (id, state_id, name, code) values
  ('d2000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','SALga','S11');
insert into public.wards (id, lga_id, name) values
  ('d3000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001','SAWard');
insert into public.polling_units (id, ward_id, name) values
  ('d4000000-0000-0000-0000-000000000001','d3000000-0000-0000-0000-000000000001','SAUnit');

-- Every active leadership profile needs a VIN (migration 0024).
insert into public.voter_ids (vin) values
  ('SA00000000000000001'), ('SA00000000000000002'), ('SA00000000000000003'),
  ('SA00000000000000004'), ('SA00000000000000005');

insert into public.profiles (id, role, full_name, vin_id, state_id) values
  ('d0000000-0000-0000-0000-000000000001','state_admin','SA One','SA00000000000000001','d1000000-0000-0000-0000-000000000001'),
  ('d0000000-0000-0000-0000-000000000002','state_admin','SA Two A','SA00000000000000002','d1000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000003','state_admin','SA Two B','SA00000000000000003','d1000000-0000-0000-0000-000000000002'),
  ('d0000000-0000-0000-0000-000000000005','state_admin','SA Mover','SA00000000000000005','d1000000-0000-0000-0000-000000000004');
insert into public.profiles (id, role, full_name, vin_id, state_id, lga_id, ward_id, polling_unit_id) values
  ('d0000000-0000-0000-0000-000000000004','leader','SA Leader','SA00000000000000004',
   'd1000000-0000-0000-0000-000000000001','d2000000-0000-0000-0000-000000000001',
   'd3000000-0000-0000-0000-000000000001','d4000000-0000-0000-0000-000000000001');

-- ─────────────────── it closes when the post is vacated ───────────────────

-- Deactivating the only coordinator closes the state.
update public.profiles set status = 'inactive'
 where id = 'd0000000-0000-0000-0000-000000000001';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000001') = false,
  'deactivating the last State Coordinator closes the state');

-- And says why, so a national coordinator is never left guessing.
select pg_temp.check(
  exists (
    select 1 from public.activity_log
     where action = 'state.deactivated'
       and state_id = 'd1000000-0000-0000-0000-000000000001'
       and actor_name = 'System'
  ),
  'closing a state writes an activity log entry');

-- Reopen by hand (as /app/admin/states does) for the delete case.
update public.states set is_active = true
 where id = 'd1000000-0000-0000-0000-000000000001';
update public.profiles set status = 'active'
 where id = 'd0000000-0000-0000-0000-000000000001';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000001') = true,
  'a national coordinator can still reopen a state by hand');

-- Deleting the account cascades auth.users -> profiles, which must close the
-- state too. This is the path that left Ogun and Oyo wrongly open in production.
delete from auth.users where id = 'd0000000-0000-0000-0000-000000000001';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000001') = false,
  'deleting the last State Coordinator closes the state (the production bug)');

-- Moving the only coordinator away closes the state they left, not the one they
-- joined: the database never opens a state.
update public.profiles set state_id = 'd1000000-0000-0000-0000-000000000005'
 where id = 'd0000000-0000-0000-0000-000000000005';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000004') = false,
  'moving the last State Coordinator away closes the state they left');

-- ─────────────────── it does NOT close for anything else ───────────────────

-- Two coordinators: removing one leaves the state open.
delete from auth.users where id = 'd0000000-0000-0000-0000-000000000002';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000002') = true,
  'a state with a second State Coordinator stays open');

-- Unrelated edits to a coordinator do not close their state.
update public.profiles set full_name = 'SA Two B renamed'
 where id = 'd0000000-0000-0000-0000-000000000003';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000002') = true,
  'renaming a coordinator does not close their state');

-- A state opened by hand with no coordinator survives unrelated churn: the
-- trigger reacts to a coordinator post being vacated, nothing else.
delete from auth.users where id = 'd0000000-0000-0000-0000-000000000004';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000003') = true,
  'deleting a leader does not close a deliberately opened state');

-- ─────────────────── one direction only, and idempotent ───────────────────

update public.profiles set status = 'inactive'
 where id = 'd0000000-0000-0000-0000-000000000003';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000002') = false,
  'losing the second coordinator closes the state');
select pg_temp.check(
  pg_temp.closures('d1000000-0000-0000-0000-000000000002') = 1,
  'that closure logged exactly once');

-- Restoring the coordinator does NOT reopen the state: opening is always a
-- deliberate act, never a side effect.
update public.profiles set status = 'active'
 where id = 'd0000000-0000-0000-0000-000000000003';
select pg_temp.check(
  pg_temp.is_open('d1000000-0000-0000-0000-000000000002') = false,
  'the database never reopens a state on its own');

-- Vacating the post again on an already-closed state changes nothing and logs
-- nothing further.
update public.profiles set status = 'inactive'
 where id = 'd0000000-0000-0000-0000-000000000003';
select pg_temp.check(
  pg_temp.closures('d1000000-0000-0000-0000-000000000002') = 1,
  'closing an already-closed state is a no-op and logs nothing further');

select 'state activation invariant: all assertions passed' as result;

rollback;
