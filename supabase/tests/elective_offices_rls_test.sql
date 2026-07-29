-- RLS allow/deny tests for the elective-office model (T-028; CR-0007, ADR-0013).
--
-- Containment is the one rule that, if wrong, silently leaks write access across
-- states. So this walks the whole matrix: every role against every office kind,
-- including the two subtle overlay cases (a constituency inside a single LGA vs
-- one that spans several or is ward-split).
--
-- Also covers the reference catalogue, the member-facing resolver, the scope
-- triggers, and the national-admin member registration added in 0019.
--
-- Seeds a mini hierarchy, impersonates each role via request.jwt.claims, and
-- ROLLS BACK, so nothing persists. Run with psql / `supabase db execute`, or via
-- the Supabase MCP. A failed assertion raises; a clean run prints PASSED.

begin;

-- ── auth users ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('90000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-na@test.dev'),
  ('90000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-sa1@test.dev'),
  ('90000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-sa2@test.dev'),
  ('90000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-lga-a@test.dev'),
  ('90000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-lga-b@test.dev'),
  ('90000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-wa1@test.dev'),
  ('90000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-wa2@test.dev'),
  ('90000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-uc@test.dev'),
  ('90000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-ld@test.dev'),
  ('90000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-mem@test.dev'),
  ('90000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-000000000000','authenticated','authenticated','eo-ld2@test.dev');

-- ── geography ──
-- S1 > {LGA-A > (WardA1, WardA2), LGA-B > WardB1};  S2 > LGA-C > WardC1
insert into public.states (id, name, code, is_active) values
  ('91000000-0000-0000-0000-000000000001','EOState1','X1', true),
  ('91000000-0000-0000-0000-000000000002','EOState2','X2', true);
insert into public.lgas (id, state_id, name, code) values
  ('92000000-0000-0000-0000-00000000000a','91000000-0000-0000-0000-000000000001','EO-LGA-A','XA'),
  ('92000000-0000-0000-0000-00000000000b','91000000-0000-0000-0000-000000000001','EO-LGA-B','XB'),
  ('92000000-0000-0000-0000-00000000000c','91000000-0000-0000-0000-000000000002','EO-LGA-C','XC');
insert into public.wards (id, lga_id, name) values
  ('93000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','EO-WardA1'),
  ('93000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-00000000000a','EO-WardA2'),
  ('93000000-0000-0000-0000-000000000003','92000000-0000-0000-0000-00000000000b','EO-WardB1'),
  ('93000000-0000-0000-0000-000000000004','92000000-0000-0000-0000-00000000000c','EO-WardC1');
insert into public.polling_units (id, ward_id, name) values
  ('94000000-0000-0000-0000-000000000001','93000000-0000-0000-0000-000000000001','EO-PU-A1'),
  ('94000000-0000-0000-0000-000000000002','93000000-0000-0000-0000-000000000002','EO-PU-A2'),
  ('94000000-0000-0000-0000-000000000004','93000000-0000-0000-0000-000000000004','EO-PU-C1');

-- ── profiles ──
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id) values
  ('90000000-0000-0000-0000-000000000001','national_admin','EO-NA',null,null,null,null),
  ('90000000-0000-0000-0000-000000000002','state_admin','EO-SA1','91000000-0000-0000-0000-000000000001',null,null,null),
  ('90000000-0000-0000-0000-000000000003','state_admin','EO-SA2','91000000-0000-0000-0000-000000000002',null,null,null),
  ('90000000-0000-0000-0000-000000000004','lg_admin','EO-LGA-A-admin','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a',null,null),
  ('90000000-0000-0000-0000-000000000005','lg_admin','EO-LGA-B-admin','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000b',null,null),
  ('90000000-0000-0000-0000-000000000006','ward_admin','EO-WA1','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001',null),
  ('90000000-0000-0000-0000-000000000007','ward_admin','EO-WA2','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000002',null),
  ('90000000-0000-0000-0000-000000000008','unit_coordinator','EO-UC','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-000000000009','leader','EO-LD','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001'),
  ('90000000-0000-0000-0000-00000000000b','leader','EO-LD2','91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-00000000000c','93000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000004'),
  ('90000000-0000-0000-0000-00000000000a','member','EO-MEM',null,null,null,null);

