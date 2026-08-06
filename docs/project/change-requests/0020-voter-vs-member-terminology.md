# CR-0020: Voter vs member terminology across the dashboard

- **Status:** In Progress
- **Requested by:** Client
- **Date requested:** 2026-08-06
- **Channel:** message
- **Related:** follows CR-0014 (everyone is a member), ADR-0015/0016

## 1. What the client asked for

> "Fix the dashboard terminologies where members are likely to be confused with
> voters. Go each page and component of the dashboard to ensure the right fix,
> including the map component as well."

## 2. Why — the underlying need

CR-0014 made **everyone** in the movement a "member" (staff included). That overloaded
the word "member": on screen it now meant both "the whole movement" and "an ordinary
person a leader registers." Those base-tier people are **registered voters**, and the
product's purpose is mobilising them, so the two senses need distinct words.

## 3. Decision — the vocabulary (locked with the client)

- **Voter / Registered voter** = the base-tier people a leader registers: the
  `/app/register` flow, the roster at `/app/members`, member-detail, the lifecycle
  toasts, and the per-area / per-state counts on the map and stats.
- **Member(s)** = reserved for the movement-wide "everyone is a member" total only:
  the coordinator home's top card ("Members … everyone in the movement") and the map's
  **Nationwide** headline.
- **Membership** (a person's own record/number/card) is unchanged — it is personal and
  reads correctly ("your membership", "Membership ID", "Membership card", "Complete
  your membership").

This is a **UI-copy change only. No schema, no enum, no RLS change** (the `members`
table and the `member` role keep their names; only user-facing wording changes).

## 4. Impact analysis

- **Surfaces:** nav, role homes, the Nigeria map, register (page/form/actions),
  members roster + detail + lifecycle/role/provision actions, stats, corrections,
  notifications compose, and account/profile copy (personal "membership" kept).
- **Data/schema impact:** none.
- **Breaking change?** No.
- **Invariants at risk:** none (copy only).
- **Size:** small-medium (a wide but shallow copy sweep).

## 5. Plan

- [ ] T-077 — Sweep nav + role homes + the map component to the locked vocabulary.
- [ ] T-078 — Sweep register, roster, member detail, stats, corrections, and the
      action toasts (register/lifecycle/role/provision/detail).
- [ ] T-079 — Account/profile: keep personal "membership"; fix base-tier references
      ("registered voters already have a record", etc.).
- [ ] T-080 — Gates + screenshots (leader home, coordinator home + map, register,
      roster) for UI sign-off; PR.

## 6. Rollback plan

Revert the branch's squash-merge commit. Copy-only, so no data considerations.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
