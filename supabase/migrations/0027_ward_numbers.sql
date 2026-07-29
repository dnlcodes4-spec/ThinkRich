-- Ward numbers for the membership card (T-048, CR-0009 §3.5).
--
-- READ THIS BEFORE TRUSTING THE NUMBER.
--
-- The approved card prints "WARD: 12". We hold no ward number: `public.wards` has
-- only id, lga_id, name, created_at, and the names are place names, not ordinals
-- ("Auna South", "Awkuzu III", "Gandi 'B'", "SI, (Lekki I)"). This was flagged to
-- the client, who directed us to derive one within the LGA.
--
-- So this number is ASSIGNED BY US. It is NOT an INEC ward code and must never be
-- presented as one, or matched against an INEC document. If real ward codes are
-- ever imported (the equivalent of T-031 for wards), they belong in a separate
-- `code` column and this one should be retired rather than overwritten.
--
-- It is STORED rather than computed at render time on purpose. A number derived
-- on the fly from row order would silently change whenever ward data was
-- re-imported or a ward was renamed, and it is printed on an identity card that
-- members keep. Stored and unique, it is stable by construction.

alter table public.wards add column ward_number int;

-- Deterministic: position within the LGA, ordered by name, tie-broken by id so
-- duplicate names cannot make the assignment ambiguous.
with numbered as (
  select id, row_number() over (partition by lga_id order by name, id) as n
    from public.wards
)
update public.wards w set ward_number = numbered.n
  from numbered where numbered.id = w.id;

alter table public.wards alter column ward_number set not null;
create unique index wards_lga_number_key on public.wards (lga_id, ward_number);

-- New wards get the next number in their LGA rather than a null. Advisory lock on
-- the LGA serialises concurrent inserts into the same LGA, so two new wards cannot
-- both take the same number.
create or replace function private.assign_ward_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.ward_number is null then
    perform pg_advisory_xact_lock(hashtext('ward_number:' || new.lga_id::text));
    select coalesce(max(ward_number), 0) + 1 into new.ward_number
      from public.wards where lga_id = new.lga_id;
  end if;
  return new;
end;
$$;

create trigger wards_assign_number
  before insert on public.wards
  for each row execute function private.assign_ward_number();

comment on column public.wards.ward_number is
  'System-assigned ordinal within the LGA, for the membership card only (CR-0009 §3.5). '
  'NOT an INEC ward code. Stable once assigned; never renumber.';
