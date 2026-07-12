# Contributing Guide

This document is the entry point for anyone doing engineering work on the platform.
It ties together our workflow, standards, and quality gates. Read it once in full.

## Working as a solo engineer

This project currently has **one engineer**. We still use PRs, reviews, and the quality gates
below — not as bureaucracy, but because:

- **You are your own reviewer.** The [code review checklist](docs/engineering/code-review.md)
  is how you catch your own mistakes with fresh eyes (open the PR, read the diff top-to-bottom
  before merging). CI is your second reviewer.
- **This is a client project that will outlive today's context.** Six months from now, "why
  did I do this?" is answered by ADRs, Conventional Commits, and change records — not memory.
- **You're training for a team.** The habits that feel like overhead solo are exactly what
  senior engineers do automatically. Building them now is the point.

Pragmatic solo shortcuts that are allowed: you may self-approve and merge your own PR once CI
is green and the [Definition of Done](docs/engineering/definition-of-done.md) is met. Keep PRs
small so self-review actually works.

## Ground rules

1. **`main` is always releasable.** Never commit directly to `main`; work on short-lived branches.
2. **Read before you write framework code.** This repo targets **Next.js 16** — consult
   `node_modules/next/dist/docs/` (see [AGENTS.md](AGENTS.md)). Assumptions from older Next
   versions will be wrong (async request APIs, `proxy` vs `middleware`, Turbopack).
3. **Every change is reviewed** via Pull Request against the [code review checklist](docs/engineering/code-review.md).
4. **Definition of Done is a gate, not a suggestion** — see [definition-of-done.md](docs/engineering/definition-of-done.md).

## The workflow (trunk-based)

Full detail: [docs/engineering/git-workflow.md](docs/engineering/git-workflow.md). In short:

```bash
git switch -c feat/leader-registration     # branch off main
# ... work, committing in Conventional Commits format ...
git push -u origin feat/leader-registration
# open a PR -> pass CI + review -> squash-merge -> delete branch
```

### Branch naming

`<type>/<short-kebab-summary>` — e.g. `feat/membership-card`, `fix/async-cookies`, `docs/adr-supabase`.

### Commit messages — [Conventional Commits](https://www.conventionalcommits.org/)

```
<type>(<optional scope>): <description>

[optional body]

[optional footer, e.g. BREAKING CHANGE: ...]
```

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`, `style`.

Examples:
- `feat(members): add opt-out request flow`
- `fix(auth): await cookies() in server supabase client`
- `docs(adr): record Supabase as backend (ADR-0003)`

## Definition of Ready → Done

- A task is **Ready** to start only when it meets the [Definition of Ready](docs/engineering/definition-of-done.md#definition-of-ready).
- A task is **Done** only when it meets the [Definition of Done](docs/engineering/definition-of-done.md#definition-of-done).

## Where work is tracked

The [task board](docs/project/task-board.md) (in-repo markdown) is the current source of truth,
graduating to GitHub Issues/Projects once a remote exists. Link every PR to a task ID.

## Making an architectural decision

Non-trivial technical decisions get an **ADR**. Copy
[docs/architecture/decisions/template.md](docs/architecture/decisions/template.md),
number it sequentially, and open it in the same PR as the change (or ahead of it).

## Getting set up

See the [README](README.md#getting-started). If a step is missing or wrong, fixing the docs
is a valid PR — treat docs as code.
