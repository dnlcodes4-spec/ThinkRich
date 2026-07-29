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

- **T-005** — Membership card render + download. **Unblocked**: the client supplied the artwork on
  2026-07-29 (`public/cards/`). Superseded by **T-047 / T-048** _(CR-0009 §3.5)_.
- **T-025** — Notification toasts + remaining catalog (voting reminder N1, card-ready N5)
- **T-026** — Reward oversight (needs product definition)
- **T-031b** — **Finish the constituency mapping.** T-031 imported all 1,459 constituencies and
  senatorial LGA membership for 22 of 37 states. Remaining, in order of value:
  1. a **reviewed LGA alias table** (~40 to 60 names) for the 15 states where the 2010 workbook and
     our 2015 LGA names disagree, unlocking Senate races nationwide;
  2. **federal constituency** membership (parseable from the same workbook, same review needed);
  3. **state constituency** membership, which needs INEC's ward-level delimitation, a different
     document this one cannot substitute for.
  Start from `docs/project/data/constituencies/unresolved-review.json`.

### CR-0009 — captured 2026-07-29, not yet refined

Pull order matters: T-038 to T-041 are independent and cheap; T-042 (the ADR) blocks the two items
that touch authorization. See [CR-0009](change-requests/0009-vin-identity-role-upgrades-uncapped-leaders-and-membership-card.md).

- **T-038** — Repair KYM leader verification. Mint a code at provisioning + backfill existing
  leaders/admins (nothing mints one today, which is why verification "doesn't work"), add the
  missing `isAdminConfigured()` guard, give `generateMyKymCode` a real action state. _(§3.6)_
- **T-039** — Any admin may create any role below them. Generalise `allowedTargets()` to match what
  `profiles_insert` already permits, deepen the geography cascade to the target role, delete the
  national-admin special case. Application code only. _(§3.2)_
- **T-040** — Lift the ≤10 leader cap: drop `private.enforce_leader_capacity()` + trigger, update
  both RLS test suites, sweep the eleven docs that state ten as a ceiling. _(§3.4)_
- **T-041** — Tenth-member congratulations on the leader dashboard, dismissible, tracked per leader.
  _(§3.4. UI, needs visual sign-off. Depends on T-040.)_
- **T-042** — **ADR-0015**: where voter identity lives, and the role-upgrade model. _(Blocks T-043,
  T-045.)_
- **T-043** — Migration: `voter_ids` table + FKs from `members` and `profiles`, the partial
  constraint, server-side sanitise/uppercase/validate, VIN required in Zod at registration and
  provisioning. Fixes the 3 fixture rows in the same migration (two share a VIN, none match the
  format). _(§3.1. Depends on T-042. Do before launch: trivial now, expensive once real members
  exist.)_
- ~~**T-044**~~ — **Dropped 2026-07-29.** Existed to backfill VINs before constraining; measurement
  showed 3 test rows and no real members, so nothing to backfill. Folded into T-043.
- **T-045** — Migration: scope columns on member profiles plus backfill. Closes a real RLS hole:
  member profiles carry no scope, so **no admin can currently read or update one**, and promotion is
  impossible without this. _(§3.3. Depends on T-042.)_
- **T-046** — Promote a member to leader (and an admin to any role below the caller): scoped action
  under the caller's own credentials, confirmation UI, activity-log entry, RLS tests per role.
  _(§3.3. UI, needs visual sign-off. Depends on T-045.)_
- **T-047** — Migration: `gender` on `members`, plus the registration and change-request fields.
  Required for the card's GENDER line. _(§3.5)_
- **T-048** — Membership card download: server-side render onto the supplied blank template,
  authorized route handler, member dashboard + leader roster entry points, deduplicated artwork.
  Supersedes T-005. _(§3.5. UI, needs visual sign-off. Depends on T-047.)_

## 🟡 Ready
_Refined, unblocked, ready to pull._

- **T-029** — Admin: design pass on scoped candidacy CRUD, plus national-admin catalogue
  management (offices, parties, elections, constituencies). Functional version exists; needs the
  design method + visual sign-off. _(CR-0007)_
- **T-030** — Member: design pass on the geography-driven candidate view. Functional version
  exists; needs the design method + visual sign-off. _(CR-0007)_

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

- **T-027 / T-028** — Elective-office model (CR-0007, ADR-0013), branch pending.
  _Done: migrations `0016`–`0018` applied (office catalogue, parties, elections, constituencies +
  membership, candidacies; containment RLS; `candidacies_for_geography()` /
  `candidacies_i_manage()`); `candidates` + `candidate_level` dropped (0 rows); types regenerated;
  app rewritten off the dropped table; resolver and scope triggers smoke-tested against live
  geography._
  _Outstanding: RLS tests per role per office type in `supabase/tests/`, and the UI design pass._
- **T-028** — RLS + resolver test suite for the elective-office model.
  _Done: `supabase/tests/elective_offices_rls_test.sql` walks every role against every office kind
  (including the three overlay shapes: single-LGA, multi-LGA, ward-split), plus catalogue
  write-protection, publication gating, the scope triggers, the resolver at ward/LGA/state, and the
  national-admin member paths. Passing, and it rolls back. It caught one real defect in its own
  expectations and one pre-existing bug in `rls_test.sql`, which counted all members and so broke
  once production held any._
- **T-031** — Import the INEC constituency delimitation.
  _Done: sourced INEC's own workbook, wrote `scripts/extract-constituencies.py` +
  `scripts/import-constituencies.mjs`, imported **1,459 constituencies** (109/360/990) and
  senatorial LGA membership for **22 of 37 states** (427 links, 5,017 wards resolving). Parse
  validated against per-state counts and the constitutional 24..40 rule; membership validated by
  exact partition of each state's LGAs. Remainder tracked as **T-031b**._
- **T-032** — Remove the stray `Seed LGA` row.
  _Done: migration `0020`. Counts now match the official 774 / 8,793 / 119,971 exactly._
- **T-033** — Unscope the National Coordinator across the app (CR-0007 §4a).
  _Done: they provision any role at any geography (was State Admin only), manage every tier on the
  Team page (was State Admins only), and register a member into any polling unit with optional
  leader attribution (migration `0019`, which also scoped the ≤10 cap to leaders). Ward admins
  gained the candidates screen. Verified under a real national-admin JWT._
  _Outstanding: the same RLS tests as T-028 should cover these paths._
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
