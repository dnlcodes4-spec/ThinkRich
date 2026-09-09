-- CR-0026 / ADR-0018 follow-ups [migrations 0053, 0054].
--
-- T-106: partners.status is enforced. A partner with status <> 'active' takes no
--   new members or staff; reads and existing rows are untouched; reactivating
--   restores registration. Core (partner_id null) writes are never affected.
-- T-107: public.identity_registration_status() reports a NIN/VIN as available /
--   taken_here / taken_elsewhere across the partition wall, never which world.
--
-- Mirrors supabase/tests/partner_rls_test.sql: one transaction, seeded via
-- auth.users + geography + partners + profiles + voter_ids + members, staff
-- 'frozen' to sidestep profiles_vin_required, impersonation via
-- request.jwt.claims, assertions that raise on failure. Everything ROLLS BACK.

begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('c0000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-su@test.dev'),
  ('c0000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-paA@test.dev'),
  ('c0000000-0000-0000-0000-0000000000f3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-paB@test.dev'),
  ('c0000000-0000-0000-0000-0000000000f4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-leadA@test.dev'),
  ('c0000000-0000-0000-0000-0000000000f5','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-new-by-paA@test.dev'),
  ('c0000000-0000-0000-0000-0000000000f6','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ps-member-b@test.dev');

insert into public.states (id, name, code, is_active) values
  ('c1000000-0000-0000-0000-0000000000f1','PStatetest1','PS1', true);
insert into public.lgas (id, state_id, name, code) values
  ('c2000000-0000-0000-0000-0000000000f1','c1000000-0000-0000-0000-0000000000f1','PStatusLGA1','PSL1');
insert into public.wards (id, lga_id, name) values
  ('c3000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','PStatusWard1');
insert into public.polling_units (id, ward_id, name) values
  ('c4000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','PStatusPU1');

-- Both partners start active: a partner_admin can only ever be created while the
-- partner is active (the block trigger fires on the profiles insert too), which
-- mirrors onboarding. Partner A is deactivated below, after its staff exist.
insert into public.partners (id, name, kind, scope_state_id, code, status, created_by) values
  ('ca000000-0000-0000-0000-00000000000a','Status Partner A','political','c1000000-0000-0000-0000-0000000000f1','PSA','active','c0000000-0000-0000-0000-0000000000f1'),
  ('ca000000-0000-0000-0000-00000000000b','Status Partner B','political','c1000000-0000-0000-0000-0000000000f1','PSB','active','c0000000-0000-0000-0000-0000000000f1');

insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
  ('c0000000-0000-0000-0000-0000000000f1','super_admin',  'PS_SU',  null, null, null, null, null, 'frozen'),
  ('c0000000-0000-0000-0000-0000000000f2','partner_admin','PS_PA_A', null, null, null, null, 'ca000000-0000-0000-0000-00000000000a', 'frozen'),
  ('c0000000-0000-0000-0000-0000000000f3','partner_admin','PS_PA_B', null, null, null, null, 'ca000000-0000-0000-0000-00000000000b', 'frozen'),
  ('c0000000-0000-0000-0000-0000000000f4','leader',       'PS_L_A',  'c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000b','frozen'),
  -- a plain member login inside Partner B, for the identity-oracle deny check.
  ('c0000000-0000-0000-0000-0000000000f6','member',       'PS_M_B',  'c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000b','active');

insert into public.voter_ids (vin) values
  ('PSTATUSVINCORE00001'),
  ('PSTATUSVINPARTB0001'),
  ('PSTATUSVINNEWMEM001'),
  ('PSTATUSVINCORE00002');

