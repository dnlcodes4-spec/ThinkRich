-- Voter identity gets its own table (T-043, CR-0009 §3.1, ADR-0015).
--
-- The client asked us to "set the VIN column to UNIQUE". That cannot be one
-- constraint, because there would be two columns: admins live in `profiles`,
-- members live in `members`, and one person is legitimately both (a leader has a
-- membership record and a login profile). Postgres has no cross-table unique
-- constraint, and a trigger checking the sibling table is racy: two concurrent
-- transactions each see no conflict and both commit.
--
-- So the VIN itself becomes the primary key of its own table, and both sides
-- reference it. Uniqueness across the whole system is then a PRIMARY KEY, which
-- is as strong as this gets, and the both-rows-one-person case points at the same
-- `voter_ids` row instead of colliding.

create table public.voter_ids (
  vin text primary key,
  created_at timestamptz not null default now(),
  -- Normalisation is enforced HERE, not only in the app. The app strips spaces
  -- and hyphens and uppercases before writing, but if that ever regresses, the
  -- same card entered as "90F5B-05EEB..." and "90F5B05EEB..." would occupy two
  -- rows and the primary key would be worth nothing.
  constraint voter_ids_format check (vin ~ '^[0-9A-Z]{19}$')
);

alter table public.voter_ids enable row level security;

-- Readable by any signed-in user (it holds no personal data on its own: a VIN
-- with no name attached identifies nobody in this table). Writes go through the
-- registration/provisioning paths, which insert the row alongside the member or
-- profile that references it.
create policy voter_ids_select on public.voter_ids for select to authenticated using (true);
create policy voter_ids_insert on public.voter_ids for insert to authenticated with check (true);

-- ─────────── the referencing columns ───────────
-- Nullable, because `members.vin` must stay erasable: migration 0009 dropped the
-- NOT NULLs on nin and date_of_birth precisely so permanent deletion can wipe PII
-- while keeping the membership number as a tombstone. A blanket NOT NULL here
-- would make a deleted member unerasable.
--
-- UNIQUE per table stops two rows in the SAME table claiming one VIN. Combined
-- with the primary key above, that is full system-wide uniqueness.
alter table public.members  add column vin_id text references public.voter_ids (vin) on delete restrict;
alter table public.profiles add column vin_id text references public.voter_ids (vin) on delete restrict;
create unique index members_vin_id_key  on public.members  (vin_id) where vin_id is not null;
create unique index profiles_vin_id_key on public.profiles (vin_id) where vin_id is not null;

-- ─────────── the three fixture rows ───────────
-- Measured 2026-07-29: `members` holds 3 rows, all test data, client-confirmed as
-- having no real members. Two of them share one VIN and none is 19 characters, so
-- none can be migrated into `voter_ids`. Clearing them is correct: they are
-- fixtures, and leaving invalid values behind would block the constraint below.
update public.members set vin = null;

-- ─────────── required, but only where it can be ───────────
-- A live member must carry a VIN. A deleted one must be allowed not to, or
-- erasure breaks. This is why the requirement is a partial CHECK and not NOT NULL.
--
-- Left NOT VALID: the three fixture rows are `active` and now have no VIN, so
-- VALIDATE would fail. They are not deleted here, because deleting client rows to
-- satisfy a constraint is not this migration's call to make, and they are not
-- given placeholder VINs, because inventing voter identity is worse than an
-- ungated fixture. NOT VALID gives exactly the behaviour asked for: every NEW and
-- UPDATED row is checked from this moment.
alter table public.members
  add constraint members_vin_required check (status = 'deleted' or vin_id is not null) not valid;

comment on constraint members_vin_required on public.members is
  'NOT VALID on purpose: enforced for new/updated rows. The 3 pre-existing fixture '
  'members have no valid VIN (two shared one, none was 19 chars). Run VALIDATE once '
  'they are given real VINs or removed.';

-- Profiles: every leadership account must carry a VIN too, which is the actual
-- ask in CR-0009 item 1 ("before registering any admin, include voter card
-- number"). Member profiles are exempt: their VIN lives on the `members` row,
-- and duplicating it would mean two places to keep in step.
alter table public.profiles
  add constraint profiles_vin_required
  check (role = 'member' or status <> 'active' or vin_id is not null) not valid;

-- Deliberately left NOT VALID. The twelve existing admin and leader accounts
-- predate this rule and have no VIN to supply; validating now would fail. New
-- and updated rows are checked from this moment, which is what the client asked
-- for. Run `alter table public.profiles validate constraint profiles_vin_required`
-- once the existing accounts have supplied theirs.
comment on constraint profiles_vin_required on public.profiles is
  'NOT VALID on purpose: enforced for new/updated rows, while the 12 pre-existing '
  'admin accounts still lack a VIN. VALIDATE once they have supplied one.';
