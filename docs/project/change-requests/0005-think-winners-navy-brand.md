# CR-0005: Think-Winners brand → navy + gold (correcting the green miscommunication)

- **Status:** In Progress
- **Requested by:** Client (clarified with the engineer)
- **Date requested:** 2026-07-14
- **Channel:** working session
- **Related:** supersedes [CR-0001](0001-brand-org-structure-and-dual-landing.md) Q7; [ADR-0007](../../architecture/decisions/0007-dual-brand-palette.md) → superseded by ADR-0008; T-014

## 1. What the client asked for

The Think-Winners Movement brand is **navy + gold** (matching the logo, `public/logo.jpeg`) — **not
green**. On reviewing the logo, the engineer confirmed the earlier "Think-Winners = green" decision
(CR-0001 Q7 → T-014 → ADR-0007) was **a miscommunication on the engineer's side**: the client always
intended navy. The client's logo is the source of truth.

## 2. Why — the underlying need

Brand consistency. The green was inferred from the infographics during CR-0001; the actual logo is
navy + gold, and the client confirmed navy. A navy landing matches the logo (and, honestly, reads as
more premium/serious for a campaign pitch).

## 3. Impact analysis

- **Surfaces/flows affected:** the Think-Winners landing (re-themed green → navy). Members' app
  unaffected.
- **Design system:** the **dual-brand collapses to a single navy + gold brand** — both ThinkRich
  Community and Think-Winners use navy. The `data-brand="think-winners"` green override is removed;
  Think-Winners inherits the default navy `:root`. The `green-*` scale is retained (unused) for any
  future arm. Captured in **ADR-0008 (supersedes ADR-0007)**.
- **Assets:** the navy logo was processed — white background removed (transparent) and a **navy→white
  recolor** produced for the dark nav (`logo-mark-light.png`, `logo-full-light.png`), plus the natural
  transparent lockup (`logo-full.png`).
- **Data/schema impact:** none.
- **Breaking change?** No — landing only, no live data.
- **Invariants at risk:** none.
- **Conflicts:** supersedes CR-0001 Q7 and ADR-0007 (recorded, not silent).
- **Size:** medium (mechanical class/color re-theme + logo processing + header work).

## 4. Decision

- **Proceed** — client-confirmed.
- **Needs an ADR?** Yes → **ADR-0008** (single navy + gold brand; supersedes ADR-0007).

## 5. Plan

- [x] T-014 (re-theme) — Think-Winners re-themed green → navy; `data-brand` override removed.
- [x] Process the real logo into transparent + dark-nav (white) variants.
- [ ] Obtain the official transparent/vector logo set (mark used is derived from the raster JPEG).

## 6. Rollback plan

Revert the navy commit — the green version remains in git history.

## 7. Outcome

- **Shipped in:** _pending_ (built on `feat/think-winners-nav-overlay`).
- **Client confirmed:** yes (navy).
