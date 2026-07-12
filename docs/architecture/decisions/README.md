# Architecture Decision Records (ADRs)

An **ADR** captures a single architecturally significant decision: its context, the choice
made, and its consequences. ADRs are **immutable** once accepted — if a decision changes, we
write a new ADR that supersedes the old one, rather than editing history. This gives future
contributors (and our future selves) the *why* behind the system.

Format based on Michael Nygard's [original ADR pattern](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions).

## When to write one

Write an ADR when a decision:

- is hard or costly to reverse (framework, database, auth model), **or**
- affects the structure, security, or cross-cutting behavior of the system, **or**
- a future contributor would reasonably ask "why did we do it this way?"

Small, local, easily-reversed choices do **not** need an ADR.

## How to add one

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` using the next number.
2. Fill it in; set status to `Proposed`.
3. Open it in a PR (ideally alongside the change it documents).
4. On merge, set status to `Accepted`.

## Statuses

`Proposed` → `Accepted` → (`Deprecated` | `Superseded by ADR-XXXX`)

## Index

| ADR | Title | Status |
|-----|-------|--------|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-nextjs-16-app-router.md) | Use Next.js 16 App Router as the single framework | Accepted |
| [0003](0003-supabase-as-backend.md) | Use Supabase for database, auth, and storage | Accepted |
| [0004](0004-pwa-for-members-app.md) | Deliver the members' app as a PWA | Accepted |
| [0005](0005-rls-as-authorization-boundary.md) | Use Postgres RLS as the authorization boundary | Accepted |
