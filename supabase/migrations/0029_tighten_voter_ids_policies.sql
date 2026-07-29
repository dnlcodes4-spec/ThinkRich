-- Tighten the voter_ids policies (T-043 follow-up, caught by the Supabase advisor).
--
-- 0024 shipped these too loosely and the linter was right:
--
--   * `voter_ids_insert` used WITH CHECK (true), so ANY signed-in user could write
--     arbitrary rows (advisor: rls_policy_always_true).
--   * `voter_ids_select` used USING (true), which the linter tolerates for public
--     reads but is wrong here: it let any member enumerate every voter card number
--     held by the movement. A VIN identifies a real person against INEC's
--     register, so that is a genuine disclosure, not harmless metadata.
--
-- What actually needs access:
--   * INSERT: only the roles that can register a member or provision an account,
--     which is everyone except `member`. Members never register anyone.
--   * SELECT: nothing. No query in the app reads this table. Registration upserts
--     without returning a representation, the duplicate check reads
--     `members.vin_id` / `profiles.vin_id`, and the member detail screen reads
--     `members.vin_id`. Foreign-key validation is performed by the system and is
--     not subject to RLS, so the reference from members/profiles keeps working.
--
-- So the read policy is dropped outright rather than narrowed. If some future
-- surface genuinely needs to read a VIN, it should fail loudly here and be given
-- a policy that states who and why.

drop policy voter_ids_select on public.voter_ids;
drop policy voter_ids_insert on public.voter_ids;

create policy voter_ids_insert on public.voter_ids for insert to authenticated
  with check (private.current_user_role() <> 'member');
