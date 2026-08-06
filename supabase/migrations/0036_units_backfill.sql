-- CR-0019 / ADR-0016 backfill: one unit per existing ward (name = ward name),
-- then propagate unit_id onto wards and every scoped profile/member. Runs after
-- 0035 (nullable columns exist) and before 0037 (which re-scopes + enforces).
-- Guarded so a re-run does not double-seed.

-- 1. seed a unit per ward that does not yet have one
insert into public.units (lga_id, name)
select w.lga_id, w.name
from public.wards w
where w.unit_id is null
on conflict (lga_id, name) do nothing;

-- 2. link each ward to its unit (same lga_id + name)
update public.wards w
set unit_id = u.id
from public.units u
where w.unit_id is null and u.lga_id = w.lga_id and u.name = w.name;

-- 3. backfill unit_id on profiles/members from their ward
update public.profiles p set unit_id = w.unit_id
from public.wards w where p.ward_id = w.id and p.unit_id is null;
update public.members m set unit_id = w.unit_id
from public.wards w where m.ward_id = w.id and m.unit_id is null;

-- 4. assert completeness (fail loudly rather than leave orphans)
do $$
declare orphan_wards int; orphan_profiles int; orphan_members int;
begin
  select count(*) into orphan_wards from public.wards where unit_id is null;
  select count(*) into orphan_profiles from public.profiles where ward_id is not null and unit_id is null;
  select count(*) into orphan_members from public.members where ward_id is not null and unit_id is null;
  if orphan_wards > 0 then raise exception 'Backfill incomplete: % wards without a unit', orphan_wards; end if;
  if orphan_profiles > 0 then raise exception 'Backfill incomplete: % profiles with a ward but no unit', orphan_profiles; end if;
  if orphan_members > 0 then raise exception 'Backfill incomplete: % members with a ward but no unit', orphan_members; end if;
end $$;
