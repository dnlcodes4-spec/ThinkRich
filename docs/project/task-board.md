# Task Board

The tactical, in-repo Kanban board — the current source of truth for what's being worked on.
It graduates to GitHub Issues/Projects once a remote exists (see
[ADR/roadmap](roadmap.md)); until then, we manage it here in version control.

**Task ID format:** `T-<nnn>`. Reference the ID in branch names, commits, and PRs.

**Columns:** Backlog → Ready → In Progress → In Review → Done.
A task enters **Ready** only when it meets the
[Definition of Ready](../engineering/definition-of-done.md#definition-of-ready), and **Done**
only when it meets the [Definition of Done](../engineering/definition-of-done.md#definition-of-done).

---

## 🔵 Backlog
_Not yet refined / not yet Ready._

- **T-004** — Leader: register member + membership-number generation 🔒 _(blocked: Q2 number format)_
- **T-005** — Membership card render + download 🔒 _(blocked: Q3 card design)_
- **T-006** — Member profile: view + photo upload + change-request flow
- **T-007** — Member home: voting view + candidates
- **T-008** — Opt-out flow (freeze → retention → delete/reactivate)
- **T-009** — PWA shell: manifest + service worker + install prompt
- **T-010** — Web Push notifications + Leader KYM verification (see [notifications.md](../architecture/notifications.md))

## 🟡 Ready
_Refined, unblocked, ready to pull._

- **T-001** — Supabase schema + migrations + geography seed + RLS
  _AC: tables + enums per data-model.md; RLS enabled with allow/deny tests; 36(+FCT?) states seeded._

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

_(none)_

## 🟣 In Review
_PR open, awaiting review + CI._

- **T-002** — Supabase bootstrap: deps, env (zod-validated), browser/server/middleware clients,
  `proxy.ts` session-refresh + auth routing, `/login` + `/app` stubs (PR `feat/supabase-bootstrap`)
  _Done: dev boots against the live project; unauth `/app`→`/login` E2E green; env + 3 unit tests._

## ✅ Done
_Merged to `main`, meets Definition of Done._

- **T-013** — Test tooling: Vitest + RTL + Playwright + CI (PR #7)
- **T-012** — Base UI primitives (PR #6)
- **T-011** — Design tokens + light/dark theming (PR #5)
- **T-000** — Engineering governance & documentation suite (PRs #2–#4)
- **Design system** — brand tokens, responsive/dashboard rules, accessibility, UI DoD (ADR-0006, PR #3)
- **Governance hardening** — pushback rule, authentic-design, learnings loop, notifications, testing (PR #4)

---

## How to use this board

1. Pull the top **Ready** task; move it to **In Progress**; create `T-<id>` branch.
2. When you open the PR, move to **In Review**.
3. On squash-merge, move to **Done** and delete the branch.
4. Keep task IDs stable; link them everywhere (branch, commits, PR).
