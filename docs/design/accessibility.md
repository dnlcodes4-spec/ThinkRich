# Accessibility (a11y)

Accessibility is a **requirement**, not a nice-to-have. Our users span a wide range of ages,
devices, literacy, connectivity, and abilities. The baseline is **WCAG 2.1 Level AA**. If a
change can't meet it, that's a blocker — raise it, don't ship around it.

## Why this matters here specifically
- Members read on cheap phones in bright sunlight → contrast and text size are critical.
- Many users are not highly tech-literate → clarity, labels, and forgiving forms matter.
- The platform is official and handles voting/identity → it must be usable by everyone equally.

---

## Colour & contrast

- **Text:** ≥ **4.5:1** (normal), ≥ **3:1** (large text ≥ 24px or 18.66px bold).
- **UI/graphics:** interactive boundaries, icons, focus indicators ≥ **3:1**.
- The [colour system](brand-and-color.md) is pre-checked. **Remember the gold rule:** never
  gold-500 as text on white; gold is a fill with dark text, or `gold-700+` for gold text.
- Verify **both light and dark** modes.

### Never rely on colour alone
Status, errors, required fields, chart series — always pair colour with a **second signal**: an
icon, text label, shape, or pattern. A colour-blind user must get the same information.

## Text & readability
- Body text default **16px**; never below **12px** for readable text.
- Support browser zoom to **200%** without breaking layout or losing content.
- Respect user font-size settings; use relative units (`rem`), not fixed `px` for type.
- Line length 45–75 chars; line-height ≥1.5 for body.

## Touch & pointer targets
- Minimum **44×44px** interactive target (pad the hit area if the visual is smaller).
- **≥8px** between adjacent targets.
- **No hover-only** functionality — touch users can't hover. Hover is an enhancement only.

## Keyboard & focus
- **Everything interactive is keyboard-operable** (Tab/Shift-Tab/Enter/Space/Esc/arrows where apt).
- **Visible focus indicator** on every focusable element (`--color-ring`, ≥3:1, never
  `outline: none` without a replacement).
- **Logical focus order** follows visual order.
- **Focus management:** modals/sheets trap focus, close on Esc, and **return focus** to the
  trigger on close. Skip-to-content link on long pages.
- No keyboard traps.

## Semantics & screen readers
- Use **semantic HTML first** (`<button>`, `<nav>`, `<main>`, `<h1>`–`<h3>`, `<label>`, `<table>`),
  ARIA only to fill gaps — "no ARIA is better than bad ARIA."
- One `<h1>` per page; don't skip heading levels.
- All images/icons that convey meaning have `alt`/`aria-label`; decorative ones are `aria-hidden`.
- **Form fields** have associated `<label>`s; errors linked via `aria-describedby`; invalid
  fields marked `aria-invalid`.
- **Live regions** (`aria-live`) for async updates (toasts, validation, search results).
- Icon-only buttons always have an accessible name.

## Motion & animation
- Honour **`prefers-reduced-motion`**: disable non-essential motion, parallax, auto-play.
- No content that flashes more than 3×/second (seizure safety).
- Motion must never be the *only* way information is conveyed.

## Forms (high-stakes here)
- Clear labels, help text, and inline errors (icon + text).
- Don't disable paste; support autofill; correct `inputmode`/`type`.
- Confirm destructive/irreversible actions (opt-out, delete) with a named consequence.
- Prevent double-submit (disable + spinner) — protects the no-duplicate-registration invariant.

## Language & localisation
- App language is Nigerian English (LTR). Set `<html lang="en">`.
- Support the full range of Nigerian names (length, characters); never truncate destructively —
  ellipsis with full value available.
- Don't assume Latin-only or short names in layouts.

## Connectivity & performance (an accessibility issue too)
- Assume slow/intermittent mobile networks: lightweight pages, skeletons, optimistic where safe,
  graceful offline messaging (PWA).
- Images optimised and correctly sized; avoid layout shift (reserve space).

## How we verify (part of the [UI DoD](process-and-ui-dod.md))
- [ ] AA contrast in light **and** dark (spot-check with a contrast tool).
- [ ] Full keyboard pass: reach and operate everything; focus always visible.
- [ ] Targets ≥44px; no hover-only actions.
- [ ] Semantic structure; labels on inputs; alt/aria on media and icon buttons.
- [ ] Zoom to 200% intact; `prefers-reduced-motion` respected.
- [ ] Status/errors use icon+text, not colour alone.
