# Coding Standards

Conventions that keep the codebase consistent and readable. When in doubt, **match the
surrounding code**. Linting/formatting enforce mechanics; this document covers judgment.

> Framework rule of record: for anything Next.js-specific, consult
> `node_modules/next/dist/docs/` before writing code (per [AGENTS.md](../../AGENTS.md)).
> Next 16 differs from older versions in ways your instincts won't catch.

## Language & tooling

- **TypeScript, `strict` mode.** No implicit `any`; prefer precise types over `any`/`as`.
- **ESLint** (`eslint-config-next`) must pass with zero warnings (`npm run lint`).
- **Formatting** follows the linter/editor config — never hand-format; never mix a formatting
  churn into a feature PR.

## Project structure (App Router)

```
app/
  (public)/        # marketing site + Think-Winners landing
  (member)/        # members' PWA (member + leader tools)
  (admin)/         # admin dashboards
  manifest.ts      # PWA manifest
  layout.tsx
lib/
  supabase/        # server.ts, client.ts, middleware.ts helpers
  auth/            # getUser, requireRole
  validation/      # Zod schemas
  card/            # membership number + card rendering
proxy.ts           # session refresh + route guard (NOT middleware.ts)
supabase/
  migrations/      # SQL schema + RLS policies
public/
  sw.js            # service worker
```

- **Route groups** `(public)`/`(member)`/`(admin)` separate surfaces without affecting URLs.
- **Colocate** route-specific components under the route; promote to `components/` only when shared.

## Next.js 16 conventions (non-negotiable)

- **Await async request APIs**: `params`, `searchParams`, `cookies()`, `headers()` are Promises.
  ```ts
  export default async function Page({ params }: PageProps<'/members/[id]'>) {
    const { id } = await params
  }
  ```
- **Server Components by default.** Add `'use client'` only when you need state, effects, or
  browser APIs — and push it to the smallest leaf component.
- **Mutations via Server Actions** (`'use server'`), always with Zod validation first.
- **Route protection in `proxy.ts`**, not `middleware.ts`.
- **No custom Webpack config** (breaks Turbopack build) without an ADR.

## Naming

| Thing | Convention | Example |
|-------|-----------|---------|
| Files/dirs (routes) | kebab-case | `membership-card/` |
| React components | PascalCase | `MemberCard.tsx` |
| Variables/functions | camelCase | `getMemberById` |
| Types/interfaces | PascalCase | `MemberProfile` |
| Constants | UPPER_SNAKE_CASE | `MAX_MEMBERS_PER_LEADER` |
| DB tables/columns | snake_case | `membership_number` |
| Booleans | `is/has/can` prefix | `isActive`, `canEdit` |

## React / UI

- Prefer small, composable components; one responsibility each.
- Data fetching happens in Server Components; pass data down as props.
- Client Components receive server data via props — don't refetch what the server already has.
- Accessibility: semantic HTML, labels for inputs, keyboard operability. Charts/visuals follow
  the `dataviz` skill guidance when applicable.

## Data & security

- **Validate every input server-side** with Zod, regardless of client validation.
- **Never trust the client for authorization** — rely on RLS + server `requireRole()`
  ([security-model.md](../architecture/security-model.md)).
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` or `VAPID_PRIVATE_KEY` to the browser.
- Keep DB access in `lib/` helpers, not scattered inline.

## Errors & logging

- Fail loudly server-side; return user-friendly messages to the client (no stack traces/PII).
- Use `error.tsx`/`not-found.tsx` route conventions for UI error states.
- Don't swallow errors silently; never `catch {}` without handling or rethrowing.

## Comments & docs

- Comment the **why**, not the **what**. Match the surrounding comment density.
- Update docs/ADRs in the same PR as the change they describe. Docs are code.

## Definition of "good code" here

Small, typed, server-first, validated, authorized at the DB, tested, and consistent with its
neighbors. If a reviewer has to ask "why?", the code or a comment should already answer it.
