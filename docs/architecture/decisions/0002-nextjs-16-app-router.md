# ADR-0002: Use Next.js 16 App Router as the single framework

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

The platform has three surfaces — a public website, an installable members' app, and admin
dashboards — that share domain concepts (roles, geography, members) and should share a data
layer. The repository was scaffolded with Next.js 16.2 + React 19.2. We need server-rendered
pages for the public/marketing site, interactive app-like UX for members, and secure
server-side mutations for administration.

Next.js 16 introduces breaking changes relative to earlier versions (async request APIs,
`middleware`→`proxy`, Turbopack by default), so adopting it is a deliberate commitment.

## Decision

We will build all three surfaces as **one Next.js 16 application using the App Router**,
organized by route groups (`(public)`, `(member)`, `(admin)`). We will use Server Components
by default, Server Actions for mutations, and follow Next 16 conventions verbatim
(consulting `node_modules/next/dist/docs/`, per [AGENTS.md](../../../AGENTS.md)).

## Options considered

1. **Single Next.js 16 App Router app (chosen)** — shared data layer & types, one deploy,
   server-first security. Cost: must respect Next 16 breaking changes.
2. **Separate SPA (e.g. Vite/React) + standalone API** — more moving parts, duplicated types,
   more infra; no benefit at this scale.
3. **Next.js Pages Router** — familiar, but forgoes Server Components/Actions and is the
   legacy path.

## Consequences

- **Positive:** one codebase, shared types and Supabase clients, server-first rendering and
  security, straightforward PWA support.
- **Positive:** Turbopack gives fast dev/build out of the box.
- **Negative / obligations:**
  - Contributors must **await** `params`/`searchParams`/`cookies()`/`headers()` (sync access removed).
  - Route protection uses **`proxy.ts`**, not `middleware.ts`.
  - **No custom Webpack config** without an ADR (would break the Turbopack build).
  - Requires **Node ≥ 20.9**.
- These obligations are codified in [tech-stack.md](../tech-stack.md) and the PR checklist.
