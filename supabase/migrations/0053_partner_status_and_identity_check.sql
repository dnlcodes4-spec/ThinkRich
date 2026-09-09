-- CR-0026 / ADR-0018 follow-ups from the final whole-branch review.
--
-- T-106: partners.status was a switch wired to nothing. Enforce it. A partner
--   with status <> 'active' cannot have new members or staff registered into it;
--   its existing rows stay readable and its members keep their own login and
--   card (CR-0026: "its members remain valid membership records"). Reactivation
--   is instant and lossless because the trigger reads the current status on
--   every insert; nothing is mutated on deactivate. Polling-unit inserts are
--   left alone: a suspended partner with no new members has no use for one, and
--   polling_units carries no partner_id.
--
-- T-107: post-partition, a registrar cannot SELECT a duplicate NIN/VIN that
--   lives in another partition, so the friendly "already registered" message
--   could not tell "already in your world" from "already in another world".
--   identity_registration_status() is SECURITY DEFINER so it can see across the
--   wall, but it only ever returns a coarse bucket, never which world.

-- ─────────── T-106: block writes into an inactive partner ───────────
create function private.partner_active(p uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'active' from public.partners where id = p), true);
$$;
grant execute on function private.partner_active(uuid) to authenticated;

create function private.block_inactive_partner_write()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.partner_id is not null and not private.partner_active(new.partner_id) then
    raise exception 'partner % is inactive; registration into it is suspended', new.partner_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger members_block_inactive_partner before insert on public.members
  for each row execute function private.block_inactive_partner_write();
create trigger profiles_block_inactive_partner before insert on public.profiles
  for each row execute function private.block_inactive_partner_write();

-- ─────────── T-107: cross-partition identity check ───────────
-- 'available'        no member or profile anywhere holds this NIN or VIN
-- 'taken_here'       one does, in the caller's own partition
-- 'taken_elsewhere'  one does, in a different partition (core or another partner)
create function public.identity_registration_status(
  p_nin text default null, p_vin text default null
)
returns text language sql stable security definer set search_path = '' as $$
  with hit as (
    select partner_id from public.members
      where (p_nin is not null and nin = p_nin)
         or (p_vin is not null and vin_id = p_vin)
    union all
    select partner_id from public.profiles
      where p_vin is not null and vin_id = p_vin
  )
  select case
    when not exists (select 1 from hit) then 'available'
    when exists (
      select 1 from hit
      where partner_id is not distinct from private.current_partner_id()
    ) then 'taken_here'
    else 'taken_elsewhere'
  end;
$$;
grant execute on function public.identity_registration_status(text, text) to authenticated;

comment on function public.identity_registration_status(text, text) is
  'Coarse pre-registration check for a NIN or VIN across every partition. '
  'Returns available / taken_here / taken_elsewhere and never reveals which '
  'organisation or member already holds the identity.';
