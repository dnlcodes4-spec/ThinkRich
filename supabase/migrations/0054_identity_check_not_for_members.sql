-- Follow-up to 0053 (final-review findings).
--
-- identity_registration_status() is only ever called by a registrar
-- (registerMember needs a registrar role; completeMyMembership rejects
-- role = 'member'). The blanket `grant execute … to authenticated` from 0053
-- therefore also handed every provisioned member login a NIN/VIN existence
-- oracle across the partition wall. Guard the body so a member caller learns
-- nothing, and drop the redundant explicit grant on the private helper (the
-- schema-wide grant in 0047 already covers trigger execution).

create or replace function public.identity_registration_status(
  p_nin text default null, p_vin text default null
)
returns text language sql stable security definer set search_path = '' as $$
  with hit as (
    select partner_id from public.members
      where private.current_user_role() is distinct from 'member'
        and ((p_nin is not null and nin = p_nin)
          or (p_vin is not null and vin_id = p_vin))
    union all
    select partner_id from public.profiles
      where private.current_user_role() is distinct from 'member'
        and p_vin is not null and vin_id = p_vin
  )
  select case
    when private.current_user_role() = 'member' then 'unknown'
    when not exists (select 1 from hit) then 'available'
    when exists (
      select 1 from hit
      where partner_id is not distinct from private.current_partner_id()
    ) then 'taken_here'
    else 'taken_elsewhere'
  end;
$$;

revoke execute on function private.partner_active(uuid) from authenticated;
