-- RLS + trigger tests for the manual constituency-membership editor (T-031c, CR-0013 §4b).
--
-- The editor lets ONLY the national admin attach wards/LGAs to a constituency
-- (the `catalogue_write` policy), and the enforce trigger must reject a ward from
-- another state. Both, if wrong, silently show members the wrong ballot, so they
-- are pinned here.
--
-- Seeds a mini hierarchy, impersonates roles via request.jwt.claims, and ROLLS
-- BACK. A failed assertion raises; a clean run prints PASSED. Run with psql /
-- `supabase db execute`, or via the Supabase MCP.

begin;

-- ── auth users ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('c0000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cm-na@test.dev'),
  ('c0000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cm-sa@test.dev'),
  ('c0000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','cm-mem@test.dev');

-- ── geography: S1 > LGA-A > WardA1; S2 > LGA-C > WardC1 (cross-state case) ──
insert into public.states (id, name, code, is_active) values
  ('c1000000-0000-0000-0000-000000000001','CMState1','C1', true),
  ('c1000000-0000-0000-0000-000000000002','CMState2','C2', true);
insert into public.lgas (id, state_id, name, code) values
  ('c2000000-0000-0000-0000-00000000000a','c1000000-0000-0000-0000-000000000001','CM-LGA-A','CA'),
  ('c2000000-0000-0000-0000-00000000000c','c1000000-0000-0000-0000-000000000002','CM-LGA-C','CC');
insert into public.wards (id, lga_id, name) values
  ('c3000000-0000-0000-0000-000000000001','c2000000-0000-0000-0000-00000000000a','CM-WardA1'),
  ('c3000000-0000-0000-0000-000000000004','c2000000-0000-0000-0000-00000000000c','CM-WardC1');

-- ── a state constituency in S1 (the ward-grain case the editor targets) ──
insert into public.constituencies (id, kind, state_id, name, code) values
  ('c4000000-0000-0000-0000-000000000001','state_constituency','c1000000-0000-0000-0000-000000000001','CM-SC-1','SC/99/C1');

-- ── profiles: national admin, a state admin, a member ──
-- Non-member active profiles must carry a VIN (profiles_vin_required, 0024), so
-- seed voter_ids first. The member is exempt.
insert into public.voter_ids (vin) values
  ('CMVIN00000000000001'),
  ('CMVIN00000000000002');
insert into public.profiles (id, role, full_name, vin_id, state_id, lga_id, ward_id, polling_unit_id) values
  ('c0000000-0000-0000-0000-000000000001','national_admin','CM-NA','CMVIN00000000000001',null,null,null,null),
  ('c0000000-0000-0000-0000-000000000002','state_admin','CM-SA','CMVIN00000000000002','c1000000-0000-0000-0000-000000000001',null,null,null),
  ('c0000000-0000-0000-0000-000000000003','member','CM-MEM',null,null,null,null,null);

-- Attempt an INSERT of (constituency, ward) as `sub`; report whether RLS allowed it.
create or replace function pg_temp.expect_ward_write(
  sub text, con uuid, ward uuid, expected boolean, label text
) returns void language plpgsql as $$
declare ok boolean := true;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  begin
    insert into public.constituency_wards (constituency_id, ward_id) values (con, ward);
    delete from public.constituency_wards where constituency_id = con and ward_id = ward;
  exception when others then ok := false;
  end;
  perform set_config('role','none',true);
  if ok <> expected then
    raise exception 'RLS FAIL [%]: expected write=%, got %', label, expected, ok;
  end if;
end;
$$;

do $$
begin
  -- ALLOW: national admin may attach a ward in the constituency's own state.
  perform pg_temp.expect_ward_write(
    'c0000000-0000-0000-0000-000000000001',
    'c4000000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001', true, 'national admin writes ward membership');

  -- DENY: a state admin (a scoped admin) may not — the catalogue is national-only.
  perform pg_temp.expect_ward_write(
    'c0000000-0000-0000-0000-000000000002',
    'c4000000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001', false, 'state admin cannot write ward membership');

  -- DENY: a member certainly may not.
  perform pg_temp.expect_ward_write(
    'c0000000-0000-0000-0000-000000000003',
    'c4000000-0000-0000-0000-000000000001',
    'c3000000-0000-0000-0000-000000000001', false, 'member cannot write ward membership');

  raise notice 'RLS allow/deny: OK';
end $$;

-- kind is auto-filled by the enforce trigger (the editor never sends it).
do $$
declare k public.constituency_kind;
begin
  insert into public.constituency_wards (constituency_id, ward_id)
    values ('c4000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000001')
    returning kind into k;
  if k <> 'state_constituency' then
    raise exception 'TRIGGER FAIL: kind not auto-filled, got %', k;
  end if;
  delete from public.constituency_wards
    where constituency_id='c4000000-0000-0000-0000-000000000001'
      and ward_id='c3000000-0000-0000-0000-000000000001';
  raise notice 'kind auto-fill: OK';
end $$;

-- The trigger must reject a ward from another state.
do $$
declare ok boolean := true;
begin
  begin
    insert into public.constituency_wards (constituency_id, ward_id)
      values ('c4000000-0000-0000-0000-000000000001','c3000000-0000-0000-0000-000000000004');
  exception when others then ok := false;
  end;
  if ok then raise exception 'TRIGGER FAIL: ward from another state was accepted'; end if;
  raise notice 'cross-state rejection: OK';
end $$;

do $$ begin raise notice 'constituency_membership_test: PASSED'; end $$;

rollback;
