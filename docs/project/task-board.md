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

- **T-055** — Regression test pinning plural position holders: two `state_admin`s in one state, two
  `lg_admin`s in one LGA, two `unit_coordinator`s over one polling unit, plus the refusals that must
  survive (peer cannot update peer, no cross-scope or upward insert). Stops a later "tidy-up" adding
  a `unique (role, scope)` index and silently breaking the client's requirement. _(CR-0011)_
- **T-056** — Surface co-admins read-only on the Team page, and state the plurality invariant in
  `security-model.md`. RLS already permits the read; the gap is presentational. _(CR-0011 §3.1)_

- **T-054** — Arm logos in the arms explorer. Two of six exist (`TCMS_transparent.png` = the MCPS
  Cooperative arm; `BeRich_transparent.png` maps to no arm we list). **Not wired up deliberately:**
  both are red/blue/yellow shield-and-sunburst marks, one containing a stock handshake photo, and
  beside the green umbrella mark on an ink ground they read as clip art. Needs either a redraw in the
  umbrella palette or a client decision to accept the clash. Reasoning in `public/logos/CREDITS.md`.

- **T-005** — Membership card render + download. **Unblocked**: the client supplied the artwork on
  2026-07-29 (`public/cards/`). Superseded by **T-047 / T-048** _(CR-0009 §3.5)_.
- **T-025** — Notification toasts + remaining catalog (voting reminder N1, card-ready N5)
- **T-026** — Reward oversight (needs product definition)
- **T-031b** — **Finish the constituency mapping.** T-031 imported all 1,459 constituencies and
  senatorial LGA membership for 22 of 37 states. _(CR-0013.)_ Progress:
  1. ✅ **Federal constituency membership — 16 states done** (315 links, 3,556 wards, verified
     one-FC-per-ward) via `scripts/analyze-federal-constituencies.py` (maximal-munch). House of
     Reps now resolves there.
  2. a **reviewed LGA alias table** (~40 to 60 names) for the 15 states where the 2010 workbook and
     our 2015 LGA names disagree, unlocking Senate nationwide + 4 more federal states
     (Anambra, Bayelsa, Ondo, Oyo);
  3. the 17 **split-LGA** federal states and all **state constituencies** need ward-level data —
     handled by the in-app editor (**T-031c**), not this source.
  Start from `docs/project/data/constituencies/unresolved-review.json`.
- **T-031c** — **Manual constituency-membership editor.** Let a national admin attach the
  wards/LGAs of a constituency in-app. **UI-only**: schema, grants, RLS (`catalogue_write` =
  national_admin) and the enforce trigger (auto-fills `kind`, rejects cross-state) are already in
  place — verified live allow/deny 2026-08-03. Build a national-admin UI with the live coverage
  preview shared with T-029, plus a regression test in `supabase/tests/` mirroring the allow/deny
  check. Unblocks State Assembly + the split-LGA states. _(CR-0013 §4b; UI, visual sign-off.)_

## 🟡 Ready
_Refined, unblocked, ready to pull._

- **T-058** — Add a "Join the community" row (Telegram + WhatsApp links) to the Think-Winners
  landing footer in `app/think-winners/page.tsx`, styled to the existing navy/gold footer.
  **Acceptance:** both links present and correct (Telegram `https://t.me/+RN9Fxs0-4WBmNDdk`,
  WhatsApp `https://chat.whatsapp.com/Cmkg0QWIJtiExqVrj0rDzA`), `target="_blank"` +
  `rel="noopener noreferrer"`, WCAG AA contrast, verified light/dark + mobile/desktop, visual
  sign-off obtained before commit. _(CR-0012)_
- **T-059** — Add the same links as a "Join our community" block on `/app/account` (member app),
  styled to the app's existing theme tokens. **Acceptance:** same links/attributes as T-058,
  matches surrounding account-page layout, verified light/dark + mobile/desktop, visual sign-off
  obtained before commit. _(CR-0012)_
- **T-029** — Admin: design pass on scoped candidacy CRUD, plus national-admin catalogue
  management (offices, parties, elections, constituencies). Functional version exists; needs the
  design method + visual sign-off. _(CR-0007)_
- **T-030** — Member: design pass on the geography-driven candidate view. Functional version
  exists; needs the design method + visual sign-off. _(CR-0007)_

## 🟠 In Progress
_One person, one task at a time. Keep this column small._