-- ── the constituency overlay: three deliberately different shapes ──
--  SD-A  senatorial district, exactly ONE LGA, no ward split  -> LG-A admin CAN manage
--  FC-AB federal constituency, TWO LGAs                       -> LG-A admin CANNOT
--  SC-A1 state constituency, ward-level (splits LGA-A)        -> LG-A admin CANNOT
insert into public.constituencies (id, kind, state_id, name) values
  ('95000000-0000-0000-0000-00000000000a','senatorial_district','91000000-0000-0000-0000-000000000001','EO-SD-A'),
  ('95000000-0000-0000-0000-00000000000b','federal_constituency','91000000-0000-0000-0000-000000000001','EO-FC-AB'),
  ('95000000-0000-0000-0000-00000000000c','state_constituency','91000000-0000-0000-0000-000000000001','EO-SC-A1');

insert into public.constituency_lgas (constituency_id, kind, lga_id) values
  ('95000000-0000-0000-0000-00000000000a','senatorial_district','92000000-0000-0000-0000-00000000000a'),
  ('95000000-0000-0000-0000-00000000000b','federal_constituency','92000000-0000-0000-0000-00000000000a'),
  ('95000000-0000-0000-0000-00000000000b','federal_constituency','92000000-0000-0000-0000-00000000000b');
insert into public.constituency_wards (constituency_id, kind, ward_id) values
  ('95000000-0000-0000-0000-00000000000c','state_constituency','93000000-0000-0000-0000-000000000001');

insert into public.elections (id, name, election_date, scope) values
  ('96000000-0000-0000-0000-000000000001','EO Test Election','2027-01-16','national');

-- ═══════════════════ helpers ═══════════════════

-- Attempt a real INSERT as `sub` and assert whether the policy allowed it.
-- Testing the policy itself, not just the predicate, so nothing can pass here
-- while the actual write path differs.
create or replace function pg_temp.expect_write(
  sub text, office_key text,
  p_state uuid, p_lga uuid, p_ward uuid, p_con uuid,
  expected boolean, label text
) returns void language plpgsql as $$
declare ok boolean; o uuid;
begin
  select id into o from public.office_types where key = office_key;
  if o is null then raise exception 'SETUP FAIL: no office_type with key %', office_key; end if;

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  begin
    insert into public.candidacies (election_id, office_type_id, state_id, lga_id, ward_id, constituency_id, full_name)
      values ('96000000-0000-0000-0000-000000000001', o, p_state, p_lga, p_ward, p_con, 'EOTEST ' || label);
    ok := true;
  exception when others then ok := false;
  end;
  perform set_config('role','none',true);

  if ok <> expected then
    raise exception 'RLS FAIL [%]: expected write=%, got %', label, expected, ok;
  end if;
end;
$$;

create or replace function pg_temp.expect_visible_count(sub text, expected int, label text)
returns void language plpgsql as $$
declare n int;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims', json_build_object('sub', sub)::text, true);
  select count(*) into n from public.candidacies;
  perform set_config('role','none',true);
  if n <> expected then
    raise exception 'RLS FAIL [%]: expected % visible candidacies, got %', label, expected, n;
  end if;
end;
$$;

-- ═══════════════════ 1. containment: every role × every office kind ═══════════════════

-- President (kind = nation): national admin ONLY.
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','president',null,null,null,null, true,  'president/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','president',null,null,null,null, false, 'president/state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','president',null,null,null,null, false, 'president/lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','president',null,null,null,null, false, 'president/ward-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000008','president',null,null,null,null, false, 'president/unit-coordinator');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000009','president',null,null,null,null, false, 'president/leader');
select pg_temp.expect_write('90000000-0000-0000-0000-00000000000a','president',null,null,null,null, false, 'president/member');

-- Governor (kind = state): the state's own admin, and above.
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','governor','91000000-0000-0000-0000-000000000001',null,null,null, true,  'governor/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','governor','91000000-0000-0000-0000-000000000001',null,null,null, true,  'governor/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000003','governor','91000000-0000-0000-0000-000000000001',null,null,null, false, 'governor/OTHER-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','governor','91000000-0000-0000-0000-000000000001',null,null,null, false, 'governor/lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','governor','91000000-0000-0000-0000-000000000001',null,null,null, false, 'governor/ward-admin');

-- LG chairman (kind = lga).
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, true,  'chairman/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, true,  'chairman/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000003','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, false, 'chairman/OTHER-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, true,  'chairman/own-lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000005','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, false, 'chairman/OTHER-lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','lg_chairman',null,'92000000-0000-0000-0000-00000000000a',null,null, false, 'chairman/ward-admin');

