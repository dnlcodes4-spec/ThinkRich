# CR-0001: Brand palette, org structure, and dual landing pages

- **Status:** Assessed <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed via the engineer)
- **Date requested:** 2026-07-13
- **Channel:** message + two organogram infographics + a Think-Winners profile document
- **Related:** ADR-0006 (design system/brand), T-001 (data model), Phase 3 (public site)

## 1. What the client asked for

Several things at once:

1. **Two landing pages**, not one site:
   - **ThinkRich Community** — the umbrella brand.
   - **Think-Winners Movement** — the major project.
2. **ThinkRich Community** is the umbrella; it has **6 arms**:
   1. Thinkrich Concept International
   2. Thinkrich MCPS (Cooperative)
   3. THINKHELP International Foundation
   4. Thinkrich Academy
   5. Thinkrich $M Club
   6. Think-Winners Movement
3. **Think-Winners Movement** full landing content supplied: intro, vision, mission, motto
   ("Thinking Together, Winning Together"), core values, org structure, statewide target,
   what-we-offer / benefits to a campaign, 6 implementation phases, commitment, partnership proposal.
4. **Organizational structure (organogram) — Ogun State**, headcount-based:
   | Level | per unit | Leaders | Voters |
   |-------|----------|---------|--------|
   | State | — | 20,000 | 200,000 |
   | Local Government | 20 LGAs | 1,000 each | 10,000 each |
   | **Unit Manager** | supervises **50 leaders** | 50 | 500 |
   | Leader | — | 1 | **10 voters** |
   - "Beginning with **Ogun State**" — **20 LGAs**.
5. **Brand appears as GREEN + GOLD** in both infographics (forest green + gold on cream),
   with a green circular logo badge.

## 2. Why — the underlying need

Partner-facing landing pages to recruit governorship campaigns and members, plus a precise,
headcount-based operating structure the software must mirror (leaders → unit → LG → state).

## 3. Impact analysis

### 🔴 Brand palette conflict (HIGH — blocks design)
- Our shipped design system (**ADR-0006**, tokens in `app/globals.css`, style guide, PR #3/#5) is
  **navy + gold**, sampled programmatically from `public/logo.jpeg` (verified navy, HSV ≈ 215°).
- The new infographics are **green + gold**. Direct contradiction.
- **Open question:** is the brand now green+gold? Or do the **two brands differ** — ThinkRich
  Community (navy) vs Think-Winners Movement (green) — which the "two landing pages" framing makes
  plausible? Either way this likely **supersedes ADR-0006** and reworks the colour tokens
  (a token-scoped change: swap the palette, keep the token architecture).

### 🔴 Org hierarchy vs. original spec (HIGH — affects the next migration)
- Original brief tiers: National → State → **L.G** → **Unit Coordinator (Ward = 2+ wards)** →
  Leader → Member. New organogram: State → LG → **Unit Manager (= 50 leaders)** → Leader (→10 voters).
- Conflicts/clarifications to resolve **before the identity/RLS migration**:
  - **Unit definition:** headcount (**50 leaders**) vs geographic (**2+ wards**)? This changes the
    `units` table semantics we just created (currently ward-based via `unit_wards`).
  - **Is there still a National tier?** The organogram is State-topped (Ogun-first); the original
    brief had a National Admin over 36 states. Both, or State-topped only for now?
  - **"Voter" vs "Member":** the organogram says a Leader mobilizes **10 voters**; our model calls
    them **members** (registered, ≤10 per leader). Same concept, confirm terminology.
- **Positive:** "Ogun-first, 20 LGAs" makes the geography seed **tractable now** (Ogun's 20 LGAs)
  rather than waiting on full national data — see [supabase/README.md](../../../supabase/README.md).

### 🟡 Public site scope (MEDIUM)
- Two distinct landing pages (ThinkRich Community + Think-Winners) rather than one site with a
  sub-page. Affects Phase 3 structure/routing (likely separate routes or sub-domains) and content model.

### Data/schema impact
- `units` semantics may change (headcount vs ward). `role` enum naming (`unit_coordinator` →
  `unit_manager`?). No destructive change yet — the identity/RLS migration is **not built**, so we
  reconcile *before* writing it (good timing).

### Invariants at risk
- None broken. The ≤10-per-leader cap is **confirmed** by the organogram ("1 Leader → 10 voters").

## 4. Decision

**Proceed after clarification.** Two client answers gate the impactful work:
1. **Brand:** green+gold everywhere, or navy (ThinkRich) + green (Think-Winners) split? → likely a
   new **ADR superseding ADR-0006** + token rework.
2. **Hierarchy:** confirm the Unit definition (50 leaders vs 2+ wards), whether a National tier
   exists, and voter/member terminology → shapes the identity/RLS migration.

Non-blocking captures (no decision needed): the Think-Winners landing **content** and the ThinkRich
**6 arms** are recorded here for Phase-3 build.

## 5. Plan (tasks — drafted, pending answers)

- [ ] T-0xx — ADR + palette rework if brand changes (supersede ADR-0006; swap tokens; restyle).
- [ ] T-0xx — Reconcile data-model hierarchy (units, roles, national tier) before identity/RLS migration.
- [ ] T-0xx — Ogun geography seed (20 LGAs + wards) once the dataset/definition is settled.
- [ ] T-0xx — ThinkRich Community landing page (umbrella + 6 arms).
- [ ] T-0xx — Think-Winners Movement landing page (content in §1.3 above).

## 6. Rollback plan

Planning only — no code shipped under this CR yet. Palette rework will be token-scoped (revert =
restore previous token values); it does not touch component structure.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending answers to §4_
