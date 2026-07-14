# Change Request Register

Every change the client requests after a feature is specced or built is captured here as a
**Change Request (CR)** before any code is written. This register is the index; each CR is its
own file. The full process is in [change-management.md](../change-management.md).

## Why this exists

On a client project, requests arrive verbally and informally ("can we also…", "actually change
this to…"). Without a written record you lose traceability, invite scope creep, and risk
breaking working features with unassessed changes. A CR turns a passing comment into a
reviewable, impact-assessed, trackable unit of work.

## How to add a CR

1. Copy [`template.md`](template.md) to `NNNN-short-title.md` (next number).
2. Fill in what the client said, why, and your impact analysis.
3. Add a row to the register below with status **Captured**.
4. Follow the [change-management flow](../change-management.md): triage → (ADR?) → tasks → build → ship.
5. Update the status as it progresses.

## Statuses

`Captured` → `Assessed` → `Planned` → `In Progress` → `Shipped` (or `Rejected` / `Deferred`)

## Register

| CR | Title | Requested by | Date | Status | Tasks | ADR |
|----|-------|--------------|------|--------|-------|-----|
| [0001](0001-brand-org-structure-and-dual-landing.md) | Brand palette, org structure, dual landing pages | Client | 2026-07-13 | Assessed | T-014, T-016, T-017 | ADR-0006/0007 |
| [0002](0002-polling-units-registration-and-live-count.md) | Polling units, member registration fields, live counts, ThinkRich content | Client | 2026-07-13 | Assessed | T-016, T-018, T-019, T-020, T-001b | — (refines ADR-0005) |
| [0003](0003-ward-tier-and-leadership-model.md) | Ward leadership tier + six-level leadership model | Client | 2026-07-14 | Assessed | T-001b | — |
| [0004](0004-candidate-first-public-landing.md) | Candidate-first public landing (audience pivot) | Client | 2026-07-14 | In Progress | T-017, T-021, T-022 | — |
| [0005](0005-think-winners-navy-brand.md) | Think-Winners brand → navy + gold (correcting green) | Client | 2026-07-14 | In Progress | T-014 | ADR-0008 |
| [0003](0003-ward-tier-and-leadership-model.md) | Ward leadership tier & the six-level leadership model | Client | 2026-07-13 | Assessed | T-021, T-001b, T-017 | — (extends ADR-0005) |

<!--
Example row once CRs exist:
| [0001](0001-rename-unit-to-cell.md) | Rename "Unit" to "Cell" across app | Client (call) | 2026-07-20 | Shipped | T-021, T-022 | ADR-0006 |
-->
