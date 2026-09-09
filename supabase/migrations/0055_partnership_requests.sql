-- CR-0026 follow-up: partner administration tooling.
--
-- 1. partnership_requests: leads from the public "become a partner" form on the
--    Think-Winners landing. The form action writes here with the service role
--    after validation, so there is NO public INSERT policy; only the super admin
--    reads and updates them.
-- 2. A guard on partners.scope_state_id: the ceiling can always widen (to
--    another state or to nationwide) but may not narrow to a state that would
--    leave existing partner members or staff outside it. enforce_partner_ceiling
--    (0045/0046/0049) only fires on members/profiles writes, so the partners-row
--    side needs its own trigger.

-- ─────────── partnership_requests ───────────
create type public.partnership_request_status as enum
  ('new', 'contacted', 'onboarded', 'declined');

create table public.partnership_requests (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) between 2 and 200),
  organization text not null check (length(btrim(organization)) between 2 and 200),
  role_title   text,
  email        text not null,
  phone        text,
  message      text not null check (length(btrim(message)) between 10 and 4000),
  status       public.partnership_request_status not null default 'new',
  partner_id   uuid references public.partners (id) on delete set null,
  handled_by   uuid references auth.users (id),
  handled_at   timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.partnership_requests enable row level security;
create index partnership_requests_status_idx
  on public.partnership_requests (status, created_at desc);

-- Only the super admin. The public form does not touch this table directly.
create policy partnership_requests_super_all on public.partnership_requests
  for all
  using (private.current_user_role() = 'super_admin')
  with check (private.current_user_role() = 'super_admin');

-- ─────────── partners: the ceiling may widen, not strand people ───────────
create function private.enforce_partner_ceiling_widen_only()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.scope_state_id is null
     or new.scope_state_id is not distinct from old.scope_state_id then
    return new;
  end if;
  if exists (
    select 1 from public.members
      where partner_id = new.id
        and status <> 'deleted'
        and state_id is distinct from new.scope_state_id
    union all
    select 1 from public.profiles
      where partner_id = new.id
        and state_id is not null
        and state_id is distinct from new.scope_state_id
  ) then
    raise exception
      'cannot narrow this partner''s ceiling: it has members or staff outside that state'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger partners_ceiling_widen_only
  before update of scope_state_id on public.partners
  for each row execute function private.enforce_partner_ceiling_widen_only();
