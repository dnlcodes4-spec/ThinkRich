-- Wall a core national_admin from partner activity_log rows
-- [CR-0026 / ADR-0018, final-review re-verification].
--
-- `activity_log_select_scoped` (0046) gave national_admin AND super_admin an
-- unconditional platform-wide read: the `national_admin` clause carried no
-- partner_id filter, so once FIX 1 made partner staff rows carry a partner_id a
-- core national_admin could read every partition's activity. CR-0026 walls
-- national admins from partner members/staff; only super_admin crosses.
--
-- Reproduces the 0046 policy exactly, changing only the role branch so a
-- national_admin sees partner_id-null rows only. drop + create (the house
-- pattern for changing a policy USING).

drop policy if exists activity_log_select_scoped on public.activity_log;
create policy activity_log_select_scoped
  on public.activity_log
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.status = 'active'
        and (
          p.role = 'super_admin'::public.user_role
          or (p.role = 'national_admin'::public.user_role and activity_log.partner_id is null)
          or (p.role = 'partner_admin'::public.user_role and activity_log.partner_id is not distinct from p.partner_id)
        )
    )
  );
