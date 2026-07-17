-- Web Push subscriptions (T-010). One row per device/browser endpoint per user.
-- Notifications (T-023) push to these; the SW (public/sw.js) shows them. Payloads
-- carry only title + link, never member PII.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- A user reads only their own subscriptions; subscribe/unsubscribe go through
-- service-role Server Actions (verified in code), so there are no write policies.
create policy push_subscriptions_select on public.push_subscriptions for select using (
  user_id = (select auth.uid())
);