-- One active member already inside Partner B (proves reads/existing rows are
-- fine) and one core member (the identity-check "taken_here" for a core caller).
-- Both take the PS1 geography path; members geography columns are NOT NULL.
insert into public.members
  (id, registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
  ('cf000000-0000-0000-0000-0000000000b1','c0000000-0000-0000-0000-0000000000f3','c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000b','PS Member B','1990-01-01','PSTATUSNINB01','PSTATUSVINPARTB0001'),
  ('cf000000-0000-0000-0000-0000000000c1','c0000000-0000-0000-0000-0000000000f1','c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1', null,'PS Member Core','1990-01-01','PSTATUSNINCORE1','PSTATUSVINCORE00001');

-- Now suspend Partner A, its admin already in place.
update public.partners set status = 'inactive' where id = 'ca000000-0000-0000-0000-00000000000a';

-- ═══════════════ T-106: inactive partner blocks writes ═══════════════
do $$
declare ok boolean; n int;
begin
  -- 1. Partner A is inactive: its partner_admin cannot register a member.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f2')::text, true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
      values ('c0000000-0000-0000-0000-0000000000f2','c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000a','Blocked Member','1990-01-01','PSTATUSNINX1','PSTATUSVINNEWMEM001');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'T-106 FAIL [1]: inactive partner accepted a new member'; end if;

  -- 2. Partner A inactive: cannot create a sub-admin profile either.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f2')::text, true);
  begin
    insert into public.profiles (id, role, full_name, state_id, partner_id, status)
      values ('c0000000-0000-0000-0000-0000000000f5','state_admin','Blocked SA','c1000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000a','frozen');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'T-106 FAIL [2]: inactive partner accepted a new staff profile'; end if;

  -- 3. Partner A inactive: it can still READ its existing world.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f2')::text, true);
  select count(*) into n from public.members;  -- partition-scoped, partner A has none, but the query must not error
  perform set_config('role','none',true);

  -- 4. Partner B is active: its leader CAN register a member.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f4')::text, true);
  insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
    values ('c0000000-0000-0000-0000-0000000000f4','c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000b','Allowed Member','1990-01-01','PSTATUSNINB02','PSTATUSVINNEWMEM001');
  perform set_config('role','none',true);
  select count(*) into n from public.members where nin = 'PSTATUSNINB02';
  if n <> 1 then raise exception 'T-106 FAIL [4]: active partner could not register a member'; end if;

  -- 5. Reactivate Partner A (as super_admin): registration works again.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f1')::text, true);
  update public.partners set status = 'active' where id = 'ca000000-0000-0000-0000-00000000000a';
  perform set_config('role','none',true);
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f2')::text, true);
  insert into public.profiles (id, role, full_name, state_id, partner_id, status)
    values ('c0000000-0000-0000-0000-0000000000f5','state_admin','Now Allowed SA','c1000000-0000-0000-0000-0000000000f1','ca000000-0000-0000-0000-00000000000a','frozen');
  perform set_config('role','none',true);
  select count(*) into n from public.profiles where id = 'c0000000-0000-0000-0000-0000000000f5';
  if n <> 1 then raise exception 'T-106 FAIL [5]: reactivated partner still blocked'; end if;

  raise notice 'T-106 assertions (1-5) passed';
end $$;

-- 6. A core insert is never touched by the trigger. Put Partner A back to
-- inactive first, to prove the guard only looks at the row's own partner_id.
update public.partners set status = 'inactive' where id = 'ca000000-0000-0000-0000-00000000000a';
do $$
declare n int;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f1')::text, true);
  insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id)
    values ('c0000000-0000-0000-0000-0000000000f1','c1000000-0000-0000-0000-0000000000f1','c2000000-0000-0000-0000-0000000000f1','c3000000-0000-0000-0000-0000000000f1','c4000000-0000-0000-0000-0000000000f1', null, 'Core Still Fine','1990-01-01','PSTATUSNINCORE2','PSTATUSVINCORE00002');
  perform set_config('role','none',true);
  select count(*) into n from public.members where nin = 'PSTATUSNINCORE2';
  if n <> 1 then raise exception 'T-106 FAIL [6]: core member insert blocked by the inactive-partner guard'; end if;
  raise notice 'T-106 assertion 6 (core unaffected) passed';
end $$;

-- ═══════════════ T-107: cross-partition identity check ═══════════════
do $$
declare r text;
begin
  -- 7. Core caller, a VIN that lives in Partner B -> taken_elsewhere.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f1')::text, true);
  select public.identity_registration_status(p_vin => 'PSTATUSVINPARTB0001') into r;
  perform set_config('role','none',true);
  if r <> 'taken_elsewhere' then raise exception 'T-107 FAIL [7]: core caller / partner VIN = %', r; end if;

  -- 8. Partner B admin, that same VIN -> taken_here.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f3')::text, true);
  select public.identity_registration_status(p_vin => 'PSTATUSVINPARTB0001') into r;
  perform set_config('role','none',true);
  if r <> 'taken_here' then raise exception 'T-107 FAIL [8]: partner B caller / own VIN = %', r; end if;

  -- 9. Partner B admin, the core member's NIN -> taken_elsewhere.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f3')::text, true);
  select public.identity_registration_status(p_nin => 'PSTATUSNINCORE1') into r;
  perform set_config('role','none',true);
  if r <> 'taken_elsewhere' then raise exception 'T-107 FAIL [9]: partner B caller / core NIN = %', r; end if;

  -- 10. Anyone, an unknown identity -> available.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f3')::text, true);
  select public.identity_registration_status(p_nin => 'NOBODYHASTHISNIN', p_vin => 'NOBODYHASTHISVIN000') into r;
  perform set_config('role','none',true);
  if r <> 'available' then raise exception 'T-107 FAIL [10]: unknown identity = %', r; end if;

  -- 11. A plain member gets nothing: the function is not an existence oracle for
  -- rank-and-file logins (migration 0054). Even a VIN that really exists -> unknown.
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub','c0000000-0000-0000-0000-0000000000f6')::text, true);
  select public.identity_registration_status(p_vin => 'PSTATUSVINCORE00001') into r;
  perform set_config('role','none',true);
  if r <> 'unknown' then raise exception 'T-107 FAIL [11]: member caller got % (should be unknown)', r; end if;

  raise notice 'T-107 assertions (7-11) passed';
end $$;

do $$ begin raise notice 'ALL PARTNER STATUS + IDENTITY CHECKS PASSED'; end $$;

rollback;
