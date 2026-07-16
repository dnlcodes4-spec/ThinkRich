-- Member detail change-requests (T-006). A member can't edit their core details
-- directly; they request a correction to one field, which a state-level admin
-- reviews. On approval the value is applied to the member row. Photo edits are
-- separate (self-service on the profile, or leader-side upload) and not here.

create type public.change_request_status as enum ('pending', 'approved', 'rejected');

create table public.change_requests (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.members (id) on delete cascade,
  field text not null,
  new_value text not null,
  reason text,
  status public.change_request_status not null default 'pending',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  -- Only correctable, non-structural fields (never nin / membership number / geography).
  constraint change_requests_field_allowed check (
    field in ('full_name', 'date_of_birth', 'vin', 'email', 'account_number', 'account_name', 'bank_name')
  )
);
create index change_requests_member_id_idx on public.change_requests (member_id);
create index change_requests_status_idx on public.change_requests (status);
-- One open request per field per member.
create unique index change_requests_one_pending on public.change_requests (member_id, field) where status = 'pending';

alter table public.change_requests enable row level security;

-- Read: the member sees their own; a leader/admin sees requests for members in
-- their scope (same visibility rule as the members table). Writes (submit +
-- review) go through service-role Server Actions that re-check authz.
create policy change_requests_select on public.change_requests for select using (
  exists (
    select 1 from public.members m
    where m.id = member_id
      and private.member_in_scope(
        m.state_id, m.lga_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id
      )
  )
);
