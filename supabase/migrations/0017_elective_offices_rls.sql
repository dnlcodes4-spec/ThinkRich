-- RLS + the member-facing resolver for the elective-office model (T-027, ADR-0013).
--
-- Two rules:
--   1. Catalogue tables (offices, parties, elections, constituencies) are
--      world-readable reference data; only the national admin may write them.
--   2. A candidacy may be written by an admin if and only if its constituency is
--      CONTAINED IN that admin's own scope. National admin's scope is the country,
--      so they can do anything. There is no role-to-office mapping table; the
--      geography answers it.

-- ─────────── containment ───────────
-- Resolves a candidacy's scope down to (state, lga, ward) and asks whether the
-- caller's own scope covers it. An overlay constituency (senatorial / federal /
-- state) belongs to an LG admin only if it lies wholly inside a single LGA and is
-- not ward-split, which is the honest answer: a federal constituency is normally
-- larger than an LGA, so an LG admin must not touch it.
create function private.candidacy_in_scope(
  p_office uuid, p_state uuid, p_lga uuid, p_ward uuid, p_constituency uuid
) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role public.user_role := private.current_user_role();
  v_kind public.constituency_kind;
  c_state uuid;
  c_lga uuid;
  c_ward uuid;
  n_lgas int;
begin
  if v_role = 'national_admin' then return true; end if;
  if v_role is null or v_role not in ('state_admin', 'lg_admin', 'ward_admin') then
    return false;
  end if;

  select constituency_kind into v_kind from public.office_types where id = p_office;
  if v_kind is null then return false; end if;

  if v_kind = 'nation' then
    return false;                                     -- national admin only
  elsif v_kind = 'state' then
    c_state := p_state;
  elsif v_kind = 'lga' then
    c_lga := p_lga;
    select state_id into c_state from public.lgas where id = p_lga;
  elsif v_kind = 'ward' then
    c_ward := p_ward;
    select w.lga_id, l.state_id into c_lga, c_state
      from public.wards w join public.lgas l on l.id = w.lga_id
      where w.id = p_ward;
  else
    select state_id into c_state from public.constituencies where id = p_constituency;
    select count(*) into n_lgas
      from public.constituency_lgas where constituency_id = p_constituency;
    if n_lgas = 1 and not exists (
      select 1 from public.constituency_wards where constituency_id = p_constituency
    ) then
      select lga_id into c_lga
        from public.constituency_lgas where constituency_id = p_constituency;
    end if;
  end if;

  return case v_role
    when 'state_admin' then c_state is not null and c_state = private.current_state_id()
    when 'lg_admin'    then c_lga   is not null and c_lga   = private.current_lga_id()
    when 'ward_admin'  then c_ward  is not null and c_ward  = private.current_ward_id()
    else false
  end;
end;
$$;

-- ─────────── catalogue: readable by all, written by the national admin ───────────
alter table public.office_types           enable row level security;
alter table public.parties                enable row level security;
alter table public.elections              enable row level security;
alter table public.election_office_types  enable row level security;
alter table public.constituencies         enable row level security;
alter table public.constituency_lgas      enable row level security;
alter table public.constituency_wards     enable row level security;

create policy catalogue_readable on public.office_types          for select using (true);
create policy catalogue_readable on public.parties               for select using (true);
create policy catalogue_readable on public.elections             for select using (true);
create policy catalogue_readable on public.election_office_types for select using (true);
create policy catalogue_readable on public.constituencies        for select using (true);
create policy catalogue_readable on public.constituency_lgas     for select using (true);
create policy catalogue_readable on public.constituency_wards    for select using (true);

create policy catalogue_write on public.office_types for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.parties for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.elections for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.election_office_types for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.constituencies for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.constituency_lgas for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');
create policy catalogue_write on public.constituency_wards for all
  using (private.current_user_role() = 'national_admin')
  with check (private.current_user_role() = 'national_admin');

-- ─────────── candidacies ───────────
alter table public.candidacies enable row level security;

-- Read: any signed-in user sees PUBLISHED candidacies anywhere (the client asked
-- for "geography first, other geographies available"). Unpublished drafts are
-- visible only to the admins who could edit them.
create policy candidacies_select on public.candidacies for select using (
  ((select auth.uid()) is not null and is_published)
  or private.candidacy_in_scope(office_type_id, state_id, lga_id, ward_id, constituency_id)
);

create policy candidacies_insert on public.candidacies for insert with check (
  private.candidacy_in_scope(office_type_id, state_id, lga_id, ward_id, constituency_id)
);
create policy candidacies_update on public.candidacies for update
  using (private.candidacy_in_scope(office_type_id, state_id, lga_id, ward_id, constituency_id))
  with check (private.candidacy_in_scope(office_type_id, state_id, lga_id, ward_id, constituency_id));
create policy candidacies_delete on public.candidacies for delete
  using (private.candidacy_in_scope(office_type_id, state_id, lga_id, ward_id, constituency_id));

-- ─────────── ward → constituency resolution ───────────
-- A ward-level membership row OVERRIDES its LGA's row for the same kind, so the
-- tedious ward-by-ward data is only needed where an LGA is actually split.
create view public.ward_constituencies with (security_invoker = true) as
  select cw.ward_id, cw.kind, cw.constituency_id
    from public.constituency_wards cw
  union all
  select w.id as ward_id, cl.kind, cl.constituency_id
    from public.constituency_lgas cl
    join public.wards w on w.lga_id = cl.lga_id
   where not exists (
     select 1 from public.constituency_wards cw2
      where cw2.ward_id = w.id and cw2.kind = cl.kind
   );

-- Every race that applies to a geography, coarsest first. Pass as much as is
-- known: a ward gives the full picture, an LGA gives everything except the state
-- constituency where an LGA is split, a state alone gives President + Governor.
--
-- NOT security definer, so RLS still applies: a member sees published rows only.
create function public.candidacies_for_geography(
  p_state_id uuid default null,
  p_lga_id uuid default null,
  p_ward_id uuid default null
) returns setof public.candidacies
language plpgsql stable set search_path = '' as $$
declare
  v_state uuid := p_state_id;
  v_lga uuid := p_lga_id;
  v_ward uuid := p_ward_id;
begin
  if v_ward is not null then
    select w.lga_id, l.state_id into v_lga, v_state
      from public.wards w join public.lgas l on l.id = w.lga_id
      where w.id = v_ward;
  elsif v_lga is not null then
    select state_id into v_state from public.lgas where id = v_lga;
  end if;

  return query
    select c.*
      from public.candidacies c
      join public.office_types o on o.id = c.office_type_id
     where o.is_active
       and case o.constituency_kind
             when 'nation' then true
             when 'state'  then v_state is not null and c.state_id = v_state
             when 'lga'    then v_lga   is not null and c.lga_id   = v_lga
             when 'ward'   then v_ward  is not null and c.ward_id  = v_ward
             else
               (v_ward is not null and c.constituency_id in (
                  select wc.constituency_id from public.ward_constituencies wc
                   where wc.ward_id = v_ward and wc.kind = o.constituency_kind))
               or (v_ward is null and v_lga is not null and c.constituency_id in (
                  select cl.constituency_id from public.constituency_lgas cl
                   where cl.lga_id = v_lga and cl.kind = o.constituency_kind))
           end
     order by o.sort_order, c.is_endorsed desc, c.full_name;
end;
$$;
