---
description: Start a task the right way — create the branch and update the board
argument-hint: <T-### or task description>
allowed-tools: Bash(git status), Bash(git switch:*), Bash(git pull:*), Bash(git branch:*), Read, Edit
---

Begin work on: **$ARGUMENTS**

Reference: @docs/engineering/git-workflow.md · board: @docs/project/task-board.md

Steps:
1. Identify the task on the board (by `T-###` or description). Confirm it meets the
   **Definition of Ready**; if it doesn't, stop and refine it via `/task` first.
2. Confirm we are not about to work on `main`. Ensure `main` is current:
   `git switch main && git pull` (only if the working tree is clean).
3. Create a branch named `<type>/<kebab-summary>` matching the task's Conventional Commit type
   (`feat`, `fix`, `docs`, `chore`, …). Example: `feat/membership-card`.
4. Move the task to **In Progress** on the board (keep that column to one task at a time).
5. Briefly restate the acceptance criteria and the plan before writing code. Then proceed,
   committing in small Conventional Commits (no AI co-author trailer).

Do NOT commit to `main`. If the guardrail hook blocks a commit, that means you're on `main` —
create the branch first.
