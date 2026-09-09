-- CR-0026 Chunk B: move a rank-and-file member between partitions.
--
-- partner_id (0048) and membership_number (0006) are both frozen on UPDATE. A
-- deliberate super-admin "move" is the one sanctioned exception. Rather than
-- drop those guards, they yield to a transaction-local flag that only
-- public.move_member_to_partition sets:
--
--     set_config('app.partition_move', 'on', true)    -- true = transaction-local
--
-- current_setting('app.partition_move', true) returns NULL when unset (not an
-- error), so every normal write is unaffected. set_config(..., true) is
-- transaction-local (not statement-local), so the RPC turns the flag back off
-- right after its two UPDATEs, scoping the bypass to exactly those.
--
-- enforce_partner_ceiling is NOT bypassed: a move must still land inside the
-- destination ceiling. Both freeze functions live in `private` (0006, 0048); the
-- trigger on members.membership_number calls private.prevent_membership_number_change.
--
-- Rollback: re-apply the pre-0056 bodies of the two `private` functions from git
-- and `drop function public.move_member_to_partition(uuid, uuid)`. No schema or
-- data change; members already moved keep their reissued numbers, correctly.

-- ─────────── freeze_partner_id yields to a partition move ───────────
create or replace function private.freeze_partner_id()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.partition_move', true) = 'on' then
    return new;
  end if;
  if new.partner_id is distinct from old.partner_id then
    raise exception 'partner_id is set at insert and never changed by update';
  end if;
  return new;
end;
$$;

-- ─────────── membership_number immutability yields to a partition move ───────────
create or replace function private.prevent_membership_number_change()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_setting('app.partition_move', true) = 'on' then
    return new;
  end if;
  if new.membership_number is distinct from old.membership_number then
    raise exception 'membership_number is immutable and cannot be changed';
  end if;
  return new;
end;
$$;

-- ─────────── the move ───────────
create or replace function public.move_member_to_partition(p_member uuid, p_target_partner uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  m             public.members%rowtype;
  login_role    public.user_role;
  s_code        text;
  l_code        text;
  p_code        text;
  ceiling       uuid;
  target_status public.partner_status;
  n             integer;
  new_number    text;
  actor         uuid := (select auth.uid());
  actor_name    text;
  actor_role    public.user_role;
begin
  if private.current_user_role() is distinct from 'super_admin' then
    raise exception 'only a super admin may move a member between organisations';
  end if;

  select * into m from public.members where id = p_member;
  if not found then
    raise exception 'member not found';
  end if;
  if m.status = 'deleted' then
    raise exception 'a removed member cannot be moved';
  end if;
  if m.partner_id is not distinct from p_target_partner then
    raise exception 'that member is already in that organisation';
  end if;

  -- Members only. If this member has a login, its profile must be role 'member'.
  if m.user_id is not null then
    select role into login_role from public.profiles where id = m.user_id;
    if login_role is distinct from 'member' then
      raise exception 'staff accounts cannot be moved with this tool';
    end if;
  end if;

  if p_target_partner is not null then
    select status, scope_state_id into target_status, ceiling
      from public.partners where id = p_target_partner;
    if not found then
      raise exception 'destination organisation not found';
    end if;
    if target_status <> 'active' then
      raise exception 'destination organisation is not active';
    end if;
    if ceiling is not null and m.state_id is distinct from ceiling then
      raise exception 'the member is outside the destination organisation''s state ceiling';
    end if;
  end if;

  -- Mint the destination number (same shape as private.assign_membership_number, 0047).
  select code into s_code from public.states where id = m.state_id;
  select code into l_code from public.lgas   where id = m.lga_id;
  n := private.next_lga_seq(m.lga_id, p_target_partner);
  if p_target_partner is null then
    new_number := format('TWM-%s-%s-%s', s_code, l_code, lpad(n::text, 6, '0'));
  else
    select code into p_code from public.partners where id = p_target_partner;
    new_number := format('TWM-%s-%s-%s-%s', p_code, s_code, l_code, lpad(n::text, 6, '0'));
  end if;

  perform set_config('app.partition_move', 'on', true);
  update public.members
    set partner_id = p_target_partner, membership_number = new_number
    where id = p_member;
  update public.profiles
    set partner_id = p_target_partner
    where id = m.user_id;   -- affects no rows when user_id is null
  perform set_config('app.partition_move', 'off', true);

  -- Audit row in the DESTINATION partition, naming both numbers.
  select full_name, role into actor_name, actor_role from public.profiles where id = actor;
  insert into public.activity_log
    (actor_id, actor_name, actor_role, action, summary, subject_type, subject_id, state_id, partner_id)
  values
    (actor, coalesce(actor_name, 'Unknown'), actor_role, 'member.moved',
     format('Moved %s from %s to %s (%s becomes %s)',
            m.full_name,
            coalesce((select name from public.partners where id = m.partner_id), 'the core movement'),
            coalesce((select name from public.partners where id = p_target_partner), 'the core movement'),
            m.membership_number, new_number),
     'member', p_member, m.state_id, p_target_partner);

  return new_number;
end;
$$;

revoke all on function public.move_member_to_partition(uuid, uuid) from public, anon;
grant execute on function public.move_member_to_partition(uuid, uuid) to authenticated;
