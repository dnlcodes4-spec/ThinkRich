# Responsive Design & Dashboard Rules

This is the doc that prevents the most common real-world UX failures: desktop patterns crammed
onto phones. The **information** stays constant across devices; the **presentation** adapts.

## Mobile-first, non-negotiable

1. Design and build the **smallest screen first**, then enhance upward. Never the reverse.
2. Members and leaders are **mostly on phones** — their experience is the primary experience,
   not a shrunken afterthought.
3. Admin dashboards are desktop-*primary* but must be **fully usable on a phone** — an admin
   will need to approve a change or look up a member from their phone.
4. **No horizontal page scrolling.** If something is too wide, it adapts (below) or scrolls
   inside its own container — the page never does.

---

## The table rule: tables are desktop-only; on mobile, use cards

> A data table forces horizontal scrolling on a phone, hides columns off-screen, and shrinks tap
> targets. That is bad UX. **On mobile, a row of a table becomes a card.**

### On desktop (`lg+`)
A proper table: columns, sortable headers, a row per record, row actions on the right. Good for
scanning many records and comparing values.

### On mobile (`< lg`)
Each record becomes a **card** that surfaces only the **necessary information** plus the **right
call(s) to action**. Not every column — the 2–4 fields that matter, and the actions the user
actually needs here.

**Anatomy of a mobile record card**
```
┌───────────────────────────────────────────┐
│ Ada Obi                       [● Active]    │  ← identity + status pill
│ TWM-LA-IKJ-000123                           │  ← key identifier (tabular nums)
│ Ikeja  ·  Lagos                             │  ← 1–2 supporting facts
│                                             │
│ [ View ]                    [ ⋯ More ]      │  ← primary CTA + overflow
└───────────────────────────────────────────┘
```

**Rules for record cards**
- Lead with the **identity** (name) and a **status pill**; show the **key identifier**
  (membership number) with tabular figures.
- Show **2–4 supporting fields max** — the ones a user needs to decide/act. Everything else lives
  on the detail view.
- Exactly **one primary CTA** (e.g. *View*, *Approve*); secondary actions go in an overflow
  (`⋯`) menu or the detail view.
- The **whole card is tappable** to open the record; explicit buttons for discrete actions.
- Card list is single-column, vertical scroll, comfortable spacing, 44px targets.

### Same data, two presentations
Build the data once; render `<DataTable>` at `lg+` and `<RecordCardList>` below it (or a single
responsive component that switches). Never ship a `<table>` that scrolls sideways on a phone.

### When a table is genuinely needed on mobile
Rare. If unavoidable (e.g. a financial breakdown), put it in an `overflow-x-auto` wrapper with a
**sticky first column** and a visible scroll affordance — and treat it as a last resort.

---

## Dashboard layout per device

### App shell / navigation
| Device | Navigation pattern |
|--------|--------------------|
| Mobile (`< lg`) | **Bottom tab bar** (3–5 primary destinations) and/or a **hamburger drawer** for the rest. Top bar shows title + one contextual action. |
| Desktop (`lg+`) | **Persistent left sidebar** (collapsible), top bar for search/profile/notifications. |

- Keep **primary destinations to 3–5**; deeper items go in a drawer/"More".
- The current location is always obvious (active state + page title/breadcrumb).
- On mobile, the primary action can be a **FAB** or a bottom-anchored button within thumb reach.

### Content layout
| Region | Mobile | Desktop |
|--------|--------|---------|
| Stat tiles / KPIs | 1–2 per row, horizontally scrollable if needed | 3–4 per row grid |
| Filters/search | collapse into a sheet/expandable bar | inline toolbar above the table |
| Record list | **card list** | **table** |
| Detail view | full-screen page | side panel or dedicated page |
| Bulk actions | selection mode + action sheet | toolbar with checkboxes |

### Data density
- Mobile: fewer items, bigger targets, progressive disclosure (summary → tap → detail).
- Desktop: more visible at once is fine, but keep AA contrast and 44px targets; provide a
  comfortable default density.

---

## Responsive patterns cheat-sheet

| Desktop pattern | Mobile equivalent |
|-----------------|-------------------|
| Data table | Card list (necessary fields + CTA) |
| Left sidebar nav | Bottom tabs + hamburger drawer |
| Multi-column form | Single-column, stacked |
| Hover actions/tooltips | Always-visible controls / tap to reveal (no hover on touch) |
| Side panel detail | Full-screen detail page |
| Inline filter toolbar | Filter button → bottom sheet |
| Right-click / hover menus | Explicit `⋯` overflow menu |
| Wide chart | Simplified chart or horizontal scroll within a container |

## Testing responsiveness (before merge)
Verify at **360px** (small phone), **768px** (tablet), and **1280px** (desktop) minimum:
- No horizontal page scroll at any width.
- Tables render as cards below `lg`; targets ≥44px.
- Navigation switches correctly (bottom/drawer ↔ sidebar).
- Nothing overlaps, clips, or requires pinch-zoom to read.

See the [UI Definition of Done](process-and-ui-dod.md#ui-definition-of-done).
