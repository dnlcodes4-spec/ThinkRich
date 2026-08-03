# Dashboard Feedback & State System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every `/app/*` dashboard surface one sanctioned mechanism per state (loading, partial-loading, pending, success, error, empty) so users never guess what is happening.

**Architecture:** A small set of shared primitives + one feedback hook encode the rules; then a sweep applies them to all 17 routes and ~20 forms. Delivered as two PRs: (A) foundation, (B) sweep.

**Tech Stack:** Next.js 16 App Router (RSC + Server Actions), React 19 (`useActionState`), Tailwind v4 semantic tokens, Vitest + jsdom + Testing Library.

## Global Constraints

- **Semantic tokens only** — no raw hex/px; use `text-danger`, `bg-surface-muted`, etc. (design system).
- **No em dashes** in any user-facing copy or comments (project AI-tell rule). Use period/comma/colon.
- **No eyebrow/kicker uppercase labels** above headings (AI-tell rule).
- **No AI co-author trailer** on commits. Conventional Commits. Never commit to `main`.
- **WCAG AA**, mobile-first, light theme (dashboard is light-only today).
- **a11y wiring must match `Input`**: `aria-invalid`, `aria-describedby`, `role="alert"`/`role="status"` where appropriate.
- **Never add `revalidatePath` to one-time-artifact forms** (register, provision-login, new-account, dev/national-admins) — it remounts the form and wipes the shown-once value.
- **UI sign-off**: build + gate, then show screenshots (desktop + mobile) and get approval before committing/merging UI-bearing changes.
- Test pattern: `import { render, screen } from "@testing-library/react"`; `describe/it/expect` are global (vitest `globals: true`). Run with `npm test`.

---

# PR A — Foundation (primitives + hook + docs)

### Task A1: Shared action-state type + constructors

**Files:**
- Create: `lib/action-state.ts`
- Test: `lib/action-state.test.ts`

**Interfaces:**
- Produces: `type ActionState<Extra = {}>`, `const idle: ActionState`, `ok<E>(extra?: E & { message?: string }): ActionState<E>`, `fail(message: string, fieldErrors?: Record<string,string>): ActionState`.

- [ ] **Step 1: Write the failing test**
```ts
import { describe, it, expect } from "vitest";
import { idle, ok, fail } from "./action-state";

describe("action-state", () => {
  it("idle has no status noise", () => {
    expect(idle).toEqual({ status: "idle" });
  });
  it("ok carries extra payload and optional message", () => {
    expect(ok({ tempPassword: "x", message: "Done." })).toEqual({
      status: "success", message: "Done.", tempPassword: "x",
    });
    expect(ok()).toEqual({ status: "success" });
  });
  it("fail carries a message and optional field errors", () => {
    expect(fail("Bad", { email: "Taken" })).toEqual({
      status: "error", message: "Bad", fieldErrors: { email: "Taken" },
    });
    expect(fail("Bad")).toEqual({ status: "error", message: "Bad" });
  });
});
```

- [ ] **Step 2: Run test, verify it fails**
Run: `npm test -- action-state` → FAIL ("Cannot find module ./action-state").

- [ ] **Step 3: Implement**
```ts
// Shared shape for Server Action results consumed by useActionState. The dashboard
// standardises on this so every form stops re-declaring its own state type.
// `Extra` carries one-time payloads (temp password, membership number) without
// loosening the base shape.
export type ActionState<Extra = {}> = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
} & Partial<Extra>;

export const idle: ActionState = { status: "idle" };

export function ok<E extends Record<string, unknown> = {}>(
  extra?: E & { message?: string },
): ActionState<E> {
  return { status: "success", ...(extra ?? {}) } as ActionState<E>;
}

export function fail(
  message: string,
  fieldErrors?: Record<string, string>,
): ActionState {
  return fieldErrors ? { status: "error", message, fieldErrors } : { status: "error", message };
}
```

- [ ] **Step 4: Run test, verify it passes**
Run: `npm test -- action-state` → PASS.

- [ ] **Step 5: Commit**
```bash
git add lib/action-state.ts lib/action-state.test.ts
git commit -m "feat(ui): shared ActionState type and constructors"
```

---

### Task A2: `FormError` — persistent form-level alert

**Files:**
- Create: `components/ui/form-error.tsx`
- Test: `components/ui/form-error.test.tsx`

**Interfaces:**
- Produces: `FormError({ message }: { message?: string })` — renders nothing when message is falsy; else a `role="alert"` block.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormError } from "./form-error";

