# Git Workflow

We use **trunk-based development** with short-lived branches and **Conventional Commits**.
`main` is always releasable; work is integrated in small, frequent, reviewed increments.

## Principles

1. `main` is the single long-lived branch and is always in a releasable state.
2. Branches are **short-lived** (hours to a couple of days) and scoped to one task.
3. Every change reaches `main` through a **reviewed Pull Request** — no direct commits.
4. Prefer **small PRs**; they review faster and break less.

## Branch naming

```
<type>/<short-kebab-summary>
```

`type` matches the Conventional Commit types below. Examples:
`feat/leader-registration`, `fix/async-cookies`, `docs/adr-supabase`, `chore/eslint-config`.

## The loop

```bash
git switch main && git pull                 # start from latest main
git switch -c feat/membership-card          # branch
# ...code, committing in small logical steps...
git push -u origin feat/membership-card     # push
# open PR -> CI green -> review -> squash-merge -> branch auto-deleted
git switch main && git pull                 # sync
```

## Commit messages — Conventional Commits

```
<type>(<optional scope>): <description>

[optional body — the "why", wrapped ~72 cols]

[optional footer(s)]
```

**Types:** `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `ci`, `perf`, `build`, `style`.

**Scope** (optional) names the area: `members`, `auth`, `admin`, `db`, `pwa`, `adr`, …

**Breaking changes:** add `!` after type/scope **and** a `BREAKING CHANGE:` footer:

```
feat(auth)!: require email verification before first login

BREAKING CHANGE: existing members must verify email; unverified sessions are rejected.
```

### Why this matters
Conventional Commits let us derive the [CHANGELOG](../../CHANGELOG.md) and SemVer bumps
mechanically (`fix`→patch, `feat`→minor, `BREAKING CHANGE`→major), and make history readable.

### Good vs. bad

| ✅ Good | ❌ Bad |
|--------|--------|
| `feat(members): add opt-out request flow` | `updates` |
| `fix(auth): await cookies() in server client` | `fixed bug` |
| `docs(adr): record RLS as authz boundary (ADR-0005)` | `stuff` |

## Merging

- **Squash-merge** so each task is one clean commit on `main`; the PR title becomes that
  commit and must be a valid Conventional Commit.
- Delete the branch after merge.
- Rebase your branch on `main` to resolve conflicts; avoid merge commits from `main` into branches.

## Pull requests

- Fill in the [PR template](../../.github/pull_request_template.md).
- Link the task ID; reference any ADR.
- Keep PRs focused — one logical change. Split unrelated changes.
- CI must be green and the [Definition of Done](definition-of-done.md#definition-of-done) met.

## What never goes in git

Secrets, `.env.local`, build output, `node_modules`. See [.gitignore](../../.gitignore) and
[SECURITY.md](../../SECURITY.md).
