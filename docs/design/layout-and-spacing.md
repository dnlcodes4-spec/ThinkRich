# Layout, Spacing & Grid

Consistent spacing and layout make the product feel calm and trustworthy. Everything is built on
a **4px base unit** so rhythm is predictable.

## Spacing scale (4px base)

| Token | px | Common use |
|-------|----|------------|
| `0.5` | 2 | hairline gaps |
| `1` | 4 | icon ↔ text |
| `2` | 8 | tight padding, chip padding |
| `3` | 12 | control inner padding |
| `4` | 16 | **default gap / card padding (mobile)** |
| `6` | 24 | card padding (desktop), section gaps |
| `8` | 32 | between major blocks |
| `12` | 48 | section spacing |
| `16` | 64 | page-level rhythm (desktop) |

Use scale steps only — no `13px`, no `margin: 7px`. Tailwind's spacing scale already matches this.

## Radii

| Token | px | Use |
|-------|----|----|
| `sm` | 6 | inputs, small chips |
| `md` | 10 | buttons, badges |
| `lg` | 14 | **cards (default)** |
| `xl` | 20 | sheets, modals, membership card |
| `full` | 9999 | avatars, pills, icon buttons |

Consistent, slightly rounded corners read as modern and friendly without being playful.

## Elevation (shadows)

Prefer **borders and surface tints** over heavy shadows (flatter = more trustworthy, better in
dark mode). Use shadow only to lift interactive/floating things.

| Token | Use |
|-------|-----|
| `border` | default separation (cards, table rows) — a `1px` `--color-border` |
| `shadow-sm` | resting cards on busy backgrounds |
| `shadow-md` | dropdowns, popovers |
| `shadow-lg` | modals, bottom sheets |

In dark mode, shadows are subtle; rely on `--color-surface` steps to convey layering.

## Breakpoints

Mobile-first. Design at the smallest first; these are min-widths (Tailwind defaults).

| Name | Min width | Target |
|------|-----------|--------|
| (base) | 0 | phones (member/leader primary) |
| `sm` | 640px | large phones / small tablets |
| `md` | 768px | tablets; dashboards become multi-column |
| `lg` | 1024px | laptops; admin dashboards primary |
| `xl` | 1280px | large desktops |
| `2xl` | 1536px | wide monitors (cap content width) |

## Containers & content width

- **Reading/content:** cap at ~`65ch` for prose; ~`640px` for member app forms.
- **App shell (dashboards):** full-width with a `max-w-screen-2xl` cap and generous side padding
  (`px-4` mobile → `px-6/8` desktop). Content shouldn't stretch edge-to-edge on huge monitors.
- **Member PWA:** single-column, centered, comfortable `max-w-md`/`max-w-lg` for most views.

## Grid & layout patterns

- Use **flexbox/grid**, never fixed pixel positioning. Everything fluid; `max-width: 100%` on media.
- **Card grids:** 1 column mobile → 2 at `sm/md` → 3–4 at `lg+`, using `grid` with `gap-4/6`.
- **Dashboard shell:** off-canvas/bottom nav on mobile → persistent sidebar at `lg+`
  (see [responsive-and-dashboards.md](responsive-and-dashboards.md)).
- **No horizontal page scroll, ever.** Wide content (tables, charts, code) scrolls **inside its
  own** `overflow-x-auto` container, not the page body.

## Touch & target sizing

- Minimum interactive target: **44×44px** (see [accessibility.md](accessibility.md)).
- Spacing between adjacent tap targets: **≥8px**.
- On mobile, primary actions sit within thumb reach (bottom half of the screen where possible).

## Density

- **Member/leader (mobile):** comfortable density — bigger targets, more whitespace, fewer items
  per screen.
- **Admin (desktop):** higher density is acceptable (more rows/columns visible) but never at the
  cost of the 44px targets or AA contrast. Offer a comfortable default; density is not an excuse
  for cramped, ambiguous UI.
