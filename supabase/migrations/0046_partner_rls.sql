-- CR-0026 / ADR-0018: partition the RLS scope engine by partner_id.
--
-- The partition predicate is always `partner_id is not distinct from
-- private.current_partner_id()`, never `=`, so a core caller (partner_id null)
-- matches only core rows and a partner caller matches only that partner's rows.
-- Null never leaks across the boundary as an unknown.
--
-- Role model:
--   * super_admin is unchanged. It still short-circuits to true in both scope
--     functions, i.e. it reads every partition.
--   * partner_admin behaves exactly like national_admin, but only inside its own
--     partition. It shares role_rank 1 with national_admin on purpose: the
--     partition predicate keeps the two apart, rank only orders tiers *within* a
--     partition, and a partner_admin trying to create a national_admin still
--     fails role_rank(1) > role_rank(1) = false.
--   * national_admin and every geography tier below it are unchanged in shape;
--     they simply now sit inside the partition guard, which is a no-op for the
--     core partition where every existing row lives (partner_id null).
--
-- Mechanics: private.member_in_scope and private.profile_in_scope gain a
-- trailing uuid parameter. That is a signature change, so they must be dropped
-- and recreated, and Postgres refuses to drop a function while any policy
-- depends on it. Seven policies depend on them (five on members/profiles plus
-- change_requests_select from 0011 and opt_out_requests_select from 0009), so
-- all seven are dropped first and recreated afterwards.
--
-- Ordering: role_rank (replace in place) -> drop 7 policies -> drop 2 functions
-- by their old signatures -> create 2 functions with the new signature ->
-- recreate 7 policies -> alter the two insert policies -> swap the profiles
-- scope CHECK -> activity_log column + policy.
--
-- Data note: at write time every profiles/members row is core (partner_id null),
-- so this migration is behaviour-preserving for existing users.

-- ─────────── role_rank: add the partner_admin arm ───────────
-- Already exists (0040) and is referenced by profiles_insert / profiles_update,
-- so it cannot be dropped. Replace in place with the identical signature.
create or replace function private.role_rank(r public.user_role)
returns int language sql immutable set search_path = '' as $$
  select case r
    when 'super_admin' then 0
    when 'partner_admin' then 1
    when 'national_admin' then 1 when 'state_admin' then 2 when 'lg_admin' then 3
    when 'ward_admin' then 4 when 'unit_coordinator' then 5 when 'leader' then 6
    when 'member' then 7 end;
$$;

-- ─────────── drop the 7 dependent policies ───────────
drop policy members_select on public.members;
drop policy members_update on public.members;
drop policy profiles_select on public.profiles;
drop policy profiles_insert on public.profiles;
drop policy profiles_update on public.profiles;
drop policy change_requests_select on public.change_requests;
drop policy opt_out_requests_select on public.opt_out_requests;

-- ─────────── drop the old scope functions (old signatures, explicitly) ───────────
drop function private.member_in_scope(uuid, uuid, uuid, uuid, uuid, uuid);
drop function private.profile_in_scope(uuid, uuid, uuid, uuid, uuid);

-- ─────────── recreate the scope functions, partitioned ───────────
-- Same volatility, same search_path lockdown, still NOT security definer (they
-- read no tables; they only call the private.current_* helpers, which are).
create function private.member_in_scope(
  m_state uuid, m_lga uuid, m_ward uuid, m_pu uuid, m_registered_by uuid, m_user_id uuid, m_partner uuid
) returns boolean language sql stable set search_path = '' as $$
  select private.current_user_role() = 'super_admin'
  or (
    m_partner is not distinct from private.current_partner_id()
    and case private.current_user_role()
      when 'partner_admin'    then true
      when 'national_admin'   then true
      when 'state_admin'      then m_state = private.current_state_id()
      when 'lg_admin'         then m_lga = private.current_lga_id()
      when 'ward_admin'       then m_ward = private.current_ward_id()
      when 'unit_coordinator' then m_pu = private.current_polling_unit_id()
      when 'leader'           then m_registered_by = (select auth.uid())
      when 'member'           then m_user_id = (select auth.uid())
      else false
    end
  );
$$;

