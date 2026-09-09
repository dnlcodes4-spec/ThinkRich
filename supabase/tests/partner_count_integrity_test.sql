-- Count-integrity test for the partner partition [CR-0026 / ADR-0018, T-104].
--
-- After 0046 every core geographic admin (incl. national_admin) sits inside the
-- partition guard, so a national_admin's RLS-visible member count excludes
-- partner members. CR-0026 §1 requires the NATIONAL dashboard headline total to
-- still count partner members, while geographic drill-downs correctly do not.
-- Migration 0050 adds public.movement_member_count() (security definer) for the
-- headline; the drill-down stays plain RLS.
--
-- This test asserts BOTH halves:
--   1. movement_member_count() rises by the seeded partner rows (crosses the wall).
--   2. a core national_admin's plain `select count(*) from public.members` does NOT.
--
-- Mirrors supabase/tests/partner_rls_test.sql: one transaction, seeded via
-- auth.users + geography + partners + profiles + voter_ids + members,
-- impersonation via request.jwt.claims. Everything ROLLS BACK.

begin;

do $$
declare
  baseline       bigint;
  baseline_core  bigint;
  got            bigint;
  n              int;
begin
  -- ── auth users ──
  insert into auth.users (id, instance_id, aud, role, email) values
    ('a0000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ci-su@test.dev'),
    ('a0000000-0000-0000-0000-0000000000f2','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ci-na@test.dev'),
    ('a0000000-0000-0000-0000-0000000000f3','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ci-lcore@test.dev'),
    ('a0000000-0000-0000-0000-0000000000f4','00000000-0000-0000-0000-000000000000','authenticated','authenticated','ci-pa@test.dev');

  -- ── geography ──
  insert into public.states (id, name, code, is_active) values
    ('b0000000-0000-0000-0000-0000000000f1','CountTeststate','CT1', true);
  insert into public.lgas (id, state_id, name, code) values
    ('c0000000-0000-0000-0000-0000000000f1','b0000000-0000-0000-0000-0000000000f1','CountLGA','CLG1');
  insert into public.wards (id, lga_id, name) values
    ('d0000000-0000-0000-0000-0000000000f1','c0000000-0000-0000-0000-0000000000f1','CountWard');
  insert into public.polling_units (id, ward_id, name) values
    ('e0000000-0000-0000-0000-0000000000f1','d0000000-0000-0000-0000-0000000000f1','CountPU1');

  -- ── partner: state-scoped to CT1 ──
  insert into public.partners (id, name, kind, scope_state_id, code, created_by) values
    ('a1000000-0000-0000-0000-0000000000f1','Count Partner','political','b0000000-0000-0000-0000-0000000000f1','CP1','a0000000-0000-0000-0000-0000000000f1');

  -- ── profiles: core SU, core NA, core leader (registrant), partner_admin ──
  insert into public.profiles (id, role, full_name, state_id, lga_id, ward_id, polling_unit_id, partner_id, status) values
    ('a0000000-0000-0000-0000-0000000000f1','super_admin',   'ci_SU', null, null, null, null, null, 'frozen'),
    ('a0000000-0000-0000-0000-0000000000f2','national_admin', 'ci_NA', null, null, null, null, null, 'frozen'),
    ('a0000000-0000-0000-0000-0000000000f3','leader',         'ci_L',
        'b0000000-0000-0000-0000-0000000000f1','c0000000-0000-0000-0000-0000000000f1','d0000000-0000-0000-0000-0000000000f1','e0000000-0000-0000-0000-0000000000f1', null, 'frozen'),
    ('a0000000-0000-0000-0000-0000000000f4','partner_admin',  'ci_PA', null, null, null, null, 'a1000000-0000-0000-0000-0000000000f1', 'frozen');

  -- ── voter_ids ──
  insert into public.voter_ids (vin) values
    ('CNTVINCORE000000001'),
    ('CNTVINPARTNER000001');

  -- ── baseline AFTER all profiles are seeded, BEFORE any members ──
  -- Capturing here isolates the member contribution: the seeded staff profiles
  -- (super_admin, national_admin, leader, partner_admin) are all already in
  -- `baseline` as staff-without-membership, so the only thing the two member
  -- inserts below add is +2 (one core, one partner) with no staff-count fudge.
  select public.movement_member_count() into baseline;

  -- ── members: one core, one partner (partner number assigned by the 0047 trigger) ──
  insert into public.members
    (id, membership_number, registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
    ('f0000000-0000-0000-0000-0000000000f1','TWM-CT1-CLG1-090001','a0000000-0000-0000-0000-0000000000f3',
        'b0000000-0000-0000-0000-0000000000f1','c0000000-0000-0000-0000-0000000000f1','d0000000-0000-0000-0000-0000000000f1','e0000000-0000-0000-0000-0000000000f1', null,
        'ci_MemberCore','1990-01-01','CNTNINCORE01','CNTVINCORE000000001');
  insert into public.members
    (id, registered_by, state_id, lga_id, ward_id, polling_unit_id, partner_id, full_name, date_of_birth, nin, vin_id) values
    ('f0000000-0000-0000-0000-0000000000f2','a0000000-0000-0000-0000-0000000000f4',
        'b0000000-0000-0000-0000-0000000000f1','c0000000-0000-0000-0000-0000000000f1','d0000000-0000-0000-0000-0000000000f1','e0000000-0000-0000-0000-0000000000f1','a1000000-0000-0000-0000-0000000000f1',
        'ci_MemberPartner','1990-01-01','CNTNINPTNR01','CNTVINPARTNER000001');

  -- ═══════════ assertion 1: the definer count crosses the partition ═══════════
  -- Both seeded members are counted, including the partner member the caller
  -- (running as the migration owner, not impersonating) could see anyway; the
  -- point is that impersonation in assertion 2 does NOT change this figure.
  select public.movement_member_count() into got;
  if got <> baseline + 2 then
    raise exception 'COUNT FAIL [1]: movement_member_count() = %, expected baseline(%) + 2 (core + partner member)', got, baseline;
  end if;

  -- The definer count is unchanged under a core national_admin's session: it is
  -- SECURITY DEFINER, so RLS does not filter it. This is the CR-0026 §1 headline.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', 'a0000000-0000-0000-0000-0000000000f2')::text, true);
  select public.movement_member_count() into got;
  perform set_config('role', 'none', true);
  if got <> baseline + 2 then
    raise exception 'COUNT FAIL [1b]: movement_member_count() as core national_admin = %, expected baseline(%) + 2', got, baseline;
  end if;

  -- ═══════════ assertion 2: a core national_admin's drill-down does NOT ═══════════
  -- Impersonate the seeded core national_admin. Its RLS-visible members are
  -- core-only (partner_id is not distinct from null), so it must see the seeded
  -- core member but NOT the seeded partner member.
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims',
    json_build_object('sub', 'a0000000-0000-0000-0000-0000000000f2')::text, true);
  select count(*) into baseline_core from public.members
    where status <> 'deleted' and id in (
      'f0000000-0000-0000-0000-0000000000f1','f0000000-0000-0000-0000-0000000000f2');
  select count(*) into n from public.members where id = 'f0000000-0000-0000-0000-0000000000f2';
  perform set_config('role', 'none', true);

  if baseline_core <> 1 then
    raise exception 'COUNT FAIL [2]: core national_admin saw % of the 2 seeded members, expected 1 (core only)', baseline_core;
  end if;
  if n <> 0 then
    raise exception 'COUNT FAIL [2]: core national_admin saw the partner member in its drill-down (% rows)', n;
  end if;

  raise notice 'PARTNER COUNT INTEGRITY OK';
end;
$$;

rollback;
