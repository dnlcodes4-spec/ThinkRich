# Think — Winners Movement · Management Platform

A membership-management platform for the Think — Winners Movement (a ThinkRich Community
product). It comprises three surfaces:

1. **Public website** — showcases ThinkRich Community products.
2. **Members' app** — an installable Progressive Web App (PWA) for members and leaders.
3. **Admin dashboards** — hierarchical control from National → State → L.G → Unit → Leader.

> **Current focus:** Phase 1 — the Members' PWA. See the [Roadmap](docs/project/roadmap.md).

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16.2 (App Router) + React 19.2 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Backend / DB / Auth | Supabase (Postgres + Auth + Storage), RLS as the authz boundary |
| Build/dev | Turbopack (default in Next 16) |

See [docs/architecture/tech-stack.md](docs/architecture/tech-stack.md) for the full rationale.

> ⚠️ **This project targets Next.js 16**, which has breaking changes vs. earlier versions
> (async `params`/`cookies`/`headers`, `middleware`→`proxy` rename, Turbopack default).
> Read the relevant guide in `node_modules/next/dist/docs/` before writing framework code —
> do **not** rely on memory. This is codified in [AGENTS.md](AGENTS.md).

---

## Getting started

**Prerequisites:** Node.js `>= 20.9.0` (Next 16 minimum), npm.

```bash
npm install
cp .env.example .env.local   # then fill in Supabase + VAPID keys
npm run dev                  # http://localhost:3000
```

For PWA/push testing over HTTPS: `npm run dev -- --experimental-https`.

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start the dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run test` | Unit/component tests (Vitest) |
| `npm run test:e2e` | End-to-end tests (Playwright) |

---

## Documentation

All engineering documentation lives in [`docs/`](docs/README.md). Start there.

> 🎓 **First time here?** Read the **[Engineering Handbook](docs/HANDBOOK.md)** — a
> plain-language tour of everything in this repo and the practices behind it.

| Area | Link |
|------|------|
| **Engineering Handbook (start here)** | [docs/HANDBOOK.md](docs/HANDBOOK.md) |
| Architecture (C4) | [docs/architecture/overview.md](docs/architecture/overview.md) |
| Decision records (ADRs) | [docs/architecture/decisions/](docs/architecture/decisions/) |
| Data model | [docs/architecture/data-model.md](docs/architecture/data-model.md) |
| How we work (SDLC) | [docs/engineering/sdlc.md](docs/engineering/sdlc.md) |
| Coding standards | [docs/engineering/coding-standards.md](docs/engineering/coding-standards.md) |
| Roadmap & task board | [docs/project/roadmap.md](docs/project/roadmap.md) · [docs/project/task-board.md](docs/project/task-board.md) |
| Client change management | [docs/project/change-management.md](docs/project/change-management.md) |

New here? Read [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

Proprietary — © ThinkRich Community. All rights reserved.