create function private.profile_in_scope(
  p_id uuid, p_state uuid, p_lga uuid, p_ward uuid, p_pu uuid, p_partner uuid
) returns boolean language sql stable set search_path = '' as $$
  select p_id = (select auth.uid())
  or private.current_user_role() = 'super_admin'
  or (
    p_partner is not distinct from private.current_partner_id()
    and case private.current_user_role()
      when 'partner_admin'    then true
      when 'national_admin'   then true
      when 'state_admin'      then p_state = private.current_state_id()
      when 'lg_admin'         then p_lga = private.current_lga_id()
      when 'ward_admin'       then p_ward = private.current_ward_id()
      when 'unit_coordinator' then p_pu = private.current_polling_unit_id()
      else false
    end
  );
$$;

grant execute on function private.member_in_scope(uuid, uuid, uuid, uuid, uuid, uuid, uuid) to anon, authenticated;
grant execute on function private.profile_in_scope(uuid, uuid, uuid, uuid, uuid, uuid) to anon, authenticated;

-- ─────────── recreate the 7 policies against the new signatures ───────────
create policy members_select on public.members for select using (
  private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
);
create policy members_update on public.members for update using (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
) with check (
  private.current_user_role() <> 'member'
  and private.member_in_scope(state_id, lga_id, ward_id, polling_unit_id, registered_by, user_id, partner_id)
);

create policy profiles_select on public.profiles for select using (
  private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);
-- profiles_insert / profiles_update: the 0040 body plus the partition predicate
-- and an explicit "you may not mint a partner_admin unless you are super_admin"
-- guard. The role_rank test already blocks it (rank 1 is not > rank 1), but the
-- explicit clause makes the intent readable and survives future rank changes.
-- Consequence, by design: the partition clause is NOT exempted for super_admin,
-- so a super_admin cannot create or edit a partner-scoped profile through RLS.
-- Partner onboarding writes that profile with the admin (service role) client,
-- which bypasses RLS. See CR-0026 task T-101.
create policy profiles_insert on public.profiles for insert with check (
  private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[])
  and (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and (private.current_user_role() = 'super_admin' or role <> 'super_admin')
  and (private.current_user_role() = 'super_admin' or role <> 'partner_admin')
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);
create policy profiles_update on public.profiles for update using (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
) with check (
  (private.current_user_role() = 'super_admin' or private.role_rank(role) > private.role_rank(private.current_user_role()))
  and (private.current_user_role() = 'super_admin' or role <> 'partner_admin')
  and partner_id is not distinct from private.current_partner_id()
  and private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id, partner_id)
);

-- change_requests / opt_out_requests: identical to 0011 / 0009, with the
-- member's partner_id threaded through as the new 7th argument.
create policy change_requests_select on public.change_requests for select using (
  exists (select 1 from public.members m where m.id = change_requests.member_id
    and private.member_in_scope(m.state_id, m.lga_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id, m.partner_id))
);
create policy opt_out_requests_select on public.opt_out_requests for select using (
  exists (select 1 from public.members m where m.id = opt_out_requests.member_id
    and private.member_in_scope(m.state_id, m.lga_id, m.ward_id, m.polling_unit_id, m.registered_by, m.user_id, m.partner_id))
);

-- ─────────── members_insert: the 0040 body, partitioned ───────────
-- Changes vs 0040: the whole expression is wrapped in the partition predicate;
-- 'partner_admin' joins both role arrays and the "any scope" short-circuit; and
-- the leader-attribution EXISTS additionally requires the leader profile to sit
-- in the same partition as the member row.
alter policy members_insert on public.members with check (
  partner_id is not distinct from private.current_partner_id()
  and (
    ((private.current_user_role() = 'leader'::public.user_role) and (registered_by = (select auth.uid())) and (polling_unit_id = private.current_polling_unit_id()))
    or ((private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[]))
      and ((private.current_user_role() = any (array['super_admin','partner_admin','national_admin']::public.user_role[]))
        or ((private.current_user_role() = 'state_admin'::public.user_role) and (state_id = private.current_state_id()))
        or ((private.current_user_role() = 'lg_admin'::public.user_role) and (lga_id = private.current_lga_id()))
        or ((private.current_user_role() = 'ward_admin'::public.user_role) and (ward_id = private.current_ward_id()))
        or ((private.current_user_role() = 'unit_coordinator'::public.user_role) and (polling_unit_id = private.current_polling_unit_id())))
      and ((registered_by = (select auth.uid()))
        or (exists (select 1 from public.profiles p
              where ((p.id = members.registered_by)
                and (p.role = 'leader'::public.user_role)
                and (p.polling_unit_id = members.polling_unit_id)
                and (p.partner_id is not distinct from members.partner_id))))))
  )
);

