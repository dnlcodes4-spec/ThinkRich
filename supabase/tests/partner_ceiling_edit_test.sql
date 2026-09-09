-- CR-0026 follow-up [migration 0055]: partners.scope_state_id may widen freely
-- but may not narrow to a state that would strand existing members or staff.
-- private.enforce_partner_ceiling_widen_only() guards the partners-row side;
-- enforce_partner_ceiling only ever fired on members/profiles writes.
--
-- One transaction, rolled back. Seed style mirrors partner_rls_test.sql.

begin;

insert into auth.users (id, instance_id, aud, role, email) values
  ('d0000000-0000-4000-8000-0000000000c1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pce-su@test.dev'),
  ('d0000000-0000-4000-8000-0000000000c2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pce-l1@test.dev'),
  ('d0000000-0000-4000-8000-0000000000c3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','pce-l2@test.dev');

insert into public.states (id, name, code, is_active) values
  ('d1000000-0000-4000-8000-0000000000c1','CeilStateOne','CE1', true),
  ('d1000000-0000-4000-8000-0000000000c2','CeilStateTwo','CE2', true);
insert into public.lgas (id, state_id, name, code) values
  ('d2000000-0000-4000-8000-0000000000c1','d1000000-0000-4000-8000-0000000000c1','CeilLGA1','CEL1'),
  ('d2000000-0000-4000-8000-0000000000c2','d1000000-0000-4000-8000-0000000000c2','CeilLGA2','CEL2');
insert into public.wards (id, lga_id, name) values
  ('d3000000-0000-4000-8000-0000000000c1','d2000000-0000-4000-8000-0000000000c1','CeilWard1'),
  ('d3000000-0000-4000-8000-0000000000c2','d2000000-0000-4000-8000-0000000000c2','CeilWard2');
insert into public.polling_units (id, ward_id, name) values
  ('d4000000-0000-4000-8000-0000000000c1','d3000000-0000-4000-8000-0000000000c1','CeilPU1'),
  ('d4000000-0000-4000-8000-0000000000c2','d3000000-0000-4000-8000-0000000000c2','CeilPU2');

-- Nationwide partner, so its members can sit in either state.
insert into public.partners (id, name, kind, scope_state_id, code, status, created_by) values
  ('da000000-0000-4000-8000-0000000000c1','Ceiling Partner','political', null,'CEIL','active','d0000000-0000-4000-8000-0000000000c1');

insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
  ('d0000000-0000-4000-8000-0000000000c1','super_admin','PCE_SU',null,null,null,null,null,'frozen'),
  ('d0000000-0000-4000-8000-0000000000c2','leader','PCE_L1','d1000000-0000-4000-8000-0000000000c1','d2000000-0000-4000-8000-0000000000c1','d3000000-0000-4000-8000-0000000000c1','d4000000-0000-4000-8000-0000000000c1','da000000-0000-4000-8000-0000000000c1','frozen'),
  ('d0000000-0000-4000-8000-0000000000c3','leader','PCE_L2','d1000000-0000-4000-8000-0000000000c2','d2000000-0000-4000-8000-0000000000c2','d3000000-0000-4000-8000-0000000000c2','d4000000-0000-4000-8000-0000000000c2','da000000-0000-4000-8000-0000000000c1','frozen');

insert into public.voter_ids (vin) values ('PCEILVIN00000000001'),('PCEILVIN00000000002');

-- One partner member in each state.
insert into public.members (id, registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
  ('df000000-0000-4000-8000-0000000000c1','d0000000-0000-4000-8000-0000000000c2','d1000000-0000-4000-8000-0000000000c1','d2000000-0000-4000-8000-0000000000c1','d3000000-0000-4000-8000-0000000000c1','d4000000-0000-4000-8000-0000000000c1','da000000-0000-4000-8000-0000000000c1','PCE M1','1990-01-01','PCEILNIN01','PCEILVIN00000000001'),
  ('df000000-0000-4000-8000-0000000000c2','d0000000-0000-4000-8000-0000000000c3','d1000000-0000-4000-8000-0000000000c2','d2000000-0000-4000-8000-0000000000c2','d3000000-0000-4000-8000-0000000000c2','d4000000-0000-4000-8000-0000000000c2','da000000-0000-4000-8000-0000000000c1','PCE M2','1990-01-01','PCEILNIN02','PCEILVIN00000000002');

do $$
declare ok boolean; v uuid;
begin
  -- 1. Narrowing nationwide -> state CE1 is rejected: M2 (and L2) sit in CE2.
  begin
    update public.partners set scope_state_id = 'd1000000-0000-4000-8000-0000000000c1'
      where id = 'da000000-0000-4000-8000-0000000000c1';
    ok := true;
  exception when others then ok := false; end;
  if ok then raise exception 'FAIL [1]: narrowed the ceiling while people were outside it'; end if;

  -- 2. Move everyone into CE1 first (delete M2, repoint L2), then the narrow works.
  delete from public.members where id = 'df000000-0000-4000-8000-0000000000c2';
  update public.profiles set state_id = 'd1000000-0000-4000-8000-0000000000c1',
    lga_id = 'd2000000-0000-4000-8000-0000000000c1', ward_id = 'd3000000-0000-4000-8000-0000000000c1',
    polling_unit_id = 'd4000000-0000-4000-8000-0000000000c1'
    where id = 'd0000000-0000-4000-8000-0000000000c3';
  update public.partners set scope_state_id = 'd1000000-0000-4000-8000-0000000000c1'
    where id = 'da000000-0000-4000-8000-0000000000c1';
  select scope_state_id into v from public.partners where id = 'da000000-0000-4000-8000-0000000000c1';
  if v is distinct from 'd1000000-0000-4000-8000-0000000000c1' then
    raise exception 'FAIL [2]: narrow was blocked even though everyone fits';
  end if;

  -- 3. Widening back to nationwide is always allowed.
  update public.partners set scope_state_id = null where id = 'da000000-0000-4000-8000-0000000000c1';
  select scope_state_id into v from public.partners where id = 'da000000-0000-4000-8000-0000000000c1';
  if v is not null then raise exception 'FAIL [3]: could not widen the ceiling to nationwide'; end if;

  raise notice 'PARTNER CEILING EDIT: all checks passed';
end $$;

rollback;
