# ADR-0014: One deployment, two origins, split by Host in the proxy

- **Status:** Proposed
- **Date:** 2026-07-29
- **Deciders:** DNLCodess (client-confirmed via [CR-0008](../../project/change-requests/0008-two-origin-split-apex-landing-thinkwinners-subdomain.md))
- **Supersedes / Superseded by:** none. Narrows the PWA scope set by [ADR-0004](0004-pwa-for-members-app.md); extends [ADR-0002](0002-nextjs-16-app-router.md) with a URL topology.

## Context

Until now the product had no domain, so both public surfaces shared one origin and were told apart by path: the ThinkRich Community umbrella landing at `/`, the Think-Winners arm at `/think-winners`, and the members' app at `/app`. That was a consequence of having one deployment, not a considered information architecture.

`thinkrichcommunity.com` was registered on 2026-07-29 (Namecheap DNS, Vercel hosting), and the client has asked for the URL structure to mirror the organizational structure established in [CR-0001](../../project/change-requests/0001-brand-org-structure-and-dual-landing.md): the umbrella owns the main domain and stays a front door for all six arms, while Think-Winners, currently the only arm with a built platform, takes `thinkwinners.thinkrichcommunity.com` for its landing *and* its member app.

The forces at play:

- The two surfaces are **not** independent apps. They share `lib/`, `components/ui/`, the Supabase clients, the design tokens, and one `globals.css`. They differ in palette and display face, both already scoped per subtree.
- **Two pages cannot occupy `/`** in one App Router tree. The umbrella landing is already there, and the Think-Winners landing now needs to be the root of its own origin.
- **Local dev and Vercel previews have no subdomain.** Whatever we do must degrade to a single browsable origin, or every PR preview breaks.
- Service workers and installed PWAs are **origin-scoped**. The manifest currently claims `scope: "/"` and the registrar sits in the root layout, which after a split would run on a marketing site with nothing to install.
- Five more arms may want subdomains later. Whatever we choose should not have to be renegotiated each time.

## Decision

We will serve **both origins from one Vercel project and one build**, and split them on the `Host` header in `proxy.ts`.

- **`thinkrichcommunity.com`** (and `www.`) serves the umbrella landing and nothing else. `/app`, `/login`, `/gallery`, `/dev` and `/think-winners` **307** to the Think-Winners origin.
- **`thinkwinners.thinkrichcommunity.com`** serves the arm. The `/think-winners` subtree **stays where it is on disk** and the proxy **rewrites** it onto that origin's root, so `/` renders the arm's landing and `/organization` renders `/think-winners/organization`. The prefixed URLs 307 to the canonical unprefixed ones, so each page keeps one address. Platform paths (`/app`, `/login`) are **not** rewritten: they keep their real paths and fall through to the existing session handling untouched.
- The split is **configuration, not code**: `NEXT_PUBLIC_APEX_HOST` and `NEXT_PUBLIC_THINK_WINNERS_HOST`. If either is unset the split is a no-op and every surface is reachable on one origin, which is what dev and previews get. Unrecognised hosts (preview URLs) are likewise left unsplit.
- The routing table is a **pure function**, `resolveOriginRoute(pathname, host, hosts)` in [lib/origins.ts](../../../lib/origins.ts), returning `pass | redirect | rewrite`. [lib/origin-split.ts](../../../lib/origin-split.ts) turns its verdict into a `NextResponse`. The same module exports `thinkWinnersHref` / `apexHref`, so cross-origin links are generated from the identical definition of the split rather than a second, drifting copy.
- Redirects are **307, not 308**, until the split is proven in production.
- The **PWA narrows to `/app`**: manifest `scope` and the registrar's scope both move off `/`, and the registrar moves from the root layout into the app shell. The manifest re-brands to Think-Winners navy, since navy is what the installed app opens into.

Host routing is **addressing, not access control**. Authorization remains Postgres RLS ([ADR-0005](0005-rls-as-authorization-boundary.md)); a hostname is never a permission.

## Options considered

1. **One project, host split in the proxy (chosen)** — pros: one build, no shared-code extraction, surfaces cannot drift apart, rollback is an env var, adding an arm later is one more branch in a pure function. Cons: a request-time branch on every navigation; the marketing surface's on-disk path (`/think-winners/*`) no longer matches its public URL, which is a genuine indirection a reader must learn.
2. **Two Vercel projects from one repo** — pros: fully independent deploys, env vars and rollbacks; no host logic at all. Cons: `lib/`, `components/ui/`, the Supabase clients and the tokens would have to be extracted into a shared package or duplicated. That is a significant refactor bought for benefits (independent deploy cadence) that a solo engineer on one product does not currently need. Rejected as premature.
3. **Move the Think-Winners routes to the app-directory root and push the umbrella down a path** — pros: on-disk layout matches the subdomain's URLs, no rewrite. Cons: inverts the problem, since the umbrella then needs a rewrite to occupy the apex root, and it rewrites the *more* permanent surface. Rejected.
4. **Vercel-level redirects/rewrites in `vercel.json`** — pros: no application code, handled at the edge. Cons: the rules would live outside the repo's test suite and outside the type system, could not be exercised by `resolveOriginRoute`'s unit tests, and would not degrade automatically on preview URLs. Rejected: this logic deserves tests.

## Consequences

- **+** URL structure now mirrors the organizational structure, and the umbrella is free to stay a pure front door for all six arms.
- **+** The split is one pure function with a unit-tested routing table, and it is reversible by unsetting two environment variables.
- **+** Cross-origin links and the proxy rewrite are provably inverse: a test asserts it, so a link cannot silently drift from the routing.
- **+** The PWA is now scoped to what is actually installable, and the apex can no longer register a service worker or advertise an install.
- **−** A reader must hold one indirection: the Think-Winners landing lives at `/think-winners` on disk but at `/` on its origin. Mitigated by comments at both ends and by `TW_ROOT` being named once.
- **−** Anything added under a **new** top-level path must be classified: umbrella, platform, or marketing. Forget, and it silently becomes part of the Think-Winners marketing rewrite. `PLATFORM_PREFIXES` is the single place to update, but nothing enforces remembering.
- **−** Asset URLs under `public/think-winners/` collide with the `/think-winners` route subtree. Handled by an extension check in `isPassThroughPath`, which is load-bearing and covered by a test that says so.
- **−** Dev and production now differ in a visible way: locally the surfaces share an origin. Cross-origin bugs (cookies, CORS, absolute links) will not reproduce locally. Preview deploys share this blind spot.
- **Auth is unaffected.** `/login` and `/app` sit on the same origin, so Supabase's host-scoped cookies stay self-contained; no `.thinkrichcommunity.com` cookie domain and no change to [ADR-0011](0011-auth-email-password.md).
- **Follow-ups:** promote the 307s to 308 once stable (CR-0008 §6); revisit option 2 if a second arm ever needs an independent deploy cadence; give the other five arms subdomains through the same mechanism.
