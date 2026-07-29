-- Elective offices as an admin-editable catalogue (T-026, CR-0007, ADR-0013).
--
-- Replaces the three-value `candidate_level` enum from 0010 with reference data
-- the national admin owns: office types, parties, elections, constituencies. A
-- candidacy is (election, office, constituency-scope, person). Multiple
-- candidacies per race are allowed; the old one-per-scope unique indexes are gone.
--
-- This is NOT a voting system. Nothing here casts or counts a vote. It exists so
-- members can see who has been uploaded as standing in their area.
--
-- `public.candidates` held 0 rows when this was written, so the replacement is
-- destructive on paper only. RLS lands in 0017.

-- ─────────── shared: touch updated_at ───────────
create function private.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ─────────── what geography is a seat elected from? ───────────
-- The single most important type here. `office_types.constituency_kind` declares
-- it, and scope validation, the member-facing resolver and the permission check
-- all branch on this instead of on a hard-coded list of offices.
--
-- The first four resolve against the geography tree we already hold. The last
-- three are the INEC overlay, which does NOT nest in that tree (a federal
-- constituency is built from whole wards and may split a populous LGA).
create type public.constituency_kind as enum (
  'nation',
  'state',
  'lga',
  'ward',
  'senatorial_district',
  'federal_constituency',
  'state_constituency'
);

-- ─────────── office_types ───────────
create table public.office_types (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  title text not null,
  title_plural text not null,
  tier text not null check (tier in ('federal', 'state', 'local')),
  constituency_kind public.constituency_kind not null,
  -- President/VP, Governor/Deputy and Chairman/Vice are one joint ticket with one
  -- vote; the running mate is never separately elected. That is a property of the
  -- office, so it lives here.
  has_running_mate boolean not null default false,
  running_mate_title text,
  seat_count integer,          -- informational: 109 senators, 360 reps, ...
  sort_order integer not null,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint office_types_running_mate_title check (
    (has_running_mate and running_mate_title is not null)
    or (not has_running_mate and running_mate_title is null)
  )
);
create trigger office_types_touch before update on public.office_types
  for each row execute function private.touch_updated_at();

-- ─────────── parties ───────────
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  acronym text not null unique,
  color text,                  -- hex, for the party chip. Optional.
  logo_url text,               -- object path in the `candidate-photos` bucket
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger parties_touch before update on public.parties
  for each row execute function private.touch_updated_at();

-- ─────────── elections ───────────
-- Dates move. The Electoral Act 2026 pulled the 2027 general forward; eight
-- states run off-cycle on their own clocks. So an election is a row an admin can
-- correct, not a constant in code.
create type public.election_scope as enum ('national', 'state');

create table public.elections (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  election_date date not null,
  scope public.election_scope not null,
  state_id uuid references public.states (id) on delete cascade,
  is_active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint elections_scope_matches_state check (
    (scope = 'national' and state_id is null)
    or (scope = 'state' and state_id is not null)
  )
);
create index elections_date_idx on public.elections (election_date);
create trigger elections_touch before update on public.elections
  for each row execute function private.touch_updated_at();

-- Which offices are actually up in a given election (the 16 Jan 2027 poll fills
-- President + NASS; the 6 Feb 2027 poll fills governorships + state assemblies).
create table public.election_office_types (
  election_id uuid not null references public.elections (id) on delete cascade,
  office_type_id uuid not null references public.office_types (id) on delete cascade,
  primary key (election_id, office_type_id)
);

-- ─────────── constituencies (the overlay) ───────────
-- Senatorial districts, federal constituencies and state constituencies. Each
-- lies inside exactly one state (no constituency crosses a state boundary), but
-- none of them nest in the LGA tree, so membership is explicit.
create table public.constituencies (
  id uuid primary key default gen_random_uuid(),
  kind public.constituency_kind not null,
  state_id uuid not null references public.states (id) on delete cascade,
  name text not null,
  code text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint constituencies_kind_is_overlay check (
    kind in ('senatorial_district', 'federal_constituency', 'state_constituency')
  ),
  constraint constituencies_state_kind_name_key unique (state_id, kind, name)
);
-- Lets the membership tables carry `kind` under a composite FK, which turns
-- "one constituency of each kind per ward" into a real unique constraint rather
-- than a racy trigger check.
alter table public.constituencies add constraint constituencies_id_kind_key unique (id, kind);
create index constituencies_state_kind_idx on public.constituencies (state_id, kind);
create trigger constituencies_touch before update on public.constituencies
  for each row execute function private.touch_updated_at();

-- Whole-LGA membership: the common case.
create table public.constituency_lgas (
  constituency_id uuid not null,
  kind public.constituency_kind not null,
  lga_id uuid not null references public.lgas (id) on delete cascade,
  primary key (constituency_id, lga_id),
  foreign key (constituency_id, kind) references public.constituencies (id, kind) on delete cascade,
  constraint constituency_lgas_one_per_kind unique (lga_id, kind)
);
create index constituency_lgas_lga_idx on public.constituency_lgas (lga_id);