-- Councillor (kind = ward).
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, true,  'councillor/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, true,  'councillor/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000003','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, false, 'councillor/OTHER-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, true,  'councillor/own-lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000005','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, false, 'councillor/OTHER-lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, true,  'councillor/own-ward-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000007','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, false, 'councillor/OTHER-ward-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000008','councillor',null,null,'93000000-0000-0000-0000-000000000001',null, false, 'councillor/unit-coordinator');

-- Senator: SD-A is exactly ONE LGA and is not ward-split, so the LG admin of
-- that LGA legitimately covers it.
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', true,  'senator/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', true,  'senator/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000003','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', false, 'senator/OTHER-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', true,  'senator/single-LGA covered by its lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000005','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', false, 'senator/OTHER-lg-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','senator',null,null,null,'95000000-0000-0000-0000-00000000000a', false, 'senator/ward-admin');

-- House of Reps: FC-AB spans TWO LGAs, so no LG admin covers it. This is the
-- case that would leak if containment were written as "same state".
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','house_of_reps',null,null,null,'95000000-0000-0000-0000-00000000000b', true,  'reps/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','house_of_reps',null,null,null,'95000000-0000-0000-0000-00000000000b', true,  'reps/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','house_of_reps',null,null,null,'95000000-0000-0000-0000-00000000000b', false, 'reps/lg-admin (spans 2 LGAs)');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000005','house_of_reps',null,null,null,'95000000-0000-0000-0000-00000000000b', false, 'reps/other-lg-admin');

-- State Assembly: SC-A1 is ward-split, so the single-LGA shortcut must NOT fire.
select pg_temp.expect_write('90000000-0000-0000-0000-000000000001','state_assembly',null,null,null,'95000000-0000-0000-0000-00000000000c', true,  'assembly/national');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000002','state_assembly',null,null,null,'95000000-0000-0000-0000-00000000000c', true,  'assembly/own-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000003','state_assembly',null,null,null,'95000000-0000-0000-0000-00000000000c', false, 'assembly/OTHER-state-admin');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000004','state_assembly',null,null,null,'95000000-0000-0000-0000-00000000000c', false, 'assembly/lg-admin (ward-split)');
select pg_temp.expect_write('90000000-0000-0000-0000-000000000006','state_assembly',null,null,null,'95000000-0000-0000-0000-00000000000c', false, 'assembly/ward-admin');

-- ═══════════════════ 2. scope + integrity triggers ═══════════════════
do $$
declare ok boolean; e uuid := '96000000-0000-0000-0000-000000000001';
begin
  -- a governorship with no state
  begin
    insert into public.candidacies (election_id, office_type_id, full_name)
      values (e, (select id from public.office_types where key='governor'), 'bad');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'TRIGGER FAIL: governor accepted with no state'; end if;

  -- a presidential candidacy carrying a geography
  begin
    insert into public.candidacies (election_id, office_type_id, state_id, full_name)
      values (e, (select id from public.office_types where key='president'),
              '91000000-0000-0000-0000-000000000001', 'bad');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'TRIGGER FAIL: president accepted with a state'; end if;

  -- an office pointed at a constituency of the WRONG kind
  begin
    insert into public.candidacies (election_id, office_type_id, constituency_id, full_name)
      values (e, (select id from public.office_types where key='senator'),
              '95000000-0000-0000-0000-00000000000b', 'bad');  -- federal, not senatorial
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'TRIGGER FAIL: senator accepted a federal constituency'; end if;

  -- a running mate on an office that has none
  begin
    insert into public.candidacies (election_id, office_type_id, ward_id, full_name, running_mate_name)
      values (e, (select id from public.office_types where key='councillor'),
              '93000000-0000-0000-0000-000000000001', 'bad', 'mate');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'TRIGGER FAIL: councillor accepted a running mate'; end if;

  -- a constituency claiming an LGA in another state
  begin
    insert into public.constituency_lgas (constituency_id, lga_id)
      values ('95000000-0000-0000-0000-00000000000a','92000000-0000-0000-0000-00000000000c');
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'TRIGGER FAIL: constituency claimed an LGA across a state boundary'; end if;

  -- published_at is stamped by the trigger, not the caller
  insert into public.candidacies (election_id, office_type_id, state_id, full_name, is_published)
    values (e, (select id from public.office_types where key='governor'),
            '91000000-0000-0000-0000-000000000001','EOTEST published', true);
  if not exists (
    select 1 from public.candidacies
     where full_name='EOTEST published' and published_at is not null
  ) then raise exception 'TRIGGER FAIL: published_at not stamped'; end if;
end;
$$;

