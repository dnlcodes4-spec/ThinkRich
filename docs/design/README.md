# Design System — Think-Winners Movement

The single source of truth for how the product looks, feels, and behaves across all three
surfaces (public site, members' PWA, admin dashboards) and every device. It exists so screens
stay consistent, accessibility is built in, and every contributor — human or AI — makes the
same choices.

> Decision of record: [ADR-0006](../architecture/decisions/0006-design-system-and-brand.md).
> New to design systems? Each doc below is self-explanatory; start with the principles here.

## The docs

| Doc | What it covers |
|-----|----------------|
| [brand-and-color.md](brand-and-color.md) | Brand story, palette, tokens, tint/shade scales, light/dark, **contrast rules** |
| [typography.md](typography.md) | Font choices, type scale, weights, responsive type |
| [layout-and-spacing.md](layout-and-spacing.md) | Spacing scale, radii, elevation, breakpoints, grid, containers |
| [responsive-and-dashboards.md](responsive-and-dashboards.md) | Mobile-first rules, **tables→cards on mobile**, dashboard patterns per device |
| [components.md](components.md) | Component anatomy & rules: buttons/CTAs, forms, cards, tables, nav, feedback |
| [authentic-design.md](authentic-design.md) | **Avoiding generic / "AI-generated" UI** — specific anti-patterns |
| [accessibility.md](accessibility.md) | WCAG 2.1 AA baseline, touch targets, focus, keyboard, motion |
| [ux-by-user-type.md](ux-by-user-type.md) | UX patterns per persona: member, leader, admins, visitor |
| [process-and-ui-dod.md](process-and-ui-dod.md) | How we design, tokens→Tailwind, and the **UI Definition of Done** |

## Brand at a glance

Sampled from the logo mark (`public/logo.jpeg`) and contrast-verified:

- **Navy `#0A2A4E`** — primary, interactive, text, dark surfaces. The workhorse. (~15:1 on white)
- **Gold `#C9A227`** — accent, highlight, celebration. **Always with dark text on top; never body
  text on white** (fails AA there). (~7.3:1 with dark text)

The pairing reads as **trustworthy, established, aspirational** — fitting a movement about
winning together. Full system in [brand-and-color.md](brand-and-color.md).

---

## Design principles

Seven principles that resolve disagreements. When a choice is unclear, the earlier principle wins.

### 1. Clarity over cleverness
Every screen has one obvious primary action and an unmistakable purpose. Members range widely in
tech-literacy; if a first-time user can't tell what to do, the design has failed — not the user.

### 2. Mobile-first, always
Members and leaders live on phones. Design the small screen first, then enhance for desktop.
Never design a desktop layout and "make it fit" mobile. Data-dense admin views still must be
fully usable on a phone (see [responsive-and-dashboards.md](responsive-and-dashboards.md)).

### 3. Accessible by default (WCAG 2.1 AA)
Contrast, touch targets, keyboard operability, and focus visibility are requirements, not
polish. Accessibility is designed in from the token up, not bolted on. See [accessibility.md](accessibility.md).

### 4. Consistency through tokens
Colours, spacing, type, and radii come from **design tokens** — never hard-coded one-off values.
Same meaning → same token → same look everywhere. This is what makes the system a *system*.

### 5. Hierarchy guides the eye
Use size, weight, colour, and spacing to make importance obvious. Navy anchors; gold highlights
sparingly (a highlight everywhere is a highlight nowhere). One primary CTA per view.

### 6. Trust is a feature
This platform holds people's personal data and guides their vote. The UI must feel secure,
official, and calm — generous spacing, restrained motion, honest states (real loading, empty,
and error views, never a frozen blank screen).

### 7. Show the right thing for the device
Don't shrink desktop patterns onto phones. A table on desktop becomes a **card list** on mobile;
a sidebar becomes a bottom nav or drawer. The *information* is constant; the *presentation*
adapts. (This is the rule behind the "no horizontal-scrolling tables on mobile" guidance.)

---

## How to use this system

- **Building UI?** Pull values from tokens ([brand-and-color.md](brand-and-color.md),
  [layout-and-spacing.md](layout-and-spacing.md)); follow the component rules
  ([components.md](components.md)); check the responsive rules for your surface.
- **Before merging UI?** Run the [UI Definition of Done](process-and-ui-dod.md#ui-definition-of-done).
- **Changing the design after the fact?** That's a [Change Request](../project/change-management.md);
  significant shifts get a new ADR.