describe("FormError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = render(<FormError />);
    expect(container).toBeEmptyDOMElement();
  });
  it("announces the error via role=alert", () => {
    render(<FormError message="Could not save." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save.");
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- form-error` → FAIL.

- [ ] **Step 3: Implement**
```tsx
// Persistent, in-context form-level error. The sanctioned mechanism for a
// whole-submit failure (the field-level errors live on the inputs). Never a
// toast: an error the user must act on should not time out from under them.
export function FormError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 rounded-sm border border-danger/40 bg-danger-soft px-3 py-2 text-sm text-foreground"
    >
      <span aria-hidden="true" className="text-danger">✕</span>
      {message}
    </p>
  );
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- form-error` → PASS.

- [ ] **Step 5: Commit**
```bash
git add components/ui/form-error.tsx components/ui/form-error.test.tsx
git commit -m "feat(ui): FormError persistent alert primitive"
```

---

### Task A3: `EmptyState` primitive

**Files:**
- Create: `components/ui/empty-state.tsx`
- Test: `components/ui/empty-state.test.tsx`

**Interfaces:**
- Produces: `EmptyState({ title, description?, icon?, action? }: { title: string; description?: string; icon?: React.ReactNode; action?: React.ReactNode })`.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("shows the title and description", () => {
    render(<EmptyState title="No members yet" description="Register the first one." />);
    expect(screen.getByText("No members yet")).toBeInTheDocument();
    expect(screen.getByText("Register the first one.")).toBeInTheDocument();
  });
  it("renders an optional action", () => {
    render(<EmptyState title="No members yet" action={<button>Register</button>} />);
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- empty-state` → FAIL.

- [ ] **Step 3: Implement** (text + optional single action; no illustration — authentic-design.md)
```tsx
// The one empty-state block for the dashboard. Text-first, optionally an icon and
// a single call to action. No decorative illustration (authentic-design.md).
export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-card border border-dashed border-border px-6 py-12 text-center">
      {icon ? <div className="text-muted">{icon}</div> : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- empty-state` → PASS.

- [ ] **Step 5: Commit**
```bash
git add components/ui/empty-state.tsx components/ui/empty-state.test.tsx
git commit -m "feat(ui): EmptyState primitive"
```

---

### Task A4: `Select` and `Textarea` field primitives

**Files:**
- Create: `components/ui/select.tsx`, `components/ui/textarea.tsx`
- Test: `components/ui/select.test.tsx`, `components/ui/textarea.test.tsx`

**Interfaces:**
- Produces: `Select(ComponentProps<"select"> & { label?; hint?; error? })`, `Textarea(ComponentProps<"textarea"> & { label?; hint?; error? })`. Same a11y wiring as `Input` (label↔control, aria-describedby, aria-invalid; hint hidden when error present).

- [ ] **Step 1: Write the failing tests** (mirror `input.test.tsx`)
```tsx
// select.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Select } from "./select";

describe("Select", () => {
  it("associates the label with the control", () => {
    render(<Select label="State"><option>Ogun</option></Select>);
    expect(screen.getByLabelText("State")).toBeInTheDocument();
  });
  it("marks invalid and describes the error", () => {
    render(<Select label="State" error="Required"><option>Ogun</option></Select>);
    const el = screen.getByLabelText("State");
    expect(el).toHaveAttribute("aria-invalid", "true");
    const id = el.getAttribute("aria-describedby");
    expect(document.getElementById(id as string)).toHaveTextContent("Required");
  });
});
```
```tsx
// textarea.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("associates the label with the control", () => {
    render(<Textarea label="Reason" />);
    expect(screen.getByLabelText("Reason")).toBeInTheDocument();
  });
  it("marks invalid and describes the error", () => {
    render(<Textarea label="Reason" error="Too long" />);
    const el = screen.getByLabelText("Reason");
    expect(el).toHaveAttribute("aria-invalid", "true");
    const id = el.getAttribute("aria-describedby");
    expect(document.getElementById(id as string)).toHaveTextContent("Too long");
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- select textarea` → FAIL.

- [ ] **Step 3: Implement** (copy `Input`'s wiring; swap the control element)
```tsx
// components/ui/select.tsx
"use client";
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type SelectProps = ComponentProps<"select"> & { label?: string; hint?: string; error?: string };

export function Select({ label, hint, error, id, className, children, ref, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;
  const errorId = `${selectId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={selectId} className="text-sm font-semibold text-foreground">{label}</label>
      )}
      <select
        id={selectId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "min-h-11 rounded-sm border bg-surface px-3 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      >
        {children}
      </select>
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
          <span aria-hidden="true">✕</span>{error}
        </p>
      ) : (
        hint && <p id={hintId} className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
```
```tsx
// components/ui/textarea.tsx — identical wiring with a <textarea> control
"use client";
import { useId, type ComponentProps } from "react";
import { cn } from "@/lib/cn";

type TextareaProps = ComponentProps<"textarea"> & { label?: string; hint?: string; error?: string };

export function Textarea({ label, hint, error, id, className, ref, ...props }: TextareaProps) {
  const generatedId = useId();
  const areaId = id ?? generatedId;
  const hintId = `${areaId}-hint`;
  const errorId = `${areaId}-error`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={areaId} className="text-sm font-semibold text-foreground">{label}</label>
      )}
      <textarea
        id={areaId}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={cn(
          "rounded-sm border bg-surface px-3 py-2 text-base text-foreground focus:outline-2 focus:outline-offset-1 focus:outline-ring",
          error ? "border-danger" : "border-border",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} className="flex items-center gap-1.5 text-xs text-danger">
          <span aria-hidden="true">✕</span>{error}
        </p>
      ) : (
        hint && <p id={hintId} className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- select textarea` → PASS.

- [ ] **Step 5: Commit**
```bash
git add components/ui/select.tsx components/ui/textarea.tsx components/ui/select.test.tsx components/ui/textarea.test.tsx
git commit -m "feat(ui): Select and Textarea field primitives matching Input"
```

---

### Task A5: `useActionFeedback` hook

**Files:**
- Create: `components/ui/use-action-feedback.ts`
- Test: `components/ui/use-action-feedback.test.tsx`

**Interfaces:**
- Consumes: `ActionState` (A1), `useToast` (existing `components/ui/toast.tsx`).
- Produces: `useActionFeedback(state: ActionState, options?: { successMessage?: string; artifact?: boolean }): { error?: string }`. Fires the success toast once per transition into `success` (unless `artifact`); returns the form-level `error` (state.message when `status==='error'`) for `FormError`.

- [ ] **Step 1: Write the failing test** (mock the toast provider)
```tsx
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { useActionFeedback } from "./use-action-feedback";
import type { ActionState } from "@/lib/action-state";

const toast = vi.fn();
vi.mock("./toast", () => ({ useToast: () => ({ toast }) }));

function Harness({ state, artifact }: { state: ActionState; artifact?: boolean }) {
  const { error } = useActionFeedback(state, { successMessage: "Saved.", artifact });
  return <span>{error ?? "no-error"}</span>;
}

describe("useActionFeedback", () => {
  it("fires a success toast on transition to success", () => {
    toast.mockClear();
    const { rerender } = render(<Harness state={{ status: "idle" }} />);
    expect(toast).not.toHaveBeenCalled();
    rerender(<Harness state={{ status: "success" }} />);
    expect(toast).toHaveBeenCalledWith("Saved.", "success");
  });
  it("suppresses the toast for artifact forms", () => {
    toast.mockClear();
    const { rerender } = render(<Harness state={{ status: "idle" }} artifact />);
    rerender(<Harness state={{ status: "success" }} artifact />);
    expect(toast).not.toHaveBeenCalled();
  });
  it("returns the form-level error message", () => {
    const { getByText } = render(<Harness state={{ status: "error", message: "Nope." }} />);
    expect(getByText("Nope.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- use-action-feedback` → FAIL.

- [ ] **Step 3: Implement** (the single sanctioned effect for success-toast; guarded so it fires once per success transition)
```ts
"use client";
import { useEffect, useRef } from "react";
import type { ActionState } from "@/lib/action-state";
import { useToast } from "./toast";

// The one place the "toast on success, inline on error" rule lives. Consumers pass
// their useActionState result; this fires the success toast exactly once per
// transition into success (unless the form shows a one-time artifact, which keeps
// its own persistent block), and hands back the form-level error to render in a
// <FormError />. Centralising it here keeps the success-toast effect in a single
// reviewed location instead of being re-hand-rolled per form.
export function useActionFeedback(
  state: ActionState,
  options?: { successMessage?: string; artifact?: boolean },
): { error?: string } {
  const { toast } = useToast();
  const lastStatus = useRef(state.status);
  const successMessage = options?.successMessage ?? "Saved.";
  const artifact = options?.artifact ?? false;

  useEffect(() => {
    if (state.status === "success" && lastStatus.current !== "success" && !artifact) {
      toast(state.message ?? successMessage, "success");
    }
    lastStatus.current = state.status;
  }, [state, artifact, successMessage, toast]);

  return { error: state.status === "error" ? state.message : undefined };
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- use-action-feedback` → PASS.

- [ ] **Step 5: Lint check** (the `set-state-in-effect` rule). Run: `npm run lint`. Expected: no error on this file (the effect calls `toast` and writes a ref, no local `setState`).

- [ ] **Step 6: Commit**
```bash
git add components/ui/use-action-feedback.ts components/ui/use-action-feedback.test.tsx
git commit -m "feat(ui): useActionFeedback hook centralising success-toast/inline-error rule"
```

---

### Task A6: Skeleton list/table variants

**Files:**
- Modify: `components/ui/skeleton.tsx`
- Test: `components/ui/skeleton.test.tsx` (create)

**Interfaces:**
- Produces: `SkeletonList({ rows? }: { rows?: number })`, `SkeletonTable({ rows?, cols? }: { rows?: number; cols?: number })`. Each aria-hidden (inherits from `Skeleton`); wrap in existing `LoadingRegion` at call sites.

- [ ] **Step 1: Write the failing test**
```tsx
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SkeletonList, SkeletonTable } from "./skeleton";

describe("skeleton variants", () => {
  it("SkeletonList renders the requested number of rows", () => {
    const { container } = render(<SkeletonList rows={3} />);
    expect(container.querySelectorAll("[data-skel-row]").length).toBe(3);
  });
  it("SkeletonTable renders rows x cols cells", () => {
    const { container } = render(<SkeletonTable rows={2} cols={4} />);
    expect(container.querySelectorAll("[data-skel-cell]").length).toBe(8);
  });
});
```

- [ ] **Step 2: Run, verify fail.** `npm test -- skeleton` → FAIL.

- [ ] **Step 3: Implement** (append to `skeleton.tsx`)
```tsx
/** A vertical list of row-shaped skeletons (roster, feed, team list). */
export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} data-skel-row className="h-16 rounded-card" />
      ))}
    </div>
  );
}

/** A grid of cell-shaped skeletons for tabular pages. */
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} data-skel-cell className="h-8" />
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run, verify pass.** `npm test -- skeleton` → PASS.

- [ ] **Step 5: Commit**
```bash
git add components/ui/skeleton.tsx components/ui/skeleton.test.tsx
git commit -m "feat(ui): SkeletonList and SkeletonTable variants"
```

---

### Task A7: Durability doc + Definition of Done line

**Files:**
- Create: `docs/design/feedback-and-states.md`
- Modify: `docs/design/process-and-ui-dod.md` (UI Definition of Done section)
- Modify: `docs/design/README.md` (link the new doc)

- [ ] **Step 1: Write `docs/design/feedback-and-states.md`** — the six-state table from the spec, the success rule (toast default + artifact exception), the error rule (field/form/render), and a "which primitive?" reference table pointing at `ActionState`, `useActionFeedback`, `FormError`, `EmptyState`, `Input/Select/Textarea`, skeleton kit, `loading.tsx`, `Suspense`, `error.tsx`.

- [ ] **Step 2: Add the DoD line** to `docs/design/process-and-ui-dod.md` under the UI Definition of Done:
  `- [ ] Declares its loading, empty, pending, success, and error handling per [feedback-and-states.md](./feedback-and-states.md).`

- [ ] **Step 3: Link** the new doc from `docs/design/README.md`.

- [ ] **Step 4: Update `CHANGELOG.md`** (Unreladed/Added): "Dashboard feedback & state system (primitives + rules)."

- [ ] **Step 5: Commit**
```bash
git add docs/design/feedback-and-states.md docs/design/process-and-ui-dod.md docs/design/README.md CHANGELOG.md
git commit -m "docs(design): feedback & state system rules + UI DoD line"
```

- [ ] **Step 6: UI sign-off gate for PR A** — build a throwaway preview route or screenshots of `FormError`, `EmptyState`, skeleton variants; show desktop + mobile; get approval; then open PR A (`gh pr create`, base `main`).

---

# PR B — The sweep (apply the system everywhere)

> Prereq: PR A merged (or stacked on it). Each task below is independently testable/committable.

### Task B1: Route `loading.tsx` for the 13 uncovered routes

**Files (create one each):**
`app/app/account/loading.tsx`, `app/app/admin/candidates/loading.tsx`, `app/app/admin/new-account/loading.tsx`, `app/app/admin/states/loading.tsx`, `app/app/admin/team/loading.tsx`, `app/app/geography/loading.tsx`, `app/app/kym/loading.tsx`, `app/app/logs/loading.tsx`, `app/app/members/[id]/loading.tsx`, `app/app/notifications/loading.tsx`, `app/app/profile/loading.tsx`, `app/app/register/loading.tsx`, `app/app/vote/loading.tsx`.

**Recipe (each file):** mirror the existing `app/app/stats/loading.tsx` — a server component returning the page's real outer wrapper classes, a `SkeletonHeader`, then the page's dominant shape wrapped in `LoadingRegion`:
- list/table pages (`admin/team`, `logs`, `kym`, `vote`, `admin/candidates`) → `SkeletonList` or `SkeletonTable`.
- form pages (`account`, `admin/new-account`, `register`, `profile`, `members/[id]`, `notifications`) → 3–5 `Skeleton` field blocks + a button-height `Skeleton`.
- `geography` → `SkeletonHeader` + `SkeletonList` (the drill-down columns).
- `admin/states` → `SkeletonList`.

Worked example (`app/app/admin/team/loading.tsx`):
```tsx
import { SkeletonHeader, SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-8">
      <SkeletonHeader />
      <div className="mt-8">
        <LoadingRegion label="Loading the team">
          <SkeletonList rows={6} />
        </LoadingRegion>
      </div>
    </main>
  );
}
```
Match each page's actual wrapper (`max-w-*`, padding) by reading its `page.tsx` first so the skeleton does not shift on load.

- [ ] **Step 1:** For each route, read its `page.tsx` outer wrapper, create the matching `loading.tsx`.
- [ ] **Step 2:** `npm run build` → all routes compile.
- [ ] **Step 3:** Manual: navigate to 3–4 of them with network throttling; confirm skeleton then content, no layout jump.
- [ ] **Step 4: Commit**
```bash
git add app/app/**/loading.tsx
git commit -m "feat(app): route loading skeletons for all dashboard pages"
```

---

### Task B2: `<Suspense>` on the heavy sections

**Files (modify):** `app/app/stats/page.tsx`, `app/app/members/page.tsx`, `app/app/geography/page.tsx`, `app/app/logs/page.tsx`, and the Nigeria map usage in `app/app/stats` (map component).

**Recipe:** extract the heavy data fetch into an async child component and wrap it:
```tsx
import { Suspense } from "react";
import { SkeletonList, LoadingRegion } from "@/components/ui/skeleton";

export default async function Page() {
  return (
    <main /* page wrapper */>
      {/* header paints immediately */}
      <Suspense fallback={<LoadingRegion><SkeletonList rows={6} /></LoadingRegion>}>
        <RosterSection /* async: does the slow query */ />
      </Suspense>
    </main>
  );
}
```
- [ ] **Step 1:** For each heavy page, split the slow query into an async section component, wrap in `Suspense` with a shape-matched fallback. Header/nav stay outside the boundary.
- [ ] **Step 2:** `npm run build` → compiles; `npm run typecheck`.
- [ ] **Step 3:** Manual: throttled load shows shell instantly, section streams in.
- [ ] **Step 4: Commit**
```bash
git add app/app/stats app/app/members app/app/geography app/app/logs
git commit -m "feat(app): stream heavy dashboard sections behind Suspense"
```

---

### Task B3: Retrofit forms to the feedback system

**Targets (16 non-artifact forms — swap to shared state + FormError + useActionFeedback + Select/Textarea):**
`app/app/account/change-password.tsx`, `app/app/admin/candidates/candidate-form.tsx`, `app/app/admin/team/change-role-button.tsx`, `app/app/kym/verify-form.tsx`, `app/app/members/[id]/leader-photo.tsx`, `app/app/notifications/compose.tsx`, `app/app/notifications/voting-reminder.tsx`, `app/app/profile/change-request.tsx`, `app/app/profile/opt-out.tsx`, `app/app/profile/photo-upload.tsx`, `app/login/login-form.tsx`, `components/account/change-password-prompt.tsx`, and any other of the 20 not in the artifact set.

**Artifact forms (KEEP their persistent success block; only adopt the shared `ActionState` type + `FormError` for the error path; do NOT add a success toast, do NOT add `revalidatePath`):**
`app/app/register/register-form.tsx`, `app/app/members/member-login-cell.tsx` (+ `provision-login.ts`), `app/app/admin/new-account/new-account-form.tsx`, `app/dev/national-admins/create-form.tsx`.

**Recipe per non-artifact form:**
1. In the action file: return `ok({ message })` / `fail(msg, fieldErrors)` from `lib/action-state`; type the state as `ActionState`.
2. In the client form: replace the ad-hoc `useEffect(...toast...)` and inline `<p role="alert">` with:
```tsx
const [state, action, pending] = useActionState(theAction, idle);
const { error } = useActionFeedback(state, { successMessage: "Saved." });
// ...
<FormError message={error} />
<Button type="submit" loading={pending}>Save</Button>
```
3. Swap hand-rolled `<select>`/`<textarea>` for `Select`/`Textarea`; keep field errors via their `error` prop.
4. Remove now-dead local success/error JSX.

- [ ] **Step 1:** Retrofit forms in small batches (2–3 per commit), running `npm run typecheck` after each batch.
- [ ] **Step 2:** Run existing tests: `npm test` → green (button/input/status-pill unaffected).
- [ ] **Step 3:** Manual per representative form: trigger a field error (stays), a form error (stays), a success (toast); confirm an artifact form still shows its block once.
- [ ] **Step 4: Commit** (per batch)
```bash
git add <the batch files>
git commit -m "refactor(app): <area> forms use shared feedback system"
```

---

### Task B4: Replace ad-hoc empty states with `EmptyState`

**Targets:** the 10 `border-dashed` blocks (find with `grep -rn border-dashed app components`), e.g. roster empty, team empty, logs empty, notifications empty, candidates empty, geography empty, corrections empty.

- [ ] **Step 1:** Replace each dashed block with `<EmptyState title=… description=… action=… />`, keeping the existing copy (plain language; no em dashes).
- [ ] **Step 2:** `npm run build` + `npm run typecheck`.
- [ ] **Step 3: Commit**
```bash
git add app components
git commit -m "refactor(app): use EmptyState for all empty lists"
```

---

### Task B5: Section-level error boundaries for independently-failing pieces

**Files (create):** `app/app/stats/error.tsx` (charts/map can fail without killing the page). Optionally wrap the map in its own boundary component if it renders outside a route segment.

**Recipe:** mirror `app/app/error.tsx` but scoped and smaller ("This chart could not load. Try again."), with the `reset` button.

- [ ] **Step 1:** Create `app/app/stats/error.tsx`.
- [ ] **Step 2:** `npm run build`.
- [ ] **Step 3: Commit**
```bash
git add app/app/stats/error.tsx
git commit -m "feat(app): scoped error boundary for stats charts"
```

---

### Task B6: Full verification + PR B

- [ ] **Step 1: Gates.** `npm run typecheck && npm run lint && npm run build && npm test` → all green. Paste the tail of each into the PR body.
- [ ] **Step 2: UI sign-off.** Screenshots desktop + mobile of: a throttled route load (skeleton), a field error, a form error, a success toast, an artifact success block (unchanged), and an `EmptyState`. Show and get approval BEFORE merge.
- [ ] **Step 3: PR B** `gh pr create` (base `main` or stacked on PR A). Body: what changed, the six-state model link, gate output, screenshots.

---

## Self-Review (completed against the spec)

- **Spec coverage:** six states → A1–A6 primitives + B1/B2 (loading/suspense) + B3 (pending/success/error) + B4 (empty) + B5 (render error). Durability doc → A7. Artifact exception → B3. All spec sections mapped.
- **Placeholder scan:** each code step has real code; the sweep tasks give one worked example + the exact file list + the transformation recipe (the repetition is mechanical and identical, not omitted).
- **Type consistency:** `ActionState`, `idle`, `ok`, `fail`, `useActionFeedback(state, {successMessage, artifact})`, `FormError({message})`, `EmptyState({title,description,icon,action})`, `SkeletonList({rows})`, `SkeletonTable({rows,cols})`, `Select/Textarea({label,hint,error})` — names identical everywhere they appear.
- **Gap check:** login uses these primitives but its layout is untouched (spec) — B3 includes `login-form.tsx` for the feedback path only, not layout. Consistent.
