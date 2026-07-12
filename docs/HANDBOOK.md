# The Engineering Handbook — Read Me First

> A plain-language guide to *everything* we've set up on this project: what each piece is,
> **why** it exists, and how professional software teams actually work. If you're newer to
> this, read this top-to-bottom once. It's written to take you from "I can write code" toward
> "I think like a senior engineer at a serious company."

Nothing here assumes prior knowledge of the tools or the jargon — every term is explained the
first time it appears. Keep it open beside you for the first few weeks.

---

## 1. What are we building?

The **Think — Winners Movement Management Platform** — software for a Nigerian membership
movement (a client's product). It has three parts, called **surfaces**:

1. A **public website** that advertises the client's products.
2. A **members' app** — an *installable* web app that members and their "Leaders" use.
3. **Admin dashboards** — a chain of command: National → State → Local Government → Unit → Leader.

The defining feature is **hierarchy**: who can see and do what depends on their level. A
Leader manages exactly 10 members; a State Admin manages one state; the National Admin runs
everything. Getting that access control right — so nobody sees data they shouldn't — is the
most important job of the system.

The full requirements are in the client's spec (`docs/Think-winner movement.docx`) and our
[build plan](BUILD-PLAN.md). We're building the **members' app first**.

---

## 2. Why all these documents? Isn't this overkill for one person?

Fair question. Here's the honest answer, and it's the single most important idea in this handbook:

> **Professional engineering is not just writing code that works today. It's building a system
> that a team can safely change for years — including "future you," who will have forgotten
> everything.**

The difference between a junior and a senior developer is rarely raw coding skill. It's
*judgment* and *discipline*: writing down decisions, making changes safely, thinking about the
next person. Big tech companies (Google, Meta, Amazon, etc.) don't run on heroics — they run
on **process and documentation** that make good outcomes repeatable.

You're solo now, but you're a client's only engineer on a product that will keep changing.
These habits protect you (traceability, no "I forgot why", nothing silently breaks) *and* they
are exactly the muscles you need to work on a big team later. We're practising the real thing
at small scale. See [CONTRIBUTING.md → Working as a solo engineer](../CONTRIBUTING.md#working-as-a-solo-engineer).

---

## 3. A guided tour of everything we set up

Think of the repo as having three kinds of documents: **architecture** (how the system is
built), **engineering** (how we work), and **project** (what we're building and client
changes). Plus root-level "front door" files.

### Root — the front door
| File | What it is | Why it matters |
|------|-----------|----------------|
| [README.md](../README.md) | Project intro + how to run it | First thing anyone reads |
| [CONTRIBUTING.md](../CONTRIBUTING.md) | How to do work here | The workflow rulebook |
| [SECURITY.md](../SECURITY.md) | How we handle security & report issues | We store people's personal data |
| [CHANGELOG.md](../CHANGELOG.md) | Human list of what changed each release | So the client & future-you can see history |
| [.env.example](../.env.example) | Template of required secrets | Real secrets never go in git |
| [.github/](../.github/) | PR & issue templates, CODEOWNERS | Standardizes how changes/bugs are proposed |

### Architecture — how the system is built ([docs/architecture/](architecture/))
| File | What it is | Why it matters |
|------|-----------|----------------|
| [overview.md](architecture/overview.md) | Diagrams of the system at 3 zoom levels (**C4**) | You can't safely change what you can't picture |
| [data-model.md](architecture/data-model.md) | The database: tables, links, rules | The data is the heart of the app |
| [security-model.md](architecture/security-model.md) | Roles + how access is enforced | The #1 risk is leaking members' data |
| [tech-stack.md](architecture/tech-stack.md) | Our technologies + why | Shared vocabulary; onboarding |
| [decisions/](architecture/decisions/) | **ADRs** — records of big decisions | Answers "why did we do it this way?" forever |

### Engineering — how we work ([docs/engineering/](engineering/))
| File | What it is | Why it matters |
|------|-----------|----------------|
| [sdlc.md](engineering/sdlc.md) | The lifecycle: idea → shipped | The map of our whole process |
| [git-workflow.md](engineering/git-workflow.md) | Branching + commit message rules | Keeps history clean & `main` always working |
| [coding-standards.md](engineering/coding-standards.md) | How our code should look | Consistency = readability = fewer bugs |
| [code-review.md](engineering/code-review.md) | The review checklist | Catch problems before they ship |
| [testing-strategy.md](engineering/testing-strategy.md) | What we test and how much | Confidence to change things fast |
| [definition-of-done.md](engineering/definition-of-done.md) | The "Ready" and "Done" gates | Stops half-baked work entering/leaving |

### Project — what & when, and client changes ([docs/project/](project/))
| File | What it is | Why it matters |
|------|-----------|----------------|
| [roadmap.md](project/roadmap.md) | Phases, milestones, open questions | The strategic plan |
| [task-board.md](project/task-board.md) | Kanban board of tasks (`T-###`) | The day-to-day to-do list |
| [change-management.md](project/change-management.md) | How we absorb client changes safely | Client requests won't break the live product |
| [change-requests/](project/change-requests/) | **CRs** — a record per client change | Traceability from "client said" to shipped code |

---

## 4. The core concepts — explained from scratch

These are the "big tech" ideas embedded in the docs above. Learn these and you'll understand
*why* the process is shaped the way it is.

### C4 model (architecture diagrams)
A way to draw software at four zoom levels — **C**ontext (the system + its users), **C**ontainers
(the big deployable parts), **C**omponents (pieces inside a container), **C**ode. We use the
first three. Why: one giant diagram is unreadable; zoom levels let you show the right amount of
detail for the question being asked. See [overview.md](architecture/overview.md).

### ADR — Architecture Decision Record
A short, numbered document recording *one important decision*: the context, the choice, and the
consequences. Once accepted, an ADR is **never edited** — if the decision changes, you write a
new one that "supersedes" it. Why: in a year, nobody remembers why you picked Supabase over
Firebase. The ADR remembers. Writing an ADR also *forces you to think the decision through*.
This is one of the strongest signals of a mature engineer. See [decisions/](architecture/decisions/).

### Trunk-based development (our Git workflow)
`main` (the "trunk") is always kept in a **working, shippable state**. You never edit it
directly. You make a short-lived **branch** (a private copy), do your change, then merge it back
via a Pull Request. Why: `main` never breaks, changes are small and reviewable, and you can
ship any time. This is how most fast-moving companies work. See [git-workflow.md](engineering/git-workflow.md).

### Pull Request (PR)
A proposal to merge your branch into `main`. It shows the exact changes (the "diff"), runs
automated checks, and gets reviewed before merging. Even solo, opening a PR lets you re-read
your own work with fresh eyes and lets the robots (CI) check it.

### Conventional Commits
A format for commit messages: `type(scope): description`, e.g. `feat(members): add opt-out
flow`. Why: consistent history that both humans *and tools* can read — we can auto-generate the
changelog and version numbers from it. Types: `feat`, `fix`, `docs`, `refactor`, `test`,
`chore`, etc. See [git-workflow.md](engineering/git-workflow.md#commit-messages--conventional-commits).

### Semantic Versioning (SemVer)
Version numbers as `MAJOR.MINOR.PATCH` (e.g. `2.4.1`). Bug fix → bump PATCH; new feature →
bump MINOR; breaking change → bump MAJOR. It tells users how risky an upgrade is at a glance.

### Definition of Ready / Definition of Done
Two checklists that act as **gates**. A task can't be *started* until it's "Ready" (clear goal,
acceptance criteria, no blocking unknowns). It can't be *merged* until it's "Done" (works,
tested, reviewed, docs updated, secure). Why: gates make quality a property of the *process*,
not of how careful you felt that day. See [definition-of-done.md](engineering/definition-of-done.md).

### The Test Pyramid
Have **many** fast, tiny **unit tests** (test one function), **some** **integration tests**
(test parts working together, e.g. against the real database), and a **few** **end-to-end (E2E)
tests** (drive the whole app like a user). Why: fast tests give quick feedback; slow tests are
expensive, so you use fewer of them on only the most important journeys. See
[testing-strategy.md](engineering/testing-strategy.md).

### Row-Level Security (RLS) & "defense in depth"
Our database (Postgres, via Supabase) can enforce rules like "a Leader can only read their own
10 members" *at the database level*. That's **RLS**. We make the database the final authority on
access — even if the app code has a bug, the database won't hand over data the user isn't
allowed to see. Layering multiple defenses (UI hides buttons, server double-checks, database
enforces) is called **defense in depth**. Why it's a big deal here: the whole system is about
who-can-see-what. See [security-model.md](architecture/security-model.md) and
[ADR-0005](architecture/decisions/0005-rls-as-authorization-boundary.md).

### PWA — Progressive Web App
A website built so it can be **installed** to a phone/computer home screen and behave like a
native app (its own icon, notifications) — without an app store. The members' app is a PWA.
Why: reach everyone with one codebase, ship updates instantly. See
[ADR-0004](architecture/decisions/0004-pwa-for-members-app.md).

### CI/CD & environments
**CI (Continuous Integration):** every PR automatically runs the linter, type checker, tests,
and a build. If any fail, you fix before merging. **CD (Continuous Deployment):** merging to
`main` automatically deploys. **Environments** are separate copies of the running app:
*local* (your machine), *preview/staging* (for testing a change), *production* (real users).
Why: robots catch mistakes tirelessly, and you never test risky things on real users. See
[sdlc.md](engineering/sdlc.md#environments).

### Feature flags & expand/contract migrations (safe change techniques)
Two techniques for changing a **live** system without breaking it:
- **Feature flag:** build new behavior behind an on/off switch. Ship it *off*, test it, then
  flip it *on*. If it misbehaves, flip it back — instant rollback.
- **Expand/contract:** to change the database safely, first *add* the new thing (old code still
  works), *migrate* the data, then *remove* the old thing once nothing uses it. Never rip-and-
  replace in one destructive step on real data.

These are central to how we handle client changes — see [change-management.md](project/change-management.md).

---

## 5. How a real change flows (a worked example)

Say the client calls and says: *"Actually, don't call them 'Units', call them 'Cells', and add
a phone number to each member's card."* Here's the professional path — and how the docs guide it:

1. **Capture it.** Create `CR-0001` from the [CR template](project/change-requests/template.md).
   Write what they said, *why*, and add it to the [register](project/change-requests/README.md).
   *(You didn't touch code yet — you turned a phone call into a durable record.)*
2. **Assess impact.** "Units → Cells" touches the UI *and* the database (a table/column rename)
   *and* every screen that says "Unit". "Add phone to card" touches the card renderer and maybe
   the data. You note: rename needs a careful **expand/contract migration**; the card change is small.
3. **Decide.** The rename is structural enough to record an **ADR** (it changes shared
   vocabulary and the schema). The card tweak doesn't need one.
4. **Plan.** Break it into tasks on the [board](project/task-board.md): `T-021` migration,
   `T-022` UI rename, `T-023` card phone field. Each links back to `CR-0001`.
5. **Build safely.** Branch `feat/rename-unit-to-cell`. Do the migration in expand/contract
   steps so nothing breaks mid-deploy. Small commits, Conventional Commit messages.
6. **Verify.** CI green; test the migration on a copy of the data; click through staging.
7. **Ship & record.** Squash-merge → deploy. Update `CR-0001` to *Shipped*, update the
   [CHANGELOG](../CHANGELOG.md), note the rollback plan, confirm with the client.

Now trace it backwards: any line of that shipped code → its PR → its task → `CR-0001` → the
client's exact words. That chain is what "professional" actually means in practice.

---

## 6. The one project-specific rule you must not forget

This repo uses **Next.js 16**, which changed several things from older versions that tutorials
(and your instincts) still assume. Examples: some APIs must now be `await`ed; the file that
guards routes is `proxy.ts`, not `middleware.ts`; the bundler changed.

**Rule:** before writing Next.js-specific code, read the relevant guide in
`node_modules/next/dist/docs/`. This is enforced in [AGENTS.md](../AGENTS.md) and
[coding-standards.md](engineering/coding-standards.md). Why it's a great habit generally:
*senior engineers verify against the real docs instead of trusting memory.*

---

## 7. What "growing to senior / big tech" actually looks like

The tools above are scaffolding for a mindset. As you work, practise these:

- **Think about the next person** (who is often future-you). Leave a trail: ADRs, CRs, clear commits.
- **Make change safe, not scary.** Small steps, reversible, behind gates and flags. Confidence
  comes from safety nets, not from being careful.
- **Write things down before you build.** A CR or ADR you write in 10 minutes saves hours of
  confusion later — and reveals bad ideas before you've coded them.
- **Security and correctness over cleverness.** Especially here: it's real people's data.
- **Verify, don't assume.** Read the docs, run the app, check the diff, test the migration.
- **Communicate in writing.** Half of senior work is clear written thinking — which is exactly
  what these documents train.

You don't have to be perfect at all of this today. You have to *practise the loop* — and this
project is set up so that the professional way is also the easy, default way.

---

## 8. Where to go next

1. Run the app: [README → Getting started](../README.md#getting-started).
2. Skim the [architecture overview](architecture/overview.md) and the [ADRs](architecture/decisions/).
3. Read [coding-standards.md](engineering/coding-standards.md) before your first line of code.
4. Pick the top task from the [task board](project/task-board.md) and follow the
   [git workflow](engineering/git-workflow.md).
5. When the client asks for anything, start at [change-management.md](project/change-management.md).

Welcome aboard. Build carefully, write things down, and you'll grow fast.
