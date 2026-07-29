-- Remove the stray "Seed LGA" bootstrap row (T-032).
--
-- A placeholder LGA (Lagos, code 'SEED') with one ward and one polling unit was
-- inserted into the live database outside the migrations, during early
-- bootstrapping. It is not real geography, and it inflated every count by one:
-- the DB reported 775 LGAs / 8,794 wards / 119,972 polling units against the
-- official 774 / 8,793 / 119,971.
--
-- Checked before writing this: nothing real references it, and no membership
-- number was ever issued under the 'SEED' code (its counter had reached 62, but
-- every one of those members is long gone).
--
-- The geography FKs are ON DELETE RESTRICT, deliberately: geography that is in
-- use must not be deletable. So this walks bottom-up, and each RESTRICT stays in
-- place as a safety net. If anything real has since attached itself to this row,
-- the migration fails loudly instead of destroying data.
-- (`lga_member_counters` is ON DELETE CASCADE, so its counter goes automatically.)

do $$
declare
  seed_lga uuid;
  n_members int;
  n_profiles int;
begin
  select l.id into seed_lga
    from public.lgas l join public.states s on s.id = l.state_id
   where l.code = 'SEED' and l.name = 'Seed LGA' and s.name = 'Lagos';

  if seed_lga is null then
    raise notice 'No Seed LGA present; nothing to do.';
    return;
  end if;

  select count(*) into n_members  from public.members  m where m.lga_id = seed_lga;
  select count(*) into n_profiles from public.profiles p where p.lga_id = seed_lga;
  if n_members > 0 or n_profiles > 0 then
    raise exception 'Refusing to delete Seed LGA: % member(s) and % profile(s) reference it',
      n_members, n_profiles;
  end if;

  delete from public.polling_units
   where ward_id in (select id from public.wards where lga_id = seed_lga);
  delete from public.wards where lga_id = seed_lga;
  delete from public.lgas  where id = seed_lga;

  raise notice 'Seed LGA removed.';
end;
$$;
