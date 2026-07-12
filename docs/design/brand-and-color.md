# Brand & Color System

The colour system is the backbone of the design. It is built from the **Think-Winners logo**
(`public/logo.jpeg`) and every value here has been contrast-checked against **WCAG 2.1 AA**.

> Rule of the system: **use tokens, never raw hex in components.** The scales below define the
> tokens; [semantic tokens](#semantic-tokens-lightdark) map them to meaning for light and dark.

## Brand story

Two colours, sampled from the logo mark:

- **Navy** `#0A2A4E` — deep, stable, authoritative. It carries **text, primary actions, and
  dark surfaces**. It is the workhorse (~15:1 on white).
- **Gold** `#C9A227` — warm, aspirational, celebratory. It is an **accent/highlight**, used
  sparingly for emphasis and success moments.

Navy + gold reads as *trustworthy, established, and aspirational* — the right tone for a
movement about winning together, and for software that holds people's data and guides their vote.

---

## Primary palette

### Navy (brand primary) — anchor `700` = `#0A2A4E`
| Token | Hex | Typical use |
|-------|-----|-------------|
| `navy-50` | `#F0F2F4` | tinted backgrounds, hover fills |
| `navy-100` | `#DDE1E6` | subtle surfaces, borders on navy |
| `navy-200` | `#B6BFCA` | disabled text on light, dividers |
| `navy-300` | `#8999AA` | placeholder, dark-mode secondary text |
| `navy-400` | `#546A83` | muted icons |
| `navy-500` | `#2C4867` | secondary interactive |
| `navy-600` | `#193759` | primary hover |
| **`navy-700`** | **`#0A2A4E`** | **primary actions, headings, brand** |
| `navy-800` | `#082240` | pressed state, dark surfaces |
| `navy-900` | `#071C33` | dark-mode background |
| `navy-950` | `#051527` | deepest background |

### Gold (brand accent) — anchor `500` = `#C9A227`
| Token | Hex | Typical use |
|-------|-----|-------------|
| `gold-50` | `#FCF9F2` | success/celebration tints |
| `gold-100` | `#F7F2E1` | highlight backgrounds |
| `gold-200` | `#EFE3BE` | badges, subtle accents |
| `gold-300` | `#E5D297` | dark-mode accent text/borders |
| `gold-400` | `#D9BE68` | decorative, charts |
| **`gold-500`** | **`#C9A227`** | **accent fills, CTAs (dark text on top)** |
| `gold-600` | `#A98821` | accent hover |
| `gold-700` | `#896E1B` | ✅ **gold text on light backgrounds** (AA 4.9:1) |
| `gold-800` | `#695414` | gold text, high emphasis |
| `gold-900` | `#4C3E0F` | deepest gold |
| `gold-950` | `#382D0B` | — |

### Neutrals (cool slate — complements navy)
`50 #F8FAFC` · `100 #F1F5F9` · `200 #E2E8F0` · `300 #CBD5E1` · `400 #94A3B8` ·
`500 #64748B` · `600 #475569` · `700 #334155` · `800 #1E293B` · `900 #0F172A` · `950 #020617`

Neutrals carry most **text, borders, and muted surfaces**. Navy tints are for *branded*
surfaces; neutrals are for everything structural.

---

## Semantic (status) colours

Chosen to be distinct from the brand (note: **warning is orange, not gold**, so status is never
confused with brand accent). Each has a light-bg fill (`-50`), a border (`-200`), and an
AA text/icon colour (`-600/700`).

| Meaning | Fill (`-50`) | Text/icon | Use |
|---------|-------------|-----------|-----|
| **Success** | `#F0FDF4` | `#15803D` | approved requests, active member, positive stats |
| **Warning** | `#FFF7ED` | `#C2410C` | needs attention, pending, frozen account |
| **Danger** | `#FEF2F2` | `#B91C1C` | errors, opt-out/delete, destructive actions |
| **Info** | `#EFF6FF` | `#1D4ED8` | neutral notices (distinct from brand navy) |

Status uses a **coloured left-border + tint + icon + text**, never colour alone (see
[accessibility.md](accessibility.md#never-rely-on-colour-alone)).

---

## The gold contrast rule (do not miss this)

Gold is beautiful and dangerous. Contrast-checked:

| Combination | Ratio | Verdict |
|-------------|-------|---------|
| `gold-500` text on **white** | 2.4:1 | ❌ **FAILS** — never use gold-500 as text on white |
| Navy/near-black text on `gold-500` fill | 7.1–7.3:1 | ✅ passes — this is how CTAs use gold |
| `gold-700` text on white | 4.9:1 | ✅ passes — use this when you need *gold-coloured text* |
| `gold-300` text on `navy-900` (dark mode) | 11.5:1 | ✅ passes — gold accent in dark mode |

**Practical rules:**
1. Gold as a **fill** → put **navy-900/near-black text** on it. (Primary use for gold CTAs, badges.)
2. Need **gold-coloured text** on a light surface → use **`gold-700`+**, never `gold-500`.
3. In **dark mode**, gold text/accents use **`gold-300/400`** on dark navy.
4. Navy is the default for text and primary actions; **gold is a highlight, used sparingly.**

---

## Semantic tokens (light/dark)

Components consume **these**, not the raw scale. Implemented as CSS custom properties and mapped
into Tailwind v4 (`@theme`). Dark mode is a first-class requirement.

```css
/* app/globals.css */
:root {
  /* surfaces & text */
  --color-background:        #FFFFFF;
  --color-surface:           #FFFFFF;
  --color-surface-muted:     #F8FAFC; /* neutral-50 */
  --color-border:            #E2E8F0; /* neutral-200 */
  --color-text:              #0F172A; /* neutral-900 */
  --color-text-muted:        #64748B; /* neutral-500 */

  /* brand / interactive */
  --color-primary:           #0A2A4E; /* navy-700 */
  --color-primary-hover:     #193759; /* navy-600 */
  --color-primary-foreground:#FFFFFF;
  --color-accent:            #C9A227; /* gold-500 */
  --color-accent-hover:      #A98821; /* gold-600 */
  --color-accent-foreground: #071C33; /* navy-900 — dark text ON gold */
  --color-ring:              #2C4867; /* focus ring (navy-500) */

  /* status */
  --color-success: #15803D; --color-success-bg: #F0FDF4;
  --color-warning: #C2410C; --color-warning-bg: #FFF7ED;
  --color-danger:  #B91C1C; --color-danger-bg:  #FEF2F2;
  --color-info:    #1D4ED8; --color-info-bg:    #EFF6FF;
}

:root.dark, :root[data-theme="dark"] {
  --color-background:        #051527; /* navy-950 */
  --color-surface:           #071C33; /* navy-900 */
  --color-surface-muted:     #082240; /* navy-800 */
  --color-border:            #193759; /* navy-600 */
  --color-text:              #F1F5F9; /* neutral-100 */
  --color-text-muted:        #94A3B8; /* neutral-400 */

  --color-primary:           #8999AA; /* navy-300 — lighter for dark bg */
  --color-primary-hover:     #B6BFCA; /* navy-200 */
  --color-primary-foreground:#051527;
  --color-accent:            #E5D297; /* gold-300 — accents pop on dark */
  --color-accent-hover:      #EFE3BE; /* gold-200 */
  --color-accent-foreground: #051527;
  --color-ring:              #8999AA;

  --color-success: #4ADE80; --color-success-bg: #052E16;
  --color-warning: #FB923C; --color-warning-bg: #431407;
  --color-danger:  #F87171; --color-danger-bg:  #450A0A;
  --color-info:    #60A5FA; --color-info-bg:    #172554;
}
```

```css
/* Tailwind v4: expose tokens as utilities (bg-primary, text-accent, etc.) */
@theme inline {
  --color-background: var(--color-background);
  --color-surface: var(--color-surface);
  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--color-primary-foreground);
  --color-accent: var(--color-accent);
  --color-accent-foreground: var(--color-accent-foreground);
  /* …map the remaining tokens the same way… */
}
```

> Implementation is tracked as a task (wire these into `app/globals.css` + verify light/dark).
> Until then, this block is the contract.

## Usage do / don't

| ✅ Do | ❌ Don't |
|------|---------|
| Navy for primary buttons, headings, links | Gold-500 as text on white |
| Gold-500 **fill** with navy-900 text for accent CTAs | More than one gold accent per view |
| `gold-700+` when you truly need gold-coloured text | Colour as the only signal of status |
| Neutrals for body text, borders, muted surfaces | Hard-coded hex in components |
| Verify both light and dark before merge | Pure black `#000` (use navy-950/neutral-950) |

See also: [accessibility.md](accessibility.md) · [components.md](components.md).
