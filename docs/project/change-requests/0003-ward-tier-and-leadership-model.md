# CR-0003: Ward leadership tier & the six-level leadership model

- **Status:** Assessed <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-07-13
- **Channel:** message
- **Related:** refines [CR-0001](0001-brand-org-structure-and-dual-landing.md) (org structure) & [CR-0002](0002-polling-units-registration-and-live-count.md) (polling units); touches [ADR-0005](../../architecture/decisions/0005-rls-as-authorization-boundary.md) (RLS boundary); implemented by the identity/RLS migration (**T-001b**)

## 1. What the client asked for

> "Apart from the members, everyone else is a leader but at different levels. The number one just
> happens to be the national admin, which will then have an admin for state, LG, ward, PU."

Two clarifications confirmed with the client:

1. **Ward is its own leadership tier** — a **Ward Admin** sits between the LG Admin and the
   Polling Unit. (Our model previously jumped LG → Polling Unit with no Ward role.)
2. **Polling Unit coordinates the leaders beneath it** — the PU (`unit_coordinator`) is a
   coordination tier **above** the grassroots leaders; each grassroots **Leader** still holds
   **≤ 10 members** (unchanged).

The full chain, top to bottom — **every level is a leader except Member**:

| # | Level | Role | Oversees |
|---|-------|------|----------|
| 1 | National | `national_admin` (the apex) | the States |
| 2 | State | `state_admin` | the LGs |
| 3 | LG | `lg_admin` | the Wards |
| 4 | **Ward** | **`ward_admin`** ← new | the Polling Units |
| 5 | Polling Unit | `unit_coordinator` | the Leaders |
| 6 | Leader | `leader` | serves the Members directly (≤10) |
| — | Member | `member` — **not a leader** | — |

## 2. Why — the underlying need

The movement's identity is that it is **all leadership** — a disciplined chain of accountability
from the National Admin down to a single leader with ten members. Framing the upper tiers as a
separate "admin" class (and omitting Ward) misrepresents both the org and the electoral geography
(**State → LGA → Ward → Polling Unit**), which has a real Ward level that needs its own
coordinator for grassroots mobilization to map onto the map.

## 3. Impact analysis

- **Surfaces/flows affected:**
  - **Data model / auth:** the `role` enum, profile scoping, and RLS policies (all roles).
  - **Public site:** the Think-Winners landing (structure section + hero "chain" card) — must show
    all six leadership levels and use **"Members"** (not "voters") at the base.
  - **Admin app (future):** admin management must be able to create/scope a Ward Admin.
- **Data/schema impact:**
  - Add **`ward_admin`** to the `role` enum (between `lg_admin` and `unit_coordinator`).
  - Add a **`ward_id`** scope FK on `profiles` (non-null only for `ward_admin`; `wards` already
    exists in geography).
  - RLS: add ward-level scoping (a Ward Admin reads/writes only within their `ward_id`; LG Admin
    spans the wards in their `lga_id`).
  - **Migration required?** Yes — but it **folds into the not-yet-built identity/RLS migration
    (T-001b)**. `profiles` does not exist yet, so this is an **expand-only** model correction
    ahead of first creation — **no live data, no destructive step.**
- **Breaking change?** **No.** No identity schema is built yet; nothing to migrate or backfill.
- **Invariants at risk:**
  - **Role scoping** — must now extend cleanly to Ward (the whole point). Re-verify in RLS tests.
  - **≤10 members per leader** — **unchanged** (PU coordinates leaders; leader still owns members).
  - Membership-number immutability & NIN dedup — **unaffected**.
- **Conflicts with spec or another CR?** Refines **CR-0001 §Q8b**, which set the hierarchy as
  `National → State → L.G → Unit → Leader → Member`. This **inserts Ward** before Unit. Not a
  contradiction — an extension. Noted so the register stays coherent.
- **Size:** **Small** now (docs + landing). The role/RLS work is **medium** and lands with T-001b.

## 4. Decision

- **Proceed.** Correct the model now (docs + landing) while it is still cheap — before the
  identity/RLS migration is written, so Ward is designed in from the start rather than retrofitted.
- **Needs an ADR?** **No new ADR.** This extends the role model within the existing
  [ADR-0005](../../architecture/decisions/0005-rls-as-authorization-boundary.md) (RLS as the
  authorization boundary) — the decision is unchanged, only the tier count grows. The identity/RLS
  migration (T-001b) will reference this CR. *(Offer stands to `/adr` if we later want the
  six-tier role model recorded as its own decision.)*

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [ ] **T-021** — Data model: add `ward_admin` role + `ward_id` profile scope + ward RLS scoping
  to [data-model.md](../../architecture/data-model.md) & [security-model.md](../../architecture/security-model.md) (doc-only; implementation rides T-001b).
- [ ] **T-001b (amend)** — Identity/RLS migration scope now includes the Ward tier
  (`ward_admin`, `ward_id`, ward policies).
- [ ] **T-017 (amend)** — Think-Winners landing: rebuild the structure section + hero chain to
  show all six leadership levels (National crown → Members base), "voters" → "members", only
  20,000 / 200,000 as figures. *(Active UI work — needs visual sign-off before commit.)*

## 6. Rollback plan

- **Docs/model:** revert the CR + data-model/security-model commits (no runtime effect).
- **Landing:** revert the T-017 UI commit (isolated on the `feat/think-winners-landing` branch;
  nothing depends on it).
- **Migration:** not yet built — nothing to roll back. When T-001b lands, `ward_admin` is added
  in the initial expand migration, reversible by a down-migration before any data exists.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
