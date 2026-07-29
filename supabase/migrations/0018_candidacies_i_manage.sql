-- "Which races may I edit?" as one database answer (T-027, ADR-0013).
--
-- The admin UI needs the same containment rule the write policies use. Rather
-- than re-implement it in TypeScript and let the two drift, expose it as a
-- function. The UI mirrors the database; the database stays the boundary.
create function public.candidacies_i_manage()
returns setof public.candidacies
language sql stable set search_path = '' as $$
  select c.* from public.candidacies c
   where private.candidacy_in_scope(
     c.office_type_id, c.state_id, c.lga_id, c.ward_id, c.constituency_id
   )
   order by c.updated_at desc;
$$;

-- Can the caller create a candidacy for this office in this geography? The admin
-- form calls this before offering the office, so an admin is never shown a race
-- the database would then refuse.
create function public.can_manage_candidacy(
  p_office_type_id uuid,
  p_state_id uuid default null,
  p_lga_id uuid default null,
  p_ward_id uuid default null,
  p_constituency_id uuid default null
) returns boolean
language sql stable set search_path = '' as $$
  select private.candidacy_in_scope(p_office_type_id, p_state_id, p_lga_id, p_ward_id, p_constituency_id);
$$;
