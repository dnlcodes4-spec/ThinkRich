# ADR-0009: Type system — Zodiak (display) + Hanken Grotesk (body), replacing Geist

- **Status:** Accepted
- **Date:** 2026-07-14
- **Deciders:** DNLCodess
- **Relates to:** [typography.md](../../design/typography.md), [authentic-design.md](../../design/authentic-design.md)

## Context

The scaffold shipped **Geist** as the UI/body face — the `create-next-app` default. A design-literate
visitor flagged it as an "AI/template" tell, and [authentic-design.md](../../design/authentic-design.md)
already bans the reflexive-safe-font pattern. `typography.md` also listed Geist only as a placeholder
default to replace. We needed a deliberate, subject-grounded type system for a platform that is a
**membership institution** (issues cards, guides votes), read largely on **low-cost Android phones in
sunlight**, where **membership-number legibility** matters and PWA weight is constrained (**max two
families**).

## Decision

A two-voice system over one body face:

- **Body / UI → Hanken Grotesk.** Warm humanist grotesque, large x-height, honest numerals —
  chosen for legibility on cheap screens; not the Inter/Geist reflex. Loaded via `next/font/google`.
- **Display (ThinkRich) → Zodiak.** A distinctive high-contrast contemporary serif (Fontshare,
  **self-hosted** via `next/font/local`, ≈82 KB woff2, licence in `app/fonts/zodiak/LICENSE.txt`).
  Uncommon enough that it can't read as a template; its calligraphic italic carries the gold
  display accents ("*for mankind*"). Navy + gold keeps a serif off the cream-editorial cliché.
- **Display (Think-Winners) → Fraunces (serif), retained.** Grounded in the movement's own
  italic-serif logotype. Each surface swaps the display face via a single CSS custom property
  (`--font-display-face`, resolved in the `font-display` token); Think-Winners overrides it for its
  subtree, ThinkRich falls back to Zodiak.
- **Numeric → JetBrains Mono** for now (tabular figures). **Follow-up:** consolidate numerals onto
  Hanken's `tabular-nums` and drop the mono, to honour the two-family rule.

## Consequences

- **+** Distinctive, subject-grounded identity; the Geist tell is gone platform-wide.
- **+** Two brand voices (Zodiak / Fraunces) share one body (Hanken) — coherent but differentiated.
- **+** Self-hosted display face: no CDN dependency, no layout shift, licence tracked in-repo.
- **−** Temporarily three font families until the mono is folded into Hanken tabular figures.
- Fixed along the way: the `--font-display-face` indirection was initially a separate `:root` rule
  that did not survive CSS compilation (headlines silently fell back to Hanken/Georgia). The default
  face is now a direct fallback **inside** the `font-display` token, verified in-browser.

## Alternatives considered

1. **Bricolage Grotesque / Newsreader (Google)** — trialled; rejected on taste once actually rendering.
2. **Keep a Google serif for uniqueness** — reliable but widely used; the self-hosted Fontshare face
   is meaningfully more one-of-a-kind for comparable effort.
3. **One family (heavier weights for display)** — rejected: loses the aspirational display voice the
   marketing surface needs; the member app still leans on Hanken alone.
