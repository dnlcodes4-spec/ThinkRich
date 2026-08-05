-- Coordinators may register members (CR-0017 item 7).
--
-- Until now members_insert (0019) admitted only a `leader` (own polling unit) and
-- the `national_admin` (anywhere). The client wants the coordinator tiers to
-- register too: State, LGA, Ward and Unit coordinators, each strictly within
-- their own scope. RLS is the control (ADR-0005); the register UI mirrors it.
--
-- Containment: check the ONE geography column that names the coordinator's level.
-- The members_geography trigger separately guarantees pu ∈ ward ∈ lga ∈ state, so
-- pinning that one level pins the whole path, no leaks across a sibling area.
--
-- registrar attribution (the "or exists leader in that PU" arm) is identical to
-- the national-admin rule: the member is either held by the registrar directly, or
-- attributed to a leader who actually sits in that polling unit. The ≤10 cap was
-- removed in 0023 (uncapped leaders), so nothing to add there.

drop policy members_insert on public.members;

create policy members_insert on public.members for insert with check (
  -- A leader: only themselves, only into their own polling unit.
  (
    private.current_user_role() = 'leader'
    and registered_by = (select auth.uid())
    and polling_unit_id = private.current_polling_unit_id()
  )
  or (
    -- Admin/coordinator tiers: within their own scope, held by themselves or
    -- attributed to a leader in that polling unit.
    private.current_user_role() in
      ('national_admin', 'state_admin', 'lg_admin', 'ward_admin', 'unit_coordinator')
    and (
      private.current_user_role() = 'national_admin'
      or (private.current_user_role() = 'state_admin' and state_id = private.current_state_id())
      or (private.current_user_role() = 'lg_admin'    and lga_id   = private.current_lga_id())
      or (private.current_user_role() = 'ward_admin'  and ward_id  = private.current_ward_id())
      or (private.current_user_role() = 'unit_coordinator' and polling_unit_id = private.current_polling_unit_id())
    )
    and (
      registered_by = (select auth.uid())
      or exists (
        select 1
          from public.profiles p
         where p.id = members.registered_by
           and p.role = 'leader'
           and p.polling_unit_id = members.polling_unit_id
      )
    )
  )
);
