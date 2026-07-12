# ADR-0003: Use Supabase for database, auth, and storage

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

The platform needs: a relational store for a hierarchical domain (states → LGAs → wards →
units, members, admins); authentication with sessions; file storage for profile photos and
membership-card assets; and — critically — a way to enforce a strict, hierarchical
**authorization** model. We are a small team optimizing for delivery speed without
sacrificing a solid security posture.

## Decision

We will use **Supabase** (managed Postgres + Auth + Storage) as the backend. Postgres holds
the relational model; Supabase Auth provides identity/sessions (integrated via
`@supabase/ssr`); Supabase Storage holds photos and card assets. Authorization is enforced
with Postgres **Row-Level Security** (detailed in [ADR-0005](0005-rls-as-authorization-boundary.md)).

## Options considered

1. **Supabase (chosen)** — Postgres + Auth + Storage + RLS in one managed product; fast to
   stand up; SQL and standard Postgres (portable). Cost: a managed dependency.
2. **Self-managed Postgres + Prisma + custom auth** — maximum control, but we build and
   maintain auth, storage, and access-control plumbing ourselves — slower, more risk.
3. **Firebase / Firestore** — quick auth, but a document model fits our relational,
   hierarchical data poorly and lacks SQL/RLS.

## Consequences

- **Positive:** relational model matches the domain; RLS gives DB-level authorization;
  auth + storage included; standard Postgres keeps us portable if we ever self-host.
- **Positive:** less bespoke security code to write and get wrong.
- **Negative / obligations:**
  - The **service-role key bypasses RLS** and must remain server-only ([security-model.md](../security-model.md)).
  - We depend on a managed provider's availability and pricing.
  - Team must be fluent in Postgres RLS to write correct policies (this is a feature, but a learning cost).
- Schema and policies live in `supabase/migrations/`; the human-readable model is
  [data-model.md](../data-model.md).
