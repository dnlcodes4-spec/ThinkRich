-- Leader-to-leader verification (KYM, T-010 / N8). Each leader/admin can mint a
-- personal code to share; another leader enters it to confirm they are a real,
-- active leader in the movement (and who + where). One code per person.
create table public.leader_kym_codes (
  id uuid primary key default gen_random_uuid(),
  leader_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.leader_kym_codes enable row level security;

-- A leader reads only their own code. Verification (looking up someone else's
-- code) goes through a service-role Server Action, which returns only that
-- leader's public-facing identity, never the code table itself.
create policy leader_kym_codes_select on public.leader_kym_codes for select using (
  leader_id = (select auth.uid())
);
