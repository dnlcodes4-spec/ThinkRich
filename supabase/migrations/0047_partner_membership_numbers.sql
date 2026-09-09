-- CR-0026 / ADR-0018: namespace membership numbers by partner.
--
-- Core members are unchanged: TWM-<STATE>-<LGA>-<seq>, one sequence per LGA.
-- Partner members get TWM-<CODE>-<STATE>-<LGA>-<seq>, where <CODE> is
-- public.partners.code and the sequence is scoped to (partner_id, lga) so each
-- partner's per-LGA numbering starts at 1, independent of the core counter and
-- of every other partner.
--
-- Mechanics: public.lga_member_counters was keyed by lga_id alone. It gains a
-- nullable partner_id and a unique key over (lga_id, coalesce(partner_id, <nil
-- uuid>)) so a null partner collapses to one fixed sentinel and the core row is
-- exactly the pre-migration row. private.next_lga_seq gains a second uuid
-- argument; that is a new signature, not a replacement, so the old 1-arg form is
-- dropped first (private.assign_membership_number is its only caller and is
-- replaced here in the same migration). The trigger function then branches on
-- new.partner_id for the number format.
--
-- Ordering: drop the counter PK -> add partner_id -> create the composite unique
-- key -> drop the 1-arg next_lga_seq -> create the 2-arg next_lga_seq -> replace
-- assign_membership_number -> blanket execute grant on schema private.
--
-- Data note: at write time all 117 numbered members are core (partner_id null),
-- so this migration is behaviour-preserving for existing members.

-- ─────────── re-key the per-LGA counter for (lga, partner) ───────────
alter table public.lga_member_counters drop constraint lga_member_counters_pkey;
alter table public.lga_member_counters add column partner_id uuid references public.partners (id);
create unique index lga_member_counters_key
  on public.lga_member_counters (lga_id, coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid));

-- ─────────── replace the 1-arg sequence generator with the 2-arg form ───────────
-- private.assign_membership_number (replaced below) is the only caller of the
-- 1-arg function, so dropping it here is safe. The new signature keeps
-- security definer and the search_path lockdown; the on conflict target is
-- byte-for-byte the lga_member_counters_key index expression.
drop function private.next_lga_seq(uuid);

create function private.next_lga_seq(p_lga uuid, p_partner uuid default null)
returns integer language sql security definer set search_path = '' as $$
  insert into public.lga_member_counters (lga_id, partner_id, seq) values (p_lga, p_partner, 1)
  on conflict (lga_id, coalesce(partner_id, '00000000-0000-0000-0000-000000000000'::uuid))
  do update set seq = public.lga_member_counters.seq + 1
  returning seq;
$$;

-- ─────────── branch the trigger function on partner_id ───────────
create or replace function private.assign_membership_number()
returns trigger language plpgsql security definer set search_path = '' as $$
declare s_code text; l_code text; p_code text; n integer;
begin
  if new.membership_number is null or new.membership_number = '' then
    select code into s_code from public.states where id = new.state_id;
    select code into l_code from public.lgas   where id = new.lga_id;
    n := private.next_lga_seq(new.lga_id, new.partner_id);
    if new.partner_id is null then
      new.membership_number := format('TWM-%s-%s-%s', s_code, l_code, lpad(n::text, 6, '0'));
    else
      select code into p_code from public.partners where id = new.partner_id;
      new.membership_number := format('TWM-%s-%s-%s-%s', p_code, s_code, l_code, lpad(n::text, 6, '0'));
    end if;
  end if;
  return new;
end;
$$;

-- ─────────── grants (0006 / 0038 pattern) ───────────
grant execute on all functions in schema private to anon, authenticated;
