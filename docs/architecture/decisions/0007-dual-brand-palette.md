# ADR-0007: Dual-brand palette — ThinkRich (navy) and Think-Winners (green)

- **Status:** Superseded by [ADR-0008](0008-single-navy-brand.md) — the "Think-Winners = green" call was a miscommunication (CR-0005); both brands are navy + gold.
- **Date:** 2026-07-13
- **Deciders:** DNLCodess (client-directed via [CR-0001](../../project/change-requests/0001-brand-org-structure-and-dual-landing.md))
- **Amends:** [ADR-0006](0006-design-system-and-brand.md) (token system + navy brand remain valid; this adds a second brand)

## Context

ADR-0006 established a token-based design system with a **navy + gold** brand, sampled from
`public/logo.jpeg`. The client has since clarified (CR-0001, with two organogram infographics)
that there are **two brands under one umbrella**:

- **ThinkRich Community** (the umbrella) — **navy + gold** (the original logo).
- **Think-Winners Movement** (the major project) — **green + gold** (the infographics).

Each has its own landing page. We need both palettes without forking the design system.

## Decision

We will support **two brands via a `data-brand` switch**, keeping a single token architecture.
The key observation: **only the primary hue differs** between the brands — **gold accent,
neutrals, surfaces, and status colours are shared**. So a brand override only redefines
`--primary`, `--primary-hover`, `--primary-foreground`, and `--ring`.

- Default (`data-brand="thinkrich"` or unset) = **navy** (unchanged from ADR-0006).
- `data-brand="think-winners"` = **green** (`green-700 #15602E` primary), with dark-mode variants.
- A **green scale** (`green-50…950`) is added to the token set, contrast-verified for WCAG AA
  (green-700 is 7.65:1 both on white and under white text; gold-on-green pairings pass).

A surface (a landing page, the members' app) sets `data-brand` on its root; theming
(`data-theme`) composes with it.

> **Provisional green:** the exact green was calibrated by eye from the infographics, not sampled
> from a file (we don't have the official green asset). Values are AA-verified and close; they
> should be **confirmed/sampled from the official green logo** when supplied (add it to `public/`
> like `logo.jpeg`). This is a token-value tweak, not a structural change.

## Options considered

1. **`data-brand` switch, shared tokens (chosen)** — one system, minimal override (primary+ring),
   composes with light/dark. Cost: a provisional green until the official asset arrives.
2. **Two separate design systems / token files** — duplicated everything, drift risk, more code
   for what is a one-hue difference.
3. **Keep navy only** — rejected: the client's Think-Winners materials are explicitly green.

## Consequences

- **Positive:** both brands from one token system; adding a brand is ~15 lines; gold/neutrals/
  status stay consistent across both; light+dark work for each.
- **Positive:** landing pages just set `data-brand`; no component changes.
- **Negative / obligations:**
  - Green values are **provisional** pending the official asset (tracked; a token tweak to finalize).
  - Contributors must apply `data-brand` at the right surface boundary (documented in
    [brand-and-color.md](../design/brand-and-color.md)).
  - The gold-on-light contrast rule from ADR-0006 still applies to **both** brands.
