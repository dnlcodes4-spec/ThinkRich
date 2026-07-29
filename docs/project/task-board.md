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
- **T-025** — Notification toasts + remaining catalog (voting reminder N1, card-ready N5)
- **T-026** — Reward oversight (needs product definition)

## 🟡 Ready
_Refined, unblocked, ready to pull._

_(none)_

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

- **T-034** — Host-based routing for the two-origin split (CR-0008, ADR-0014), branch
  `feat/two-origin-split`.
  _Done: `resolveOriginRoute` in `lib/origins.ts` is a pure routing table (`pass | redirect |
  rewrite`); `lib/origin-split.ts` turns it into responses; `proxy.ts` runs it ahead of
  `updateSession`. Config-driven via `NEXT_PUBLIC_APEX_HOST` / `NEXT_PUBLIC_THINK_WINNERS_HOST`,
  a no-op when either is unset, and unrecognised hosts (previews) are left unsplit. 40 unit tests.
  Verified against a production build by `Host`-header probes on both origins, including query
  preservation and the `public/think-winners/` asset collision._
- **T-035** — Think-Winners moves to the subdomain root; cross-origin links fixed.
  _Done: `thinkWinnersHref` / `apexHref` generate links from the same definition the proxy routes
  by, with a test asserting the two are inverse. Fixed the inverted "← ThinkRich" link in
  `nav.tsx`, which pointed at `/` and would have looped back on the new origin. Apex gained a
  "Member login" link (desktop nav + mobile menu). Per-subtree brand tokens unchanged._
- **T-036** — PWA rescoped to `/app`.
  _Done: registrar moved from the root layout into the app shell, its scope and the manifest's
  narrowed from `/` to `/app`, manifest re-branded to Think-Winners navy. No install base to
  migrate (client-confirmed 2026-07-29)._
- **T-037** — ADR-0014 + deployment runbook.
  _Done: [ADR-0014](../architecture/decisions/0014-two-origin-host-split.md) and
  [deployment.md](../engineering/deployment.md), the repo's first deployment doc: Vercel domains,
  Namecheap DNS records, the env-var contract, split verification, and the rollback path._
  _Outstanding for the CR: visual sign-off on both origins, then promote the 307s to 308 once the
  split has been stable in production._

## 🟣 In Review
_PR open, awaiting review + CI._

- **T-024** — Cross-scope member search on the roster (branch `feat/member-search`)
  _Done: `q` searchParam, sanitized `ilike` on name + membership number within RLS scope; search
  box + clear + match count on `/app/members`. Verified live._

## ✅ Done
_Merged to `main`, meets Definition of Done._

- **T-010** — Web Push (PR #24, resolves Q4) + KYM leader verification (PR #26) + wired opt-out/change-request notification events (PR #25)
- **T-023** — In-app notifications: centre + unread badge + announcements (PR #23)
- **T-021** — Admin management: deactivate/reactivate subordinate admins (PR #22)
- **T-020** — Statistics dashboard: scoped member counts + breakdown (PR #21)
- **T-019** — State activation + inactive-state gating (PR #20)
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
