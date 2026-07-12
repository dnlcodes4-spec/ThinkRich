---
description: Run the Definition of Done, then open the PR
allowed-tools: Bash(git status), Bash(git diff:*), Bash(git log:*), Bash(git push:*), Bash(npm run lint), Bash(npm run build), Bash(gh pr create:*), Bash(gh pr view:*), Read, Task
---

Prepare the current branch to merge. Do NOT skip steps to "save time."

Reference:
- Definition of Done: @docs/engineering/definition-of-done.md
- Code review checklist: @docs/engineering/code-review.md

Steps:
1. Confirm we are on a feature branch, not `main`, and show `git status` + a summary of the diff.
2. Run the **Definition of Done** checklist against the change. Explicitly note any item not met.
3. Run the automated gates: `npm run lint` (and `npm run build` if the change warrants it).
   Report results honestly — if something fails, stop and fix, don't proceed.
4. Do a focused self-review using the `code-reviewer` subagent on the diff; address blocking findings.
5. Ensure docs / ADR / CHANGELOG / task board are updated to reflect the change.
6. Push the branch and open a PR with `gh pr create`:
   - Title: a valid Conventional Commit.
   - Body: fill in the repo PR template (summary, linked task/CR/ADR, testing, DoD checklist).
7. Report the PR URL. Do NOT merge automatically — leave the merge decision to the user
   (self-approve + squash-merge once CI is green).