- **T-050 … T-053** — Leadership section on both landings + the President's profile page
  (CR-0010), on `feat/leadership-section-and-president-profile`.
  _Done: `lib/leadership.ts` content module with 13 tests; the `Leadership` section component,
  brand-parametrised and mounted on both landings with per-audience copy; `/leaders/president` as a
  full editorial page; "Leadership" added to the ThinkRich nav, which now also takes a `base` so its
  anchors work away from the landing. Client portraits cropped to five normalised 4:5 plates with
  the recipe recorded in `public/leaders/CREDITS.md`. Roster reading and the President's styling
  confirmed by the client. Lint, typecheck, 100 tests and the production build are green._
  _Two things the photographs forced, both in CR-0010 §9: the supporting band dropped from a 2+1+1
  layout to equal thirds because only one of the Vice President's two images is usable, and the
  President's spread was rebuilt (primary fills its column, second insets off the corner) after the
  side-by-side pair computed smaller than the portraits below it and inverted the hierarchy._
  _Outstanding: visual sign-off, then a clean second portrait of the Vice President and a
  watermark-free copy of the Secretary's photo from the client._

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

- **T-038 … T-049** — CR-0009 (VIN identity, role upgrades, uncapped leaders, membership card,
  KYM repair), ADR-0015, branch `feat/t-041-t-049-cr-0009-remainder`.
  _Done: **T-038** KYM codes are minted by the database on profile insert and on promotion, and every
  existing leader/admin backfilled (`0021`); verification moved off the service role to a
  `SECURITY DEFINER` `verify_kym_code()` returning only public identity (`0022`).
  **T-039** `allowedTargets()` generalised to every role below the caller, matching `profiles_insert`
  and deleting the national-admin special case.
  **T-040** the ≤10 cap dropped (`0023`) with an eleven-site docs sweep.
  **T-041** permanent milestone badge on the leader dashboard.
  **T-042** [ADR-0015](../architecture/decisions/0015-voter-identity-and-role-upgrades.md).
  **T-043** `voter_ids` table + FKs + partial constraints (`0024`), `lib/vin.ts` normalisation with
  10 unit tests, VIN required at registration and provisioning; `0029` tightened the policies after
  the Supabase advisor flagged an always-true INSERT and an over-broad read.
  **T-045** member-profile scope backfilled + kept in step by a trigger (`0026`), closing the RLS
  hole where no admin could read or write any member profile.
  **T-046 / T-049** role change under the caller's own credentials, with demotion blocked while a
  leader still holds members (`0028`).
  **T-047** `members.gender` (`0025`). **T-048** server-rendered membership card behind an authorized
  route, field geometry measured off the blank artwork.
  Verified live: 12/12 leadership profiles hold codes, a leader registered 15 members, all four
  privilege-escalation refusals hold, and a member can neither read nor write `voter_ids`.
  Suites: `supabase/tests/kym_test.sql`, `supabase/tests/role_change_test.sql`, 74 unit tests._
  _Outstanding: visual sign-off (deferred by the user), and **T-044 dropped** (no VINs to backfill).
  T-048 prints a **system-assigned** ward number, not an INEC code, per the client's direction._

## 🟣 In Review
_PR open, awaiting review + CI._

- **T-024** — Cross-scope member search on the roster (branch `feat/member-search`)
  _Done: `q` searchParam, sanitized `ilike` on name + membership number within RLS scope; search
  box + clear + match count on `/app/members`. Verified live._

## ✅ Done
_Merged to `main`, meets Definition of Done._

- **T-060** — Migration: `phone` on `profiles` + `members` + shared `lib/phone.ts` (PR `c96db0e`) _(CR-0017)_
- **T-061** — Phone field on every creation form (new-account, dev bootstrap, register) (PR `fdc75c4`) _(CR-0017)_
- **T-062** — Widened member-registration authorization to all coordinator tiers, National→Leader (PR `fdc75c4`) _(CR-0017)_
- **T-010** — Web Push (PR #24, resolves Q4) + KYM leader verification (PR #26) + wired opt-out/change-request notification events (PR #25)
- **T-023** — In-app notifications: centre + unread badge + announcements (PR #23)
- **T-021** — Admin management: deactivate/reactivate subordinate admins (PR #22)
- **T-020** — Statistics dashboard: scoped member counts + breakdown (PR #21)
- **T-057** — State activation lifecycle: a state closes when it loses its last State Coordinator
  (migration `0031`, 13 assertions in `supabase/tests/state_activation_test.sql`). Found in
  production via the national map: Ogun and Oyo sat open with no coordinator because deleting an
  account never reversed the activation. Closing is enforced in the database and one-directional;
  opening stays an intentional act. _(CR-0011 §3.2)_ · **completes** T-019's other edge
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
