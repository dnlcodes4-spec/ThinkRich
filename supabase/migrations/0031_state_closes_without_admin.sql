-- A state closes for registration when its last State Coordinator goes away.
--
-- Found in production: Ogun and Oyo were shown as active on the national map with
-- no State Coordinator and nobody registered. Their coordinators had been created
-- (which activates the state: see app/app/admin/new-account/actions.ts, T-019
-- "active once a State Admin is assigned") and then permanently deleted. Deleting
-- an account only removes the auth user; nothing reversed the activation, so both
-- states sat open for member registration with nobody supervising them.
--
-- The invariant was enforced on one edge only. This closes the other edge.
--
-- Why in the database: `states.is_active` gates member registration
-- (app/app/register/actions.ts), so it is a data-integrity rule, not a UI nicety
-- (AGENTS.md §4). Every path that can vacate the post is covered at once, including
-- the cascade from `auth.users` and any future server action that forgets.
--
-- Deliberately ONE-DIRECTIONAL. The database only ever CLOSES a state; it never
-- opens one. Opening stays an intentional act (assigning a coordinator, or the
-- toggle on /app/admin/states), so a national coordinator can still hold a state
-- shut while it has an admin, or open one ahead of an appointment, without a
-- trigger overruling them. Failing to open is safe; failing to close is not.

-- ─────────────────────────── the rule ───────────────────────────

create or replace function private.close_state_without_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  vacated uuid;
  held    int;
  closed  text;
begin
  -- Which state, if any, just lost a State Coordinator? "Holding the post" is
  -- role = 'state_admin' with any status other than 'inactive': an admin who has
  -- not finished onboarding still holds it, so the state stays open for them.
  if tg_op = 'DELETE' then
    if old.role = 'state_admin' and old.status <> 'inactive' then
      vacated := old.state_id;
    end if;
  elsif old.role = 'state_admin' and old.status <> 'inactive'
        and (new.role <> 'state_admin'
             or new.status = 'inactive'
             or new.state_id is distinct from old.state_id) then
    vacated := old.state_id;
  end if;

  if vacated is null then
    return null;
  end if;

  -- AFTER timing, so the changed row is already gone (DELETE) or already carries
  -- its new role/status/state (UPDATE). Counting the survivors needs no special
  -- case for the row that triggered us.
  select count(*) into held
    from public.profiles p
   where p.state_id = vacated
     and p.role = 'state_admin'
     and p.status <> 'inactive';

  if held > 0 then
    return null;
  end if;

  update public.states set is_active = false
   where id = vacated and is_active
   returning name into closed;

  -- Idempotent: an already-closed state updates no rows and logs nothing. When it
  -- does close, say so in the log. The absence of any such entry is exactly what
  -- made the production case hard to explain.
  if closed is not null then
    insert into public.activity_log
      (actor_id, actor_name, action, summary, subject_type, subject_id, state_id)
    values
      (null, 'System', 'state.deactivated',
       'Closed ' || closed || ' for registration: no State Coordinator remains',
       'state', vacated, vacated);
  end if;

  return null;
end;
$$;

drop trigger if exists profiles_state_admin_vacated on public.profiles;
create trigger profiles_state_admin_vacated
  after update of role, status, state_id or delete on public.profiles
  for each row execute function private.close_state_without_admin();

-- ─────────────────────── reconcile what is already wrong ───────────────────────
-- Closes any state left open with no State Coordinator. At the time of writing
-- that is exactly the two stale rows above. Note this also closes a state a
-- national coordinator had deliberately opened ahead of an appointment; there are
-- none, and re-opening is one click on /app/admin/states.

with closed as (
  update public.states s
     set is_active = false
   where s.is_active
     and not exists (
       select 1 from public.profiles p
       where p.state_id = s.id
         and p.role = 'state_admin'
         and p.status <> 'inactive'
     )
  returning s.id, s.name
)
insert into public.activity_log
  (actor_id, actor_name, action, summary, subject_type, subject_id, state_id)
select
  null, 'System', 'state.deactivated',
  'Closed ' || c.name || ' for registration: no State Coordinator remains',
  'state', c.id, c.id
from closed c;
