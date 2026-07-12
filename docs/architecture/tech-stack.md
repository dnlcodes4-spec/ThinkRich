# Technology Stack

The chosen technologies and — more importantly — **why**. Decisions with lasting consequences
are also captured as [ADRs](decisions/); this page is the at-a-glance index.

| Layer | Technology | Version | Rationale / ADR |
|-------|-----------|---------|-----------------|
| Framework | Next.js (App Router) | 16.2.x | Server-first React, one codebase for all surfaces. [ADR-0002](decisions/0002-nextjs-16-app-router.md) |
| UI runtime | React | 19.2.x | Server Components, Actions, `useActionState`. |
| Language | TypeScript | 5.x, `strict` | Type safety across data + UI. |
| Styling | Tailwind CSS | v4 | Utility-first, already scaffolded. |
| Backend / DB | Supabase (Postgres) | managed | DB + Auth + Storage in one; RLS for authz. [ADR-0003](decisions/0003-supabase-as-backend.md) |
| Auth | Supabase Auth + `@supabase/ssr` | latest | Cookie sessions in App Router. |
| Authorization | Postgres Row-Level Security | — | Authoritative access boundary. [ADR-0005](decisions/0005-rls-as-authorization-boundary.md) |
| Validation | Zod | latest | Server-side validation in every Server Action. |
| PWA / push | Web App Manifest + Service Worker + `web-push` (VAPID) | — | Installable members' app. [ADR-0004](decisions/0004-pwa-for-members-app.md) |
| Build/dev | Turbopack | bundled w/ Next 16 | Default in Next 16 (no `--turbo` flag). |
| Package manager | npm | — | Repo already uses `package-lock.json`. |
| Hosting | Vercel (or Node ≥ 20.9 host) | — | Next-native; Supabase is managed separately. |

## Runtime requirements

- **Node.js ≥ 20.9.0** — Next 16 minimum; Node 18 is unsupported.
- Modern browsers for PWA/push (iOS 16.4+ for installed-app push).

## Next.js 16 — things that differ from older versions

These are the traps most likely to bite anyone relying on pre-16 knowledge. Always confirm
against `node_modules/next/dist/docs/` (per [AGENTS.md](../../AGENTS.md)).

- **Async request APIs:** `params`, `searchParams`, `cookies()`, `headers()` return Promises
  and **must be awaited**. Synchronous access is removed.
- **`middleware.ts` → `proxy.ts`:** the convention and the exported function are renamed.
- **Turbopack is the default** bundler for `dev` and `build`. A custom Webpack config will
  **fail** the build unless deliberately opted out (justify in an ADR).
- **Caching APIs changed:** `revalidateTag` now takes a `cacheLife` profile argument;
  `cacheLife`/`cacheTag` are stable (no `unstable_` prefix).
- **`next/image` defaults changed** (qualities `[75]`, `minimumCacheTTL` 4h, local-IP block).

## Deliberately deferred

- Native mobile apps — the PWA covers "installable app" without app stores.
- A separate API service — Server Actions + Route Handlers suffice for Phase 1.
- Offline write support (e.g. Serwist) — evaluate later; requires Webpack config today.
