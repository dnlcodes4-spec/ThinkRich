# ADR-0012: Bootstrapping the first national admin (dev-only page + prod seed)

- **Status:** Accepted
- **Date:** 2026-07-16
- **Deciders:** DNLCodess
- **Relates to:** [ADR-0005](0005-rls-as-authorization-boundary.md) (RLS boundary),
  [ADR-0011](0011-auth-email-password.md) (email + password), T-015 (next-tier provisioning)

## Context

T-015 lets an admin provision the **next tier down** (National → State → … → Leader). Every tier
is created by the tier above it — except the **national admin**, which has nothing above it. So the
chain has no starting point: a fresh database has zero national admins and no in-app way to make
one. This is the classic bootstrap/chicken-and-egg problem.

Whatever creates that first national admin necessarily uses the **service-role** client (it bypasses
RLS) and cannot require an authenticated caller (there is none yet). That makes it the single most
dangerous surface in the system: anything that can reach it can mint the highest-privilege account.

## Decision

Two separate paths, split by environment so the dangerous surface never exists in production:

1. **Development / staging — a dev-only page** at `/dev/national-admins` that creates, lists, and
   deletes national admins, issuing a generated temporary password. It is gated strictly on
   `process.env.NODE_ENV !== "production"`: in a production build the page returns `notFound()` and
   **every** Server Action it uses refuses to run. It lives **outside `/app`** (the proxy-gated
   area) precisely because bootstrapping must work with no session.

2. **Production — a deliberate one-time seed**, not a page. The first national admin is inserted by
   an operator with database access (SQL or a guarded script: create the `auth.users` row +
   `auth.identities` row + `profiles` row with `role = 'national_admin'`), then that admin uses the
   normal in-app flow for everything below. Managing national admins in prod thereafter is also a
   DBA action, not a UI.

## Options considered

1. **Dev-only page + prod SQL seed (chosen)** — the mint-a-national-admin surface simply does not
   exist in production. Pros: smallest possible attack surface; matches "dev only page." Cons: the
   prod bootstrap is a manual DBA step (acceptable — it happens once).
2. **One page gated by an env flag** (e.g. `ENABLE_BOOTSTRAP=true`), usable in prod for the one-time
   setup then disabled. Rejected: a flag left on in production is an unauthenticated
   national-admin factory. The convenience is not worth that footgun.
3. **Hard-coded super-admin allowlist** — brittle, couples deploys to identities, still ships the
   surface to prod. Rejected.

## Consequences

- **+** No unauthenticated privilege-granting endpoint is ever shipped to production.
- **+** Local/staging can freely reset and re-bootstrap the hierarchy for testing.
- **−** Standing up production requires a documented one-time DBA seed. Captured here and in the
  runbook note in the dev page's source.
- **Guard depth:** the page render **and** each Server Action check the environment independently,
  because Server Actions are invokable without rendering the page. Both use the service-role client
  from `lib/supabase/admin.ts` (never `NEXT_PUBLIC_`).
- **Follow-up:** member login provisioning (a member gets an auth account + `profiles` row with
  `role = 'member'` + a temp password) is a separate task; it reuses the same temp-password helper.