-- Ward-level membership: the split case, where a populous LGA is divided between
-- two constituencies. A ward row OVERRIDES its LGA's row for the same kind.
create table public.constituency_wards (
  constituency_id uuid not null,
  kind public.constituency_kind not null,
  ward_id uuid not null references public.wards (id) on delete cascade,
  primary key (constituency_id, ward_id),
  foreign key (constituency_id, kind) references public.constituencies (id, kind) on delete cascade,
  constraint constituency_wards_one_per_kind unique (ward_id, kind)
);
create index constituency_wards_ward_idx on public.constituency_wards (ward_id);

-- Fill `kind` from the parent so callers never have to, and keep the geography
-- honest: a constituency may only claim LGAs/wards inside its own state.
create function private.enforce_constituency_membership()
returns trigger language plpgsql set search_path = '' as $$
declare
  c_state uuid;
  c_kind public.constituency_kind;
  m_state uuid;
begin
  select state_id, kind into c_state, c_kind
    from public.constituencies where id = new.constituency_id;
  new.kind := c_kind;

  if tg_table_name = 'constituency_lgas' then
    select state_id into m_state from public.lgas where id = new.lga_id;
  else
    select l.state_id into m_state
      from public.wards w join public.lgas l on l.id = w.lga_id
      where w.id = new.ward_id;
  end if;

  if m_state is distinct from c_state then
    raise exception 'constituency membership crosses a state boundary';
  end if;
  return new;
end;
$$;
create trigger constituency_lgas_enforce before insert or update on public.constituency_lgas
  for each row execute function private.enforce_constituency_membership();
create trigger constituency_wards_enforce before insert or update on public.constituency_wards
  for each row execute function private.enforce_constituency_membership();

-- ─────────── candidacies ───────────
-- Replaces public.candidates (0 rows). Exactly one scope column is set, decided
-- by the office's constituency_kind and enforced by a trigger.
create table public.candidacies (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  office_type_id uuid not null references public.office_types (id) on delete restrict,

  -- exactly one of these four, per the office's constituency_kind
  state_id uuid references public.states (id) on delete cascade,
  lga_id uuid references public.lgas (id) on delete cascade,
  ward_id uuid references public.wards (id) on delete cascade,
  constituency_id uuid references public.constituencies (id) on delete cascade,

  full_name text not null,
  running_mate_name text,
  party_id uuid references public.parties (id) on delete set null,
  photo_url text,              -- object path in the public `candidate-photos` bucket
  slogan text,
  bio text,

  -- the movement's own pick, where more than one candidate is uploaded for a race
  is_endorsed boolean not null default false,
  -- members only ever see published rows; admins stage before that
  is_published boolean not null default false,
  published_at timestamptz,

  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index candidacies_election_idx on public.candidacies (election_id);
create index candidacies_office_idx on public.candidacies (office_type_id);
create index candidacies_state_idx on public.candidacies (state_id) where state_id is not null;
create index candidacies_lga_idx on public.candidacies (lga_id) where lga_id is not null;
create index candidacies_ward_idx on public.candidacies (ward_id) where ward_id is not null;
create index candidacies_constituency_idx on public.candidacies (constituency_id) where constituency_id is not null;
create index candidacies_published_idx on public.candidacies (is_published) where is_published;
create trigger candidacies_touch before update on public.candidacies
  for each row execute function private.touch_updated_at();

-- The scope column set must match what the office says it is elected from, the
-- constituency's kind must agree, and the running mate must belong to an office
-- that actually has one.
create function private.enforce_candidacy_scope()
returns trigger language plpgsql set search_path = '' as $$
declare
  o_kind public.constituency_kind;
  o_running boolean;
  c_kind public.constituency_kind;
  filled int;
begin
  select constituency_kind, has_running_mate into o_kind, o_running
    from public.office_types where id = new.office_type_id;

  filled := (new.state_id is not null)::int + (new.lga_id is not null)::int
          + (new.ward_id is not null)::int + (new.constituency_id is not null)::int;

  if o_kind = 'nation' then
    if filled <> 0 then raise exception 'a national office takes no geography'; end if;
  elsif o_kind = 'state' then
    if new.state_id is null or filled <> 1 then raise exception 'this office needs exactly a state'; end if;
  elsif o_kind = 'lga' then
    if new.lga_id is null or filled <> 1 then raise exception 'this office needs exactly an LGA'; end if;
  elsif o_kind = 'ward' then
    if new.ward_id is null or filled <> 1 then raise exception 'this office needs exactly a ward'; end if;
  else
    if new.constituency_id is null or filled <> 1 then
      raise exception 'this office needs exactly a constituency';
    end if;
    select kind into c_kind from public.constituencies where id = new.constituency_id;
    if c_kind is distinct from o_kind then
      raise exception 'constituency kind % does not match office kind %', c_kind, o_kind;
    end if;
  end if;

  if not o_running and new.running_mate_name is not null then
    raise exception 'this office has no running mate';
  end if;

  -- keep published_at honest without making the app remember
  if new.is_published and new.published_at is null then
    new.published_at := now();
  elsif not new.is_published then
    new.published_at := null;
  end if;

  return new;
end;
$$;
create trigger candidacies_scope before insert or update on public.candidacies
  for each row execute function private.enforce_candidacy_scope();

-- ─────────── retire the MVP model ───────────
drop table public.candidates;
drop type public.candidate_level;

-- ─────────── seed: office types ───────────
-- The seven offices Nigerians are elected into. Counts are INEC's 2023
-- delimitation. See docs/project/nigeria-elective-offices.md.
insert into public.office_types
  (key, title, title_plural, tier, constituency_kind, has_running_mate, running_mate_title, seat_count, sort_order)
values
  ('president',      'President',                'Presidents',                'federal', 'nation',                true,  'Vice President',   1,    10),
  ('senator',        'Senator',                  'Senators',                  'federal', 'senatorial_district',   false, null,               109,  20),
  ('house_of_reps',  'House of Representatives', 'House of Representatives',  'federal', 'federal_constituency',  false, null,               360,  30),
  ('governor',       'Governor',                 'Governors',                 'state',   'state',                 true,  'Deputy Governor',  36,   40),
  ('state_assembly', 'State House of Assembly',  'State Houses of Assembly',  'state',   'state_constituency',    false, null,               993,  50),
  ('lg_chairman',    'LG Chairman',              'LG Chairmen',               'local',   'lga',                   true,  'Vice Chairman',    774,  60),
  ('councillor',     'Councillor',               'Councillors',               'local',   'ward',                  false, null,               8809, 70)
on conflict (key) do nothing;

-- ─────────── seed: parties ───────────
-- INEC's 21 registered parties as at April 2026 (two, DLA and NDC, were
-- registered 5 Feb 2026). Registration changes between cycles, which is exactly
-- why this is an editable table: the national admin should verify against
-- inecnigeria.org/political-parties before a cycle.
insert into public.parties (name, acronym) values
  ('All Progressives Congress',      'APC'),
  ('Peoples Democratic Party',       'PDP'),
  ('Accord',                         'A'),
  ('Social Democratic Party',        'SDP'),
  ('Labour Party',                   'LP'),
  ('All Progressives Grand Alliance', 'APGA'),
  ('African Democratic Congress',    'ADC'),
  ('Boot Party',                     'BP'),
  ('Action Democratic Party',        'ADP'),
  ('African Action Congress',        'AAC'),
  ('Action Alliance',                'AA'),
  ('National Rescue Movement',       'NRM'),
  ('Zenith Labour Party',            'ZLP'),
  ('New Nigeria Peoples Party',      'NNPP'),
  ('Allied Peoples Movement',        'APM'),
  ('Peoples Redemption Party',       'PRP'),
  ('Action Peoples Party',           'APP'),
  ('Young Progressives Party',       'YPP'),
  ('Youth Party',                    'YP'),
  ('Democratic Leadership Alliance', 'DLA'),
  ('Nigeria Democratic Congress',    'NDC')
