-- KYM codes are minted by the database, not by whoever remembers to (T-038, CR-0009 §3.6).
--
-- `leader_kym_codes` held ZERO rows against fourteen profiles. Nothing ever minted
-- a code: a leader had to find /app/kym and press "Generate my code" themselves.
-- Nobody did, so every verification attempt correctly returned "not verified",
-- which is what the client reported as "leader verification is not functional".
--
-- The fix is a trigger rather than a call in `createAccount`, because there are
-- three ways a profile is born and only one of them goes through that action:
-- the provisioning UI, the dev-only national-admin bootstrap page (ADR-0012), and
-- the production SQL seed. A helper the app must remember to call would be missed
-- by two of the three. The database is the only place that sees all of them.

-- ─────────── code generation ───────────
-- Same alphabet the app used: no 0/O or 1/I, because these get read aloud and
-- copied off a screen in the field. 32^9 ≈ 3.5e13 codes, so collisions are rare
-- and handled rather than designed against.
create or replace function private.gen_kym_code()
returns text language plpgsql volatile set search_path = '' as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..9 loop
    if i = 4 or i = 7 then result := result || '-'; end if;
    result := result || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return result;  -- XXX-XXX-XXX
end;
$$;

-- SECURITY DEFINER because `leader_kym_codes` has a SELECT policy and no INSERT
-- policy at all: nobody may write it directly, which is the point. Minting is the
-- database's job, so only the database does it.
--
-- The retry loop exists for code collisions. `on conflict (leader_id) do nothing`
-- covers the other race (two callers minting for the same profile at once), and
-- makes this idempotent, which is what lets the trigger and the backfill share it.
create or replace function private.ensure_kym_code(p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare attempt int;
begin
  if exists (select 1 from public.leader_kym_codes where leader_id = p_profile_id) then
    return;
  end if;
  for attempt in 1..8 loop
    begin
      insert into public.leader_kym_codes (leader_id, code)
        values (p_profile_id, private.gen_kym_code())
        on conflict (leader_id) do nothing;
      return;
    exception when unique_violation then
      -- code collided with an existing one; draw again
    end;
  end loop;
  raise warning 'could not mint a KYM code for profile % after 8 attempts', p_profile_id;
end;
$$;

-- ─────────── mint on provisioning ───────────
-- Members are excluded: KYM answers "is this person a real leader in the
-- movement", so a code for a member would assert something untrue.
--
-- Deliberately does NOT fail the insert. A profile without a code is a degraded
-- account, recoverable from /app/kym; a provisioning call that fails because of
-- verification plumbing is a worse outcome than a missing code.
create or replace function private.mint_kym_code()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.role <> 'member' then
    perform private.ensure_kym_code(new.id);
  end if;
  return new;
end;
$$;

create trigger profiles_mint_kym_code
  after insert on public.profiles
  for each row execute function private.mint_kym_code();

-- A profile promoted INTO a leadership role (CR-0009 §3.3) needs a code too, and
-- it arrives as an update rather than an insert.
create trigger profiles_mint_kym_code_on_promotion
  after update of role on public.profiles
  for each row when (old.role = 'member' and new.role <> 'member')
  execute function private.mint_kym_code();

-- ─────────── backfill everyone who should already have had one ───────────
select private.ensure_kym_code(id) from public.profiles where role <> 'member';
