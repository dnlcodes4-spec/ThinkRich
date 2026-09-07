-- CR-0026 / ADR-0018: a member's login profile is a pure identity mirror
-- ({id, role, full_name}); it carries no geography by design (see
-- app/app/members/provision-login.ts). 0046 made enforce_partner_ceiling skip
-- partner_admin profiles for the same reason. Extend the skip to member
-- profiles: the geographic ceiling is enforced on the members row itself, and a
-- member login profile must be free to carry only partner_id.
--
-- The body is the 0046 version verbatim apart from the single inner IF line,
-- which grows from `= 'partner_admin'` to `in ('partner_admin', 'member')`. The
-- nested-IF shape is kept deliberately: this one function backs triggers on BOTH
-- profiles and members, members has no `role` column, and PL/pgSQL plans a
-- condition as a whole expression, so a flat `tg_table_name = 'profiles' and
-- new.role in (...)` would fail with "record new has no field role" on the
-- members path (see 0046's note).
create or replace function private.enforce_partner_ceiling()
returns trigger language plpgsql security definer set search_path = '' as $$
declare ceiling uuid;
begin
  if new.partner_id is null then return new; end if;
  if tg_table_name = 'profiles' then
    if new.role in ('partner_admin'::public.user_role, 'member'::public.user_role) then return new; end if;
  end if;
  select scope_state_id into ceiling from public.partners where id = new.partner_id;
  if ceiling is not null and new.state_id is distinct from ceiling then
    raise exception 'row state % is outside partner ceiling %', new.state_id, ceiling;
  end if;
  return new;
end;
$$;
