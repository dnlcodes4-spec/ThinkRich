# CR-0008: Two-origin split — apex serves the umbrella landing, Think-Winners moves to a subdomain

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed via the engineer)
- **Date requested:** 2026-07-29
- **Channel:** message, while setting up DNS for the newly acquired domain
- **Related:** amends [CR-0001](0001-brand-org-structure-and-dual-landing.md) (dual landing on one
  origin) · touches [CR-0004](0004-candidate-first-public-landing.md), [CR-0006](0006-thinkrich-root-black-brand.md) ·
  [ADR-0014](../../architecture/decisions/0014-two-origin-host-split.md) · ADR-0004 (PWA)

## 1. What the client asked for

> "The only thing that belongs and should be in the main thinkrichcommunity.com domain should be
> the landing page. All we have built so far, all dashboards and member app, belongs to the
> thinkwinners branch which is thinkwinners.thinkrichcommunity.com"

The domain `thinkrichcommunity.com` was registered on 2026-07-29 (Namecheap DNS, Vercel hosting).
"Branch" here means the **organizational arm**, not a git branch.

So, concretely:

| Origin | Serves |
|--------|--------|
| `thinkrichcommunity.com` | **Only** the ThinkRich Community umbrella landing (`/`) |
| `thinkwinners.thinkrichcommunity.com` | The Think-Winners landing at its root, plus `/login` and every `/app/*` dashboard and member surface |

Decisions confirmed with the engineer at capture time:

- The subdomain root shows the **existing Think-Winners landing** (currently `/think-winners`),
  not a bare login screen. The arm keeps its candidate/partner pitch as its front door.
- **One Vercel project**, both domains attached, host-based routing. Not two projects.
- The apex **keeps one "Member login" link** into the subdomain so existing members can find
  their way in from the main domain.

## 2. Why — the underlying need

CR-0001 established ThinkRich Community as an umbrella with six arms, of which Think-Winners is
one. Until now both surfaces shared a single origin because there was no domain: the umbrella sat
at `/` and the arm at `/think-winners`, an artifact of having one deployment, not a deliberate
information architecture.

Now that the real domain exists, the client wants the URL structure to mirror the *organizational*
structure. The umbrella brand should own the main domain and stay a pure front door for all six
arms. Think-Winners is one arm among six, and it happens to be the only one with a built
platform, so its landing and its member app belong together on their own origin, addressable and
brandable as a unit. This also leaves clean room for the other five arms to get their own
subdomains later without renegotiating the apex.

## 3. Impact analysis

**Surfaces/flows affected:** all three, though only their addressing changes, not their behavior.

| Surface | Today | After |
|---------|-------|-------|
| Umbrella landing | `/` | `thinkrichcommunity.com/` (unchanged path) |
| Think-Winners landing | `/think-winners` | `thinkwinners.…/` (moves to root) |
| Internal org page | `/think-winners/organization` | `thinkwinners.…/organization` |
| Login | `/login` | `thinkwinners.…/login` |
| Member app + all admin dashboards | `/app/*` | `thinkwinners.…/app/*` |
| `/gallery`, `/dev/national-admins` | `/…` | subdomain (they support the arm, not the umbrella) |

All roles are affected equally — member, leader, coordinator, admin, national admin. No role sees
a different set of capabilities; they all reach the app at a new hostname.

**Data/schema impact:** **none.** No migration. This is entirely routing and deployment topology.
No table, column, policy, or seed changes.

**Breaking change?** **Yes, for URLs — and it needs handling in three specific places.**

1. **Bookmarks and saved links.** Anyone with `thinkrichcommunity.com/app` or `/login` saved gets
   a dead path. Mitigation: the apex issues **307 temporary** redirects to the subdomain
   equivalent, held at 307 (not 308) until the split is proven in production. Permanent 308s are
   cached hard by browsers and are painful to walk back.
