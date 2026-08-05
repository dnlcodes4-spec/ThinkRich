-- Admins may add missing polling units (CR-0018).
--
-- The INEC seed (~120k units) is incomplete. Until now polling_units had only the
-- geography_readable SELECT policy, so every write was blocked. This adds a
-- tightly SCOPED insert: a coordinator may create a unit only in a ward inside
-- their own area; the national coordinator anywhere. RLS is the control (ADR-0005);
-- the add-unit action mirrors it and also normalises + dedupes the name.
--
-- No update/delete policy: editing or removing seeded geography stays out of reach.
-- No hard unique index here: 3 pre-existing duplicate name-groups exist in the
-- seed and would make the index creation fail; the action enforces a
-- case-insensitive per-ward dedupe instead (see CR-0018 T-065 for the cleanup).

create policy polling_units_insert on public.polling_units for insert to authenticated
with check (
  private.current_user_role() in
    ('national_admin', 'state_admin', 'lg_admin', 'ward_admin', 'unit_coordinator')
  and (
    private.current_user_role() = 'national_admin'
    or exists (
      select 1
        from public.wards w
        join public.lgas l on l.id = w.lga_id
       where w.id = polling_units.ward_id
         and (private.current_user_role() <> 'state_admin' or l.state_id = private.current_state_id())
         and (private.current_user_role() <> 'lg_admin'    or w.lga_id   = private.current_lga_id())
         and (private.current_user_role() <> 'ward_admin'  or w.id       = private.current_ward_id())
         and (private.current_user_role() <> 'unit_coordinator' or w.id  = private.current_ward_id())
    )
  )
);
