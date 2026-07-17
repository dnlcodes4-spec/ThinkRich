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

- **T-005** — Membership card render + download 🔒 _(blocked: Q3 card design)_
- **T-010** — Web Push notifications + Leader KYM verification 🔒 _(push blocked: Q4; SW is already push-ready)_
- **T-019** — State activation: National admin activates/deactivates states (`states.is_active`)
- **T-020** — Statistics dashboard: member counts by geography + live totals
- **T-021** — Admin management: view/deactivate admins within scope
- **T-023** — In-app notifications: notification centre + toasts (Web Push comes later, T-010)

## 🟡 Ready
_Refined, unblocked, ready to pull._

_(none)_

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

_(none)_

## 🟣 In Review
_PR open, awaiting review + CI._

_(none)_

## ✅ Done
_Merged to `main`, meets Definition of Done._

- **T-006** — Member change-requests + leader photo upload (PR #18) · **completes** T-006
- **T-007** — Member voting view + scoped candidate management (PR #17)
- **T-009** — PWA shell: manifest + SW + offline + install prompt (ADR-0004, PR #16)
- **T-008** — Membership lifecycle / opt-out (PR #14; landed via corrective after #13)
- **T-006 (profile)** — Member profile + self passport-photo upload (PR #12)
- **T-018** — Geography import: 774 LGAs / 8.8k wards / 120k PUs (PR #11)
- **T-017** — Member login provisioning: temp password at registration + roster (PR #10)
- **T-016** — National-admin bootstrap: dev-only page + prod seed (ADR-0012, PR #9)
- **T-015** — Admin account provisioning: next-tier, in-scope (PR #8)
- **T-006a** — Member roster: scoped list at `/app/members` (PR #7)
- **T-004** — Leader registers a member + membership-number generation (PR #6)
- **T-003** — Auth: email/password sign-in + session (ADR-0011, resolves Q1) (PR #5)
- **T-001b** — Identity + membership schema + hierarchical RLS (PR #4)
- **T-002** — Supabase bootstrap: clients, env, proxy auth routing (PR #8)
- **T-001 (geography)** — schema + reference RLS + 37 states + types + import path (PR #9)
- **CR-0006 / ADR-0010** — ThinkRich umbrella rebrand to **black + green** (root + member app)
- **T-014** — Dual-brand palette (green Think-Winners via `data-brand`, ADR-0007) — later superseded by CR-0006
- **CR-0001** — client brand/org/landing capture + resolution (PR #10)
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
