# Feedback & state handling

How every dashboard surface (`/app/*`) tells the user what is happening. The goal is
simple: **the user never has to guess.** Each state has exactly one sanctioned
mechanism, so the app stays consistent as it grows and no one invents a fourth way.

This is a contract, not a suggestion. It is enforced by the
[UI Definition of Done](process-and-ui-dod.md#ui-definition-of-done).

## The six states

| State | When | Mechanism |
|---|---|---|
| **Route loading** | navigating to a page, server data in flight | `loading.tsx` in the route, a skeleton mirroring that page's shape |
| **Partial loading** | the shell can paint instantly but one section is slow | `<Suspense fallback={…skeleton}>` around the slow query only |
| **Pending** | an action (form submit / mutation) is running | `Button loading` on the submitting control |
| **Success** | an action succeeded | transient **toast** by default; a **persistent block** for one-time-artifact forms (see below) |
| **Error** | an action or data load failed | field → `Input`/`Select`/`Textarea` `error`; whole form → `FormError`; render → `error.tsx`; misconfigured/missing → `NotConfigured`/`not-found` |
| **Empty** | a query legitimately returned nothing | `EmptyState` |

## The success rule

- **Default: toast on success.** The user stays in context and the form does not
  vanish. Editing details, toggling a role, sending a reminder: all toast.
- **Exception: one-time-artifact forms keep a persistent success block.** When the
  result contains something the user must read or copy exactly once (a temporary
  password, a new membership number), a toast would disappear before it is read.
  Those forms replace or augment themselves with a persistent block instead, and
  they must **not** call `revalidatePath` on success (it remounts the form and wipes
  the shown-once value). Current artifact forms: registration, member-login
  provisioning/reset, admin account creation, the dev national-admin bootstrap.

## The error rule

- **Field-level** validation errors render on the field (`error` prop) and stay until
  corrected. Never a toast: a timed-out message loses the field context.
- **Form-level** failures ("already in use", a server error) render in a persistent
  `FormError` near the submit control.
- **Render / route** failures fall to `error.tsx` (plain language, a retry, never the
  raw error text). Add a scoped `error.tsx` only where a section can fail
  independently of its page.
- Errors are **never transient-only.** Someone recovering from an error must still be
  able to see what went wrong while they fix it.

## Which primitive do I reach for?

| Need | Use | Where |
|---|---|---|
| Action result shape | `ActionState`, `ok()`, `fail()` | `lib/action-state.ts` |
| Fire success toast / read form error | `useActionFeedback(state, opts)` | `components/ui/use-action-feedback.ts` |
| Whole-form error line | `FormError` | `components/ui/form-error.tsx` |
| One field's error | `Input` / `Select` / `Textarea` `error=` | `components/ui/{input,select,textarea}.tsx` |
| Submit button spinner | `Button loading` | `components/ui/button.tsx` |
| Empty list / no results | `EmptyState` | `components/ui/empty-state.tsx` |
| Loading placeholders | `Skeleton` / `SkeletonHeader` / `SkeletonCard` / `SkeletonList` / `SkeletonTable`, wrapped in `LoadingRegion` | `components/ui/skeleton.tsx` |
| Route load | `loading.tsx` | the route folder |
| Slow section | `<Suspense>` | the page |
| Route crash | `error.tsx` | the route folder |
| Transient message | `useToast().toast(msg, variant)` | `components/ui/toast.tsx` |

## The standard form shape

```tsx
"use client";
import { useActionState } from "react";
import { idle } from "@/lib/action-state";
import { useActionFeedback } from "@/components/ui/use-action-feedback";
import { FormError } from "@/components/ui/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ExampleForm() {
  const [state, action, pending] = useActionState(saveExample, idle);
  const { error } = useActionFeedback(state, { successMessage: "Saved." });
  const fe = state.fieldErrors ?? {};

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <Input label="Name" name="name" error={fe.name} />
      <FormError message={error} />
      <Button type="submit" loading={pending}>Save</Button>
    </form>
  );
}
```

Artifact forms are the same, with `useActionFeedback(state, { artifact: true })` (no
success toast) and a persistent block rendered when `state.status === "success"`.
