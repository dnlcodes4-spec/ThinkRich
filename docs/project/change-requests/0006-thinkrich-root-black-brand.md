# CR-0006: ThinkRich root site → black + green (retire navy on the root only)

- **Status:** Assessed
- **Requested by:** Client (relayed by the engineer)
- **Date requested:** 2026-07-15
- **Channel:** relayed via engineer
- **Related:** [ADR-0008](../../architecture/decisions/0008-single-navy-brand.md) (to be amended), ADR-0010 (proposed), [CR-0001](0001-brand-org-structure-and-dual-landing.md) / [CR-0005](0005-think-winners-navy-brand.md) (brand history)

## 1. What the client asked for

The client has **reverted away from green**, and **black is now the main ThinkRich colour**.
Confirmed scope with the engineer:

- The **ThinkRich umbrella** rebrands from **navy + gold → black + green**: this covers the
  **root landing site (`/`)** *and* the **member app** (`/app`, protected surfaces) + the shared UI primitives.
- **Navy is retired across the ThinkRich umbrella.** Gold stays as the accent.
- **Think-Winners (`/think-winners`) keeps navy + gold** (grounded in its own logo).
- Green remains retired/unused.

## 2. Why — the underlying need

A distinct, premium identity for the **ThinkRich umbrella** that sets it apart from the navy Think-Winners arm. Black + the logo green reads as stark and on-brand; keeping Think-Winners navy + gold preserves its logo grounding.

## 3. Impact analysis

- **Surfaces/flows affected:**
  - **Public root landing `/`** and its components (`ThinkRichNav`, `HeroSlider`, `ArmsExplorer`, `PhilosophyFlow`, `ArmMark`/`ThinkRichWordmark`, `app/page.tsx` sections) — these use **raw `navy-*`** utilities.
  - **Member app + shared UI primitives** (`Button`, `Input`, `StatusPill`, `DataTable`, `RecordCard`, the gallery) — these use the **semantic tokens** (`bg-primary`, `ring-ring`, `--background`/`--surface` in dark).
  - **Think-Winners is NOT affected** — it uses raw `navy-*`, which we leave intact.
  - No roles, no flows, no data.
- **Data/schema impact:** **None.** No migration.
- **Breaking change?** No behavioural change — visual only. **WCAG AA** must be re-verified for black backgrounds/text and the green accent in **both light and dark** (the logo green has strong contrast on near-black; the gold-contrast rule still governs Think-Winners).
- **Invariants at risk:** none of the data invariants (membership number, no-duplicate, role scoping) are touched. The **accessibility invariant** is the one to guard.
- **Conflicts with spec / another CR?** Contradicts **ADR-0008** ("both ThinkRich and Think-Winners use navy + gold") → this reintroduces a **per-surface brand distinction**, so it needs a new ADR amending 0008. Note: the brand has changed several times (navy → green → navy, now ThinkRich → black); proceeding per the client, but the churn is worth flagging.
- **Token strategy (the crux):** two paths, because the two surfaces colour differently.
  - The root components use `navy-*` **directly** (~87 occurrences across 6 files) plus inline navy/gold gradients. Because both scales are **shared** with Think-Winners, we **cannot** redefine them globally. Plan: add a **scoped near-black `ink-*` scale** (neutral black; **no pure `#000`**), re-sample the `green-*` scale from the logo, and swap `navy-* → ink-*` **and** `gold-* → green-*` **in the root components only** (plus their inline gradients).
  - The member app / primitives use the **semantic tokens**, so we **repoint** `--primary`/`--primary-hover`/`--ring` (and the navy-tinted dark-mode surfaces `--background`/`--surface`/`--border`) from navy to **ink**, in **light and dark**. This reskins the app + primitives in one place. Think-Winners is untouched because it never used the semantic tokens.
- **Size:** medium (mechanical root swap + semantic-token repoint + a new scale + AA re-check in light/dark + ADR).

## 4. Decision

- **Proceed.**
- **Needs an ADR? Yes — ADR-0010**, amending ADR-0008: the platform reintroduces a per-surface brand (ThinkRich root = black + green; Think-Winners = navy + gold). Run `/adr`.

## 5. Plan

Tasks to create on the [task board](../task-board.md):

- [ ] **T-023** — Add a near-black `ink-*` scale + a logo-sampled `green-*` scale; **repoint the semantic tokens** (`--primary`/`--ring` + dark surfaces navy→ink, `--accent` gold→green), in light and dark. Document in `brand-and-color.md`; verify AA for ink + green + black-text pairings.
- [ ] **T-024** — Reskin the ThinkRich root site: swap `navy-* → ink-*` and `gold-* → green-*` across the 6 root components + inline gradients. Verify member app + primitives (via the semantic-token change) and the root site in light + dark, mobile + desktop; get visual sign-off.
- [ ] **T-025** — ADR-0010 (amend ADR-0008) + update `brand-and-color.md` and the CR/ADR registers.

## 6. Rollback plan

Revert the branch/commit. The `ink-*` scale and the swaps are additive and contained; the `navy-*` scale is left intact, so Think-Winners is unaffected. No data to roll back.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
