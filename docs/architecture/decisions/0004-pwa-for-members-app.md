# ADR-0004: Deliver the members' app as a Progressive Web App (PWA)

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

The specification requires the members' app to "work like a phone application," be
installable to the home screen "from any phone or computer browser," with **no app-store
download**, and to send members reminders/notifications (who to vote for, major updates).
The member audience is broad and geographically distributed across Nigeria, so install
friction and app-store gatekeeping matter.

## Decision

We will deliver the members' app as a **Progressive Web App** built with Next.js 16:
a Web App Manifest (`app/manifest.ts`), a service worker (`public/sw.js`), an install prompt,
and **Web Push notifications** via VAPID (`web-push`). We follow the official Next 16 PWA
guide (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md`).

## Options considered

1. **PWA (chosen)** — one codebase with the rest of the platform; installable; push
   notifications; instant updates; no store approval. Cost: iOS push requires the app to be
   installed to the home screen (iOS 16.4+).
2. **Native apps (iOS/Android)** — best OS integration, but separate codebases, store review
   latency, and higher cost — unjustified for the required feature set.
3. **Plain responsive web app (no PWA)** — simplest, but fails the "installable" and
   "notifications" requirements.

## Consequences

- **Positive:** meets the "installable app without app store" requirement with a single
  codebase; updates ship instantly; re-engagement via push.
- **Negative / obligations:**
  - Requires **HTTPS** everywhere (dev via `next dev --experimental-https`).
  - Web Push needs VAPID keys and a service worker; subscriptions are stored per user.
  - iOS notifications only work once the PWA is installed to the home screen — the UI must
    guide iOS users to "Add to Home Screen."
  - Offline write support is **out of scope** for Phase 1 (would require extra tooling/Webpack).
