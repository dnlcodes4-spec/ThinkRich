-- Geography reference data: states -> lgas -> wards, plus units (a unit groups
-- 2+ wards). This is reference data: world-readable, and written only by the
-- service role (migrations / authoritative import). No client write policies.

create table public.states (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  code text not null unique,                 -- 2-letter; used in membership numbers
  is_active boolean not null default false,  -- active once a State Admin is assigned
  created_at timestamptz not null default now()
);

create table public.lgas (
  id uuid primary key default gen_random_uuid(),
  state_id uuid not null references public.states (id) on delete restrict,
  name text not null,
  code text not null,                         -- short code; used in membership numbers
  created_at timestamptz not null default now(),
  unique (state_id, name),
  unique (state_id, code)
);
create index lgas_state_id_idx on public.lgas (state_id);

create table public.wards (
  id uuid primary key default gen_random_uuid(),
  lga_id uuid not null references public.lgas (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  unique (lga_id, name)
);
create index wards_lga_id_idx on public.wards (lga_id);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  lga_id uuid not null references public.lgas (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  unique (lga_id, name)
);
create index units_lga_id_idx on public.units (lga_id);

-- A unit = 2+ wards (join table).
create table public.unit_wards (
  unit_id uuid not null references public.units (id) on delete cascade,
  ward_id uuid not null references public.wards (id) on delete cascade,
  primary key (unit_id, ward_id)
);
create index unit_wards_ward_id_idx on public.unit_wards (ward_id);

-- Row-Level Security: reference data is readable by everyone; only the service
-- role (which bypasses RLS) may write it via migrations/import.
alter table public.states enable row level security;
alter table public.lgas enable row level security;
alter table public.wards enable row level security;
alter table public.units enable row level security;
alter table public.unit_wards enable row level security;

create policy geography_readable on public.states for select using (true);
create policy geography_readable on public.lgas for select using (true);
create policy geography_readable on public.wards for select using (true);
create policy geography_readable on public.units for select using (true);
create policy geography_readable on public.unit_wards for select using (true);
