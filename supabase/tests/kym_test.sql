-- KYM code minting + visibility tests (T-038, CR-0009 §3.6).
-- Asserts that the database mints a code for every leadership profile, never for
-- a member, mints one on promotion, and that the table stays unwritable from the
-- API. Runs in one transaction and ROLLS BACK, so no test data persists.
--
-- Run locally with `supabase db execute` / psql, or via the Supabase MCP.
-- A failed assertion raises an exception; a clean run means all checks passed.

begin;

create or replace function pg_temp.check(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond is distinct from true then
    raise exception 'FAIL: %', label;
  end if;
end;
$$;

-- ── auth users (profiles.id FKs to auth.users) ──
insert into auth.users (id, instance_id, aud, role, email) values
  ('a1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kym-na@test.dev'),
  ('a1000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kym-ld@test.dev'),
  ('a1000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kym-mb@test.dev'),
  ('a1000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','kym-promo@test.dev');

insert into public.states (id, name, code, is_active)
  values ('b1000000-0000-0000-0000-000000000001','Kymstate','KY', true);
insert into public.lgas (id, state_id, name, code)
  values ('c1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','KymLGA','KL1');
insert into public.wards (id, lga_id, name)
  values ('d1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','KymWard');
insert into public.polling_units (id, ward_id, name)
  values ('e1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','KymPU');

-- ─────────────── minting on insert ───────────────
insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id) values
  ('a1000000-0000-0000-0000-000000000001','national_admin','KymNA',null,null,null,null),
  ('a1000000-0000-0000-0000-000000000002','leader','KymLD','b1000000-0000-0000-0000-000000000001','c1000000-0000-0000-0000-000000000001','d1000000-0000-0000-0000-000000000001','e1000000-0000-0000-0000-000000000001'),
  ('a1000000-0000-0000-0000-000000000003','member','KymMB',null,null,null,null),
  ('a1000000-0000-0000-0000-000000000004','member','KymPromo',null,null,null,null);

select pg_temp.check(
  (select count(*) from public.leader_kym_codes
    where leader_id in ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002')) = 2,
  'a national admin and a leader are each minted a code on insert');

select pg_temp.check(
  (select count(*) from public.leader_kym_codes
    where leader_id in ('a1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000004')) = 0,
  'a member is NOT minted a code (KYM asserts leadership, which would be untrue)');

select pg_temp.check(
  (select bool_and(code ~ '^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$')
     from public.leader_kym_codes
    where leader_id in ('a1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000002')),
  'minted codes are XXX-XXX-XXX over the unambiguous alphabet (no 0/O, no 1/I)');

-- ─────────────── minting on promotion (CR-0009 §3.3) ───────────────
update public.profiles set
  role = 'leader',
  state_id = 'b1000000-0000-0000-0000-000000000001',
  lga_id = 'c1000000-0000-0000-0000-000000000001',
  ward_id = 'd1000000-0000-0000-0000-000000000001',
  polling_unit_id = 'e1000000-0000-0000-0000-000000000001'
where id = 'a1000000-0000-0000-0000-000000000004';

select pg_temp.check(
  (select count(*) from public.leader_kym_codes where leader_id = 'a1000000-0000-0000-0000-000000000004') = 1,
  'promoting a member to leader mints their code');

-- ─────────────── idempotence ───────────────
-- The trigger and the backfill share ensure_kym_code, so calling it twice must
-- not mint a second code or raise.
select private.ensure_kym_code('a1000000-0000-0000-0000-000000000002');
select private.ensure_kym_code('a1000000-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) from public.leader_kym_codes where leader_id = 'a1000000-0000-0000-0000-000000000002') = 1,
  'ensure_kym_code is idempotent (one code per person, never a second)');

-- ─────────────── the table is not writable from the API ───────────────
-- leader_kym_codes has a SELECT policy and no INSERT/UPDATE/DELETE policy, so a
-- leader cannot mint themselves a vanity code or overwrite someone else's.
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1000000-0000-0000-0000-000000000002","role":"authenticated"}';

do $$
begin
  insert into public.leader_kym_codes (leader_id, code)
    values ('a1000000-0000-0000-0000-000000000003','AAA-AAA-AAA');
  raise exception 'FAIL: a leader was able to INSERT into leader_kym_codes';
exception when insufficient_privilege then
  null;  -- expected: RLS denies, there is no insert policy
end;
$$;

select pg_temp.check(
  (select count(*) from public.leader_kym_codes) = 1,
  'a leader reads only their OWN code, never anyone else''s');

reset role;

-- ─────────────── everyone who should have a code, has one ───────────────
select pg_temp.check(
  not exists (
    select 1 from public.profiles p
     where p.role <> 'member'
       and not exists (select 1 from public.leader_kym_codes k where k.leader_id = p.id)
  ),
  'no leadership profile anywhere is left without a code');

rollback;
