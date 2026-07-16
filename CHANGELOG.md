# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are derived from [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Changed
- **ThinkRich → black + green** (CR-0006 / ADR-0010, amending ADR-0008): the ThinkRich umbrella
  (root site + member app + shared UI primitives) rebrands from navy + gold to a near-black `ink-*`
  scale + the **logo green** (`green-*` re-sampled from the ThinkRich Community logo). Root
  components swap `navy-* → ink-*` and `gold-* → green-*`; the member app/primitives get it via the
  semantic tokens (light + dark). **Think-Winners keeps navy + gold** (untouched).
- **Premium pass (root):** replaced the philosophy four-cell grid with a connected "one idea,
  four moves" flow whose links draw in on scroll; finished purging em dashes from the remaining
  user-facing copy (page titles, meta descriptions, form messages, login). Fixed the `#community`
  image alt to match the photo.
- **Premium copy + component pass:** rewrote the marketing copy into scannable fragments and
  purged em dashes from all user-facing copy. Replaced the Think-Winners process timeline with an
  interactive step-through "journey" (one step in focus at a time), and reframed "What we bring"
  from an eight-item list into three themed capability cards (the vital few).
- **Type system** (ADR-0009): replaced the scaffold's Geist with **Hanken Grotesk** (body) +
  **Zodiak** (ThinkRich display, self-hosted Fontshare serif) + Fraunces retained for
  Think-Winners; per-surface display face via `--font-display-face`. Removes the "AI-default"
  Geist tell. JetBrains Mono still carries numerals pending consolidation onto Hanken tabular-nums.
- **ThinkRich landing polish:** wired client-generated hero photography (optimised), removed the
  per-slide eyebrow labels, set the slider cadence to 5s, and fixed `#join`'s self-referential CTA.
- **Mobile-first restructure:** Think-Winners rebuilt from 9 sections to 6 (dropped the redundant
  reach band, folded benefits into "what we bring", merged vision + principles), and both landings
  compacted (Think-Winners ~13.4→8.9 phone screens; root ~8.4→6.8). Added cross-nav CTAs
  (ThinkRich → Think-Winners, and Think-Winners → back to ThinkRich).
- **Rule:** banned em dashes project-wide as an AI tell (authentic-design.md).

### Fixed
- Arms explorer: guard the mobile-accordion collapsed state (`active = -1`) so the desktop
  panel and deep-link URL effect no longer crash on `arms[-1]`; the mobile accordion now uses
  its own state and starts collapsed.
- Hero slider: auto-advance no longer freezes on hover/focus of the full-screen hero (explicit
  Pause/Play only); each segment's progress restarts from 0; completed segments stay filled.
- Gated the internal `/think-winners/organization` page — 404s in production unless
  `ENABLE_INTERNAL_PAGES=1` (T-022), on top of its existing noindex.

### Added
- National-admin bootstrap (T-016, ADR-0012): a **dev-only** page at `/dev/national-admins` that
  creates, lists, and deletes national admins with a generated temporary password, solving the
  chain's start point (nothing sits above a national admin). Gated strictly on
  `NODE_ENV !== "production"` — the page `notFound()`s and every Server Action refuses in a prod
  build (verified: prod returns 404, dev returns 200); it lives outside the proxy-gated `/app`
  because bootstrapping runs with no session. Production's first national admin is a deliberate
  one-time DB seed instead (ADR-0012). Extracted the shared `generateTempPassword` helper. Verified
  live: created an admin, signed in as them, reached the provisioning page, deleted them (auth user
  + profile both removed).
- Admin account provisioning (T-015): an admin creates the **next tier down** within their own
  scope at `/app/admin/new-account` (National→State→LG→Ward→Unit-coordinator→Leader). The Server
  Action re-enforces the same hierarchy the RLS `profiles_insert` policy does, because the
  service-role client used to create the auth user + profile bypasses RLS; the chosen geography is
  validated to sit inside the caller's scope, and a temporary password is returned once (change on
  first sign-in). The auth user is rolled back if the profile insert fails (no orphan users). The
  admin service-role client is isolated in `lib/supabase/admin.ts` (server-only by convention +
  runtime env guard). Deferred: member login provisioning (invite flow). Verified live end-to-end
  (National provisioned a State admin, who then signed in and saw only their in-scope LGAs).
- Member roster (T-006a): a scoped list of members at `/app/members` — a leader sees the members
  they registered, admins see their geography, all via RLS (no app-side scope logic). Responsive
  table (desktop) / cards (mobile) on the primitives, with the membership number, registered date,
  and status; empty state + a "View members" entry on `/app`.
- Member registration (T-004): a leader registers a member via a server-validated form. Geography
  is auto-derived from the leader's own polling unit; the membership number `TWM-<STATE>-<LGA>-<seq>`
  is assigned atomically by the DB (per-LGA counter + BEFORE INSERT trigger). Enforces NIN
  uniqueness, age ≥18, and the ≤10-active-members cap, with friendly errors. Email is captured for
  the member's future login account. Deferred: passport-photo upload (needs Storage) and provisioning
  the member's login account (invite flow). Verified live end-to-end (numbers, sequence, invariants).
- Authentication (T-003, ADR-0011, resolves Q1): **email + password** sign-in via Supabase Auth.
  Server-validated `signIn`/`signOut` actions, a login form on the (now black + green) primitives,
  a safe `next` redirect, and sign-out + role display on `/app`. No public sign-up (accounts are
  provisioned). Login-page + invalid-credentials e2e; happy path verified with a provisioned account.
