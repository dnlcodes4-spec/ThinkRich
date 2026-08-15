-- Admins may add missing wards (self-service ward add; mirrors CR-0018 for wards).
--
-- Like the ~120k polling-unit seed, the ward seed can be incomplete. Until now
-- wards had only the geography_readable SELECT policy, so every write was blocked.
-- This adds a tightly SCOPED insert: a ward is a child of an LGA, so LGA-level and
-- up may create one, only within their own area; national/super anywhere. RLS is
-- the control (ADR-0005); the add-ward action mirrors it and also normalises +
-- dedupes the name. super_admin is admitted beside national (ADR-0017).
--
-- Ward-scoped roles (ward_admin, unit_coordinator) are deliberately NOT admitted:
-- they own a single ward, not the creation of sibling wards.
--
-- No update/delete policy: editing or removing seeded geography stays out of reach.
-- wards already has unique (lga_id, name) and an auto-assigned ward_number trigger,
-- so a duplicate name is refused by the DB and the number needs no client input.

create policy wards_insert on public.wards for insert to authenticated
with check (
  private.current_user_role() in
    ('super_admin', 'national_admin', 'state_admin', 'lg_admin')
  and (
    private.current_user_role() in ('super_admin', 'national_admin')
    or exists (
      select 1
        from public.lgas l
       where l.id = wards.lga_id
         and (private.current_user_role() <> 'state_admin' or l.state_id = private.current_state_id())
         and (private.current_user_role() <> 'lg_admin'    or l.id       = private.current_lga_id())
    )
  )
);
