-- RLS allow/deny tests for wards_insert (self-service ward add; migration 0041).
-- A ward is a child of an LGA, so LGA-level and up may create one, scoped to
-- their own area; national/super anywhere; ward_admin and unit_coordinator not
-- at all. Mirrors the harness in super_admin_rls_test.sql: one transaction,
-- seeded via auth.users + geography + profiles (frozen, to sidestep
-- profiles_vin_required), impersonation via request.jwt.claims, assertions that
-- raise on failure. Everything ROLLS BACK.
--
-- Assumes migration 0041 (wards_insert) is applied. To dry-run before applying,
-- run 0041's CREATE POLICY at the top of this transaction.

begin;

-- ── auth users ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('a0000000-0000-0000-0000-0000000009f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wsu@test.dev'),
  ('a0000000-0000-0000-0000-0000000009f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wna@test.dev'),
  ('a0000000-0000-0000-0000-0000000009f3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wsa@test.dev'),
  ('a0000000-0000-0000-0000-0000000009f4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wlg@test.dev'),
  ('a0000000-0000-0000-0000-0000000009f5','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wwa@test.dev'),
  ('a0000000-0000-0000-0000-0000000009f6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','wuc@test.dev');

-- ── geography: S1 > (L1 > W1 > PU1), (L2); S2 > (L3) ──
insert into public.states (id, name, code, is_active) values
  ('b0000000-0000-0000-0000-0000000009f1','WardTestState1','WT1', true),
  ('b0000000-0000-0000-0000-0000000009f2','WardTestState2','WT2', true);
insert into public.lgas (id, state_id, name, code) values
  ('c0000000-0000-0000-0000-0000000009f1','b0000000-0000-0000-0000-0000000009f1','WardLGA1','WL1'),
  ('c0000000-0000-0000-0000-0000000009f2','b0000000-0000-0000-0000-0000000009f1','WardLGA2','WL2'),
  ('c0000000-0000-0000-0000-0000000009f3','b0000000-0000-0000-0000-0000000009f2','WardLGA3','WL3');
insert into public.wards (id, lga_id, name) values
  ('d0000000-0000-0000-0000-0000000009f1','c0000000-0000-0000-0000-0000000009f1','SeedWard1');
insert into public.polling_units (id, ward_id, name) values
  ('e0000000-0000-0000-0000-0000000009f1','d0000000-0000-0000-0000-0000000009f1','WardPU1');

-- ── profiles (frozen, to sidestep profiles_vin_required) ──
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, status) values
  ('a0000000-0000-0000-0000-0000000009f1','super_admin','WSU', null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000009f2','national_admin','WNA', null, null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000009f3','state_admin','WSA','b0000000-0000-0000-0000-0000000009f1', null, null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000009f4','lg_admin','WLG','b0000000-0000-0000-0000-0000000009f1','c0000000-0000-0000-0000-0000000009f1', null, null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000009f5','ward_admin','WWA','b0000000-0000-0000-0000-0000000009f1','c0000000-0000-0000-0000-0000000009f1','d0000000-0000-0000-0000-0000000009f1', null, 'frozen'),
  ('a0000000-0000-0000-0000-0000000009f6','unit_coordinator','WUC','b0000000-0000-0000-0000-0000000009f1','c0000000-0000-0000-0000-0000000009f1','d0000000-0000-0000-0000-0000000009f1','e0000000-0000-0000-0000-0000000009f1', 'frozen');

-- helper: attempt an insert as a user; return true if it succeeded.
create or replace function pg_temp.try_add_ward(sub text, p_lga uuid, p_name text)
returns boolean language plpgsql as $$
declare okk boolean;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  begin
    insert into public.wards (lga_id, name) values (p_lga, p_name);
    okk := true;
  exception when others then okk := false; end;
  perform set_config('role','none',true);
  return okk;
end;
$$;

do $$
declare
  su  text := 'a0000000-0000-0000-0000-0000000009f1';
  na  text := 'a0000000-0000-0000-0000-0000000009f2';
  sa  text := 'a0000000-0000-0000-0000-0000000009f3';
  lg  text := 'a0000000-0000-0000-0000-0000000009f4';
  wa  text := 'a0000000-0000-0000-0000-0000000009f5';
  uc  text := 'a0000000-0000-0000-0000-0000000009f6';
  L1  uuid := 'c0000000-0000-0000-0000-0000000009f1';
  L2  uuid := 'c0000000-0000-0000-0000-0000000009f2';
  L3  uuid := 'c0000000-0000-0000-0000-0000000009f3';
begin
  -- national + super: anywhere
  if not pg_temp.try_add_ward(na, L3, 'NA in S2 LGA')      then raise exception 'FAIL: national denied (any LGA)'; end if;
  if not pg_temp.try_add_ward(su, L2, 'SU in S1 LGA2')     then raise exception 'FAIL: super_admin denied (any LGA)'; end if;

  -- state_admin(S1): own state yes, other state no
  if not pg_temp.try_add_ward(sa, L2, 'SA in own state')   then raise exception 'FAIL: state_admin denied in own state'; end if;
  if     pg_temp.try_add_ward(sa, L3, 'SA in other state') then raise exception 'FAIL: state_admin added ward outside its state'; end if;

  -- lg_admin(L1): own LGA yes, sibling LGA no
  if not pg_temp.try_add_ward(lg, L1, 'LG in own LGA')     then raise exception 'FAIL: lg_admin denied in own LGA'; end if;
  if     pg_temp.try_add_ward(lg, L2, 'LG in sibling LGA') then raise exception 'FAIL: lg_admin added ward in a sibling LGA'; end if;

  -- ward_admin + unit_coordinator: never
  if pg_temp.try_add_ward(wa, L1, 'WA attempt')            then raise exception 'FAIL: ward_admin added a ward'; end if;
  if pg_temp.try_add_ward(uc, L1, 'UC attempt')            then raise exception 'FAIL: unit_coordinator added a ward'; end if;

  raise notice 'ALL WARDS_INSERT RLS CHECKS PASSED';
end;
$$;

rollback;
