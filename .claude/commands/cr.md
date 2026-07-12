---
description: Capture a client-requested change as a Change Request (do this before any code)
argument-hint: <what the client said>
---

The client has requested a change: **$ARGUMENTS**

Follow the change-management process — capture and assess it BEFORE writing any code.

Reference (read if you haven't this session):
- Process: @docs/project/change-management.md
- Template: @docs/project/change-requests/template.md
- Register: @docs/project/change-requests/README.md

Steps:
1. Determine the next CR number by inspecting existing files in `docs/project/change-requests/`.
2. Create `docs/project/change-requests/NNNN-<short-kebab-title>.md` from the template, filling in:
   - What the client asked for (their words) and the underlying **why**.
   - A real **impact analysis**: surfaces/roles affected, data/schema impact (does it need a
     migration?), whether it's a breaking change, which invariants are at risk, conflicts with
     the spec or another CR, and a size estimate.
   - Whether it needs an **ADR** (structural/architectural → yes). If yes, note it; offer to run `/adr`.
   - A rollback plan.
3. Add a row to the register table in `docs/project/change-requests/README.md` (status: Captured).
4. Propose the concrete task breakdown (to add via `/task`) — but do not start coding yet.
5. If anything the client said is ambiguous or conflicts with the spec, flag it back rather than guessing.

Present the CR summary and the proposed tasks for confirmation.
