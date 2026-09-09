-- Close two partition gaps found in the final whole-branch review of the
-- partner-organisations feature [CR-0026 / ADR-0018].
--
-- a. public.verify_kym_code() is SECURITY DEFINER and its WHERE clause never
--    mentioned partner_id, so a signed-in partner user could resolve a KYM code
--    belonging to a core leader (or another partner's), and vice versa. Add the
--    partition predicate: super_admin still verifies across every partition,
--    everyone else is confined to their own (core = partner_id null).
--
-- b. profiles_scope_matches_role: the super_admin branch requires
--    partner_id IS NULL, but the national_admin branch says nothing about
--    partner_id. Add `and partner_id is null` to national_admin for symmetry
--    (a national_admin is core by definition, like super_admin).
--
-- Additive, create-or-replace only. The CHECK is drop + re-add (a CHECK cannot
-- be replaced in place); every other branch is byte-for-byte the 0046 version.

-- ─────────── a. verify_kym_code stays inside the caller's partition ───────────
create or replace function public.verify_kym_code(p_code text)
returns table (full_name text, role public.user_role, state_name text, lga_name text)
language sql stable security definer set search_path = '' as $$
  select p.full_name, p.role, s.name, l.name
    from public.leader_kym_codes k
    join public.profiles p on p.id = k.leader_id
    left join public.states s on s.id = p.state_id
    left join public.lgas   l on l.id = p.lga_id
   where k.code = upper(btrim(p_code))
     and p.status = 'active'
     and p.role <> 'member'
     and (private.current_user_role() = 'super_admin'
          or p.partner_id is not distinct from private.current_partner_id());
$$;

revoke all on function public.verify_kym_code(text) from public, anon;
grant execute on function public.verify_kym_code(text) to authenticated;

comment on function public.verify_kym_code(text) is
  'Resolve a KYM code to the holder''s public identity (name, role, state, LGA). '
  'Returns no row for an unknown code or an inactive holder. Never returns the code itself. '
  'Restricting WHICH signed-in roles may verify is a product choice enforced in the app, '
  'not a security boundary: every field returned here is already public-facing.';

-- ─────────── b. profiles_scope_matches_role: national_admin is core too ───────────
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'super_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is null)
    when 'partner_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is not null)
    when 'national_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is null)
    when 'state_admin' then (state_id is not null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'lg_admin' then (state_id is not null and lga_id is not null and ward_id is null and polling_unit_id is null)
    when 'ward_admin' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is null)
    when 'unit_coordinator' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'leader' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'member' then true
    else null::boolean
  end
);
