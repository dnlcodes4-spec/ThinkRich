-- Candidates + member voting view (T-007). Per data-model.md: a candidate has a
-- `level` (presidential / state / lg) with matching geography. A member sees the
-- presidential candidate + the candidate for their state + their LGA. Admins
-- manage the candidate for their own scope (national -> presidential, state admin
-- -> their state, LG admin -> their LGA). NOTE: the office taxonomy + fields here
-- follow the documented model; the client should confirm the exact set.

create type public.candidate_level as enum ('presidential', 'state', 'lg');

create table public.candidates (
  id uuid primary key default gen_random_uuid(),
  level public.candidate_level not null,
  state_id uuid references public.states (id) on delete cascade,
  lga_id uuid references public.lgas (id) on delete cascade,
  full_name text not null,
  party text,
  running_mate text,
  slogan text,
  photo_url text, -- object path in the public `candidate-photos` bucket
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidates_scope_matches_level check (
    (level = 'presidential' and state_id is null and lga_id is null)
    or (level = 'state' and state_id is not null and lga_id is null)
    or (level = 'lg' and state_id is not null and lga_id is not null)
  )
);

-- One endorsed candidate per scope (MVP).
create unique index candidates_one_presidential on public.candidates ((level)) where level = 'presidential';
create unique index candidates_one_per_state on public.candidates (state_id) where level = 'state';
create unique index candidates_one_per_lga on public.candidates (lga_id) where level = 'lg';
create index candidates_level_idx on public.candidates (level);

alter table public.candidates enable row level security;

-- Campaign content is meant to be seen: any signed-in user may read candidates
-- (the app shows each member only the ones relevant to their geography). Writes
-- go through service-role Server Actions that re-check the caller's scope, so
-- there are no write policies.
create policy candidates_select on public.candidates for select using (
  (select auth.uid()) is not null
);

-- Public bucket for candidate photos (campaign images are public, not PII).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('candidate-photos', 'candidate-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
