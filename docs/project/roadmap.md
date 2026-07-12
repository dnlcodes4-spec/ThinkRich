# Roadmap

The delivery plan by phase. This is the strategic view; the tactical, day-to-day view is the
[task board](task-board.md). Detail on Phase 1 sequencing lives in
[docs/BUILD-PLAN.md](../BUILD-PLAN.md).

> Legend: ✅ done · 🚧 in progress · ⏳ planned · 🔒 blocked

## Phase 0 — Foundations (engineering governance) 🚧

- ✅ Architecture docs (C4), ADRs, data model, security model
- ✅ SDLC, git workflow, coding standards, code review, testing strategy, DoR/DoD
- ✅ Root governance (README, CONTRIBUTING, SECURITY, CHANGELOG) + GitHub templates
- ✅ Claude Code project configuration (rules, commands, reviewer agent, guardrail hooks)
- ✅ Design system (brand tokens, responsive/dashboard rules, accessibility, UI DoD) — ADR-0006
- ⏳ Repo bootstrap: dependencies, `.env`, Supabase project, `proxy.ts`, base layout
- ⏳ Implement design tokens in code (T-011) + base UI primitives (T-012)

## Phase 1 — Members' App (PWA) 🚧 (current focus)

The member + leader experience, plus the minimal foundation it depends on.

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Supabase schema + migrations + geography seed + RLS | ⏳ |
| 2 | Supabase clients, `proxy.ts`, env, base layout | ⏳ |
| 3 | Auth: login, session, role-based redirect | ⏳ |
| 4 | Leader: register member + membership-number generation | 🔒 (number format) |
| 5 | Membership card render + download | 🔒 (card design) |
| 6 | Member: profile view + photo update + change-request flow | ⏳ |
| 7 | Member: voting/home view + candidates | ⏳ |
| 8 | Opt-out flow (freeze → retain → delete/reactivate) | ⏳ |
| 9 | PWA shell (manifest, service worker, install prompt) | ⏳ |
| 10 | Web Push notifications + KYM | ⏳ |

## Phase 2 — Admin dashboards ⏳

State Admin then National Admin: member management/search, admin management, activation of
states, messaging with templates, statistics/reports, reward oversight.

## Phase 3 — Public website ⏳

ThinkRich Community product showcase (6–7 products) + Think-Winners landing page (vision,
mission, values, leadership, live member count) on its sub-domain.

## Phase 4 — Hardening & scale ⏳

Audit logging, rate limiting, observability, performance, accessibility pass, and an
end-to-end test suite for critical journeys.

---

## Open questions (must be resolved to unblock 🔒 items)

| # | Question | Blocks | Owner |
|---|----------|--------|-------|
| Q1 | Member login credential — membership number, phone, or email? | Auth, registration UX | Client |
| ~~Q2~~ | ✅ **Resolved:** membership number = `TWM-<STATE>-<LGA>-<seq>` (per-LGA, zero-padded) | Deliverable 4 | Client |
| Q3 | Official membership-card design file | Deliverable 5 | Client |
| Q4 | Push notifications in Phase 1 or deferred? | Deliverable 10 scope | Client |
| ~~Q5~~ | ✅ **Resolved:** 36 states + FCT = **37** (seeded) | Geography seed | Client |
| Q6 | Duplicate-registration key — **deferred**: soft-warn now, hard constraint later | Schema uniqueness, deliverable 4 | Client |

Update this table as answers arrive; move unblocked items in the phase table above.