on conflict (acronym) do nothing;

-- ─────────── seed: elections ───────────
-- Only the dates we can defend from INEC's revised timetable. Off-cycle polls
-- whose dates INEC has not fixed are left for the national admin to add.
insert into public.elections (name, election_date, scope, state_id, notes) values
  ('2027 General Election: Presidential & National Assembly', '2027-01-16', 'national', null,
   'INEC revised timetable following the Electoral Act 2026.'),
  ('2027 General Election: Governorship & State Houses of Assembly', '2027-02-06', 'national', null,
   'Not held in the eight off-cycle states: Anambra, Bayelsa, Edo, Ekiti, Imo, Kogi, Ondo, Osun.')
on conflict (name) do nothing;

insert into public.elections (name, election_date, scope, state_id, notes)
select '2026 Osun State Governorship', date '2026-08-15', 'state', s.id,
       'Sources conflict: INEC''s May 2025 notice said 8 Aug 2026, later reporting says 15 Aug 2026. VERIFY against inecnigeria.org before publishing.'
from public.states s where s.name = 'Osun'
on conflict (name) do nothing;

-- Which offices each election fills.
insert into public.election_office_types (election_id, office_type_id)
select e.id, o.id
from public.elections e join public.office_types o on true
where (e.name = '2027 General Election: Presidential & National Assembly'
        and o.key in ('president', 'senator', 'house_of_reps'))
   or (e.name = '2027 General Election: Governorship & State Houses of Assembly'
        and o.key in ('governor', 'state_assembly'))
   or (e.name = '2026 Osun State Governorship' and o.key = 'governor')
on conflict do nothing;

-- ─────────── constituencies: deliberately empty ───────────
-- The real INEC delimitation (109 senatorial districts, 360 federal, 993 state,
-- and their ward/LGA membership) is not something we can invent. It is sourced
-- and imported in T-030, to the same standard as docs/project/data. Until then
-- the three overlay office types resolve to no races, which is honest.
