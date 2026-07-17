-- In-app notifications (T-023). Per-recipient model: one row per (notification,
-- user), so the centre + unread badge are trivial RLS reads (user_id = auth.uid()).
-- Broadcasts fan out to one row per recipient on send. Web Push (Q4) is a later
-- layer that reads the same rows; not in this migration.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null, -- 'announcement' | 'change_request' | 'opt_out' | ... (catalog N1-N8)
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id) where read_at is null;

alter table public.notifications enable row level security;

-- A user reads only their own notifications. Sending and mark-read go through
-- service-role Server Actions (verified in code), so there are no write policies.
create policy notifications_select on public.notifications for select using (
  user_id = (select auth.uid())
);
