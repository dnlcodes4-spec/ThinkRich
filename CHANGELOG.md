# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are derived from [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
- Supabase bootstrap (T-002): `@supabase/ssr` + `supabase-js` + `zod` + `web-push`; zod-validated
  public env (`lib/env.ts`); browser/server Supabase clients (`lib/supabase/*`, server awaits
  `cookies()` per Next 16); **`proxy.ts`** (the Next 16 rename of middleware) that refreshes the
  session and does optimistic auth routing; `/login` + protected `/app` stubs. Wired to the live
  project via `.env.local`. Tests: 3 env-schema unit + 2 auth-routing E2E (unauth `/app`→`/login`).
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
