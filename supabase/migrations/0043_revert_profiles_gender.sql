-- Revert 0042 (CR-0024): the client decided gender should stay a registered-voter
-- demographic, not be captured on staff accounts. No data loss: the column was
-- never populated (staff-gender capture had not shipped). Kept 0042 in history and
-- reverse it here for ledger alignment, per the CR-0019 revert precedent.

alter table public.profiles drop column if exists gender;
