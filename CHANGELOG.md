# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are derived from [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
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
