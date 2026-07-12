# Component Guidelines

How our building blocks look and behave. Every component pulls from
[tokens](brand-and-color.md) and meets the [accessibility](accessibility.md) baseline. Build
components once, reuse everywhere — no one-off variants.

**Every interactive component must define all states:** default, hover, focus-visible, active,
disabled, loading, and (where relevant) error. A component without its states is unfinished.

---

## Buttons & CTAs

Hierarchy is enforced by variant — **one primary action per view**.

| Variant | Look | Use |
|---------|------|-----|
| **Primary** | navy-700 fill, white text | the main action (Submit, Save, Register) |
| **Accent** | gold-500 fill, **navy-900 text** | celebratory/high-emphasis (Join Now, Download Card) |
| **Secondary** | navy outline, navy text, transparent fill | alternative actions |
| **Ghost** | no border, navy text, tinted hover | low-emphasis, toolbars |
| **Destructive** | danger fill/outline, danger text | delete, opt-out, deactivate |
| **Link** | navy text, underline on hover | inline navigation |

- **Sizes:** `sm` (32px), `md` (40px, default), `lg` (48px, primary mobile CTAs). Never below the
  44px touch target on mobile (pad the hit area even if the visual is smaller).
- **Loading:** show a spinner + keep the label (or "Saving…"); disable to prevent double-submit
  (critical for registration — avoids duplicate members).
- **Icon buttons:** must have an `aria-label`; 44px target.
- **Placement:** primary action bottom-right in dialogs; bottom-anchored within thumb reach on
  mobile forms.

## Forms & inputs

Forms are where members/leaders do real work — make them forgiving.

- **Label every field** (visible label above the input; never placeholder-as-label).
- **Input height ≥44px**, 16px text (prevents iOS zoom), clear focus ring (`--color-ring`).
- **Validation:** validate on blur and on submit; show errors **inline beneath the field** with
  an icon + text (not colour alone), and summarise at top for long forms. Errors mirror the
  server-side Zod messages ([coding-standards](../engineering/coding-standards.md)).
- **Required vs optional:** mark clearly; prefer marking optional if most are required.
- **Help text** beneath the field for formatting (e.g. phone format).
- **Never block paste**; support autofill; correct `type`/`inputmode` (e.g. `tel`, `numeric`).
- **Destructive/irreversible submits** (opt-out, delete) require confirmation.

## Cards

The default container. Radius `lg`, `1px --color-border`, `--color-surface`, padding `4` mobile /
`6` desktop.
- **Record card** (member/admin lists on mobile): see
  [responsive-and-dashboards.md](responsive-and-dashboards.md#the-table-rule-tables-are-desktop-only-on-mobile-use-cards).
- **Stat/KPI tile:** big tabular number, small label, optional trend; never rely on colour alone
  for up/down (add an arrow/sign).
- Whole card tappable → detail; discrete actions are explicit buttons.

## Data display — tables

- **Desktop only.** Sortable headers, tabular figures, zebra or bordered rows, sticky header on
  scroll, row actions right-aligned, clear empty state.
- Below `lg`, render the **card list** instead. Wide tables scroll inside their own container,
  never the page.

## Navigation

- **Bottom tab bar** (mobile): 3–5 destinations, icon + label, clear active state.
- **Sidebar** (desktop `lg+`): grouped items, collapsible, active state, role-appropriate items
  only (a leader never sees admin-only nav).
- **Top bar:** page title/breadcrumb, search (admin), notifications, profile/theme toggle.
- **Breadcrumbs** on deep desktop views; back button on mobile detail pages.

## Status & badges

- **Status pill** for member/account state: *Active* (success), *Frozen* (warning), *Deleted*
  (neutral/danger) — icon + text + tint, never colour alone.
- **Role badge:** distinguishes National / State / L.G / Unit / Leader / Member.
- **Membership number** rendered with tabular figures and easy copy.

## Feedback & system states

Never leave a user staring at a frozen blank screen. Every data view has four states:

| State | Rule |
|-------|------|
| **Loading** | Skeleton placeholders (not just a spinner) matching final layout. |
| **Empty** | Friendly illustration/icon + one line of explanation + a CTA ("Register your first member"). |
| **Error** | Plain-language message + a retry action; never a raw stack trace or code. |
| **Success** | Toast/inline confirmation; gold accent is welcome for genuine wins (card generated, member registered). |

- **Toasts:** brief, top or bottom, auto-dismiss (except errors needing action); one at a time.
- **Modals vs sheets:** dialogs/modals on desktop; **bottom sheets** on mobile. Trap focus,
  close on Esc/backdrop, return focus on close.
- **Confirmation dialogs** for destructive/irreversible actions, naming the consequence.

## The membership card component

A special, brand-critical component (auto-generated at registration):
- Uses the client's official card design; member fields auto-placed; unique membership number
  in the standard format; radius `xl`.
- Must be **downloadable/printable** at correct resolution (leaders/admins).
- Renders legibly at small preview and full print size.
- Treat as a documented component with its own states (loading/generated/error).

## Motion & interaction

- **Purposeful, quick:** 150–250ms, standard easing. Motion clarifies (where did this come
  from?), never decorates.
- Respect **`prefers-reduced-motion`** — disable non-essential animation.
- **No hover-only affordances** on touch; hover enhancements are desktop extras, not requirements.
- Provide immediate feedback on tap (state change within 100ms).

## Component checklist (before it's "done")
- [ ] Pulls from tokens (no hard-coded hex/px).
- [ ] All states defined (default/hover/focus/active/disabled/loading/error).
- [ ] Keyboard operable; visible focus; `aria-label` on icon-only controls.
- [ ] Works light **and** dark; AA contrast.
- [ ] Responsive (mobile card / desktop table where relevant); 44px targets.
