-- CR-0019 / ADR-0016: swap the role ladder and rewrite the RLS scope engine.
--
-- Strategy (refined from the plan after introspecting prod): the meaning-shuffle
-- is done with THREE in-place ALTER TYPE RENAME VALUE, not a full type recreation.
-- Renaming preserves each value's internal identity and sort order, so every row
-- is remapped automatically and we avoid dropping/recreating the type and all its
-- dependents:
--   unit_coordinator -> polling_unit_coordinator  (the PU-scoped coordinators)
--   ward_admin       -> unit_coordinator          (frees the name first, above)
--   member           -> registered_voter
-- Resulting ladder (sort order preserved):
--   national_admin(1) state_admin(2) lg_admin(3) unit_coordinator(4)
--   polling_unit_coordinator(5) leader(6) registered_voter(7)
--
-- We still rewrite the objects whose LOGIC changes: the scope engine gains a unit
-- level (unit_coordinator matches unit_id; polling_unit_coordinator matches
-- polling_unit_id), and every place that embedded a changing label is refreshed.
-- Runs after 0035 (unit columns) and 0036 (unit_id backfilled on all rows).

-- ─────────────── phase 1: drop label-dependent CHECKs ───────────────
-- profiles_scope_matches_role encodes per-label rules; after the rename its stored
-- expression would apply the wrong rule to the swapped values, so drop it first.
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles drop constraint profiles_vin_required;

-- ─────────────── phase 2: drop dependent policies ───────────────
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;
drop policy members_select on public.members;
drop policy members_insert on public.members;
drop policy members_update on public.members;
drop policy change_requests_select on public.change_requests;
drop policy opt_out_requests_select on public.opt_out_requests;
drop policy polling_units_insert on public.polling_units;
drop policy voter_ids_insert on public.voter_ids;

-- ─────────────── phase 3: drop signature-changing functions ───────────────
-- member_in_scope / profile_in_scope gain a `unit` argument.
drop function private.member_in_scope(uuid, uuid, uuid, uuid, uuid, uuid);
drop function private.profile_in_scope(uuid, uuid, uuid, uuid, uuid);

-- ─────────────── phase 4: rename the enum values (order matters) ───────────────
alter type public.user_role rename value 'unit_coordinator' to 'polling_unit_coordinator';
alter type public.user_role rename value 'ward_admin' to 'unit_coordinator';
alter type public.user_role rename value 'member' to 'registered_voter';

-- ─────────────── phase 5: scope engine + refreshed functions ───────────────
-- The caller's own unit (new scope column).
create function private.current_unit_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select unit_id from public.profiles where id = (select auth.uid());
$$;

create or replace function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'unit_coordinator' then 4 when 'polling_unit_coordinator' then 5
    when 'leader' then 6 when 'registered_voter' then 7 end;
$$;

create function private.member_in_scope(
  m_state uuid, m_lga uuid, m_unit uuid, m_ward uuid, m_pu uuid,
  m_registered_by uuid, m_user_id uuid
) returns boolean language sql stable set search_path = '' as $$
  select case private.current_user_role()
    when 'national_admin'           then true
    when 'state_admin'              then m_state = private.current_state_id()
    when 'lg_admin'                 then m_lga = private.current_lga_id()
    when 'unit_coordinator'         then m_unit = private.current_unit_id()
    when 'polling_unit_coordinator' then m_pu = private.current_polling_unit_id()
    when 'leader'                   then m_registered_by = (select auth.uid())
    when 'registered_voter'         then m_user_id = (select auth.uid())
    else false
  end;
$$;

create function private.profile_in_scope(
  p_id uuid, p_state uuid, p_lga uuid, p_unit uuid, p_ward uuid, p_pu uuid
) returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
    or case private.current_user_role()
      when 'national_admin'           then true
      when 'state_admin'              then p_state = private.current_state_id()
      when 'lg_admin'                 then p_lga = private.current_lga_id()
      when 'unit_coordinator'         then p_unit = private.current_unit_id()
      when 'polling_unit_coordinator' then p_pu = private.current_polling_unit_id()
      else false
    end;
$$;

