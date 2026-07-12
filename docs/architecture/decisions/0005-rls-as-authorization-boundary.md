# ADR-0005: Use Postgres Row-Level Security as the authorization boundary

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

The platform's core rule is hierarchical, scoped access to **personal data**: a Leader may
see only their ≤10 members; a State Admin only their state; National sees everything. Getting
this wrong means leaking members' personal information across scopes — the most serious
failure mode of the system. We use Supabase/Postgres ([ADR-0003](0003-supabase-as-backend.md)),
which supports Row-Level Security natively.

The question: **where does authorization live** — in application code, or in the database?

## Decision

We will make **Postgres Row-Level Security (RLS)** the authoritative authorization boundary.
Every table has RLS enabled with policies encoding the role/scope rules. Application layers
(Server Actions, UI) enforce the same rules as **defense in depth**, but the database is the
final arbiter: a bug in the app cannot return rows a user is not entitled to.

## Options considered

1. **RLS as source of truth + app checks as defense in depth (chosen)** — security holds even
   if application code has a bug; rules are centralized next to the data.
2. **Application-only authorization** — all checks in Server Actions/queries. A single missed
   check leaks data; rules are scattered and easy to drift.
3. **A separate authorization service / policy engine** — powerful but over-engineered for
   this scale and duplicates what Postgres already offers.

## Consequences

- **Positive:** strongest guarantee for the highest-risk requirement; centralized, testable
  policies; the service-role path is the only bypass and is server-only.
- **Positive:** UI can safely query with the user's session and trust the DB to scope results.
- **Negative / obligations:**
  - Requires fluency in writing and **testing RLS policies** (policy tests are part of the
    [testing strategy](../../engineering/testing-strategy.md)).
  - The **service-role key bypasses RLS** — its use is restricted to trusted server code and
    reviewed carefully.
  - Policy changes are schema changes: they ship as migrations and get review.
- The UI's role-gating is explicitly **not** a security control (see [security-model.md](../security-model.md)).
