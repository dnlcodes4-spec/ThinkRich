# Learnings Log

A running record of **non-obvious lessons** we've hit — bugs that fooled us, gotchas, decisions
that turned out to matter. This is the honest version of a "self-learning system": not magic, but
a disciplined habit. When something surprises you, costs you time, or you'd want a teammate (or
future-you) to know it, add a dated entry here.

> This complements — doesn't replace — the other living docs. If a lesson changes *how we work*,
> also update the relevant doc/ADR/standard. Durable, cross-session preferences also go into the
> assistant's memory. See [AGENTS.md §6](../../AGENTS.md).

## How to add an entry
Newest first. Keep it short and concrete:

```
### YYYY-MM-DD — <one-line title>
- **Context:** what we were doing.
- **Lesson:** what we learned (the non-obvious bit).
- **Action:** what we changed / the rule now (link the doc if it moved there).
```

When to log: a bug whose cause wasn't obvious; a framework gotcha; a process friction; a decision
whose rationale isn't captured elsewhere. When *not* to: things already covered by code, git
history, or an existing doc.

---

## Entries

### 2026-07-12 — Next 16 allows only one dev server per project dir
- **Context:** Playwright's webServer (`next dev -p 3100`) exited with code 1; run manually it
  printed "Ready" then bailed with `⨯ Another next dev server is already running`.
- **Lesson:** Next 16 enforces a single `next dev` per project directory. A **leftover** dev
  server (from an earlier run) blocks new ones — including Playwright's webServer — even on a
  different port. Different projects (different dirs) are fine.
- **Action:** kill stray dev servers before E2E (`pkill -f "thinkrich/node_modules/.bin/next dev"`).
  When driving the app in a shell, tear the server down afterwards.

### 2026-07-12 — E2E ran against the wrong app (port 3000 collision)
- **Context:** first Playwright run failed to find even the server-rendered heading.
- **Lesson:** another project's dev server was on `localhost:3000`, and Playwright's
  `reuseExistingServer` happily ran our tests against **that** app. Shared default ports bite when
  multiple projects are open.
- **Action:** pin E2E to a **dedicated port** (`npm run dev -- -p 3100`, `baseURL` :3100). Logged
  as the rule in [testing-strategy.md](testing-strategy.md).

### 2026-07-12 — No-flash theme script causes a hydration warning on <html>
- **Context:** E2E webServer output showed a hydration attribute diff on `<html data-theme>`.
- **Lesson:** the pre-paint inline script sets `data-theme` before React hydrates, so server HTML
  (no attribute) and client DOM (attribute set) differ — React warns. Expected for this pattern.
- **Action:** add **`suppressHydrationWarning`** to the `<html>` element only (what `next-themes`
  does). The E2E surfaced a warning the SSR-DOM grep didn't — a point for driving the real app.

### 2026-07-12 — Verifying SSR HTML: count occurrences, and expect the RSC payload
- **Context:** checking the prerendered page rendered both table + card presentations.
- **Lesson:** two traps. (1) `grep -c` counts matching *lines*; minified SSR HTML is one line, so
  it returns 1 regardless of occurrences — use `grep -o … | wc -l`. (2) Next.js App Router embeds
  an **RSC flight payload** (`self.__next_f.push(...)`) inline, so visible text appears roughly
  **twice** in the HTML (once rendered, once serialized). Don't mistake that for double-rendering.
- **Action:** count with `grep -o`, and expect ~2× text occurrences in App Router SSR output.

### 2026-07-12 — Tailwind can't see interpolated class names
- **Context:** rendering brand-scale swatches with `` className={`bg-navy-${step}`} ``.
- **Lesson:** Tailwind (v3 and v4) generates utilities by scanning source for **complete**
  class strings. Interpolated/'dynamic' names like `bg-navy-${step}` are never emitted, so the
  element renders unstyled — no error, just silently wrong.
- **Action:** always write full class names (`bg-navy-700`), even if it's more verbose. For truly
  dynamic colour, use a CSS variable / inline style instead.

### 2026-07-12 — Auto-lint hook caught setState-in-effect (the guardrail earns its keep)
- **Context:** the `ThemeToggle` read `document.dataset.theme` in `useEffect` + `setState`.
- **Lesson:** React 19's `react-hooks/set-state-in-effect` flags this (cascading renders). The
  right tool for reading external/DOM state is **`useSyncExternalStore`** — it also fixes SSR
  hydration for theme (server snapshot vs client snapshot). The PostToolUse lint hook blocked the
  commit-worthy mistake at write time — exactly its purpose.
- **Action:** read external/DOM/browser state via `useSyncExternalStore`, not effect+setState.

### 2026-07-12 — Hook heredoc swallowed piped stdin
- **Context:** building the `block-main-commit.sh` PreToolUse hook; a smoke test appeared to pass.
- **Lesson:** `python3 - <<'PY'` makes the heredoc the program *via stdin*, so the piped hook
  payload (`printf … | …`) never reaches the program — `sys.stdin` was the script text, not the
  JSON. The test "passed" only because the no-match path also exits 0. A green test can be green
  for the wrong reason.
- **Action:** pass the program with `python3 -c '…'` and pipe the payload to stdin; verify the
  *side effect* (blocks on `main`, allows on a branch), not just the exit code. Reinforced our
  testing habit: assert behaviour, not just "it ran."

### 2026-07-12 — `git rev-parse --abbrev-ref HEAD` is empty on an unborn branch
- **Context:** the same hook checked the current branch; it failed to block in a fresh test repo.
- **Lesson:** on a branch with no commits yet, `git rev-parse --abbrev-ref HEAD` errors/returns
  empty. `git branch --show-current` returns the name (e.g. `main`) even with no commits.
- **Action:** use `git branch --show-current` for "what branch am I on" checks.

### 2026-07-12 — Gold fails as text on white (brand contrast trap)
- **Context:** building the colour system from the logo (navy + gold).
- **Lesson:** the brand gold `#C9A227` is only ~2.4:1 on white — **fails WCAG AA for text** — but
  ~7.1:1 with dark text on a gold fill. Beautiful brand colours can be accessibility traps.
- **Action:** codified the rule in [brand-and-color.md](../design/brand-and-color.md): gold is a
  fill with dark text (or `gold-700+` for gold-coloured text), never body text on white.

### 2026-07-12 — New `.claude/settings.json` needs a reload to activate
- **Context:** wiring guardrail hooks + permissions mid-session.
- **Lesson:** the settings watcher only picks up `.claude/settings.json` if it existed when the
  session started; creating it mid-session means hooks don't fire until `/hooks` is opened or the
  session restarts.
- **Action:** after adding hooks, tell the user to open `/hooks` once (or restart); don't assume
  the hook is live in the same session.

### 2026-07-12 — PR sequencing when config depends on docs
- **Context:** the Claude Code config (AGENTS.md links, `@docs/...` command refs) depends on the
  governance docs existing.
- **Lesson:** a PR that references files living in another unmerged PR has dangling links until
  both merge. Foundational, dependency-ordered work is cleaner merged in order than stacked.
- **Action:** merge the depended-on PR first, then branch the dependent work off updated `main`.