-- ═══════════════════ 3. reads: publication is the gate ═══════════════════
do $$
declare e uuid := '96000000-0000-0000-0000-000000000001';
begin
  -- Scoped to this test's election: never a bare DELETE on a shared table.
  delete from public.candidacies where election_id = e;
  insert into public.candidacies (election_id, office_type_id, state_id, full_name, is_published) values
    (e,(select id from public.office_types where key='governor'),'91000000-0000-0000-0000-000000000001','EO Pub S1', true),
    (e,(select id from public.office_types where key='governor'),'91000000-0000-0000-0000-000000000002','EO Pub S2', true),
    (e,(select id from public.office_types where key='governor'),'91000000-0000-0000-0000-000000000001','EO Draft S1', false);
end;
$$;

-- A member sees BOTH published rows, in any state (the client asked for
-- "geography first, other areas available"), and NOT the draft.
select pg_temp.expect_visible_count('90000000-0000-0000-0000-00000000000a', 2, 'member sees published everywhere, no drafts');
select pg_temp.expect_visible_count('90000000-0000-0000-0000-000000000009', 2, 'leader sees published only');
-- SA1 additionally sees their own state's draft; SA2 does not.
select pg_temp.expect_visible_count('90000000-0000-0000-0000-000000000002', 3, 'own-state admin also sees their draft');
select pg_temp.expect_visible_count('90000000-0000-0000-0000-000000000003', 2, 'other-state admin does NOT see that draft');
select pg_temp.expect_visible_count('90000000-0000-0000-0000-000000000001', 3, 'national sees everything');

-- ═══════════════════ 4. the reference catalogue is national-admin-write-only ═══════════════════
do $$
declare ok boolean;
begin
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002"}',true);
  begin
    insert into public.parties (name, acronym) values ('EO Sneaky Party','EOSNK');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL: a state admin wrote to the party catalogue'; end if;

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002"}',true);
  begin
    insert into public.constituencies (kind, state_id, name)
      values ('senatorial_district','91000000-0000-0000-0000-000000000001','EO Sneaky SD');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL: a state admin created a constituency'; end if;

  -- the national admin may
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001"}',true);
  insert into public.parties (name, acronym) values ('EO Test Party','EOTP');
  insert into public.office_types (key,title,title_plural,tier,constituency_kind,sort_order)
    values ('eo_test_office','EO Office','EO Offices','local','ward',999);
  perform set_config('role','none',true);
end;
$$;

-- ═══════════════════ 5. the member-facing resolver ═══════════════════
do $$
declare
  e uuid := '96000000-0000-0000-0000-000000000001';
  n int;
begin
  delete from public.candidacies where election_id = e;
  insert into public.candidacies (election_id, office_type_id, state_id, lga_id, ward_id, constituency_id, full_name, is_published) values
    (e,(select id from public.office_types where key='president'),      null,null,null,null,'R-President', true),
    (e,(select id from public.office_types where key='governor'),       '91000000-0000-0000-0000-000000000001',null,null,null,'R-Governor', true),
    (e,(select id from public.office_types where key='lg_chairman'),    null,'92000000-0000-0000-0000-00000000000a',null,null,'R-Chairman-A', true),
    (e,(select id from public.office_types where key='councillor'),     null,null,'93000000-0000-0000-0000-000000000001',null,'R-Councillor-A1', true),
    (e,(select id from public.office_types where key='senator'),        null,null,null,'95000000-0000-0000-0000-00000000000a','R-Senator-SD-A', true),
    (e,(select id from public.office_types where key='house_of_reps'),  null,null,null,'95000000-0000-0000-0000-00000000000b','R-Reps-FC-AB', true),
    (e,(select id from public.office_types where key='state_assembly'), null,null,null,'95000000-0000-0000-0000-00000000000c','R-Assembly-SC-A1', true),
    (e,(select id from public.office_types where key='governor'),       '91000000-0000-0000-0000-000000000002',null,null,null,'R-Governor-S2', true);

  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-00000000000a"}',true);

  -- WardA1: everything applies (it is inside SD-A, FC-AB and SC-A1).
  select count(*) into n from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000001');
  if n <> 7 then raise exception 'RESOLVER FAIL: WardA1 expected 7 races, got %', n; end if;

  -- WardA2: same LGA as WardA1, so it keeps president/governor/chairman/senator/
  -- reps, but drops BOTH ward-scoped races: the councillor seat (WardA1) and the
  -- ward-split state constituency SC-A1. Five, not six.
  select count(*) into n from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000002');
  if n <> 5 then raise exception 'RESOLVER FAIL: WardA2 expected 5 races, got %', n; end if;
  if exists (
    select 1 from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000002')
     where full_name = 'R-Assembly-SC-A1'
  ) then raise exception 'RESOLVER FAIL: ward-level constituency leaked to a ward outside it'; end if;

  -- WardB1: different LGA, so no chairman/councillor of LGA-A and no SD-A,
  -- but it IS inside the two-LGA federal constituency.
  select count(*) into n from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000003');
  if n <> 3 then raise exception 'RESOLVER FAIL: WardB1 expected 3 races (president, governor, reps), got %', n; end if;

  -- Another state: president + that state's governor only.
  select count(*) into n from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000004');
  if n <> 2 then raise exception 'RESOLVER FAIL: WardC1 expected 2 races, got %', n; end if;

  -- Coarser input: an LGA with no ward still resolves what it can.
  select count(*) into n from public.candidacies_for_geography(null,'92000000-0000-0000-0000-00000000000a',null);
  if n <> 5 then raise exception 'RESOLVER FAIL: LGA-A expected 5 races, got %', n; end if;

  -- A state alone: president + governor.
  select count(*) into n from public.candidacies_for_geography('91000000-0000-0000-0000-000000000001',null,null);
  if n <> 2 then raise exception 'RESOLVER FAIL: state-only expected 2 races, got %', n; end if;

  perform set_config('role','none',true);
