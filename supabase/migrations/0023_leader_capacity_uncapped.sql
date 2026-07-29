-- Leaders are no longer capped at ten members (T-040, CR-0009 §3.4).
--
-- The client: "Leaders aren't capped to just 10 member registration, they can
-- register more, but once they reach 10, there has to be a congratulations
-- message on their dashboard."
--
-- So ten stops being a ceiling and becomes a milestone. The dashboard badge is
-- application code (T-041); this migration removes the enforcement.
--
-- Note what this does NOT change: `registered_by` still attributes every member
-- to whoever registered them, and every count in the product still keys on it.
-- Only the ceiling goes.
--
-- ROLLBACK IS NOT SYMMETRIC. Re-creating this trigger later does not un-register
-- anyone: it blocks new inserts, so any leader already above ten would simply be
-- frozen at their current count. Restoring the cap is a product decision with a
-- data cleanup attached, not a revert.

drop trigger if exists members_leader_capacity on public.members;
drop function if exists private.enforce_leader_capacity();
