# Code Review

Review is how we keep quality high and share knowledge. Even when self-reviewing (solo work),
run this checklist deliberately before merging — the habit is the point.

## What reviewers optimize for

1. **Correctness** — does it do what the task says, including edge cases?
2. **Security** — authorization, validation, secrets, PII handling.
3. **Simplicity** — is there a clearer, smaller way? Reuse over reinvention.
4. **Consistency** — does it match the [coding standards](coding-standards.md) and its neighbors?
5. **Maintainability** — will someone understand this in six months?

Performance and cleverness are secondary to the above unless the task is explicitly about them.

## Author responsibilities (before requesting review)

- PR is small and focused; title is a valid Conventional Commit.
- Self-reviewed the diff; no debug code, stray logs, or commented-out blocks.
- CI green: lint, typecheck, tests, build.
- [PR template](../../.github/pull_request_template.md) filled; task/ADR linked.
- [Definition of Done](definition-of-done.md#definition-of-done) met.

## Reviewer checklist

### Correctness
- [ ] Implements the acceptance criteria; handles empty/error/edge cases.
- [ ] Framework usage matches Next 16 (awaited async APIs, `proxy` not `middleware`, Server Actions).

### Security & data
- [ ] Authorization enforced by RLS and/or server `requireRole()` — **not UI-only**.
- [ ] All input validated server-side (Zod).
- [ ] No secrets committed; service-role/VAPID private keys stay server-side.
- [ ] Immutable invariants respected (e.g. membership number never mutated).

### Design & quality
- [ ] Simplest reasonable approach; no needless abstraction or duplication.
- [ ] Server/Client component boundary is correct and minimal.
- [ ] Names are clear; structure follows the standards.
- [ ] Errors handled meaningfully; no silent catches.

### Tests & docs
- [ ] Tests cover the new behavior and meaningful edge cases ([testing strategy](testing-strategy.md)).
- [ ] Docs/ADR/CHANGELOG updated where relevant.

## Feedback conventions

Prefix comments to signal intent:

- **`blocking:`** must change before merge.
- **`suggestion:`** improvement, author's discretion.
- **`nit:`** trivial/stylistic; never blocks.
- **`question:`** seeking understanding, not necessarily a change.
- **`praise:`** call out good work — reviews aren't only for problems.

Be kind and specific; critique the code, not the person. Prefer proposing a concrete
alternative over a vague objection.

## Merging

- Resolve all `blocking:` comments; CI green; DoD met → **squash-merge**, delete branch.
- If a review surfaces a decision, capture it (comment thread → ADR when significant).
