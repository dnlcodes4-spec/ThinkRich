# CR-0022: Leader "10 registrations" progress bar + one-time congratulations

- **Status:** Rejected — duplicate of already-shipped work <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer)
- **Date requested:** 2026-08-07
- **Channel:** message
- **Related:** [CR-0009](0009-vin-identity-role-upgrades-uncapped-leaders-and-membership-card.md) §3.4 — this exact
  feature (progress bar + congratulations at 10) already shipped there (commit `7fa7778`), live in
  `LeaderHome` ([app/app/page.tsx:223](../../../app/app/page.tsx#L223)).

## 1. What the client asked for

> "When a Leader registers 10 [members] there could be something like 'congratulations you
> have registered 10' — and if it's a bar you want to use for the progress toward the 10.
> Just let congratulations pop up once the person reaches 10, even though he can register more."

Confirmed with the engineer:
- Scope: **Leader role only** (not the other coordinator tiers who can also register members
  per CR-0017).
- Placement: **both** — a persistent progress bar on the Leader's dashboard home, and the
  congratulations moment fires wherever the 10th registration actually completes (dashboard
  re-render or the post-registration success screen).
- The congratulations fires **exactly once**, the first time a Leader's registered-member count
  reaches 10. It does not repeat, and does not block or throttle further registrations —
  leaders remain uncapped (CR-0009).

## 2. Why — the underlying need

Registration is manual, grassroots work with no built-in feedback loop. A visible progress bar
and a first-milestone celebration gives Leaders a sense of momentum and recognizes an early
contribution goal, without capping or gating anything.

## 3. Impact analysis

- **Surfaces/flows affected:** Leader dashboard home (`LeaderHome` in
  [app/app/page.tsx:223](../../../app/app/page.tsx#L223)) and the registration success state in
  [app/app/register/register-form.tsx:32](../../../app/app/register/register-form.tsx#L32).
- **Data/schema impact:** **None.** `activity_log.action` is plain `text` with no CHECK
  constraint (per CR-0021), so a new action key (e.g. `member.milestone_10`) can be logged via
  the existing `logActivityAs` helper with no migration. Presence of that log entry for a given
  Leader is what makes the popup fire once instead of on every visit — no new column needed.
- **Breaking change?** No — additive UI + one new best-effort log action.
- **Invariants at risk:** None. Leaders stay uncapped (CR-0009) — this must not read as, or
  become, a soft cap. The 10-count is `count(members where registered_by = leader.id)`, computed
  the same way regardless of whether the milestone has already fired.
- **Conflicts with spec or another CR?** None.
- **Size:** small.

## 4. Decision

**Rejected — no new work.** On review with the engineer, this is the same request already
decided and shipped under CR-0009 §3.4: a permanent "Congratulations" badge that appears once a
Leader's registered-member count reaches 10, plus a progress bar below it, both derived live from
`count(members where registered_by = leader.id)` — no "seen"/dismissal state, so it also honestly
disappears if the count drops back under 10 (e.g. opt-outs). Confirmed with the engineer this
matches what's wanted; keeping it a derived badge rather than adding a one-time popup.

**Needs an ADR?** No.

## 5. Plan

No tasks — nothing to build.

## 6. Rollback plan

N/A — no code change.

## 7. Outcome

- **Shipped in:** N/A — duplicate of CR-0009 (commit `7fa7778`)
- **Client confirmed:** _pending_ — worth a quick sanity check that the live badge on
  `LeaderHome` is in fact what was being asked for.
