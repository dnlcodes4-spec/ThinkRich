# Dashboard feedback & state system — design

- **Date:** 2026-08-03
- **Status:** Approved (design); pending implementation plan
- **Scope:** All `/app/*` dashboard routes and their forms (the member-app / Think-Winners surface)
- **Related:** [docs/design/README.md](../../design/README.md), [UI Definition of Done](../../design/process-and-ui-dod.md#ui-definition-of-done), [docs/design/authentic-design.md](../../design/authentic-design.md)

## Problem

The dashboard has good state-handling **primitives** but no **system**: no rule for
which mechanism handles which situation, and thin coverage. A user navigating or
submitting often has to guess what is happening.

Measured on `main` (2026-08-03):

| Signal | Now |
|---|---|
| Dashboard routes (`app/app/**/page.tsx`) | 17 |
| Routes with `loading.tsx` | 4 (root, corrections, members, stats) |
| `<Suspense>` boundaries | 0 |
| Route error boundaries | 1 (`app/app/error.tsx`, catches all nested) |
| Forms using `useActionState` | 20 |
| Forms using the toast system | 3 |
| Ad-hoc `border-dashed` "empty" boxes | 10 |
| Shared `ActionState` type / `EmptyState` primitive | none |

Three consequences:

1. **Navigation feels broken on 13 of 17 routes** — the old page stays frozen, then jumps.
2. **Success/error feedback is done three different ways** with no rule: inline
   `<p role="alert">`, a success block that replaces the form, and `toast()` fired
   from a `useEffect`. Same app, three conventions, so it drifts.
3. **The action-return shape is a convention by copy-paste**, re-declared per form.

## What already works (keep, do not rebuild)

- `Button` `loading` prop: spinner + `aria-busy`, disables while busy. This is the
  standard pending indicator.
- `Skeleton` / `SkeletonHeader` / `SkeletonCard` + `LoadingRegion` (a11y wrapper).
- `app/app/error.tsx`: plain-language boundary, never leaks raw error text, offers
  "Try again" + "Go home", shows the digest reference.
- `not-found.tsx`, and `NotConfigured` for the "service role not set" case.
- `Toast` provider: success/error/default variants, auto-dismiss (errors linger
  ~7s), dismissible, `role="status"`.
- The de-facto action shape:
  `{ status: "idle" | "success" | "error"; message?; fieldErrors? }`.

## The model: six states, one sanctioned mechanism each

The system's job is that each state has exactly **one** mechanism, so no one invents
a fourth. This table is the durable contract.

| State | When | Mechanism |
|---|---|---|
| **Route loading** | navigating to a page, server data in flight | `loading.tsx` per route, skeleton mirroring that page's shape |
| **Partial loading** | shell can paint instantly but one section is slow | `<Suspense fallback={…skeleton}>` around the slow query only |
| **Pending** | an action (form submit / mutation) is running | `Button loading` on the submitting control |
| **Success** | action succeeded | transient **toast** by default; **persistent success block** for one-time-artifact forms (see rule below) |
| **Error** | action or data failed | field → `Input`/`Select`/`Textarea` `error`; form → `FormError`; render → `error.tsx`; misconfig/missing → `NotConfigured`/`not-found` |
| **Empty** | a query legitimately returned nothing | `EmptyState` primitive |

### The success rule (the one locked decision)

- **Default: toast on success.** The user stays in context; the form does not
  disappear. Example: editing details, toggling a role, sending a reminder.
- **Exception: one-time-artifact forms keep a persistent success block.** When the
  success response contains something the user must read/copy exactly once — a
  temporary password or a new membership number — a toast would vanish before it is
  read. These forms replace/augment themselves with a persistent block instead.
  This is already why `register` and `provision-login` deliberately avoid
  `revalidatePath` (it would remount the form and wipe the one-time value); the
  system names and preserves that behaviour rather than fighting it.

### The error rule

- **Field-level** validation errors render on the field (`Input error=…`), and stay
  until corrected. Never a toast (a 7s toast loses the field context).
- **Form-level** errors (a whole-submit failure, "already in use", a server error)
  render in a persistent `FormError` alert near the submit control.
- **Render/route** failures fall to `error.tsx`.
- Errors are **never** transient-only. A user recovering from an error must be able
  to still see what went wrong while they fix it.

## New / changed pieces

### New: `lib/action-state.ts`
The shared shape + constructors, so actions stop re-declaring it:
```ts
export type ActionState<Extra = {}> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} & Partial<Extra>;

export const idle: ActionState;
export function ok<E>(extra?: E & { message?: string }): ActionState<E>;
export function fail(message: string, fieldErrors?: Record<string, string>): ActionState;
```
`Extra` carries one-time-artifact payloads (e.g. `{ tempPassword; membershipNumber }`)
without loosening the base shape.

### New: `useActionFeedback(state, options?)` (client hook)
The **single** place the success-toast / inline-error rule lives:
- On a transition into `status: "success"`, fires the success toast (default copy
  overridable; suppressed when `options.artifact` is true so artifact forms show
  their block instead).
- Returns the form-level error string to render via `FormError`.
- Fires the toast exactly once per submission (keyed on a monotonic submit marker),
  which also removes the repeated `useEffect`-fires-toast smell now in 3 files.
- The one sanctioned effect for this concern, written once rather than 20 times.

### New: `components/ui/empty-state.tsx`
`EmptyState({ icon?, title, description?, action? })`. Text + optional single action.
**No illustrations / no decorative clichés** (per `authentic-design.md`). Replaces all
10 ad-hoc dashed boxes with one consistent, accessible block.

### New: `components/ui/form-error.tsx`
`FormError({ message })` — the persistent form-level alert (`role="alert"`, danger
token, hidden when empty). Standardises the current hand-rolled `<p role="alert">`.

### New: `components/ui/select.tsx`, `components/ui/textarea.tsx`
Thin primitives matching `Input`'s API (`label`, `error`, `hint`), because several
forms currently hand-roll `<select>` / `<textarea>` with bespoke error spans, and the
sweep touches those forms anyway. Field errors then look identical everywhere.

### Changed: skeleton kit
Add `SkeletonTable` and `SkeletonList` variants for the list-heavy routes so their
`loading.tsx` mirrors real content shape.

### Unchanged
`Button`, `Toast` provider, `error.tsx`, `not-found`, `NotConfigured`, `Input`
(already has `error`), `LoadingRegion`.

## Coverage sweep (the "full" in full-sweep)

1. **13 missing `loading.tsx`** — one per remaining route
   (`account`, `admin/candidates`, `admin/new-account`, `admin/states`, `admin/team`,
   `geography`, `kym`, `logs`, `members/[id]`, `notifications`, `profile`, `register`,
   `vote`), each a tailored skeleton (header + the page's dominant shape).
2. **`<Suspense>` on the 5 heavy pages** (`stats`, `members`, `geography`, `logs`, and
   the Nigeria map component) so the shell/nav paint immediately and only the heavy
   section shows a skeleton.
3. **20 forms retrofitted** to: shared `ActionState`, `Button loading`,
   `Input/Select/Textarea error` for field errors, `FormError` for form errors, and
   `useActionFeedback` for success — except the artifact forms (`register`,
   `provision-login`/`member-login-cell`, `new-account`, `dev/national-admins`) which
   keep their persistent success block.
4. **10 dashed empty boxes → `EmptyState`.**
5. **Error boundaries:** keep the single root `error.tsx`; add a section-level
   boundary only where a piece can fail independently of the page (the map; the stats
   charts). No per-route error files.

## Durability

- New doc **`docs/design/feedback-and-states.md`**: the six-state model, the success
  and error rules, and a "which primitive do I reach for?" table. This is the artifact
  that stops the three-conventions drift from returning.
- One line added to the **UI Definition of Done** requiring every new/changed
  dashboard surface to declare its loading, empty, pending, success, and error
  handling against this doc.

## Decisions locked

- **Feedback model:** toast on success, inline (persistent) on errors, with the
  one-time-artifact exception. (User-selected.)
- **Delivery:** full sweep of all 17 routes now, split into **two PRs** for review
  sanity — (A) primitives + hook + shared type + docs; (B) the route/form/empty-state
  sweep. Both land now. (User-approved.)
- **Defaults (user-approved):** single root `error.tsx` (no per-route error files);
  `EmptyState` is text + optional action, no illustrations; `<Suspense>` only on the 5
  heavy pages, not universally.

## Explicitly out of scope

- The broader UI/UX overhaul (nav shell, role homes, terminology glossary) tracked in
  the separate plan — this system is a dependency it will consume, not the overhaul itself.
- The marketing / public site (`components/marketing/*`) — different surface; only
  `app/app/*` is in scope. (`login` uses these primitives but its layout is untouched.)
- Push-notification / real-time delivery — unrelated to in-page state feedback.

## Non-goals / risks

- **Risk: toast-in-effect lint.** The repo blocks `set-state-in-effect`. Centralising
  the success toast in `useActionFeedback` means the effect exists in exactly one
  reviewed place; it must fire the toast (a provider-side state change) without a
  local `setState`-in-effect. Verify it passes `lint` before rollout.
- **Risk: `revalidatePath` vs one-time artifacts.** The retrofit must not add
  `revalidatePath` to artifact forms; doing so remounts the form and wipes the
  one-time value. The success rule encodes this; tests/QA must confirm it holds.
- **Not building:** a global loading bar, optimistic UI, or per-field async
  validation. YAGNI for this pass.

## Verification

- Gates: `typecheck`, `lint`, `build`, unit tests green.
- Visual (UI sign-off rule — screenshots desktop + mobile before commit):
  navigate each route with throttling to see skeleton → content; trigger a field
  error, a form error, and a success on representative forms; confirm an artifact form
  still shows its persistent block; view an `EmptyState`. Light theme (dashboard is
  light-only today).
- Confirm no artifact form regressed (temp password / membership number still shown once).
