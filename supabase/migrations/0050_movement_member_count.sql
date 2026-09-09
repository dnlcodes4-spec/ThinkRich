-- CR-0026 / ADR-0018: the movement's true headline size, across every partition.
-- SECURITY DEFINER so it is NOT filtered by the partner RLS partition: the
-- National dashboard total must count partner members and staff (CR-0026 §1),
-- even though a national_admin cannot see those individual rows. Mirrors the
-- app's existing movementTotal(): non-deleted members, plus staff profiles that
-- have not recorded a membership of their own yet.
create function public.movement_member_count()
returns bigint
language sql stable security definer set search_path = '' as $$
  select
    (select count(*) from public.members where status <> 'deleted')
  + (select count(*) from public.profiles p
       where p.role <> 'member'
         and not exists (
           select 1 from public.members m
           where m.user_id = p.id and m.status <> 'deleted'))
$$;
grant execute on function public.movement_member_count() to anon, authenticated;