-- Candidacy writes: ward_admin is gone; the unit coordinator owns ward-kind races
-- for the wards in their unit (matched via the ward's unit_id).
create or replace function private.candidacy_in_scope(
  p_office uuid, p_state uuid, p_lga uuid, p_ward uuid, p_constituency uuid
) returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_role public.user_role := private.current_user_role();
  v_kind public.constituency_kind;
  c_state uuid; c_lga uuid; c_unit uuid; n_lgas int;
begin
  if v_role = 'national_admin' then return true; end if;
  if v_role is null or v_role not in ('state_admin', 'lg_admin', 'unit_coordinator') then
    return false;
  end if;
  select constituency_kind into v_kind from public.office_types where id = p_office;
  if v_kind is null then return false; end if;
  if v_kind = 'nation' then
    return false;
  elsif v_kind = 'state' then
    c_state := p_state;
  elsif v_kind = 'lga' then
    c_lga := p_lga;
    select state_id into c_state from public.lgas where id = p_lga;
  elsif v_kind = 'ward' then
    select w.unit_id, w.lga_id, l.state_id into c_unit, c_lga, c_state
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
    when 'state_admin'      then c_state is not null and c_state = private.current_state_id()
    when 'lg_admin'         then c_lga   is not null and c_lga   = private.current_lga_id()
    when 'unit_coordinator' then c_unit  is not null and c_unit  = private.current_unit_id()
    else false
  end;
end;
$$;

-- Trigger functions that embedded the old base-tier label.
create or replace function private.mint_kym_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role <> 'registered_voter' then
    perform private.ensure_kym_code(new.id);
  end if;
  return new;
end;
$$;

create or replace function private.sync_member_profile_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    update public.profiles
       set state_id        = new.state_id,
           lga_id          = new.lga_id,
           unit_id         = new.unit_id,
           ward_id         = new.ward_id,
           polling_unit_id = new.polling_unit_id
     where id = new.user_id
       and role = 'registered_voter';
  end if;
  return new;
end;
$$;

create or replace function public.verify_kym_code(p_code text)
returns table(full_name text, role public.user_role, state_name text, lga_name text)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.role, s.name, l.name
    from public.leader_kym_codes k
    join public.profiles p on p.id = k.leader_id
    left join public.states s on s.id = p.state_id
    left join public.lgas   l on l.id = p.lga_id
   where k.code = upper(btrim(p_code))
     and p.status = 'active'
     and p.role <> 'registered_voter';
$$;

-- Geography triggers gain unit-consistency checks (ward's unit / unit's lga).
create or replace function private.enforce_profile_geography()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.lga_id is not null and not exists (
    select 1 from public.lgas where id = new.lga_id and state_id = new.state_id
  ) then raise exception 'profile lga not in state'; end if;
  if new.unit_id is not null and not exists (
    select 1 from public.units where id = new.unit_id and lga_id = new.lga_id
  ) then raise exception 'profile unit not in lga'; end if;
  if new.ward_id is not null and not exists (
    select 1 from public.wards where id = new.ward_id and lga_id = new.lga_id
  ) then raise exception 'profile ward not in lga'; end if;
  if new.ward_id is not null and new.unit_id is not null and not exists (
    select 1 from public.wards where id = new.ward_id and unit_id = new.unit_id
  ) then raise exception 'profile ward not in unit'; end if;
  if new.polling_unit_id is not null and not exists (
    select 1 from public.polling_units where id = new.polling_unit_id and ward_id = new.ward_id
  ) then raise exception 'profile polling unit not in ward'; end if;
  return new;
end;
$$;

create or replace function private.enforce_member_geography()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
  select (l.state_id = new.state_id) and (w.lga_id = new.lga_id)
     and (w.unit_id = new.unit_id) and (pu.ward_id = new.ward_id)
    into ok
    from public.polling_units pu
    join public.wards w on w.id = pu.ward_id
    join public.lgas  l on l.id = w.lga_id
    where pu.id = new.polling_unit_id;
  if ok is distinct from true then
    raise exception 'Member geography inconsistent: polling unit/unit not within the given ward/lga/state';
  end if;
  return new;
end;
$$;

grant execute on all functions in schema private to anon, authenticated;

-- ─────────────── phase 6: recreate policies (new ladder + unit arg) ───────────────
create policy profiles_select on public.profiles for select using (
  private.profile_in_scope(id, state_id, lga_id, unit_id, ward_id, polling_unit_id)
);
create policy profiles_insert on public.profiles for insert with check (
  private.current_user_role() in
    ('national_admin','state_admin','lg_admin','unit_coordinator','polling_unit_coordinator')
  and private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, unit_id, ward_id, polling_unit_id)
);
create policy profiles_update on public.profiles for update using (
  private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, unit_id, ward_id, polling_unit_id)
) with check (
  private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, unit_id, ward_id, polling_unit_id)
);

