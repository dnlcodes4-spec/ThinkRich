-- A leader holding members cannot be demoted until they are moved (T-049, CR-0009 §3.3).
--
-- The client delegated the demotion rule. Decided: demotion is supported, but the
-- members a leader holds must be moved first, to another leader in the same
-- polling unit or to the demoting admin (0019 already lets an admin hold members
-- directly).
--
-- Why not just let it happen: `members.registered_by` is NOT NULL and ON DELETE
-- RESTRICT, so the members cannot be orphaned; and silently reassigning them
-- would destroy the recruitment history that every count in this product is
-- derived from. Making the admin choose is the honest option.
--
-- Enforced in the database because it is a data-integrity rule, not a UI nicety.
-- WHO may demote is already handled: `profiles_update` checks rank on both the old
-- and the new row, so an admin can only move someone between levels that are both
-- strictly below their own.

create or replace function private.enforce_demotion_reassignment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare held int;
begin
  -- Only a move DOWN the hierarchy, away from 'leader', is a demotion. Promotions
  -- and sideways corrections are untouched.
  if old.role = 'leader' and new.role <> 'leader' then
    select count(*) into held
      from public.members
     where registered_by = old.id and status = 'active';
    if held > 0 then
      raise exception
        'Cannot change this leader''s role while they still hold % active member(s). Move them to another leader first.', held
        using errcode = 'restrict_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_demotion_reassignment
  before update of role on public.profiles
  for each row execute function private.enforce_demotion_reassignment();
