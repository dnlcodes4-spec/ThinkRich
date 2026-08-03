# CR-0012: Think-Winners social media links (Telegram + WhatsApp)

- **Status:** Captured <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed via the engineer)
- **Date requested:** 2026-08-03
- **Channel:** message
- **Related:** touches the Think-Winners landing built under [CR-0001](0001-brand-org-structure-and-dual-landing.md)/[CR-0008](0008-two-origin-split-apex-landing-thinkwinners-subdomain.md); no ADR

## 1. What the client asked for

> "Include thinkwinners social media page in their landing page and perhaps in the member app as well"
>
> Telegram: https://t.me/+RN9Fxs0-4WBmNDdk
> WhatsApp: https://chat.whatsapp.com/Cmkg0QWIJtiExqVrj0rDzA

## 2. Why — the underlying need

Think-Winners already runs community channels on Telegram and WhatsApp. The landing page is the
public front door for the arm (candidates, partners, prospective members); right now it has no
path from "I'm reading about Think-Winners" to "I'm in the community chat." Surfacing the links
converts landing-page interest directly into the channels the movement actually organizes in.

## 3. Impact analysis

- **Surfaces/flows affected:** Think-Winners landing (`app/think-winners/page.tsx`, currently
  served at `thinkwinners.thinkrichcommunity.com/` per CR-0008), footer section. The member app
  (`/app/*`) impact is **unconfirmed** — see open question below.
- **Data/schema impact:** none. Static outbound links; no table, column, or content-model change.
- **Breaking change?** No. Purely additive.
- **Invariants at risk:** none. No auth, membership, or role-scoping surface touched.
- **Conflicts with spec or another CR?** None directly, but two things need the client's word
  before building (see below) rather than a guess baked into code.
- **Size:** trivial (landing only) to small (if the member app is in scope too).

### Open questions — resolved with the engineer, 2026-08-03

1. **Member app scope — confirmed: yes, on the account page.** Add a "Join our community" block to
   `/app/account`, not the sidebar/bottom-nav (keeps the nav rail unchanged; account page is where
   member-facing informational content already lives).
2. **Umbrella landing — confirmed: Think-Winners only.** The apex (`thinkrichcommunity.com`) stays
   brand-neutral across all six arms per CR-0008; no change to `app/page.tsx`.

## 4. Decision

- **Proceed** on both confirmed surfaces: Think-Winners landing footer, and the `/app/account`
  page in the member app.
- **Not doing:** umbrella landing (`app/page.tsx`) — confirmed out of scope, stays brand-neutral
  per CR-0008.
- **Needs an ADR?** No — pure content/UI addition, no structural or architectural change.

## 5. Plan

Tasks to create on the [task board](../task-board.md):

- [ ] T-058 — Add a "Join the community" row (Telegram + WhatsApp icons/links) to the Think-Winners
      landing footer in `app/think-winners/page.tsx`, styled to the existing navy/gold footer
      (WCAG AA contrast, mobile-first, `rel="noopener noreferrer" target="_blank"` on both). Follow
      the [design system](../../design/README.md) and run the UI Definition of Done before sign-off.
- [ ] T-059 — Add the same links as a "Join our community" block on `/app/account`, styled to the
      app's existing theme tokens (light/dark), `rel="noopener noreferrer" target="_blank"`.

## 6. Rollback plan

Revert commit. No data, no migration, no feature flag needed — a static link block is trivially
removable.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
