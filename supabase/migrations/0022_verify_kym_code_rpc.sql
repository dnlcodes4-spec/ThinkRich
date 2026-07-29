-- Verification stops needing the service role (T-038, CR-0009 §3.6 fault 3).
--
-- Looking up someone ELSE's code cannot go through `leader_kym_codes_select`,
-- which deliberately shows you only your own row. The app worked around that with
-- the service-role client, which has two problems: it bypasses RLS for a merely
-- *read-only public* lookup, and on a deploy missing SUPABASE_SERVICE_ROLE_KEY the
-- whole feature 500s (the action never called `isAdminConfigured()`, unlike every
-- other service-role caller in the codebase).
--
-- A SECURITY DEFINER function is the right size of privilege: it can read the
-- table, but it can only ever return the four public-facing fields below. The code
-- column itself is never returned, and no filter but an exact code match is
-- offered, so it cannot be used to enumerate leaders.

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
     and p.role <> 'member';
$$;

-- Signed-in users only. `anon` is deliberately NOT granted: whether an
-- unauthenticated prospect (or a QR code on the membership card) may verify a
-- leader is an open product question in CR-0009 §3.6, and opening it also needs
-- rate limiting, which does not exist yet. Granting it later is one line.
revoke all on function public.verify_kym_code(text) from public, anon;
grant execute on function public.verify_kym_code(text) to authenticated;

-- EXPECTED ADVISOR WARNING: `authenticated_security_definer_function_executable`
-- fires on this function, and should. Being callable by signed-in users over
-- /rest/v1/rpc IS the design: that is how the verify form reaches it without the
-- service role. The warning is worth re-reading if this function ever grows a
-- second parameter or returns a new column, because the safety argument rests
-- entirely on how narrow its output is.
comment on function public.verify_kym_code(text) is
  'Resolve a KYM code to the holder''s public identity (name, role, state, LGA). '
  'Returns no row for an unknown code or an inactive holder. Never returns the code itself. '
  'Restricting WHICH signed-in roles may verify is a product choice enforced in the app, '
  'not a security boundary: every field returned here is already public-facing.';
