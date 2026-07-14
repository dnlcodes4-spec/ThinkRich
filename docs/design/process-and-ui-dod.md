# Design Process & UI Definition of Done

How design decisions get made, implemented, and verified — so the system stays coherent as it
grows, and every UI change ships to the same bar.

## Tokens are the source of truth

1. **Design decisions live in these docs** (colour, type, spacing, components).
2. Tokens are implemented **once** as CSS custom properties in `app/globals.css` and mapped into
   **Tailwind v4** via `@theme`, so components use utilities like `bg-primary`, `text-accent`,
   `p-4` — **never raw hex or arbitrary pixel values**.
3. Changing a token changes the whole product consistently. That's the point.

> Implementation of the tokens into `globals.css`/`@theme` is a tracked task
> ([task board](../project/task-board.md)); these docs are the contract until then.

## How we design a new screen or component

1. **Start from the persona and device** ([ux-by-user-type.md](ux-by-user-type.md)) — who uses
   this, on what, to do what?
2. **Reuse first.** Check [components.md](components.md) for an existing pattern before inventing
   one. New patterns must be justified and documented.
3. **Design mobile-first**, then enhance for desktop (tables→cards, nav swaps).
4. **Use tokens** for every value.
5. **Design the states**, not just the happy path: loading, empty, error, success; default →
   hover → focus → active → disabled.
6. **Check accessibility as you go** ([accessibility.md](accessibility.md)) — contrast, targets,
   keyboard, semantics — not at the end.
7. **Significant new patterns / design shifts** → capture the decision (an [ADR](../architecture/decisions/)
   for structural design decisions; a [CR](../project/change-management.md) when the client
   requests a change to existing UI).

## Design review

UI changes get the same PR review as any code, plus a design pass:
- Does it follow the system (tokens, type, spacing, components)?
- Mobile-first and responsive (verified at real breakpoints)?
- Accessible (AA, keyboard, targets, states)?
- On-brand and consistent with sibling screens?

Use the [`code-reviewer`](../../.claude/agents/code-reviewer.md) subagent and, for anything
visual, actually **look at it running** (see below) — screenshots in the PR help.

## UI Definition of Done

A UI change is **Done** only when all of these hold (in addition to the general
[Definition of Done](../engineering/definition-of-done.md)):

### Design system
- [ ] Uses **tokens** only — no hard-coded hex or arbitrary px.
- [ ] Type, spacing, radius, elevation match the scales.
- [ ] Matches the relevant [component](components.md) patterns; no unjustified one-offs.
- [ ] **Doesn't look generic/AI-generated** ([authentic-design.md](authentic-design.md)):
      grounded in the subject/brand, real content (no lorem/filler), no template clichés. Ask:
      *could this screen drop unchanged into an unrelated app?* If yes, rework it.

### Responsive
- [ ] Verified at **360px, 768px, 1280px** — no horizontal page scroll at any width.
- [ ] Tables render as **card lists below `lg`**; navigation swaps correctly.
- [ ] Touch targets ≥ **44px**; no hover-only actions.

### Accessibility (WCAG 2.1 AA)
- [ ] Contrast passes in **light and dark**; **gold rule** respected.
- [ ] Full **keyboard** operability; visible focus; logical order; focus managed in overlays.
- [ ] Semantic HTML; labels on inputs; alt/aria on media & icon buttons.
- [ ] Status/errors use **icon + text**, not colour alone.
- [ ] Zoom 200% intact; `prefers-reduced-motion` respected.

### States & content
- [ ] Loading (skeleton), empty (with CTA), error (plain-language + retry), success all handled.
- [ ] Copy is clear and on-tone; destructive actions confirmed with named consequences.

### Verification
- [ ] **Looked at it running** (the `run`/`verify` skills), light and dark, mobile and desktop —
      not just "it compiles."
- [ ] `npm run lint` clean; screenshots attached to the PR for visual changes.
- [ ] **User visual sign-off obtained** — UI is shown (screenshots desktop + mobile) and the user
      has explicitly approved **before** committing/merging. UI is never auto-committed.

## Keeping the system alive
- Update these docs in the **same PR** as the design change they describe.
- New reusable component → document it in [components.md](components.md).
- Token/scale change → update [brand-and-color.md](brand-and-color.md) / [layout-and-spacing.md](layout-and-spacing.md)
  and the `@theme` implementation together.
- Drift is debt: if a screen diverges from the system, fix the screen or (deliberately) evolve
  the system via ADR/CR — never leave silent one-offs.