create policy members_select on public.members for select using (
  private.member_in_scope(state_id, lga_id, unit_id, ward_id, polling_unit_id, registered_by, user_id)
);
create policy members_insert on public.members for insert with check (
  (
    private.current_user_role() = 'leader'
    and registered_by = (select auth.uid())
    and polling_unit_id = private.current_polling_unit_id()
  )
  or (
    private.current_user_role() in
      ('national_admin','state_admin','lg_admin','unit_coordinator','polling_unit_coordinator')
    and (
      private.current_user_role() = 'national_admin'
      or (private.current_user_role() = 'state_admin' and state_id = private.current_state_id())
      or (private.current_user_role() = 'lg_admin' and lga_id = private.current_lga_id())
      or (private.current_user_role() = 'unit_coordinator' and unit_id = private.current_unit_id())
      or (private.current_user_role() = 'polling_unit_coordinator' and polling_unit_id = private.current_polling_unit_id())
    )
    and (
      registered_by = (select auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = members.registered_by
          and p.role = 'leader'
          and p.polling_unit_id = members.polling_unit_id
      )
    )
  )
);
create policy members_update on public.members for update using (
  private.current_user_role() <> 'registered_voter'
  and private.member_in_scope(state_id, lga_id, unit_id, ward_id, polling_unit_id, registered_by, user_id)
) with check (
  private.current_user_role() <> 'registered_voter'
  and private.member_in_scope(state_id, lga_id, unit_id, ward_id, polling_unit_id, registered_by, user_id)
);

create policy change_requests_select on public.change_requests for select using (
  exists (
    select 1 from public.members m
    where m.id = change_requests.member_id
      and private.member_in_scope(m.state_id, m.lga_id, m.unit_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id)
  )
);
create policy opt_out_requests_select on public.opt_out_requests for select using (
  exists (
    select 1 from public.members m
    where m.id = opt_out_requests.member_id
      and private.member_in_scope(m.state_id, m.lga_id, m.unit_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id)
  )
);

create policy polling_units_insert on public.polling_units for insert with check (
  private.current_user_role() in
    ('national_admin','state_admin','lg_admin','unit_coordinator','polling_unit_coordinator')
  and (
    private.current_user_role() = 'national_admin'
    or exists (
      select 1 from public.wards w join public.lgas l on l.id = w.lga_id
      where w.id = polling_units.ward_id
        and (private.current_user_role() <> 'state_admin' or l.state_id = private.current_state_id())
        and (private.current_user_role() <> 'lg_admin' or w.lga_id = private.current_lga_id())
        and (private.current_user_role() <> 'unit_coordinator' or w.unit_id = private.current_unit_id())
        and (private.current_user_role() <> 'polling_unit_coordinator' or w.id = private.current_ward_id())
    )
  )
);

create policy voter_ids_insert on public.voter_ids for insert with check (
  private.current_user_role() <> 'registered_voter'
);

-- ─────────────── phase 7: re-scope the migrated ward admins ───────────────
-- Former ward_admins are now unit_coordinator: their scope column is unit_id
-- (backfilled in 0036); clear the ward/polling-unit path they no longer carry.
-- Former unit_coordinators are now polling_unit_coordinator and keep their full
-- path (incl. unit_id), so they are untouched here.
update public.profiles
   set ward_id = null, polling_unit_id = null
 where role = 'unit_coordinator';

-- ─────────────── phase 8: new CHECK constraints ───────────────
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'national_admin' then (state_id is null and lga_id is null and unit_id is null and ward_id is null and polling_unit_id is null)
    when 'state_admin' then (state_id is not null and lga_id is null and unit_id is null and ward_id is null and polling_unit_id is null)
    when 'lg_admin' then (state_id is not null and lga_id is not null and unit_id is null and ward_id is null and polling_unit_id is null)
    when 'unit_coordinator' then (state_id is not null and lga_id is not null and unit_id is not null and ward_id is null and polling_unit_id is null)
    when 'polling_unit_coordinator' then (state_id is not null and lga_id is not null and unit_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'leader' then (state_id is not null and lga_id is not null and unit_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'registered_voter' then true
    else null::boolean
  end
);
-- VIN still required for active non-base-tier profiles (label refreshed). NOT VALID
-- to match the original: it guards new/updated rows without validating history.
alter table public.profiles add constraint profiles_vin_required check (
  role = 'registered_voter' or status <> 'active' or vin_id is not null
) not valid;

-- ─────────────── phase 9: tighten geography ───────────────
alter table public.wards alter column unit_id set not null;