2. **The PWA.** This is the sharpest edge. Service workers and installed PWAs are **origin-scoped**.
   [app/manifest.ts](../../../app/manifest.ts) declares `start_url: "/app"` with `scope: "/"`, and
   [service-worker-registrar.tsx:10](../../../components/pwa/service-worker-registrar.tsx#L10)
   registers `/sw.js` at scope `/`. After the split:
   - Any PWA installed from the apex origin would point at a `start_url` that no longer exists
     there, and such installs cannot be migrated remotely. **Confirmed with the client on
     2026-07-29: nobody has installed the PWA yet**, so there is no install base to strand and no
     migration path to build. This is precisely the window in which the split is cheap; the cost
     of deferring it rises with the first real install.
   - The registrar is mounted in the **root layout**, so the apex landing currently registers a
     service worker for an app that will not live there. It must become subdomain-only.
   - The manifest is branded "ThinkRich Community" but now describes a Think-Winners surface.
     Its name, description, and `theme_color` should follow the navy brand (ADR-0008), not the
     black umbrella brand (ADR-0010).
3. **Cross-surface links.** Every internal `href` that crosses the new origin boundary must become
   an absolute URL, and one of them **inverts meaning**:
   - Apex → subdomain: [app/page.tsx:145,265,334](../../../app/page.tsx#L145),
     [hero-slider.tsx:32,43](../../../components/marketing/hero-slider.tsx#L32),
     [thinkrich-nav.tsx:73,130](../../../components/marketing/thinkrich-nav.tsx#L73).
   - Subdomain → apex: [nav.tsx:64,155](../../../components/marketing/nav.tsx#L64) currently sends
     `href="/"` back to the umbrella. On the subdomain, `/` **is** Think-Winners, so this link
     would loop back on itself. It must become an absolute link to the apex.
   - [not-configured.tsx:14](../../../components/ui/not-configured.tsx#L14) links to `/app`.

**Invariants at risk:** none of the hard invariants. Membership-number immutability, no-duplicate
registration, and role scoping are all enforced in Postgres RLS (ADR-0005) and are indifferent to
hostname. Worth stating explicitly because the change *looks* auth-adjacent:

- **Supabase auth cookies are host-scoped**, and since `/login` and `/app/*` both land on the
  subdomain, the session is entirely self-contained there. No cross-subdomain cookie sharing, no
  `.thinkrichcommunity.com` cookie domain, no change to the auth model (ADR-0011).
- The apex serves no authenticated surface at all, so it needs no session. The proxy's
  `PROTECTED_PREFIXES` logic in
  [lib/supabase/middleware.ts:7](../../../lib/supabase/middleware.ts#L7) stays exactly as it is;
  host routing wraps around it rather than replacing it.
- **RLS remains the authorization boundary.** Host-based routing is addressing, not access
  control, and must never be described or relied on as a security control.

**Conflicts with spec or another CR?** No contradiction, but it **amends CR-0001**, which specified
"two landing pages, not one site" and was implemented as two paths on one origin. CR-0008 keeps
that intent and gives it a truer expression: two origins. CR-0001's brand and org-structure
content is untouched. CR-0006's black umbrella brand stays on the apex; ADR-0008's navy stays on
the subdomain. The brand-per-subtree split in
[app/think-winners/layout.tsx](../../../app/think-winners/layout.tsx) already does the right thing
and mostly survives, but it must follow the route if `/think-winners` moves to the subdomain root.

**One design question this raises:** dev and preview environments have no subdomain. `localhost:3000`
and `*.vercel.app` preview URLs must keep serving every surface on one origin, or local development
and PR previews break. Host splitting therefore has to be driven by configuration
(e.g. `NEXT_PUBLIC_APEX_HOST` / `NEXT_PUBLIC_TW_HOST`) and become a no-op when unset. That is the
main thing worth getting right, and the main reason this needs an ADR.

**Size:** **small-to-medium.** No schema work and no new features; the cost is in routing, link
rewrites, PWA rescoping, and making the dev/preview story not awful. Roughly one focused branch.

## 4. Decision

- **Proceed.** The request is coherent, matches the org structure the client has described since
  CR-0001, costs no data migration, and is reversible. Doing it now, before real member traffic
  and real PWA installs accumulate, is materially cheaper than doing it later — the PWA
  origin-scoping problem gets worse with every install.
- **Needs an ADR? Yes — [ADR-0014](../../architecture/decisions/0014-two-origin-host-split.md), written.** This sets deployment topology and URL architecture: which
  origin owns which surface, how host routing is expressed, how dev/preview degrade, and where
  the other five arms go when their turn comes. It extends rather than supersedes ADR-0002
  (App Router) and ADR-0004 (PWA); ADR-0004's PWA scope decision is narrowed by it.

## 5. Plan

Tasks to create on the [task board](../task-board.md):

- [x] **T-034** — Host-based routing in `proxy.ts`. Config-driven apex/subdomain resolution that
      no-ops on localhost and previews; apex 307s `/app`, `/login`, `/think-winners` to the
      subdomain; subdomain serves the Think-Winners landing at `/` and 307s the umbrella landing
      to the apex. Tests for the host-matching logic, including the unset-config dev path.
- [x] **T-035** — Move the Think-Winners surface to the subdomain root and fix every cross-origin
      link, including the inverted "back to ThinkRich" link in `nav.tsx`. Keep the per-subtree
      brand tokens intact.
- [x] **T-036** — Rescope the PWA: registrar and manifest become subdomain-only, manifest
      re-branded to Think-Winners (navy), `start_url` and `scope` corrected for the new origin.
      No install base to migrate (confirmed 2026-07-29), so this is a clean redefinition.
- [x] **T-037** — ADR-0014 plus a deployment/DNS runbook under `docs/engineering/`. There is no
      deployment doc in the repo today, and this change is the moment one starts paying for itself.

## 6. Rollback plan

Low-risk to reverse, because nothing is destructive and no data moves.

- **Immediate:** unset `NEXT_PUBLIC_APEX_HOST` / `NEXT_PUBLIC_TW_HOST` in Vercel and redeploy.
  Host splitting no-ops, and every surface is reachable on both origins again, exactly as today.
  This is the reason for making the split config-driven rather than hard-coded, and it doubles as
  the feature flag the change-management process asks for.
- **Full:** revert the merge commit. No down-migration exists or is needed.
- **DNS:** the subdomain CNAME can stay in place harmlessly; removing it is not required to roll back.
- **Caveat:** redirects held at **307** precisely so rollback is clean. A 308 would sit in browser
  caches after the revert and keep sending users to the subdomain. Promote to 308 only after the
  split has been stable in production.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