- Identity + membership + hierarchical RLS (T-001b): corrected geography to `polling_units`
  (child of ward, CR-0002); `profiles` + `members` with the `role`/`member_status` enums and the
  invariants (immutable `TWM-<STATE>-<LGA>-<seq>`, unique NIN, age ≥18, ≤10 active/leader,
  geographic consistency); full hierarchical RLS (National→…→Member) with role-rank provisioning
  (no privilege escalation) and member self-reads only. Helpers live in a non-exposed `private`
  schema (security advisors clean). Verified by `supabase/tests/rls_test.sql`; types regenerated.
- Dual-brand palette (T-014, from CR-0001): **ThinkRich Community = navy**, **Think-Winners
  Movement = green**, switched via `data-brand` (only the primary hue + focus ring change; gold
  accent, neutrals, surfaces, status shared). Added an AA-verified `green-*` scale (green-700
  `#15602E` = 7.65:1 both ways), light/dark variants, a brands demo on the gallery, and an E2E
  asserting the switch. Recorded in ADR-0007 (amends ADR-0006). Green is provisional pending the
  official asset. Also re-applied Q5/Q6 roadmap resolutions lost in the parallel-merge churn.
- Database foundation (T-001, geography): `states → lgas → wards` + `units`/`unit_wards` schema
  with reference-data RLS (world-readable, service-role writes); the **37** states (36 + FCT)
  seeded; generated types (`lib/database.types.ts`); and a documented LGA/ward **import path**
  (`supabase/README.md`) pending an authoritative dataset. Membership-number format confirmed
  (`TWM-<STATE>-<LGA>-<seq>`); duplicate-registration key deferred (soft-warn now). Migrations in
  `supabase/migrations/` applied to the project; security advisor clean. Identity (`profiles`,
  `members`) + hierarchical RLS follow in the next migration.
- Test tooling (T-013): **Vitest** + React Testing Library (unit/component) and **Playwright**
  (E2E on a dedicated port), with `test` / `test:watch` / `test:e2e` / `typecheck` scripts and a
  **GitHub Actions CI** workflow (lint → typecheck → unit → build, plus an E2E job) on every PR.
  First tests: `cn`, `Button`, `Input`, `StatusPill` (14 unit) + a home/theme-toggle E2E (2).
- Fixed a hydration warning by adding `suppressHydrationWarning` to `<html>` (the no-flash theme
  script sets `data-theme` before hydration) — surfaced by the new E2E.
- Base UI primitives (T-012) in `components/ui/`: `Button` (6 variants, 3 sizes, loading/disabled),
  `Input` (label/hint/error + a11y wiring), `Card`, `StatusPill` and `RoleBadge` (icon+text, never
  colour alone), `RecordCard` and `DataTable` (the mobile-card / desktop-table building blocks) —
  all token-driven and accessible; a `cn()` helper; a component gallery home page. No automated
  tests yet (blocked on T-013).
- Design tokens implemented in code (T-011): brand navy/gold scales + semantic tokens as
  Tailwind v4 utilities in `app/globals.css`, light/dark theming via `data-theme` with a
  no-flash inline script and a `ThemeToggle`, real project metadata, and a token-verification
  home page. Verified: lint + production build pass; both theme rule-sets compile.
- Governance hardening: intellectual-honesty/pushback rule (AGENTS.md §8 + reviewer agent),
  authentic-design guidance to avoid generic/AI-generated UI (`docs/design/authentic-design.md`
  + UI DoD), a learnings log (`docs/engineering/learnings.md`) with a "capture learnings" DoD
  step, a consolidated notification system doc (`docs/architecture/notifications.md`), and
  notification/event-driven testing added to the testing strategy.
- Design system (`docs/design/`): design principles, brand & colour system (navy/gold tokens
  sampled from the logo and WCAG-AA contrast-verified, with light/dark and the gold-on-white
  rule), typography, layout/spacing/grid, responsive & dashboard rules (tables→cards on mobile),
  component guidelines, accessibility (WCAG 2.1 AA) standards, UX-by-user-type, and a design
  process with a UI Definition of Done. Recorded in ADR-0006. Brand asset `public/logo.jpeg` tracked.
- Engineering governance suite: architecture docs (C4), Architecture Decision Records,
  SDLC, Git workflow, coding standards, code review checklist, testing strategy,
  Definition of Ready/Done, roadmap, and in-repo task board.
- Engineering Handbook (`docs/HANDBOOK.md`): a plain-language, junior-friendly guide to the
  whole setup and the practices behind it.
- Client change-management process (`docs/project/change-management.md`) with a Change
  Request register and template for safely integrating client-requested changes.
- Solo-engineer guidance in CONTRIBUTING.
- Claude Code project configuration (`.claude/`): operating rules in AGENTS.md;
  slash commands (`/cr`, `/adr`, `/task`, `/start-task`, `/ship`); a tuned
  `code-reviewer` subagent; guardrail hooks (block commits on `main`, lint edited
  files); and a safe-command permission allow-list.
- Root project docs: README, CONTRIBUTING, SECURITY, and this CHANGELOG; `.env.example`.
- GitHub templates: pull request template, issue templates, CODEOWNERS.

<!--
Release template — copy when cutting a version:

## [X.Y.Z] - YYYY-MM-DD
### Added        (new features)
### Changed      (changes in existing functionality)
### Deprecated   (soon-to-be removed features)
### Removed      (now removed features)
### Fixed        (bug fixes)
### Security     (vulnerability fixes)
-->
