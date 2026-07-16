-- Membership lifecycle / opt-out (T-008): active -> frozen -> (active | deleted).
-- A member opts out (freeze); a retention window follows; then a leader/admin either
-- reactivates or permanently deletes (which erases PII but keeps the immutable
-- membership number as a tombstone). See docs/architecture/data-model.md.

-- PII must be erasable on permanent deletion, so relax the NOT NULLs on the
-- identifying columns. Uniqueness on nin stays (a NULL nin is simply not indexed).
alter table public.members alter column nin drop not null;
alter table public.members alter column date_of_birth drop not null;
alter table public.members add column if not exists frozen_at timestamptz;
alter table public.members add column if not exists deleted_at timestamptz;

-- ─────────────────────────── opt-out requests ───────────────────────────
create type public.opt_out_status as enum ('requested', 'frozen', 'deleted', 'reactivated');

create table public.opt_out_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  reason text,
  status public.opt_out_status not null default 'frozen',
  retention_until timestamptz not null,
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index opt_out_requests_member_id_idx on public.opt_out_requests (member_id);
-- At most one OPEN (still-frozen) request per member.
create unique index opt_out_requests_one_open on public.opt_out_requests (member_id)
  where status = 'frozen';

-- ─────────────────────────── status transition guard ───────────────────────────
-- Valid moves only: active->frozen (opt-out), frozen->active (reactivate),
-- frozen->deleted (finalize after retention). 'deleted' is terminal; a direct
-- active->deleted is blocked (must freeze first).
create function private.enforce_member_status_transition()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.status = old.status then
    return new;
  end if;
  if not (
    (old.status = 'active' and new.status = 'frozen')
    or (old.status = 'frozen' and new.status = 'active')
    or (old.status = 'frozen' and new.status = 'deleted')
  ) then
    raise exception 'invalid member status transition: % -> %', old.status, new.status;
  end if;
  return new;
end;
$$;
grant execute on function private.enforce_member_status_transition() to anon, authenticated;

create trigger members_status_transition
  before update of status on public.members
  for each row execute function private.enforce_member_status_transition();

-- ─────────────────────────── RLS ───────────────────────────
alter table public.opt_out_requests enable row level security;

-- Read: the member sees their own; a leader/admin sees requests for members in
-- their scope. Reuses the same visibility rule as the members table itself.
-- Writes happen only through service-role Server Actions (which re-check authz),
-- so there are deliberately no insert/update/delete policies.
create policy opt_out_requests_select on public.opt_out_requests for select using (
  exists (
    select 1 from public.members m
    where m.id = member_id
      and private.member_in_scope(
        m.state_id, m.lga_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id
      )
  )
);
