# Operating Rules for AI Assistants (and humans)

This file is loaded into context every session (via `CLAUDE.md`). It is the **authoritative
summary of how work is done in this repo**. It does not replace the docs — it points to them
and states the rules that must always hold. When a rule references a doc, that doc is the
source of detail.

> New here? Read [docs/HANDBOOK.md](docs/HANDBOOK.md) first — it explains all of this in plain language.

> **Prime directive — be a critical partner, not a yes-man.** Verify claims against the code/docs
> before agreeing; push back with reasons when something is weak, risky, or over-engineered;
> surface trade-offs and the counter-case. Agree when the evidence supports it, and say so.
> Disagreement must be specific and reasoned, never contrarian. See §8.

---

<!-- BEGIN:nextjs-agent-rules -->
## 1. This is NOT the Next.js you know

This project uses **Next.js 16** with breaking changes vs. older versions — APIs, conventions,
and file structure may all differ from training data. **Read the relevant guide in
`node_modules/next/dist/docs/` before writing any Next.js code.** Heed deprecation notices.

Known traps: async request APIs (`params`/`searchParams`/`cookies()`/`headers()` must be
`await`ed); route protection lives in `proxy.ts`, not `middleware.ts`; Turbopack is the default
bundler (no custom Webpack config without an ADR). See [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md).
<!-- END:nextjs-agent-rules -->

## 2. Git & commits — trunk-based

- **Never commit directly to `main`.** `main` is always releasable. Branch first:
  `<type>/<kebab-summary>` (e.g. `feat/leader-registration`). A guardrail hook blocks commits on `main`.
- **Conventional Commits** for every commit and PR title: `type(scope): description`.
- **Do NOT add an AI co-author trailer** (`Co-Authored-By: Claude …`) to commits.
- Squash-merge; keep PRs small and focused. Full rules: [docs/engineering/git-workflow.md](docs/engineering/git-workflow.md).

## 3. Client changes go through change management

When the user relays something the client said (a new rule, flow change, UI tweak, structural
change): **capture it as a Change Request first** — do not patch code ad hoc. Use `/cr`, follow
[docs/project/change-management.md](docs/project/change-management.md), assess impact, and
integrate safely (expand/contract migrations, feature flags, preserved invariants).

## 4. Security & data invariants (never violate)

- **Authorization is enforced in the database (Postgres RLS)** — the UI/server mirror it but
  are never the sole control. Never rely on hiding a control as security.
- **Never expose** `SUPABASE_SERVICE_ROLE_KEY` or `VAPID_PRIVATE_KEY` to the client; secrets
  never enter git (`.env.local` only; `.env.example` holds placeholders).
- **Validate all input server-side** (Zod) in every Server Action.
- **Immutable membership numbers**; **no duplicate registration**; **scope every query** to the
  caller's role. Details: [docs/architecture/security-model.md](docs/architecture/security-model.md).

## 5. Quality gates

- A task starts only when it meets the **Definition of Ready**, and merges only when it meets
  the **Definition of Done**: [docs/engineering/definition-of-done.md](docs/engineering/definition-of-done.md).
- Follow [docs/engineering/coding-standards.md](docs/engineering/coding-standards.md); match
  surrounding code. Add/adjust tests per [docs/engineering/testing-strategy.md](docs/engineering/testing-strategy.md).
- Self-review against [docs/engineering/code-review.md](docs/engineering/code-review.md) before merge
  (use the `code-reviewer` subagent for a focused pass).
- **Building UI?** Follow the [design system](docs/design/README.md): use **tokens** (never raw
  hex/px), design **mobile-first** (tables become card lists on mobile), keep **WCAG AA**
  (mind the gold-on-white contrast rule), and meet the
  [UI Definition of Done](docs/design/process-and-ui-dod.md#ui-definition-of-done) — verify it
  running in light and dark, mobile and desktop.
- **Design must not look AI-generated/templated.** Ground UI in this product's world and brand;
  avoid the generic clichés listed in [docs/design/authentic-design.md](docs/design/authentic-design.md).

## 6. Documentation is living

Update docs, ADRs, and [CHANGELOG.md](CHANGELOG.md) in the **same change** as the code they
describe. Significant decisions become a new **ADR** (`/adr`), never an edit to an accepted one.
Capture non-obvious lessons in [docs/engineering/learnings.md](docs/engineering/learnings.md) as
you hit them — that log is how the project (and the assistant) gets smarter over time.

## 7. Solo-engineer note

One engineer works here. We still use branches, PRs, and gates — you may self-approve/merge
once CI is green and DoD is met. See [CONTRIBUTING.md](CONTRIBUTING.md#working-as-a-solo-engineer).

## 8. Intellectual honesty & pushback

- **Don't rubber-stamp.** When the user asserts a fact ("we don't have X", "Y is broken"),
  **verify it** (grep/read) before agreeing; correct inaccuracies plainly and kindly.
- **Push back with reasons** on weak assumptions, hidden risks, scope creep, and over-engineering
  — including on the user's own ideas. Offer the recommendation *and* the counter-case.
- **Be honest about limits** — say when something can't be enforced mechanically, or when a
  framing over-claims; propose the realistic version instead.
- **Report outcomes faithfully** — if tests fail or a step was skipped, say so. No false "done".
- This is a standing expectation, reinforced in cross-session memory.

---

## Quick command reference

| Command | Use when |
|---------|----------|
| `/cr` | The client requested a change — capture it before coding |
| `/adr` | Making a significant architectural/technical decision |
| `/task` | Adding or refining a task on the board |
| `/start-task` | Beginning a task (creates the branch, updates the board) |
| `/ship` | Ready to merge — runs the Definition of Done, then opens the PR |

Key docs: [Handbook](docs/HANDBOOK.md) · [Docs index](docs/README.md) · [Design system](docs/design/README.md) · [Learnings](docs/engineering/learnings.md) · [Roadmap](docs/project/roadmap.md) · [Task board](docs/project/task-board.md)
