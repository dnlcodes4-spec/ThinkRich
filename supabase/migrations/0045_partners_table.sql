-- CR-0026 / ADR-0018: partner organisations.
--
-- Additive only. Every existing profile and member row is "core" (partner_id
-- null), and the RLS predicate added in 0046 is a no-op for null = null, so this
-- migration changes no visible behaviour on its own.
--
-- Produces:
--   * enums public.partner_kind ('political', 'community') and
--     public.partner_status ('active', 'inactive')
--   * table public.partners, RLS-enabled, managed only by super_admin (a
--     partner_admin may read its own row for branding)
--   * public.profiles.partner_id / public.members.partner_id (nullable FKs)
--   * private.current_partner_id() -- the caller's profiles.partner_id
--   * freeze triggers: partner_id is write-once (like membership_number)
--   * ceiling triggers: a partner-scoped row's state must sit inside the
--     partner's scope_state_id when that is set
--
-- Ordering note: private.current_partner_id() is defined before the policy that
-- calls it, and the partner_id columns are added before the triggers that read
-- new.partner_id.

-- ─────────── enums ───────────
create type public.partner_kind as enum ('political', 'community');
create type public.partner_status as enum ('active', 'inactive');

-- ─────────── partners ───────────
create table public.partners (
  id             uuid primary key default gen_random_uuid(),
  name           text not null check (length(btrim(name)) between 2 and 120),
  kind           public.partner_kind not null,
  scope_state_id uuid references public.states (id),          -- null = nationwide ceiling
  code           text not null unique check (code ~ '^[A-Z0-9]{2,6}$'),
  logo_url       text,
  status         public.partner_status not null default 'active',
  created_by     uuid not null references auth.users (id),
  created_at     timestamptz not null default now()
);
alter table public.partners enable row level security;

-- ─────────── helper: the caller's partner ───────────
-- Mirrors private.current_state_id() et al. from 0006.
create function private.current_partner_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select partner_id from public.profiles where id = (select auth.uid());
$$;
grant execute on function private.current_partner_id() to anon, authenticated;

-- ─────────── partners policies ───────────
-- super_admin manages partners; nobody else reads or writes the table.
create policy partners_super_all on public.partners
  for all
  using (private.current_user_role() = 'super_admin')
  with check (private.current_user_role() = 'super_admin');
-- a partner_admin may read only their own partner row (for branding / name).
create policy partners_own_select on public.partners
  for select
  using (id = private.current_partner_id());

-- ─────────── partner_id columns ───────────
alter table public.profiles add column partner_id uuid references public.partners (id);
alter table public.members  add column partner_id uuid references public.partners (id);
create index profiles_partner_id_idx on public.profiles (partner_id) where partner_id is not null;
create index members_partner_id_idx  on public.members  (partner_id) where partner_id is not null;

-- ─────────── freeze: partner_id is write-once ───────────
-- partner_id is set once at insert (like membership_number). This trigger blocks
-- any later change to a non-null value. It fires for every role, service_role
-- included; a deliberate super-admin "move" action (a later task) will need to
-- disable this trigger or run under session_replication_role = 'replica'.
create function private.freeze_partner_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.partner_id is not null and new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id is immutable once set';
  end if;
  return new;
end;
$$;
create trigger profiles_freeze_partner_id before update on public.profiles
  for each row execute function private.freeze_partner_id();
create trigger members_freeze_partner_id before update on public.members
  for each row execute function private.freeze_partner_id();

-- ─────────── ceiling: a partner row sits inside the partner's scope ───────────
-- v1 ceiling is state-level: if the partner declares a scope_state_id, every
-- profile/member carrying that partner_id must be in that state.
create function private.enforce_partner_ceiling()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ceiling uuid;
begin
  if new.partner_id is null then return new; end if;
  select scope_state_id into ceiling from public.partners where id = new.partner_id;
  if ceiling is not null and new.state_id is distinct from ceiling then
    raise exception 'row state % is outside partner ceiling %', new.state_id, ceiling;
  end if;
  return new;
end;
$$;
create trigger profiles_partner_ceiling before insert or update on public.profiles
  for each row execute function private.enforce_partner_ceiling();
create trigger members_partner_ceiling before insert or update on public.members
  for each row execute function private.enforce_partner_ceiling();
