# ADR-0006: Adopt a token-based design system with the Think-Winners brand palette

- **Status:** Accepted
- **Date:** 2026-07-12
- **Deciders:** DNLCodess
- **Supersedes / Superseded by:** none

## Context

The platform serves very different users on very different devices: members and leaders on
phones (an installable PWA), and admins on desktop dashboards — all needing a consistent,
trustworthy, accessible experience. We need a single source of truth for visual and
interaction design so screens don't drift, accessibility isn't an afterthought, and any
contributor (or the assistant) makes the same choices.

The client has specified that the **brand colours are those of the Think-Winners Movement
logo** (`public/logo.jpeg`) — a deep **navy blue** and a **gold**. We sampled the logo mark to
get accurate anchors and checked their WCAG contrast:

- **Navy** ≈ `#0A2A4E` (logo median `#001E42`) — ~14–16:1 on white.
- **Gold** ≈ `#C9A227` (logo median `#C49719`) — only ~2.4:1 on white (fails AA for text), but
  ~7.3:1 with dark text on top (passes AA).

> Process note: a client directive would normally be captured as a [Change Request](../../project/change-management.md).
> Because this establishes a **foundation** (there is no built UI to change yet), we record it
> as an ADR. Once UI exists, *changes* to the palette or design rules go through a CR.

## Decision

We will adopt a **token-based design system**, documented in [`docs/design/`](../../design/)
and implemented as CSS custom properties mapped into Tailwind v4's `@theme`. The brand anchors
are **Navy `#0A2A4E`** (primary/interactive/text and dark surfaces) and **Gold `#C9A227`**
(accent/highlight, always with dark text on top — never body text on white). Full tint/shade
scales, neutrals, semantic colours, typography, spacing, and component rules live in the design
docs. **WCAG 2.1 AA** is the accessibility baseline. Design is **mobile-first**, and data-dense
admin views follow explicit responsive rules (e.g. tables become card lists on mobile).

## Options considered

1. **Token-based design system now (chosen)** — consistency, accessibility, and a shared
   vocabulary from day one; tokens map cleanly to Tailwind v4. Cost: upfront documentation effort.
2. **Ad hoc styling per screen** — fastest to start, but guarantees drift, accessibility gaps,
   and rework once there are many screens across three surfaces.
3. **Adopt a third-party UI kit's theme wholesale** — quick, but fights our specific brand and
   the PWA-vs-dashboard split; still needs tokenizing to stay consistent.

## Consequences

- **Positive:** every screen pulls from the same tokens; brand is applied consistently; AA
  accessibility is designed-in; responsive/dashboard rules prevent bad mobile UX; the assistant
  has explicit rules to follow.
- **Positive:** the gold-contrast trap is codified once, so gold is never misused as text on white.
- **Negative / obligations:**
  - Tokens must be implemented in `app/globals.css` (`@theme`) and kept in sync with the docs
    (tracked as a task).
  - Contributors must verify UI against the [UI Definition of Done](../../design/process-and-ui-dod.md)
    (responsive breakpoints, AA contrast, keyboard, light/dark, empty/loading/error states).
  - Dark mode is a first-class requirement, not a later add-on.
