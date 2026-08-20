-- voter_ids upsert-on-conflict RLS trap.
--
-- `voter_ids` has only ever had an INSERT policy (0024, tightened in 0029/0037/
-- 0038) -- there has never been an UPDATE policy. Registration legitimately
-- upserts a VIN that may already have a row (the same person can hold both a
-- membership record and a leadership profile, ADR-0015), via Postgres
-- `INSERT ... ON CONFLICT (vin) DO UPDATE`. Postgres requires UPDATE privilege
-- on the conflicting row for that clause, which RLS refuses with no UPDATE
-- policy, so a registrar re-submitting an existing VIN got a Postgres error
-- that the app then reported as "enter the 19-character number", even though
-- the VIN was perfectly valid. `ON CONFLICT DO NOTHING` only needs INSERT
-- privilege, which is why register/actions.ts upserts with
-- `ignoreDuplicates: true` rather than the default merge-duplicates.
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

create or replace function pg_temp.check(cond boolean, label text)
returns void language plpgsql as $$
begin
  if cond is distinct from true then raise exception 'FAIL: %', label; end if;
end;
$$;

insert into auth.users (id, instance_id, aud, role, email) values
  ('f1000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','vi-na@test.dev');

insert into public.voter_ids (vin) values
  ('VI00000000000000001'),  -- the admin's own VIN, for profiles_vin_required
  ('VI00000000000000002'); -- the VIN under test: already exists before either upsert

insert into public.profiles (id, role, full_name, vin_id) values
  ('f1000000-0000-0000-0000-000000000001','national_admin','VI Admin','VI00000000000000001');

select pg_temp.as_user('f1000000-0000-0000-0000-000000000001');

-- ── the trap: DO UPDATE on a row that already exists is refused ──
do $$
begin
  insert into public.voter_ids (vin) values ('VI00000000000000002')
    on conflict (vin) do update set vin = excluded.vin;
  raise exception 'FAIL: DO UPDATE on an existing voter_ids row should have been refused by RLS (no UPDATE policy exists)';
exception when insufficient_privilege then
  null; -- expected: this is the bug register/actions.ts used to hit
end;
$$;

-- ── the fix: DO NOTHING only needs INSERT privilege, which the registrar has ──
do $$
begin
  insert into public.voter_ids (vin) values ('VI00000000000000002')
    on conflict (vin) do nothing;
exception when insufficient_privilege then
  raise exception 'FAIL: DO NOTHING on an existing voter_ids row was refused; a registrar re-submitting a known VIN can never register';
end;
$$;

select pg_temp.check(
  (select count(*) from public.voter_ids where vin = 'VI00000000000000002') = 1,
  'the existing row is untouched, no duplicate or error');

reset role;

rollback;
