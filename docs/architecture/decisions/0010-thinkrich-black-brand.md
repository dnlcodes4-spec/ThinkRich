# ADR-0010: ThinkRich umbrella adopts a black + green brand (per-surface)

- **Status:** Accepted
- **Date:** 2026-07-15
- **Deciders:** DNLCodess (client-confirmed via [CR-0006](../../project/change-requests/0006-thinkrich-root-black-brand.md))
- **Supersedes / Superseded by:** Amends [ADR-0008](0008-single-navy-brand.md) (the "both surfaces use navy" clause); the rest of ADR-0008 stands.

## Context

ADR-0008 collapsed the brand to a single navy + gold for both ThinkRich and Think-Winners (reverting an earlier green experiment). The client has now decided the **ThinkRich umbrella** — the root landing (`/`), the member app (`/app`), and the shared UI primitives — should be **black + green**, while **Think-Winners (`/think-winners`) keeps navy + gold** (grounded in its own logo). This reintroduces a per-surface brand distinction.

Constraints: the root marketing components use **raw `navy-*` utilities** (the same token scale Think-Winners uses), while the member app + primitives use the **semantic tokens** (`--primary`, `--ring`, dark surfaces). We must recolour ThinkRich **without touching Think-Winners**; WCAG AA must hold in light and dark (the gold-contrast rule still governs Think-Winners; green-on-black is the new pairing to check); the design system bans pure `#000`.

## Decision

We will brand the **ThinkRich umbrella black + green**: a near-black **`ink-*`** scale (neutral, **no pure `#000`**) for the dark colour, and the **logo green** for the accent (the `green-*` scale re-sampled from the ThinkRich Community logo, emerald `#009752` → forest `#09603e`). Applied through two paths:

- **Root components** (`ThinkRichNav`, `HeroSlider`, `ArmsExplorer`, `PhilosophyFlow`, `ArmMark`, `page.tsx`): swap `navy-* → ink-*` **and** `gold-* → green-*` (plus the inline gradients).
- **Member app + primitives:** repoint the **semantic tokens** — `--primary`/`--ring` (+ navy-tinted dark surfaces) from navy to ink, and `--accent` from gold to green — in **light and dark**.

**Think-Winners keeps navy + gold** — it uses the raw `navy-*`/`gold-*` utilities, left intact. This **amends ADR-0008**.

## Options considered

1. **New `ink-*` scale + scoped swap (chosen)** — pros: isolates the change, Think-Winners untouched, trivial rollback, explicit. Cons: two colouring paths (raw swap for root, semantic repoint for app); a mechanical swap.
2. **Redefine the `navy-*` scale to black globally** — pros: a single edit. Cons: **also recolours Think-Winners** (violates the scope) and destroys the navy its logo needs. Rejected.
3. **Revive `data-brand` + refactor the root to semantic tokens** — pros: cleaner per-surface theming long-term. Cons: a large refactor of raw-utility components for one rebrand; over-engineered now. Rejected (revisit if more per-surface brands appear).

## Consequences

- **+** Distinct, premium identity for ThinkRich; Think-Winners' identity preserved; the change is contained and reversible.
- **+** The member app + primitives reskin from one place (the semantic tokens).
- **−** Per-surface brand divergence returns (the thing ADR-0008 simplified away); two colouring mechanisms to keep straight (raw `ink-*` on the root, semantic tokens on the app).
- **−** A new accessibility surface: green-on-black and black text must be re-verified in light and dark.
- **Follow-ups:** T-023 (ink scale + semantic repoint), T-024 (root reskin + visual sign-off), T-025 (docs/registers). On the marketing side, `navy-*` now serves Think-Winners only.
