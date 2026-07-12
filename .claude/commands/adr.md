---
description: Scaffold the next Architecture Decision Record
argument-hint: <the decision, e.g. "use React Email for member emails">
---

Record an architectural decision: **$ARGUMENTS**

Reference:
- ADR process & index: @docs/architecture/decisions/README.md
- Template: @docs/architecture/decisions/template.md

Steps:
1. Determine the next ADR number from the files in `docs/architecture/decisions/`.
2. Create `docs/architecture/decisions/NNNN-<short-kebab-title>.md` from the template.
3. Fill it in properly:
   - **Context** — the situation and forces, stated neutrally (no decision yet).
   - **Decision** — "We will …", in the active voice.
   - **Options considered** — at least two real alternatives with pros/cons.
   - **Consequences** — both positive AND negative; new obligations/risks/follow-ups.
   - Status `Accepted`, today's date, deciders. If it changes an existing decision, mark the
     old ADR `Superseded by ADR-NNNN` and cross-link both.
4. Add the new row to the index table in `docs/architecture/decisions/README.md`.
5. If this ADR came from a Change Request, cross-link the CR.

Keep it concise — an ADR is a short record, not an essay. Present it for review.
