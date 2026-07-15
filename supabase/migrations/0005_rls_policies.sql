-- Hierarchical RLS for profiles + members (T-001b, per security-model.md).
-- The database is the authorization boundary (ADR-0005). Service role bypasses RLS
-- (used only by server-side account-provisioning / bootstrap).

-- ─────────── profiles: require the FULL geographic path per level ───────────
-- (profiles is empty, so tightening the check is safe.) This lets every scope
-- check be a simple equality on the caller's own filled scope.
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'national_admin'   then state_id is null     and lga_id is null     and ward_id is null     and polling_unit_id is null
    when 'state_admin'      then state_id is not null and lga_id is null     and ward_id is null     and polling_unit_id is null
    when 'lg_admin'         then state_id is not null and lga_id is not null and ward_id is null     and polling_unit_id is null
    when 'ward_admin'       then state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is null
    when 'unit_coordinator' then state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null
    when 'leader'           then state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null
    when 'member'           then true
  end
);

-- ─────────── geographic-consistency triggers (defense in depth) ───────────
create or replace function public.enforce_member_geography()
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
create trigger members_geography
  before insert or update on public.members
  for each row execute function public.enforce_member_geography();

create or replace function public.enforce_profile_geography()
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
create trigger profiles_geography
  before insert or update on public.profiles
  for each row execute function public.enforce_profile_geography();

-- ─────────── scope predicates ───────────
create or replace function public.role_rank(r public.user_role)
returns int language sql immutable as $$
  select case r
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;

-- Is a member row within the caller's scope? (reads use this)
create or replace function public.member_in_scope(
  m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid
) returns boolean language sql stable set search_path = '' as $$
  select case public.current_user_role()
    when 'national_admin'   then true
    when 'state_admin'      then m_state = public.current_state_id()
    when 'lg_admin'         then m_lga = public.current_lga_id()
    when 'ward_admin'       then m_ward = public.current_ward_id()
    when 'unit_coordinator' then m_pu = public.current_polling_unit_id()
    when 'leader'           then m_registered_by = (select auth.uid())
    when 'member'           then m_user_id = (select auth.uid())
    else false
  end;
$$;

-- Is a profile row within the caller's scope? (own profile always; admins see below them)
create or replace function public.profile_in_scope(
  p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid
) returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
    or case public.current_user_role()
      when 'national_admin'   then true
      when 'state_admin'      then p_state = public.current_state_id()
      when 'lg_admin'         then p_lga = public.current_lga_id()
      when 'ward_admin'       then p_ward = public.current_ward_id()
      when 'unit_coordinator' then p_pu = public.current_polling_unit_id()
      else false
    end;
$$;

-- ─────────── profiles policies ───────────
-- Read: own profile, plus (for admins) profiles within their scope.
create policy profiles_select on public.profiles for select using (
  public.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
-- Provision: an admin may create a profile STRICTLY BELOW their level and within
-- their scope (no self, no sideways, no escalation). Self-profile edits and the
-- first national_admin are done server-side with the service role.
create policy profiles_insert on public.profiles for insert with check (
  public.current_user_role() in ('national_admin','state_admin','lg_admin','ward_admin','unit_coordinator')
  and public.role_rank(role) > public.role_rank(public.current_user_role())
  and public.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);
create policy profiles_update on public.profiles for update using (
  public.role_rank(role) > public.role_rank(public.current_user_role())
  and public.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
) with check (
  public.role_rank(role) > public.role_rank(public.current_user_role())
  and public.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)
);

-- ─────────── members policies ───────────
-- Read: anyone whose scope covers the row (admins by geography; leader by ownership;
-- member by their own linked record).
create policy members_select on public.members for select using (
  public.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
);
-- Register: only a leader, registering their own member, in their own polling unit.
create policy members_insert on public.members for insert with check (
  public.current_user_role() = 'leader'
  and registered_by = (select auth.uid())
  and polling_unit_id = public.current_polling_unit_id()
);
-- Edit: admins in scope (e.g. freeze) and a leader for their own members. NOT members
-- directly (their edits go through change_requests / a server action).
create policy members_update on public.members for update using (
  public.current_user_role() <> 'member'
  and public.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
) with check (
  public.current_user_role() <> 'member'
  and public.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id)
);
-- No DELETE policy: members are soft-deleted (status='deleted'); hard deletes are
-- service-role only in the retention step.
