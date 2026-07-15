-- Security hardening (advisors): move the RLS/trigger helper functions into a
-- `private` schema that PostgREST does NOT expose, so they can't be called as
-- RPC endpoints, and pin search_path on every function. They stay callable by
-- RLS policy/trigger evaluation (anon + authenticated keep EXECUTE), but are off
-- the public API. This is the recommended Supabase pattern for RLS helpers.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Drop the policies + triggers that depend on the public functions, then the
-- functions, then recreate everything against `private`.
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;
drop policy members_select on public.members;
drop policy members_insert on public.members;
drop policy members_update on public.members;

drop trigger members_min_age on public.members;
drop trigger members_membership_number_immutable on public.members;
drop trigger members_leader_capacity on public.members;
drop trigger members_geography on public.members;
drop trigger profiles_geography on public.profiles;

drop function public.current_user_role();
drop function public.current_state_id();
drop function public.current_lga_id();
drop function public.current_ward_id();
drop function public.current_polling_unit_id();
drop function public.role_rank(public.user_role);
drop function public.member_in_scope(uuid, uuid, uuid, uuid, uuid, uuid);
drop function public.profile_in_scope(uuid, uuid, uuid, uuid, uuid);
drop function public.enforce_member_min_age();
drop function public.prevent_membership_number_change();
drop function public.enforce_leader_capacity();
drop function public.enforce_member_geography();
drop function public.enforce_profile_geography();

-- ─────────── scope helpers (private, SECURITY DEFINER, own-scope only) ───────────
create function private.current_user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;
create function private.current_state_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select state_id from public.profiles where id = (select auth.uid());
$$;
create function private.current_lga_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select lga_id from public.profiles where id = (select auth.uid());
$$;
create function private.current_ward_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select ward_id from public.profiles where id = (select auth.uid());
$$;
create function private.current_polling_unit_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select polling_unit_id from public.profiles where id = (select auth.uid());
$$;

create function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;

create function private.member_in_scope(
  m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid
) returns boolean language sql stable set search_path = '' as $$
  select case private.current_user_role()
    when 'national_admin'   then true
    when 'state_admin'      then m_state = private.current_state_id()
    when 'lg_admin'         then m_lga = private.current_lga_id()
    when 'ward_admin'       then m_ward = private.current_ward_id()
    when 'unit_coordinator' then m_pu = private.current_polling_unit_id()
    when 'leader'           then m_registered_by = (select auth.uid())
    when 'member'           then m_user_id = (select auth.uid())
    else false
  end;
$$;

create function private.profile_in_scope(
  p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid
) returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
    or case private.current_user_role()
      when 'national_admin'   then true
      when 'state_admin'      then p_state = private.current_state_id()
      when 'lg_admin'         then p_lga = private.current_lga_id()
      when 'ward_admin'       then p_ward = private.current_ward_id()
      when 'unit_coordinator' then p_pu = private.current_polling_unit_id()
      else false
    end;
$$;

-- ─────────── enforcement / trigger functions (private) ───────────
create function private.enforce_member_min_age()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.date_of_birth > current_date - interval '18 years' then
    raise exception 'Member must be at least 18 years old at registration';
  end if;
  return new;
end;
$$;
create function private.prevent_membership_number_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.membership_number is distinct from old.membership_number then
    raise exception 'membership_number is immutable and cannot be changed';
  end if;
  return new;
end;
$$;
create function private.enforce_leader_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare active_count int;
begin
  if new.status = 'active' then
    select count(*) into active_count
      from public.members m
      where m.registered_by = new.registered_by and m.status = 'active' and m.id <> new.id;
    if active_count >= 10 then
      raise exception 'Leader capacity exceeded: a leader may hold at most 10 active members';
    end if;
  end if;
  return new;
end;
$$;
create function private.enforce_member_geography()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ok boolean;
begin
  select (l.state_id = new.state_id) and (w.lga_id = new.lga_id) and (pu.ward_id = new.ward_id)
    into ok
    from public.polling_units pu
    join public.wards w on w.id = pu.ward_id
    join public.lgas  l on l.id = w.lga_id
    where pu.id = new.polling_unit_id;
  if ok is distinct from true then
    raise exception 'Member geography inconsistent: polling unit is not within the given ward/lga/state';
  end if;
  return new;
end;
$$;
create function private.enforce_profile_geography()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.lga_id is not null and not exists (
    select 1 from public.lgas where id = new.lga_id and state_id = new.state_id
  ) then raise exception 'profile lga not in state'; end if;
  if new.ward_id is not null and not exists (
    select 1 from public.wards where id = new.ward_id and lga_id = new.lga_id
  ) then raise exception 'profile ward not in lga'; end if;
  if new.polling_unit_id is not null and not exists (
    select 1 from public.polling_units where id = new.polling_unit_id and ward_id = new.ward_id
  ) then raise exception 'profile polling unit not in ward'; end if;
  return new;
end;
$$;

grant execute on all functions in schema private to anon, authenticated;

-- ─────────── rebind triggers ───────────
create trigger members_min_age
  before insert or update of date_of_birth on public.members
  for each row execute function private.enforce_member_min_age();
create trigger members_membership_number_immutable
  before update on public.members
  for each row execute function private.prevent_membership_number_change();
create trigger members_leader_capacity
  before insert or update on public.members
  for each row execute function private.enforce_leader_capacity();
create trigger members_geography
  before insert or update on public.members
  for each row execute function private.enforce_member_geography();
create trigger profiles_geography
  before insert or update on public.profiles
  for each row execute function private.enforce_profile_geography();

-- ─────────── rebind policies ───────────
create policy profiles_select on public.profiles for select using (
  private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
create policy profiles_insert on public.profiles for insert with check (
  private.current_user_role() in ('national_admin','state_admin','lg_admin','ward_admin','unit_coordinator')
  and private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
create policy profiles_update on public.profiles for update using (
  private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
) with check (
  private.role_rank(role) > private.role_rank(private.current_user_role())
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
create policy members_select on public.members for select using (
  private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
);
create policy members_insert on public.members for insert with check (
  private.current_user_role() = 'leader'
  and registered_by = (select auth.uid())
  and polling_unit_id = private.current_polling_unit_id()
);
create policy members_update on public.members for update using (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
) with check (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
);
