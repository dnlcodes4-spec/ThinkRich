# Typography

Type is the primary carrier of information, so it must be legible for everyone — including
members reading on small, low-cost phones in bright sunlight. Rules here favour **clarity and
size over density**.

## Typeface

Chosen deliberately (see [ADR-0009](../architecture/decisions/0009-type-system.md)); Geist was the
scaffold default and has been replaced.

- **UI / body:** **Hanken Grotesk** — a warm humanist grotesque with a large x-height and honest
  numerals, picked for legibility on low-cost phones in sunlight. Loaded via `next/font/google`.
- **Display (ThinkRich Community):** **Zodiak** — a distinctive contemporary serif (Fontshare,
  self-hosted via `next/font/local`; licence in `app/fonts/zodiak/`); its italic carries the gold
  display accents. Applied through the `--font-display-face` custom property.
- **Display (Think-Winners):** **Fraunces** (serif), retained — grounded in the movement's
  logotype. Each surface swaps `--font-display-face` for its subtree.
- **Numeric / tabular data:** use a **tabular-figures** variant (`font-variant-numeric:
  tabular-nums`) in tables, stat tiles, and membership numbers so digits align. Currently
  JetBrains Mono; the intent is to fold numerals onto Hanken's `tabular-nums` and keep to **two
  families** total for PWA weight.

Load fonts via `next/font` (already set up) for performance and no layout shift. Aim for no more
than two font families total.

## Type scale

A modular scale (~1.25 ratio), mobile-first. Values are the defaults; large headings step up on
`md+` (see [responsive rules](#responsive-type)).

| Token | Size / line-height | Weight | Use |
|-------|--------------------|--------|-----|
| `display` | 36–48 / 1.1 | 700 | landing hero, big moments |
| `h1` | 28–32 / 1.2 | 700 | page titles |
| `h2` | 22–24 / 1.25 | 600 | section titles |
| `h3` | 18–20 / 1.3 | 600 | card titles, subsections |
| `body-lg` | 18 / 1.6 | 400 | primary reading (member app) |
| `body` | 16 / 1.6 | 400 | default body |
| `body-sm` | 14 / 1.5 | 400 | secondary text, table cells |
| `caption` | 12–13 / 1.4 | 500 | labels, metadata, badges |

**Never go below 12px** for any readable text. Body text default is **16px** (prevents mobile
zoom-on-focus and aids readability).

## Weight & emphasis

- Weights in use: **400** (body), **500** (labels/emphasis), **600** (subheads), **700** (titles).
- Emphasise with weight and hierarchy first; use colour (navy) second. Avoid italics for
  emphasis in UI. Avoid ALL-CAPS for long strings (fine for short labels/badges).

## Readability rules

- **Line length:** aim for 45–75 characters for paragraphs; constrain with `max-width` (~65ch).
- **Line height:** 1.5–1.6 for body, ~1.2 for headings.
- **Alignment:** left-aligned (this is Nigerian English, LTR). Never justify body text.
- **Contrast:** body text meets AA (see [accessibility.md](accessibility.md)); muted text uses
  `neutral-500`+ only for non-essential metadata.
- **Truncation:** truncate long names with ellipsis + full value on tap/hover/`title`; never let
  a long member name break a layout.

## Responsive type

- Mobile-first sizes above; step **h1/display up** at `md` (≥768px).
- Prefer `clamp()` for fluid headings, e.g. `font-size: clamp(1.75rem, 4vw, 2rem)` for `h1`.
- Keep body at 16px across breakpoints — bigger screens get more *content*, not bigger body text.

## Tokens

Type tokens live alongside colour tokens and map into Tailwind's type utilities. Define the
scale once (font sizes, line-heights, weights) so components reference `text-h2`, `text-body`,
etc., never arbitrary pixel values.
