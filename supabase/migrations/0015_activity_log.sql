-- Activity log (T-0xx): an append-only record of the actions that matter, so a
-- National Coordinator can see what is happening across the platform.
--
-- Design notes:
--  * Actor identity is DENORMALISED (actor_name, actor_role) alongside the FK.
--    The FK goes null if the account is later deleted, but the log must still
--    read correctly, so the name is copied in at write time.
--  * state_id is carried for scoping, so the log can later be exposed to State
--    Coordinators without re-deriving geography from the subject row.
--  * Writes go through the service role only. There is deliberately NO insert
--    policy: nothing holding a user JWT can forge or backdate an entry.

create table if not exists public.activity_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Who did it. Kept readable after the account is gone.
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null,
  actor_role public.user_role,

  -- What happened. `action` is the stable machine key (e.g. 'member.registered');
  -- `summary` is the sentence shown in the UI.
  action text not null,
  summary text not null,

  -- What it happened to.
  subject_type text,
  subject_id uuid,

  -- Where, for scoping and filtering.
  state_id uuid references public.states (id) on delete set null,

  metadata jsonb
);

create index if not exists activity_log_created_at_idx on public.activity_log (created_at desc);
create index if not exists activity_log_action_idx on public.activity_log (action);
create index if not exists activity_log_state_idx on public.activity_log (state_id);

alter table public.activity_log enable row level security;

-- Read: National Coordinators see everything. (State-level read can be added
-- later using state_id; deliberately not granted yet.)
drop policy if exists activity_log_select_national on public.activity_log;
create policy activity_log_select_national
  on public.activity_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'national_admin'
        and p.status = 'active'
    )
  );

-- No insert/update/delete policies: append-only, service-role writes only.
