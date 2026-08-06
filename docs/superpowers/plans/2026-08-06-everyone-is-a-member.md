# Everyone Is a Member (CR-0014) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Every staff account (role ≠ `member`) also holds a real membership record + number + downloadable card, based on their personal home voter registration, created via a self-service onboarding flow; movement counts include them.

**Architecture:** Reuse the existing `members` table, number generator, and card renderer unchanged (ADR-0016 — no migration). A caller-scoped service-role action creates the caller's own home-geography member row. A shell prompt routes staff without a member row to an onboarding page. Homes/account surface the caller's own card.

**Tech Stack:** Next.js 16 App Router (Server Actions, RSC), Supabase (`members`, RLS), Zod, `tryCreateAdminClient`, `GeoPicker`, Vitest.

## Global Constraints

- **No DB migration.** `members` already supports staff rows linked by `user_id` (ADR-0015).
- **The onboarding action is service-role and MUST be hard-scoped to `user_id = auth.uid()`** — it can only ever create the caller's own membership (mirrors `addMyVin`).
- **No-duplicate invariant:** dedupe against an existing row by `user_id`, then NIN, then VIN, before insert.
- **Age ≥ 18** (reuse the register flow's adult check); normalise VIN (`lib/vin`), phone (`lib/phone`).
- **RLS stays the boundary.** The card route + counts are unchanged; they already RLS-scope.
- **No AI co-author trailer; Conventional Commits; no em dashes.**
- **UI sign-off before committing UI** (prompt, onboarding page, home cards) — screenshots desktop+mobile, light+dark.
- Base-tier `member` accounts are unaffected by every task.

## File Structure

- Create `app/app/account/membership-actions.ts` — `completeMyMembership` server action.
- Create `app/app/account/membership/page.tsx` — onboarding page (home-PU geo picker + form).
- Create `app/app/account/membership/membership-form.tsx` — client form.
- Create `components/account/complete-membership-prompt.tsx` — shell modal → CTA to the page.
- Create `components/account/needs-membership.ts` — tiny pure helper + shared query key (optional; else inline).
- Modify `app/app/layout.tsx` — compute `needsMembership`, render the prompt (precedence: password → membership → vin).
- Modify `app/app/page.tsx` — card + ID on `LeaderHome` and `CoordinatorHome`; relabel the movement count.
- Modify `app/app/account/page.tsx` — card + ID for staff (their own member row).
- Test `app/app/account/membership-actions.test.ts` (pure validation via an extracted helper) + reuse `lib/membership-card.test.ts`.

---

## Task 1: `completeMyMembership` server action

**Files:**
- Create: `app/app/account/membership-actions.ts`
- Reference: `app/app/account/actions.ts` (addMyVin pattern), `app/app/register/actions.ts` (member insert + isAdult), `lib/vin.ts`, `lib/phone.ts`.

**Interfaces:**
- Produces: `completeMyMembership(prev: MembershipState, formData: FormData): Promise<MembershipState>`; `type MembershipState = { status: "idle"|"success"|"error"; message?: string; membershipNumber?: string; fieldErrors?: Record<string,string> }`.

- [ ] **Step 1: Write the action.** Mirror `addMyVin`: `createClient()` for the caller, `tryCreateAdminClient()` for writes. Steps in order:
  1. get `user`; if none → error.
  2. `admin` client; if none → `ADMIN_NOT_CONFIGURED`.
  3. Zod-parse: `full_name` (min 2, default to profile.full_name if omitted), `date_of_birth` (required), `nin` (required), `vin` (required), `gender` (enum male/female), `phone` (optional), `polling_unit_id` (uuid, required).
  4. Load `profile` (role, full_name, vin_id, status) via admin, `.eq("id", user.id)`. If `role === 'member'` → error ("Members manage their details from registration."). 
  5. **Dedupe:** if a `members` row exists with `user_id = user.id` → return success ("You are already a member.", membershipNumber). Else if a row exists with this `nin` or `vin` (belonging to another user) → error (already registered).
  6. Normalise VIN (`normalizeVin`) and phone (`normalizePhone`); adult check (copy `isAdult` from register/actions or import if exported — if not exported, inline the same logic).
  7. Resolve the home path from `polling_unit_id`: pu → ward(id,lga_id) → lga(id,state_id) → state(id). If any missing → error ("That polling unit could not be found.").
  8. Upsert `voter_ids` `{ vin }` onConflict vin.
  9. Insert `members` via **admin**: `{ user_id: user.id, registered_by: user.id, state_id, lga_id, ward_id, polling_unit_id, full_name, date_of_birth, nin, vin_id: vin, gender, phone }`. The number is trigger-assigned. Map 23505 errors (nin/vin/email) to friendly field errors.
  10. Set profile VIN + activate (only if not frozen/deleted), exactly as `addMyVin` does: `admin.from("profiles").update({ vin_id: vin, status: nextStatus }).eq("id", user.id)`.
  11. Return success with `membershipNumber`.

```ts
"use server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient, ADMIN_NOT_CONFIGURED } from "@/lib/supabase/admin";
import { normalizeVin, VIN_INVALID } from "@/lib/vin";
import { normalizePhone, PHONE_INVALID } from "@/lib/phone";

export type MembershipState = {
  status: "idle" | "success" | "error";
  message?: string;
  membershipNumber?: string;
  fieldErrors?: Record<string, string>;
};

export function isAdult(dob: string): boolean {
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

const schema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name."),
  date_of_birth: z.string().min(1, "Enter your date of birth."),
  nin: z.string().trim().min(1, "Enter your NIN."),
  vin: z.string().trim().min(1, "Enter your voter's card number (VIN)."),
  gender: z.enum(["male", "female"], { message: "Choose a gender." }),
  phone: z.string().trim().optional(),
  polling_unit_id: z.string().uuid("Choose your home polling unit."),
});
// ...(body per Step 1; strictly user_id = user.id throughout)
```

- [ ] **Step 2: Extract + unit-test `isAdult`.** Create `app/app/account/membership-actions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { isAdult } from "./membership-actions";
describe("isAdult", () => {
  it("accepts 18+", () => { const d = new Date(); d.setFullYear(d.getFullYear()-20); expect(isAdult(d.toISOString().slice(0,10))).toBe(true); });
  it("rejects under 18", () => { const d = new Date(); d.setFullYear(d.getFullYear()-10); expect(isAdult(d.toISOString().slice(0,10))).toBe(false); });
  it("rejects garbage", () => expect(isAdult("not-a-date")).toBe(false));
});
```
- [ ] **Step 3:** `npx vitest run app/app/account/membership-actions.test.ts` → PASS. `rm -rf .next && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Commit** `feat(membership): completeMyMembership self-service action [CR-0014]` (action + test).

---

## Task 2: Onboarding page + form

**Files:**
- Create: `app/app/account/membership/page.tsx`, `app/app/account/membership/membership-form.tsx`
- Reference: `app/app/register/page.tsx` (GeoPicker cascade via searchParams), `app/app/register/register-form.tsx` (field set + useActionState + useActionFeedback).

**Interfaces:**
- Consumes: `completeMyMembership`, `MembershipState`; `GeoPicker` (`depth="polling_unit"`, no `locked` — home can be anywhere).

- [ ] **Step 1: page.tsx (RSC).** Read `searchParams` (state/lga/ward/pu). Load caller profile + existing member row (`members` by `user_id`). If already a member → show "You're already a member" + link to card. If `role === 'member'` → redirect to `/app`. If no `pu` selected → render `GeoPicker action="/app/account/membership" depth="polling_unit" selection={...} submitLabel="Continue" addPollingUnit`. Once `pu` chosen, resolve the path (pu→ward→lga→state) for a "Your home area: A › B › C › D" confirmation, then render `<MembershipForm pollingUnitId={pu} defaultFullName={profile.full_name} />`.
- [ ] **Step 2: membership-form.tsx (client).** `useActionState(completeMyMembership, {status:"idle"})`, `useActionFeedback`. Hidden `polling_unit_id`. Fields: full name (default from profile), gender (select male/female), date of birth (date), NIN, VIN (hint `VIN_HINT`), phone (optional, hint `PHONE_HINT`). On success show the assigned membership number + a "Download your card" link + "Go to home". Mirror `register-form.tsx` structure and the shared `Input`/`Button`/`FormError` primitives.
- [ ] **Step 3:** `rm -rf .next && npx tsc --noEmit` → PASS; `npm run lint` clean on the new files.
- [ ] **Step 4: Verify running + screenshots (UI sign-off gate).** Sign in as a staff account without a member row, complete the flow, confirm the member row + number + card. Screenshot desktop+mobile, light+dark. **Wait for approval before committing.**
- [ ] **Step 5: Commit (after sign-off)** `feat(membership): self-service onboarding page + form [CR-0014]`.

---

## Task 3: Shell prompt for staff without a membership

**Files:**
- Create: `components/account/complete-membership-prompt.tsx`
- Modify: `app/app/layout.tsx`
- Reference: `components/account/vin-prompt.tsx` (dismiss via `useSyncExternalStore`, session key), `lib/must-change-password.ts` (`needsPasswordChange`).

**Interfaces:**
- Consumes: none (client prompt); links to `/app/account/membership`.
- Produces: `<CompleteMembershipPrompt />`.

- [ ] **Step 1: complete-membership-prompt.tsx.** Copy `vin-prompt.tsx`'s dismiss scaffold (session key `tr:membership-prompt-dismissed`). Instead of an inline form, render a modal: title "Complete your membership", body "You're a member of the movement too. Add your details to get your membership card.", a primary link-button to `/app/account/membership` ("Complete membership") and a "Not now" dismiss.
- [ ] **Step 2: layout.tsx.** After loading `profile`, also fetch the caller's member row: `supabase.from("members").select("id").eq("user_id", user.id).maybeSingle()`. Compute `const needsMembership = Boolean(profile && profile.role !== "member" && !memberRow)`. Update the prompt precedence at the bottom:
```tsx
{needsPasswordChange(user?.app_metadata) ? (
  <ChangePasswordPrompt />
) : needsMembership ? (
  <CompleteMembershipPrompt />
) : needsVin ? (
  <VinPrompt />
) : null}
```
Import `CompleteMembershipPrompt`. (`needsVin` stays as the fallback for staff who have a member row but somehow no profile VIN.)
- [ ] **Step 3:** `rm -rf .next && npx tsc --noEmit` → PASS.
- [ ] **Step 4: Verify + screenshots (UI sign-off gate)** — prompt appears for a staff account lacking a member row; "Not now" dismisses for the session; completing membership makes it stop appearing. **Wait for approval before committing.**
- [ ] **Step 5: Commit (after sign-off)** `feat(membership): shell prompt for staff to complete membership [CR-0014]`.

---

## Task 4: Surface card + ID on staff homes and account; movement counts

**Files:**
- Modify: `app/app/page.tsx` (`LeaderHome`, `CoordinatorHome`), `app/app/account/page.tsx`
- Reference: `MemberHome` in `app/app/page.tsx` (existing card + ID block to reuse).

**Interfaces:**
- Consumes: the caller's own `members` row (`select id, membership_number, status .eq("user_id", userId)`), the `/app/members/[id]/card` route.

- [ ] **Step 1: Extract a small server helper or inline** in `page.tsx`: fetch `me = members by user_id (id, membership_number, status)`. Add the same "Membership ID + Download card" block that `MemberHome` already renders to the top of `LeaderHome` and `CoordinatorHome` (only when `me` exists and `status === 'active'`). Keep it visually secondary to each role's primary content.
- [ ] **Step 2: account/page.tsx** — add the same ID + card block for the caller (their own member row), so it's reachable from the account page too.
- [ ] **Step 3: Movement count relabel** — in `CoordinatorHome`, the `members` count now includes staff; change the label "Members in your area" → "Members" (national) / keep area wording but it now means home-based membership. Keep the query as-is.
- [ ] **Step 4:** `rm -rf .next && npx tsc --noEmit` → PASS.
- [ ] **Step 5: Verify + screenshots (UI sign-off gate)** — Leader, Coordinator, National homes each show the card for a staff account that has completed membership; counts read as the movement total. **Wait for approval before committing.**
- [ ] **Step 6: Commit (after sign-off)** `feat(membership): show card on staff homes + account; movement counts [CR-0014]`.

---

## Task 5: Gates + docs + PR

- [ ] **Step 1:** Full gates — `rm -rf .next && npx tsc --noEmit && npm run lint && npm run build && npx vitest run` → all green.
- [ ] **Step 2:** e2e — drive one staff account through onboarding → card download on `:3100` (reuse Playwright). Clean up any seed.
- [ ] **Step 3:** Update `CHANGELOG.md`; set ADR-0016 → Accepted on merge; tick CR-0014 tasks; add a `docs/engineering/learnings.md` note (staff membership keyed to home registration; caller-scoped service-role action).
- [ ] **Step 4:** Open PR `feat(membership): everyone is a member (CR-0014)`; body summarises the model + no-migration; ends with the Claude Code footer. Squash-merge after CI green + UI sign-off.

---

## Self-Review

**Spec coverage (CR-0014 / ADR-0016):**
- Staff hold real member record + number → Task 1. ✓
- Membership keyed to home registration → Task 1 (home path from chosen PU). ✓
- Self-service onboarding (prompt + page) → Tasks 2, 3. ✓
- Existing staff prompted on next login → Task 3 (`needsMembership` fires for any staff without a member row). ✓
- Card downloadable in dashboard + members app → Task 4 (all role homes + account) reusing the existing route. ✓
- Counts = movement total → Task 4 Step 3. ✓
- No-duplicate invariant → Task 1 Step 1.5 (dedupe by user_id/NIN/VIN + unique indexes). ✓
- No migration → honoured throughout. ✓

**Placeholder scan:** none — the action body is specified step-by-step with the field schema; UI tasks reference the concrete existing components to mirror. The one "extract or inline `isAdult`" is a real, bounded choice, not a placeholder.

**Type consistency:** `MembershipState` shape is defined in Task 1 and consumed in Task 2; `completeMyMembership` signature matches `useActionState` usage; member-row query (`id, membership_number, status` by `user_id`) is consistent across Tasks 3 and 4.

**Risk note:** the service-role action is privileged; the hard `user_id = auth.uid()` scoping (Task 1) is the safety invariant — a reviewer must confirm every write targets the caller only.
