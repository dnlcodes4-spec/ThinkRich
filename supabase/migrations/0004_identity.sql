-- Identity & membership (T-001b, per data-model.md + security-model.md).
-- Tables: profiles (1:1 auth.users) and members (the membership record).
-- RLS is ENABLED here (secure by default) but the hierarchical POLICIES land in
-- 0005; between the two, only the service role can touch these tables.

-- ─────────────────────────── enums ───────────────────────────
create type public.user_role as enum (
  'national_admin', 'state_admin', 'lg_admin', 'ward_admin',
  'unit_coordinator', 'leader', 'member'
);
create type public.member_status as enum ('active', 'frozen', 'deleted');

-- ─────────────────────────── profiles ───────────────────────────
-- One row per authenticated user (admins, leaders, and members). Scope FKs are
-- non-null only at that role's level; parents are derived via joins when needed.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  state_id uuid references public.states (id) on delete restrict,
  lga_id uuid references public.lgas (id) on delete restrict,
  ward_id uuid references public.wards (id) on delete restrict,
  polling_unit_id uuid references public.polling_units (id) on delete restrict,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  -- each admin/leader must carry its own direct scope FK
  constraint profiles_scope_matches_role check (
    (role = 'national_admin')
    or (role = 'state_admin' and state_id is not null)
    or (role = 'lg_admin' and lga_id is not null)
    or (role = 'ward_admin' and ward_id is not null)
    or (role in ('unit_coordinator', 'leader') and polling_unit_id is not null)
    or (role = 'member')
  )
);
create index profiles_role_idx on public.profiles (role);
create index profiles_state_id_idx on public.profiles (state_id);
create index profiles_lga_id_idx on public.profiles (lga_id);
create index profiles_ward_id_idx on public.profiles (ward_id);
create index profiles_polling_unit_id_idx on public.profiles (polling_unit_id);

-- ─────────────────────────── members ───────────────────────────
create table public.members (
  id uuid primary key default gen_random_uuid(),
  membership_number text not null unique,        -- immutable; TWM-<STATE>-<LGA>-<seq> (generated in T-004)
  registered_by uuid not null references public.profiles (id) on delete restrict,  -- the leader
  user_id uuid unique references auth.users (id) on delete set null,  -- member's own login (when provisioned; credential TBD)
  -- geography (auto-loaded; ward in lga in state, pu in ward)
  state_id uuid not null references public.states (id) on delete restrict,
  lga_id uuid not null references public.lgas (id) on delete restrict,
  ward_id uuid not null references public.wards (id) on delete restrict,
  polling_unit_id uuid not null references public.polling_units (id) on delete restrict,
  -- personal
  full_name text not null,
  date_of_birth date not null,
  passport_photo_url text,
  -- sensitive PII
  nin text not null unique,                      -- no-duplicate key (CR-0002)
  vin text,
  account_number text,
  account_name text,
  bank_name text,
  status public.member_status not null default 'active',
  created_at timestamptz not null default now()
);
create index members_registered_by_idx on public.members (registered_by);
create index members_state_id_idx on public.members (state_id);
create index members_lga_id_idx on public.members (lga_id);
create index members_ward_id_idx on public.members (ward_id);
create index members_polling_unit_id_idx on public.members (polling_unit_id);

-- ─────────────────────────── invariants (triggers) ───────────────────────────
-- current_date is STABLE (not allowed in a CHECK), so age is enforced by a trigger.
create or replace function public.enforce_member_min_age()
returns trigger language plpgsql as $$
begin
  if new.date_of_birth > current_date - interval '18 years' then
    raise exception 'Member must be at least 18 years old at registration';
  end if;
  return new;
end;
$$;
create trigger members_min_age
  before insert or update of date_of_birth on public.members
  for each row execute function public.enforce_member_min_age();

-- membership_number is immutable once issued.
create or replace function public.prevent_membership_number_change()
returns trigger language plpgsql as $$
begin
  if new.membership_number is distinct from old.membership_number then
    raise exception 'membership_number is immutable and cannot be changed';
  end if;
  return new;
end;
$$;
create trigger members_membership_number_immutable
  before update on public.members
  for each row execute function public.prevent_membership_number_change();

-- A leader (registered_by) holds at most 10 ACTIVE members. SECURITY DEFINER so the
-- count is accurate regardless of the caller's RLS visibility.
create or replace function public.enforce_leader_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare active_count int;
begin
  if new.status = 'active' then
    select count(*) into active_count
      from public.members m
      where m.registered_by = new.registered_by
        and m.status = 'active'
        and m.id <> new.id;
    if active_count >= 10 then
      raise exception 'Leader capacity exceeded: a leader may hold at most 10 active members';
    end if;
  end if;
  return new;
end;
$$;
create trigger members_leader_capacity
  before insert or update on public.members
  for each row execute function public.enforce_leader_capacity();

-- ─────────────────── RLS scope helpers (avoid policy recursion) ───────────────────
-- SECURITY DEFINER + locked search_path: these read the CALLER's own profile only
-- (id = auth.uid()), so policies can branch on role/scope without re-querying
-- profiles under RLS (which would recurse).
create or replace function public.current_user_role()
returns public.user_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid());
$$;
create or replace function public.current_state_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select state_id from public.profiles where id = (select auth.uid());
$$;
create or replace function public.current_lga_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select lga_id from public.profiles where id = (select auth.uid());
$$;
create or replace function public.current_ward_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select ward_id from public.profiles where id = (select auth.uid());
$$;
create or replace function public.current_polling_unit_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select polling_unit_id from public.profiles where id = (select auth.uid());
$$;

-- ─────────────────────────── RLS (enable; policies in 0005) ───────────────────────────
alter table public.profiles enable row level security;
alter table public.members enable row level security;
