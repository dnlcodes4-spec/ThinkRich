-- voter_ids ON CONFLICT RLS trap.
--
-- `voter_ids` has only ever had an INSERT policy (0024, tightened in 0029/0037/
-- 0038); 0029 dropped the SELECT policy outright and it was never recreated, so
-- there has never been a way to read this table via RLS, and there has never
-- been an UPDATE policy either. Registration legitimately needs to write a VIN
-- that may already have a row (the same person can hold both a membership
-- record and a leadership profile, ADR-0015), which used to go through
-- `INSERT ... ON CONFLICT (vin) DO UPDATE`.
--
-- Both flavours of ON CONFLICT need to resolve whether the conflicting row is
-- visible to the caller before deciding what to do with it, and RLS gates that
-- on the SELECT policy that doesn't exist here -- so DO UPDATE *and* DO NOTHING
-- are both refused with insufficient_privilege. A registrar re-submitting an
-- existing VIN got a Postgres error that the app then reported as "enter the
-- 19-character number", even though the VIN was perfectly valid.
--
-- A plain INSERT with no ON CONFLICT clause sidesteps this entirely: it never
-- looks at the existing row under RLS, so a duplicate raises an ordinary 23505
-- unique_violation instead, which register/actions.ts now catches directly.
--
-- Runs in one transaction and ROLLS BACK. Run via `supabase db execute` / psql
-- or the Supabase MCP.

begin;

create or replace function pg_temp.as_user(uid text)
returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
end;
$$;

insert into auth.users (id, instance_id, aud, role, email) values
  ('f1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vi-na@test.dev');

insert into public.voter_ids (vin) values
  ('VI00000000000000001'),  -- the admin's own VIN, for profiles_vin_required
  ('VI00000000000000002'); -- the VIN under test: already exists before every attempt below

insert into public.profiles (id, role, full_name, vin_id) values
  ('f1000000-0000-0000-0000-000000000001','national_admin','VI Admin','VI00000000000000001');

select pg_temp.as_user('f1000000-0000-0000-0000-000000000001');

-- ── the trap, part 1: DO UPDATE on a row that already exists is refused ──
do $$
begin
  insert into public.voter_ids (vin) values ('VI00000000000000002')
    on conflict (vin) do update set vin = excluded.vin;
  raise exception 'FAIL: DO UPDATE on an existing voter_ids row should have been refused by RLS (no UPDATE or SELECT policy exists)';
exception when insufficient_privilege then
  null; -- expected
end;
$$;

-- ── the trap, part 2: DO NOTHING is refused too, for the same reason (no
--    SELECT policy to resolve the conflict against) ──
do $$
begin
  insert into public.voter_ids (vin) values ('VI00000000000000002')
    on conflict (vin) do nothing;
  raise exception 'FAIL: DO NOTHING on an existing voter_ids row should have been refused by RLS (no SELECT policy exists)';
exception when insufficient_privilege then
  null; -- expected
end;
$$;

-- ── the fix: a plain insert with no ON CONFLICT clause never consults RLS
--    about the existing row, so a duplicate raises a normal unique_violation ──
do $$
begin
  insert into public.voter_ids (vin) values ('VI00000000000000002');
  raise exception 'FAIL: inserting a duplicate vin should have raised unique_violation';
exception when unique_violation then
  null; -- expected: register/actions.ts treats code 23505 here as "already exists, fine"
end;
$$;

reset role;

rollback;
