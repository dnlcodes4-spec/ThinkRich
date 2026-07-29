-- Gender on members (T-047, CR-0009 §3.5).
--
-- Needed only because the approved membership card prints a GENDER line. Recorded
-- plainly: this adds a new category of personal data we did not previously hold,
-- collected for one purpose, so it is nullable and erasable like the rest of the
-- PII on this table (see 0009's deletion design).

create type public.gender as enum ('male', 'female');

alter table public.members add column gender public.gender;

comment on column public.members.gender is
  'Collected for the membership card''s GENDER line (CR-0009 §3.5). Nullable: '
  'members registered before this column exists render a blank line until they '
  'supply it through the change_requests flow.';
