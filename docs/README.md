# Documentation

The engineering knowledge base for the Think — Winners Movement platform. Everything here is
**living documentation**: treated as code, reviewed via PR, and updated alongside the changes
it describes.

> 🎓 **New to the project or to professional engineering practice? Start with the
> [Engineering Handbook](HANDBOOK.md)** — it explains every document below, and the concepts
> behind them, in plain language.

## Map

### 📐 Architecture — [`architecture/`](architecture/)
How the system is built and why.
- [overview.md](architecture/overview.md) — C4 diagrams (context → container → component)
- [data-model.md](architecture/data-model.md) — entities, relationships, invariants, RLS summary
- [security-model.md](architecture/security-model.md) — roles, authorization, threat model
- [tech-stack.md](architecture/tech-stack.md) — technologies and Next 16 specifics
- [decisions/](architecture/decisions/) — **Architecture Decision Records (ADRs)**

### 🛠 Engineering — [`engineering/`](engineering/)
How we work.
- [sdlc.md](engineering/sdlc.md) — lifecycle & environments
- [git-workflow.md](engineering/git-workflow.md) — trunk-based dev + Conventional Commits
- [coding-standards.md](engineering/coding-standards.md) — conventions & Next 16 rules
- [code-review.md](engineering/code-review.md) — review checklist & etiquette
- [testing-strategy.md](engineering/testing-strategy.md) — the test pyramid & RLS tests
- [definition-of-done.md](engineering/definition-of-done.md) — Definition of Ready & Done

### 📋 Project — [`project/`](project/)
What we're building and when.
- [roadmap.md](project/roadmap.md) — phases, milestones, open questions
- [task-board.md](project/task-board.md) — in-repo Kanban board
- [change-management.md](project/change-management.md) — how we absorb client changes safely
- [change-requests/](project/change-requests/) — **Change Records (CRs)** per client request

### 📄 Source material
- [BUILD-PLAN.md](BUILD-PLAN.md) — Phase 1 (Members' PWA) build plan
- `Think-winner movement.docx` — the original client specification

## Reading order for a new contributor

1. **[HANDBOOK.md](HANDBOOK.md) → the plain-language guide to all of this (read first)**
2. [Root README](../README.md) → set up locally
3. [CONTRIBUTING](../CONTRIBUTING.md) → how work flows
4. [architecture/overview.md](architecture/overview.md) → the shape of the system
5. [architecture/decisions/](architecture/decisions/) → why it's shaped that way
6. [engineering/coding-standards.md](engineering/coding-standards.md) → before writing code
7. [project/task-board.md](project/task-board.md) → pick up work

## Conventions for docs

- Update docs in the **same PR** as the code they describe.
- Significant decisions become **ADRs**, not edits to old ADRs.
- Prefer Mermaid diagrams (render on GitHub, diff in git) over image files.
