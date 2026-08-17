-- Capture gender on staff accounts too (CR-0024), so the Statistics gender
-- breakdown reflects the whole movement, not only the people who hold a full
-- voter record. Additive and nullable: existing staff rows stay valid (their
-- gender reads as "Not recorded"), and the "Give app access" form collects it
-- for every account created from now on. Reuses the existing public.gender enum
-- that members.gender already uses; a person who later completes membership
-- carries gender on both rows, and Statistics counts each person once.

alter table public.profiles add column if not exists gender public.gender;
