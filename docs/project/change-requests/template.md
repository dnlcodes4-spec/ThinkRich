# CR-NNNN: <Short title>

- **Status:** Captured <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** <client name / role>
- **Date requested:** YYYY-MM-DD
- **Channel:** <call / meeting / message / email>
- **Related:** <ADR-####, CR-####, roadmap phase — or none>

## 1. What the client asked for

In their own words where possible. Attach/screenshot any examples they gave.

## 2. Why — the underlying need

The problem behind the request. (Solving the need is often better than the literal ask.)

## 3. Impact analysis

- **Surfaces/flows affected:** <members app / admin / public; which roles>
- **Data/schema impact:** <none / new column / rename / removal — migration required?>
- **Breaking change?** <yes/no — if yes, the backwards-compatible plan>
- **Invariants at risk:** <membership number immutability / no duplicate registration / role scoping / none>
- **Conflicts with spec or another CR?** <describe or "none">
- **Size:** <trivial / small / large / new phase>

## 4. Decision

- **Proceed / Reject / Defer:** <and the reasoning>
- **Needs an ADR?** <yes → link · no>

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [ ] T-### — <task>
- [ ] T-### — <task>

## 6. Rollback plan

How to undo this safely if it misbehaves in production (revert commit / flip feature flag /
down-migration).

## 7. Outcome

- **Shipped in:** <PR / release / commit>
- **Client confirmed:** <yes/no + date>
