# Definition of Ready & Definition of Done

Two quality gates that bracket every task. **Ready** controls what work is allowed to start;
**Done** controls what work is allowed to merge. They prevent the two most common failure
modes: starting vague work, and shipping incomplete work.

---

## Definition of Ready

A task may move from **Backlog → Ready** only when **all** of these are true:

- [ ] **Clear objective** — one or two sentences on what and why.
- [ ] **Acceptance criteria** — written as verifiable statements.
- [ ] **Scope & non-goals** understood; the task is small enough for a short-lived branch.
- [ ] **Dependencies identified** and either resolved or explicitly noted (e.g. "blocked on
      client card design"). No task starts blocked on an unanswered question that changes its shape.
- [ ] **Design/decision known** — if it needs an architectural choice, an [ADR](../architecture/decisions/)
      exists or is planned.
- [ ] **Data/security impact considered** — does it touch RLS, PII, or auth? Noted if so.

If a task can't meet these, it stays in Backlog and gets refined.

---

## Definition of Done

A task may move to **Done** (i.e. be merged to `main`) only when **all** of these are true:

### Functionality
- [ ] All acceptance criteria met.
- [ ] Edge/empty/error cases handled.

### Quality
- [ ] Follows the [coding standards](coding-standards.md); matches surrounding code.
- [ ] Next 16 conventions respected (awaited async APIs, `proxy`, Server Actions) and verified
      against `node_modules/next/dist/docs/` where relevant.
- [ ] Self-reviewed against the [code review checklist](code-review.md); reviewed via PR.

### Security
- [ ] Authorization enforced by RLS and/or server checks — not UI-only.
- [ ] Input validated server-side (Zod).
- [ ] No secrets committed; `.env.example` updated for any new variables.

### Testing
- [ ] Tests added/updated per the [testing strategy](testing-strategy.md) and passing.
- [ ] `npm run lint` clean; production build succeeds.
- [ ] Affected flow manually verified in the running app.

### Documentation & tracking
- [ ] Docs / ADR / [CHANGELOG](../../CHANGELOG.md) updated as needed.
- [ ] PR uses a Conventional Commit title and links the task (and ADR, if any).

---

## Why gates, not vibes

Explicit gates make quality a property of the **process**, not of how careful someone felt
that day. They're also the shared contract that lets reviews be objective: "this doesn't meet
DoD item X" is a fact, not an opinion. Solo or not, we run them every time — that's how the
habit scales to a team.
