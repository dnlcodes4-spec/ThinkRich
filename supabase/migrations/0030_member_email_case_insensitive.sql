-- Member email uniqueness becomes case-insensitive.
--
-- `members_email_unique` has existed since 0007, so exact duplicates were already
-- refused. But it indexes the raw column, and email addresses are not
-- case-sensitive in practice, so `Dupe@Example.com` and `dupe@example.com` were
-- two different keys and both were accepted. Confirmed against the live database:
-- the exact duplicate was blocked, the different-case one went straight through.
--
-- That matters beyond tidiness. `provisionMemberLogin` creates an `auth.users`
-- row from `members.email`, and Supabase Auth treats addresses case-insensitively,
-- so the second member could be registered but could never be given a login: the
-- auth insert would collide and the failure would surface long after registration,
-- against a member record that already looked fine.
--
-- Indexing `lower(email)` makes the database agree with how email actually works.
-- The Server Action lowercases on the way in as well, so what is stored matches
-- what is compared, and the member sees their address as the system will use it.

drop index if exists public.members_email_unique;

create unique index members_email_unique
  on public.members (lower(email))
  where email is not null;

-- Normalise what is already stored so the index and the data agree. No-op on a
-- database whose addresses are already lowercase.
update public.members
   set email = lower(email)
 where email is not null and email <> lower(email);
