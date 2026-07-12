---
description: Add or refine a task on the in-repo task board
argument-hint: <task description>
---

Add/refine this task on the board: **$ARGUMENTS**

Reference:
- Board: @docs/project/task-board.md
- Ready/Done gates: @docs/engineering/definition-of-done.md

Steps:
1. Determine the next `T-###` id from the board.
2. Add the task to the correct column:
   - **Ready** only if it meets the Definition of Ready (clear objective, acceptance criteria,
     unblocked, size fits a short-lived branch). Otherwise **Backlog**.
3. Write it with:
   - A one-line objective.
   - Verifiable acceptance criteria.
   - Any dependencies/blockers (e.g. open client questions) marked with 🔒 and the blocker.
   - A link to its parent CR / roadmap phase if applicable.
4. Keep IDs stable; do not renumber existing tasks.

Show the updated board section.
