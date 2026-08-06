# CR-0021: Activity log — record every activity, show it properly

- **Status:** In Progress
- **Requested by:** Client
- **Date requested:** 2026-08-06
- **Channel:** message
- **Related:** builds on ADR-0005 (RLS), the 0015 activity_log; follows CR-0009 (active-status gating), CR-0020 (voter wording)

## 1. What the client asked for

> "Focus on the activity page. I am not sure we are fetching data properly nor is
> the data accurate. Ensure every activity is being recorded and shown properly."

## 2. Root cause (systematic investigation)

The write helper (`logActivity` / `logActivityAs`, service role, best-effort) and the
read path (`/app/logs`, RLS to an active national admin, active-status guard) are both
**correct** — this was **not** a fetch bug. Two real causes:

1. **Coverage gaps — most mutations never called the logger.** Live data showed only
   5 action types had ever been recorded (`account.deleted`, `account.deactivated`,
   `state.deactivated`, `account.reactivated`, `member.login_reset`). These mutation
   paths recorded **nothing**:
   - creating an account (`admin/new-account`) → `account.created` had 0 rows despite
     being declared;
   - member lifecycle: pause / reactivate / remove (`members/lifecycle-actions`);
   - candidate save + delete (`admin/candidates`);
   - announcements + voting reminders (`notifications`);
   - a staff member completing their own membership (`account/membership-actions`).
2. **Display drift.** The log page kept its own copy of the action → label/tone map,
   separate from the emitter union. `account.promoted` and `account.role_changed` were
   emitted (role changes) but **missing** from that map, so they rendered as the raw
   key with no filter chip and a neutral tone.

## 3. The fix

- **One source of truth: `lib/activity-meta.ts`** — the `ActivityAction` union plus a
  `Record<ActivityAction, { label, tone }>`. The logger type, every emitter, and the
  page import it. Because the map is a `Record` over the union, adding an action
  without a label/tone is now a **type error**, not a silent gap. The page's separate
  map is deleted; it imports the shared one.
- **Added `logActivityAs` at every missing success point:** `account.created`
  (provisioning), `member.paused` / `member.reactivated` / `member.removed`
  (self opt-out + admin reactivate/remove), `candidate.saved` + new `candidate.removed`,
  `announcement.sent` (announcements + voting reminders), and `member.registered` for a
  staff member completing their own membership.
- Logging stays **best effort** (never blocks or throws). `activity_log.action` is
  plain `text` (no CHECK), so new action keys record without a migration.

**No schema change.** Copy/logic only.

## 4. Impact analysis

- **Surfaces:** the emitting actions above + `/app/logs` display; `lib/activity(-meta)`.
- **Data/schema impact:** none (existing table + text column).
- **Breaking change?** No. Best-effort logging.
- **Invariants at risk:** none. The service-role, no-insert-policy forgery guard is
  unchanged.
- **Size:** small-medium.

## 5. Plan

- [x] T-081 — `lib/activity-meta.ts` single source of truth; wire logger + page.
- [x] T-082 — Add logging to every uncovered mutation path.
- [ ] T-083 — Gates + PR; verify on the running app that new actions appear.

## 6. Rollback plan

Revert the branch's squash-merge. Logging is additive and best-effort; no data cleanup.

## 7. Outcome

- **Shipped in:** _pending_
- **Client confirmed:** _pending_
