<!--
PR title MUST follow Conventional Commits, e.g.:
  feat(members): add opt-out request flow
-->

## Summary

<!-- What does this PR do and why? Link the task/ADR. -->

Closes: <!-- task ID or issue link -->
Related ADR: <!-- e.g. docs/architecture/decisions/0003-... , or "none" -->

## Type of change

- [ ] `feat` — new feature
- [ ] `fix` — bug fix
- [ ] `docs` — documentation only
- [ ] `refactor` — no behavior change
- [ ] `test` — tests only
- [ ] `chore` / `ci` / `build` — tooling
- [ ] Contains a **breaking change** (describe in the body + footer)

## How was this tested?

<!-- Commands run, scenarios exercised, screenshots for UI. -->

## Definition of Done checklist

- [ ] Code follows the [coding standards](../docs/engineering/coding-standards.md)
- [ ] Framework code verified against `node_modules/next/dist/docs/` (Next 16 specifics)
- [ ] Input validated server-side (Zod) where applicable
- [ ] Authorization enforced via RLS / server checks — not UI-only
- [ ] Tests added/updated and passing; `npm run lint` clean
- [ ] Docs/ADR/CHANGELOG updated as needed
- [ ] No secrets committed; `.env.example` updated if new vars added
- [ ] Self-reviewed against the [code review checklist](../docs/engineering/code-review.md)