-- ─────────── polling_units_insert: the 0040 body, plus a partner ceiling ───────────
-- polling_units is shared geography: it has NO partner_id column and is not
-- getting one. A partner's admins may create polling units only inside their
-- partner's scope_state_id ceiling (null ceiling = nationwide).
--
-- Note the `<> 'partner_admin'` conjunct on the generic branch. Without it that
-- branch, whose tests are all of the form "role <> X or ...", would evaluate to
-- true for a partner_admin against ANY ward and silently defeat the ceiling
-- branch above it. The conjunct is a no-op for every pre-existing role.
alter policy polling_units_insert on public.polling_units with check (
  (private.current_user_role() = any (array['super_admin','partner_admin','national_admin','state_admin','lg_admin','ward_admin','unit_coordinator']::public.user_role[]))
  and ((private.current_user_role() = any (array['super_admin','national_admin']::public.user_role[]))
    or ((private.current_user_role() = 'partner_admin'::public.user_role)
      and (exists (select 1 from ((public.wards w join public.lgas l on ((l.id = w.lga_id)))
          join public.partners pt on ((pt.id = private.current_partner_id())))
        where ((w.id = polling_units.ward_id)
          and ((pt.scope_state_id is null) or (l.state_id = pt.scope_state_id))))))
    or ((private.current_user_role() <> 'partner_admin'::public.user_role)
      and (exists (select 1 from (public.wards w join public.lgas l on ((l.id = w.lga_id)))
        where ((w.id = polling_units.ward_id)
          and ((private.current_user_role() <> 'state_admin'::public.user_role) or (l.state_id = private.current_state_id()))
          and ((private.current_user_role() <> 'lg_admin'::public.user_role) or (w.lga_id = private.current_lga_id()))
          and ((private.current_user_role() <> 'ward_admin'::public.user_role) or (w.id = private.current_ward_id()))
          and ((private.current_user_role() <> 'unit_coordinator'::public.user_role) or (w.id = private.current_ward_id())))))))
);

-- ─────────── the scope CHECK (drop + re-add; a CHECK cannot be ALTERed) ───────────
-- partner_admin carries no geography of its own (like national_admin) but MUST
-- carry a partner_id. super_admin gains the mirror rule: it must carry none.
-- Every other branch is byte-for-byte the 0040 version: they say nothing about
-- partner_id, so a partner's own state_admin / lg_admin / ward_admin /
-- unit_coordinator / leader (geography set AND partner_id set) still validates.
alter table public.profiles drop constraint profiles_scope_matches_role;
alter table public.profiles add constraint profiles_scope_matches_role check (
  case role
    when 'super_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is null)
    when 'partner_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null and partner_id is not null)
    when 'national_admin' then (state_id is null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'state_admin' then (state_id is not null and lga_id is null and ward_id is null and polling_unit_id is null)
    when 'lg_admin' then (state_id is not null and lga_id is not null and ward_id is null and polling_unit_id is null)
    when 'ward_admin' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is null)
    when 'unit_coordinator' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'leader' then (state_id is not null and lga_id is not null and ward_id is not null and polling_unit_id is not null)
    when 'member' then true
    else null::boolean
  end
);

-- ─────────── activity_log: partition the read ───────────
-- national_admin and super_admin keep the platform-wide read they got in 0040.
-- A partner_admin reads only its own partition. The column is added here but
-- nothing writes it yet: the log-writing helper and the INSERT policy are
-- deliberately untouched, so partner-context rows will start carrying a
-- partner_id only once that writer is updated (CR-0026 task T-101). Until then
-- every log row has partner_id null, and `is not distinct from` a partner_admin's
-- non-null partner_id matches nothing, so a partner_admin's log reads empty
-- rather than leaking the core log. That is the safe direction to fail.
alter table public.activity_log add column if not exists partner_id uuid references public.partners (id);

drop policy if exists activity_log_select_national on public.activity_log;
create policy activity_log_select_scoped
  on public.activity_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.status = 'active'
        and (
          p.role = any (array['national_admin','super_admin']::public.user_role[])
          or (p.role = 'partner_admin'::public.user_role and activity_log.partner_id is not distinct from p.partner_id)
        )
    )
  );
