-- CR-0002: "Unit" means "Polling Unit". Correct the geography so a polling unit is
-- a child of a ward (State -> LGA -> Ward -> Polling Unit), replacing the earlier
-- units (2+ wards) / unit_wards model. All four affected tables are empty (only the
-- 37 states are seeded), so no data is moved.

drop table if exists public.unit_wards;
drop table if exists public.units;

create table public.polling_units (
  id uuid primary key default gen_random_uuid(),
  ward_id uuid not null references public.wards (id) on delete restrict,
  name text not null,
  code text,                                  -- optional PU code (e.g. INEC), for agent allocation
  created_at timestamptz not null default now(),
  unique (ward_id, name)
);
create index polling_units_ward_id_idx on public.polling_units (ward_id);

-- Reference data: world-readable; writes only via the service role (authoritative import).
alter table public.polling_units enable row level security;
create policy geography_readable on public.polling_units for select using (true);
