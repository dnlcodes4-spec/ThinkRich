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
- **T-006** — Member profile: view + photo upload + change-request flow
- **T-007** — Member home: voting view + candidates
- **T-008** — Opt-out flow (freeze → retention → delete/reactivate)
- **T-009** — PWA shell: manifest + service worker + install prompt
- **T-010** — Web Push notifications + Leader KYM verification (see [notifications.md](../architecture/notifications.md))

## 🟡 Ready
_Refined, unblocked, ready to pull._

_(none)_

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

_(none)_

## 🟣 In Review
_PR open, awaiting review + CI._

- **T-006 (partial)** — Member profile + passport photo (branch `feat/member-profile-photo`)
  _Done: `/app/profile` member self-view + passport-photo upload to a private `member-photos` bucket
  (service-role write, code-checked ownership, signed-URL reads, no object policies). Verified live.
  Deferred: leader-side upload + details change-request flow._
- **T-017** — Member login provisioning: temp password (branch `feat/member-login-provisioning`)
  _Done: creates the member's `auth.users` + `profiles(role=member)` + `members.user_id` (service
  role, rollback on failure), returning a one-time temp password. Auto at registration when an email
  is present; on-demand from the roster's Login column. Authz reuses RLS visibility. Verified live
  (member signs in; roster button provisions)._
- **T-014** — Dual-brand palette: green Think-Winners via `data-brand` (PR `feat/dual-brand-palette`)
  _Done: AA-verified green scale, light/dark, brands demo + E2E; ADR-0007. Green provisional._

## ✅ Done
_Merged to `main`, meets Definition of Done._

- **T-017** — Member login provisioning: temp password at registration + roster (PR #10)
- **T-016** — National-admin bootstrap: dev-only page + prod seed (ADR-0012, PR #9)
- **T-015** — Admin account provisioning: next-tier, in-scope (PR #8)
- **T-006a** — Member roster: scoped list at `/app/members` (PR #7)
- **T-004** — Leader registers a member + membership-number generation (PR #6)
- **T-003** — Auth: email/password sign-in + session (ADR-0011, resolves Q1) (PR #5)
- **T-001b** — Identity + membership schema + hierarchical RLS (PR #4)
- **T-002** — Supabase bootstrap: clients, env, proxy auth routing (PR #8)
- **T-001 (geography)** — schema + reference RLS + 37 states + types + import path (PR #9)
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
