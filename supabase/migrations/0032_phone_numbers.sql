-- Contact phone numbers for everyone (CR-0017 item 1).
--
-- Every admin (profiles) and member (members) now carries a phone number. It is
-- the primary contact channel for grassroots mobilisation and was captured
-- nowhere before.
--
-- Nullable, added expand/contract: existing rows predate the field and stay
-- valid; the app requires it on every NEW write (server-validated, then stored
-- normalised as +234XXXXXXXXXX). A format CHECK is left NOT VALID so the column
-- can be validated once the historical rows are backfilled, mirroring how the VIN
-- columns were introduced (0024).
--
-- Deliberately NOT unique: households and field teams legitimately share a line.

alter table public.profiles add column if not exists phone text;
alter table public.members  add column if not exists phone text;

-- Normalised shape only: a leading +234 and ten subscriber digits starting 7/8/9.
-- NULL is allowed (erasable PII on deleted members, and pre-existing rows).
alter table public.profiles
  add constraint profiles_phone_format
  check (phone is null or phone ~ '^\+234[789]\d{9}$') not valid;

alter table public.members
  add constraint members_phone_format
  check (phone is null or phone ~ '^\+234[789]\d{9}$') not valid;

comment on column public.profiles.phone is
  'E.164 Nigerian number (+234XXXXXXXXXX), normalised in the app. Nullable for '
  'pre-CR-0017 rows; required on new writes. Not unique (shared lines).';
comment on column public.members.phone is
  'E.164 Nigerian number (+234XXXXXXXXXX), normalised in the app. Nullable so '
  'permanent deletion can erase it; required on new registrations. Not unique.';
