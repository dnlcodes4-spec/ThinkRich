-- CR-0026 / ADR-0018: partner_id is INSERT-only.
--
-- 0045 shipped private.freeze_partner_id() as a write-once guard: it blocked a
-- change only when the OLD value was already non-null, so an existing core row
-- (partner_id null) could still be pulled into a partner by a plain UPDATE
-- null -> value. T-099's allow/deny matrix (assertions 18 and 19) treats any
-- UPDATE of partner_id as forbidden, and that is the intent: a row's partition
-- is fixed at insert.
--
-- This tightens the guard to reject every partner_id change, in either
-- direction, for every role including service_role. A deliberate super_admin
-- "move a row between partitions" action (a later task) must therefore either
-- disable this trigger for its transaction or run under
-- session_replication_role = 'replica'; a plain authenticated UPDATE can never
-- do it.
--
-- Only the function body changes. The two triggers from 0045
-- (profiles_freeze_partner_id, members_freeze_partner_id) stay attached and pick
-- up the new body via create or replace. Same signature, same
-- `language plpgsql set search_path = ''`, same `returns trigger` / `return new`.

create or replace function private.freeze_partner_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id is set at insert and never changed by update';
  end if;
  return new;
end;
$$;