end;
$$;

-- ═══════════════════ 6. drafts never reach the resolver ═══════════════════
do $$
declare n int;
begin
  update public.candidacies set is_published = false where full_name = 'R-Councillor-A1';
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-00000000000a"}',true);
  select count(*) into n from public.candidacies_for_geography(null,null,'93000000-0000-0000-0000-000000000001');
  perform set_config('role','none',true);
  if n <> 6 then raise exception 'RESOLVER FAIL: a draft was visible to a member (got % races)', n; end if;
end;
$$;

-- ═══════════════════ 7. national admin registers members (0019) ═══════════════════
do $$
declare ok boolean; i int;
begin
  -- into a polling unit in a completely different state
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001"}',true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-00000000000c','93000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000004','EO NatMember','1990-01-01','EONIN00001');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if not ok then raise exception 'RLS FAIL: national admin could not register a member'; end if;

  -- attributing to a leader who IS in that polling unit
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001"}',true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-00000000000b','91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-00000000000c','93000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000004','EO AttrOk','1990-01-01','EONIN00002');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if not ok then raise exception 'RLS FAIL: attribution to a leader in that PU was refused'; end if;

  -- attributing to a leader in a DIFFERENT polling unit must fail
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000001"}',true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-000000000009','91000000-0000-0000-0000-000000000002','92000000-0000-0000-0000-00000000000c','93000000-0000-0000-0000-000000000004','94000000-0000-0000-0000-000000000004','EO AttrBad','1990-01-01','EONIN00003');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL: attributed a member to a leader from another polling unit'; end if;

  -- a state admin still cannot register a member
  perform set_config('role','authenticated',true);
  perform set_config('request.jwt.claims','{"sub":"90000000-0000-0000-0000-000000000002"}',true);
  begin
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-000000000002','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','EO SA member','1990-01-01','EONIN00004');
    ok := true;
  exception when others then ok := false; end;
  perform set_config('role','none',true);
  if ok then raise exception 'RLS FAIL: a state admin registered a member'; end if;

  -- the national admin may hold any number of members
  for i in 1..12 loop
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-000000000001','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','EO Bulk '||i,'1990-01-01','EOBULK'||i);
  end loop;

  -- ...and since CR-0009 §3.4, so may a LEADER. Ten is a milestone, not a
  -- ceiling: this used to assert the eleventh insert was refused.
  for i in 1..11 loop
    insert into public.members (registered_by, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin)
      values ('90000000-0000-0000-0000-000000000009','91000000-0000-0000-0000-000000000001','92000000-0000-0000-0000-00000000000a','93000000-0000-0000-0000-000000000001','94000000-0000-0000-0000-000000000001','EO LdCap '||i,'1990-01-01','EOLDCAP'||i);
  end loop;
  if (select count(*) from public.members
        where registered_by = '90000000-0000-0000-0000-000000000009' and status = 'active') <> 11 then
    raise exception 'INVARIANT FAIL: a leader could not register past ten';
  end if;

  raise notice 'ALL ELECTIVE-OFFICE RLS + RESOLVER + INVARIANT CHECKS PASSED';
end;
$$;

rollback;
