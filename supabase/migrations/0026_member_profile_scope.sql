-- Member profiles carry scope (T-045, CR-0009 §3.3, ADR-0015).
--
-- THIS CLOSES A LIVE RLS HOLE, not just a missing feature.
--
-- `provisionMemberLogin` creates a `profiles` row with role='member' and no
-- geography, which `profiles_scope_matches_role` permits. But `profiles_select`
-- and `profiles_update` both delegate to
-- `private.profile_in_scope(id, state_id, lga_id, ward_id, polling_unit_id)`,
-- which for a unit coordinator evaluates `null = current_polling_unit_id()` ->
-- NULL -> not true, and `p_id = auth.uid()` is false for anyone else.
--
-- So today NO ADMIN CAN READ OR WRITE ANY MEMBER PROFILE. Verified on the live
-- project 2026-07-29: both role='member' profiles had all four scope columns
-- null, while all twelve admin/leader profiles carried theirs. Two consequences:
-- member profiles are invisible on the Team page, and promotion (an UPDATE of
-- profiles.role) is refused for everyone.
--
-- The fix is to make the policy's inputs correct rather than to loosen the
-- policy. Nothing here changes who may see what; it fills in columns that should
-- never have been empty.

-- ─────────── backfill from the membership record ───────────
-- The member's own `members` row is the source of truth for where they are. Only
-- profiles linked to a member row can be filled; a member profile with no
-- members row is not a case the app creates.
update public.profiles p
   set state_id        = m.state_id,
       lga_id          = m.lga_id,
       ward_id         = m.ward_id,
       polling_unit_id = m.polling_unit_id
  from public.members m
 where m.user_id = p.id
   and p.role = 'member'
   and p.polling_unit_id is null;

-- ─────────── keep them in step ───────────
-- Linking a member row to a login must also stamp the profile's scope, or the
-- next member provisioned reintroduces the hole. Doing it in the database rather
-- than in `provisionMemberLogin` means the dev bootstrap page and any future
-- caller get it too, the same reasoning as the KYM trigger in 0021.
--
-- SECURITY DEFINER because it writes a profile row the caller may not yet be able
-- to see (that is precisely the state being repaired).
create or replace function private.sync_member_profile_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is not null then
    update public.profiles
       set state_id        = new.state_id,
           lga_id          = new.lga_id,
           ward_id         = new.ward_id,
           polling_unit_id = new.polling_unit_id
     where id = new.user_id
       and role = 'member';   -- never touch a leadership profile's own scope
  end if;
  return new;
end;
$$;

create trigger members_sync_profile_scope
  after insert or update of user_id, state_id, lga_id, ward_id, polling_unit_id
  on public.members
  for each row execute function private.sync_member_profile_scope();
