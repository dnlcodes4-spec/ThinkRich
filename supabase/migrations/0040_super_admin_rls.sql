-- CR-0015 / ADR-0017: super_admin is a superset of national_admin. Extend every
-- privileged object to treat it like national, plus a peer special-case so a
-- super_admin may create/manage other super_admins. Additive; no data change.
-- Runs after 0039 (which added the enum value in its own transaction).

-- ─────────────── functions (CREATE OR REPLACE; signatures unchanged) ───────────────
create or replace function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'super_admin' then 0
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;

create or replace function private.profile_in_scope(p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid)
returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid()) or case private.current_user_role()
    when 'super_admin' then true
    when 'national_admin' then true when 'state_admin' then p_state = private.current_state_id()
    when 'lg_admin' then p_lga = private.current_lga_id() when 'ward_admin' then p_ward = private.current_ward_id()
    when 'unit_coordinator' then p_pu = private.current_polling_unit_id() else false end;
$$;

create or replace function private.member_in_scope(m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid)
returns boolean language sql stable set search_path = '' as $$
  select case private.current_user_role()
    when 'super_admin' then true
    when 'national_admin' then true when 'state_admin' then m_state = private.current_state_id()
    when 'lg_admin' then m_lga = private.current_lga_id() when 'ward_admin' then m_ward = private.current_ward_id()
    when 'unit_coordinator' then m_pu = private.current_polling_unit_id()
    when 'leader' then m_registered_by = (select auth.uid()) when 'member' then m_user_id = (select auth.uid()) else false end;
$$;

create or replace function private.candidacy_in_scope(p_office uuid, p_state uuid, p_lga uuid, p_ward uuid, p_constituency uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare v_role public.user_role := private.current_user_role(); v_kind public.constituency_kind; c_state uuid; c_lga uuid; c_ward uuid; n_lgas int;
begin
  if v_role in ('national_admin','super_admin') then return true; end if;
  if v_role is null or v_role not in ('state_admin', 'lg_admin', 'ward_admin') then return false; end if;
  select constituency_kind into v_kind from public.office_types where id = p_office;
  if v_kind is null then return false; end if;
  if v_kind = 'nation' then return false;
  elsif v_kind = 'state' then c_state := p_state;
  elsif v_kind = 'lga' then c_lga := p_lga; select state_id into c_state from public.lgas where id = p_lga;
  elsif v_kind = 'ward' then c_ward := p_ward; select w.lga_id, l.state_id into c_lga, c_state from public.wards w join public.lgas l on l.id = w.lga_id where w.id = p_ward;
  else select state_id into c_state from public.constituencies where id = p_constituency;
    select count(*) into n_lgas from public.constituency_lgas where constituency_id = p_constituency;
    if n_lgas = 1 and not exists (select 1 from public.constituency_wards where constituency_id = p_constituency) then
      select lga_id into c_lga from public.constituency_lgas where constituency_id = p_constituency; end if;
  end if;
  return case v_role when 'state_admin' then c_state is not null and c_state = private.current_state_id()
    when 'lg_admin' then c_lga is not null and c_lga = private.current_lga_id()
    when 'ward_admin' then c_ward is not null and c_ward = private.current_ward_id() else false end;
end; $$;

-- ─────────────── policies (ALTER POLICY; expression only) ───────────────
-- profiles: allow super_admin + peer special-case (super may target any role incl
-- super_admin; everyone else stays strictly-below via role_rank).
alter policy profiles_insert on public.profiles with check (
  private.current_user_role() = any (array['super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
  and (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
alter policy profiles_update on public.profiles using (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
) with check (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);

-- members_insert: add super_admin to the coordinator allowlist + the "any scope" branch.
alter policy members_insert on public.members with check (
  ((private.current_user_role() = 'leader'::public.user_role) and (registered_by = (select auth.uid())) and (polling_unit_id = private.current_polling_unit_id()))
  or ((private.current_user_role() = any (array['super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[]))
    and ((private.current_user_role() = any (array['super_admin','national_admin']::public.user_role[]))
      or ((private.current_user_role() = 'state_admin'::public.user_role) and (state_id = private.current_state_id()))
      or ((private.current_user_role() = 'lg_admin'::public.user_role) and (lga_id = private.current_lga_id()))
      or ((private.current_user_role() = 'ward_admin'::public.user_role) and (ward_id = private.current_ward_id()))
      or ((private.current_user_role() = 'unit_coordinator'::public.user_role) and (polling_unit_id = private.current_polling_unit_id())))
    and ((registered_by = (select auth.uid()))
      or (exists (select 1 from public.profiles p where ((p.id = members.registered_by) and (p.role = 'leader'::public.user_role) and (p.polling_unit_id = members.polling_unit_id))))))
);

-- polling_units_insert: add super_admin (any ward).
alter policy polling_units_insert on public.polling_units with check (
  (private.current_user_role() = any (array['super_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[]))
  and ((private.current_user_role() = any (array['super_admin','national_admin']::public.user_role[]))
    or (exists (select 1 from (public.wards w join public.lgas l on ((l.id = w.lga_id)))
      where ((w.id = polling_units.ward_id)
        and ((private.current_user_role() <> 'state_admin'::public.user_role) or (l.state_id = private.current_state_id()))
        and ((private.current_user_role() <> 'lg_admin'::public.user_role) or (w.lga_id = private.current_lga_id()))
        and ((private.current_user_role() <> 'ward_admin'::public.user_role) or (w.id = private.current_ward_id()))
        and ((private.current_user_role() <> 'unit_coordinator'::public.user_role) or (w.id = private.current_ward_id()))))))
);

-- elective-office catalogue: super_admin manages it too, like national.
alter policy catalogue_write on public.office_types using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.parties using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.elections using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.constituencies using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.constituency_lgas using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.constituency_wards using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));
alter policy catalogue_write on public.election_office_types using (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[])) with check (private.current_user_role() = any (array['national_admin','super_admin']::public.user_role[]));

-- activity_log: the owner reads the platform log too.
alter policy activity_log_select_national on public.activity_log using (
  exists (select 1 from public.profiles p
          where p.id = (select auth.uid())
            and p.role = any (array['national_admin','super_admin']::public.user_role[])
            and p.status = 'active')
);

-- ─────────────── the scope CHECK (drop + re-add; a CHECK cannot be ALTERed) ───────────────
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'super_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'national_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'state_admin' then (state_id is not null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'lg_admin' then (state_id is not null and lga_id is not null and ward_id is null and polling_unit_id is null)
    when 'ward_admin' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is null)
    when 'unit_coordinator' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'leader' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'member' then true
    else null::boolean
  end
);
