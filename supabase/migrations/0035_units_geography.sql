-- CR-0019 / ADR-0016: reintroduce "unit" as a grouping of one or more wards, one
-- unit per ward (wards.unit_id), sitting between LGA and Ward. This EXPAND step
-- adds the table and nullable columns only; 0036 backfills, 0037 swaps the role
-- ladder and enforces NOT NULL + the scope CHECK. (Revives the units concept that
-- CR-0002 dropped, now modelled one-to-many rather than many-to-many.)

create table public.units (
  id uuid primary key default gen_random_uuid(),
  lga_id uuid not null references public.lgas (id) on delete restrict,
  name text not null,
  created_at timestamptz not null default now(),
  unique (lga_id, name)
);
create index units_lga_id_idx on public.units (lga_id);

alter table public.units enable row level security;
create policy geography_readable on public.units for select using (true);

-- Nullable now; 0036 backfills every existing row, 0037 tightens.
alter table public.wards    add column unit_id uuid references public.units (id) on delete restrict;
alter table public.profiles add column unit_id uuid references public.units (id) on delete restrict;
alter table public.members  add column unit_id uuid references public.units (id) on delete restrict;
create index wards_unit_id_idx    on public.wards (unit_id);
create index profiles_unit_id_idx on public.profiles (unit_id);
create index members_unit_id_idx  on public.members (unit_id);

-- Client insert of a missing unit, scoped to the caller's LGA (units are an
-- LGA-level grouping; the unit-management screen is the primary create path).
-- Roles here are unchanged by the 0037 rename (national/state/lg survive), so
-- this policy stands across the swap.
create policy units_insert on public.units for insert with check (
  private.current_user_role() in ('national_admin','state_admin','lg_admin')
  and case private.current_user_role()
    when 'national_admin' then true
    when 'state_admin' then exists (
      select 1 from public.lgas l where l.id = lga_id and l.state_id = private.current_state_id()
    )
    when 'lg_admin' then lga_id = private.current_lga_id()
    else false
  end
);
