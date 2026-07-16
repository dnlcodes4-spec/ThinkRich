-- T-004: membership-number generation + capture the member's email.
-- The number format is TWM-<STATE>-<LGA>-<seq> with a per-LGA, zero-padded
-- sequence (data-model.md). Generation is a BEFORE INSERT trigger backed by an
-- atomic per-LGA counter, so concurrent registrations never collide.

-- Email is captured at registration (ADR-0011) and stored here until the member's
-- login account is provisioned. Unique among non-null values.
alter table public.members add column email text;
create unique index members_email_unique on public.members (email) where email is not null;

-- Default '' so the app can insert without the number; the trigger fills it in
-- (and it is immutable thereafter, per 0004).
alter table public.members alter column membership_number set default '';

-- Per-LGA counter (internal; only the SECURITY DEFINER generator writes it).
create table public.lga_member_counters (
  lga_id uuid primary key references public.lgas (id) on delete cascade,
  seq integer not null default 0
);
alter table public.lga_member_counters enable row level security;  -- no policies: locked to service/definer

-- Atomically bump and return the next per-LGA sequence.
create function private.next_lga_seq(p_lga uuid)
returns integer language sql security definer set search_path = '' as $$
  insert into public.lga_member_counters (lga_id, seq) values (p_lga, 1)
  on conflict (lga_id) do update set seq = public.lga_member_counters.seq + 1
  returning seq;
$$;

-- Assign TWM-<STATE>-<LGA>-<seq> on insert when not already set.
create function private.assign_membership_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s_code text; l_code text; n integer;
begin
  if new.membership_number is null or new.membership_number = '' then
    select code into s_code from public.states where id = new.state_id;
    select code into l_code from public.lgas   where id = new.lga_id;
    n := private.next_lga_seq(new.lga_id);
    new.membership_number := format('TWM-%s-%s-%s', s_code, l_code, lpad(n::text, 6, '0'));
  end if;
  return new;
end;
$$;
create trigger members_assign_number
  before insert on public.members
  for each row execute function private.assign_membership_number();

grant execute on function private.next_lga_seq(uuid) to authenticated;
