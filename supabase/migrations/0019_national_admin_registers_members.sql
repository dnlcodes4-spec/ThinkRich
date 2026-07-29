-- The National Coordinator can register a member directly (T-033, CR-0007 §4a).
--
-- Until now `members_insert` admitted only a `leader`, writing into their own
-- polling unit. That was the last place the national admin was scoped, and the
-- client asked for it to go.
--
-- Two things have to move together:
--   1. the insert policy, to admit the national admin anywhere;
--   2. the ≤10 capacity rule, which counted by `registered_by` regardless of who
--      that was, and so would have capped the national admin at ten members.

-- ─────────── the cap describes LEADERS, not registrars ───────────
-- The invariant, and this function's own error message, is "a leader may hold at
-- most 10 active members". An admin registering directly is not a leader, so the
-- rule does not describe them. Attributing a member TO a leader still counts
-- against that leader, which is the behaviour we want to keep.
create or replace function private.enforce_leader_capacity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  active_count int;
  registrar_role public.user_role;
begin
  if new.status = 'active' then
    select role into registrar_role from public.profiles where id = new.registered_by;
    if registrar_role = 'leader' then
      select count(*) into active_count
        from public.members m
        where m.registered_by = new.registered_by and m.status = 'active' and m.id <> new.id;
      if active_count >= 10 then
        raise exception 'Leader capacity exceeded: a leader may hold at most 10 active members';
      end if;
    end if;
  end if;
  return new;
end;
$$;

-- ─────────── who may insert a member ───────────
-- A leader: only themselves, only into their own polling unit (unchanged).
-- A national admin: anywhere, attributing the member either to themselves or to
-- a leader who actually sits in that polling unit. The second form keeps the
-- member inside the leadership chain, which is the norm; the first is the escape
-- hatch for a polling unit that has no leader yet.
--
-- Geography consistency (pu ∈ ward ∈ lga ∈ state) is still enforced separately by
-- the members_geography trigger, so it is not repeated here.
drop policy members_insert on public.members;

create policy members_insert on public.members for insert with check (
  (
    private.current_user_role() = 'leader'
    and registered_by = (select auth.uid())
    and polling_unit_id = private.current_polling_unit_id()
  )
  or (
    private.current_user_role() = 'national_admin'
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
