# Think — Winners Movement · Build Plan

**Track chosen:** Members' App (PWA) first · **Backend:** Supabase · **Framework:** Next.js 16.2 (App Router) + React 19.2 + Tailwind v4

> This plan covers Phase 1 (the Members' PWA) plus the minimal shared foundation it
> depends on. Public website and full admin dashboards are later tracks, stubbed here
> only where the members' app touches them (e.g. State Admin approving change requests).

---

## 0. Why the foundation comes first (even though we picked "members' app")

Members cannot self-register — **Leaders create members**, and every member is scoped to a
State → L.G → Unit → Ward and sees a candidate based on their L.G. So the members' app is
unusable without: the role/geography model, auth, and at least the Leader registration flow.
Phase 1 therefore includes the backbone, scoped tightly to what the member + leader experience needs.

---

## 1. Data model (Supabase / Postgres)

**Geography (reference data, seeded):**
- `states` — 36 Nigerian states + FCT; `is_active` (activated when National assigns an admin)
- `lgas` — belongs to a state
- `wards` — belongs to an lga
- `units` — a unit = 2+ wards; `unit_wards` join table

**Identity & roles:**
- `profiles` — 1:1 with `auth.users`; `role` enum (`national_admin`, `state_admin`, `lg_admin`, `unit_coordinator`, `leader`, `member`), plus scope FKs (`state_id`, `lga_id`, `unit_id`) that are non-null only at the relevant level.
- `members` — the membership record. `membership_number` (unique, **immutable**), `registered_by` (leader FK), demographic fields, `ward_id`/`lga_id`/`state_id`, `status` (`active` | `frozen` | `deleted`), `profile_photo_url`.
- Constraint: a leader may have **at most 10** active members (enforced in the registration Server Action + a DB check).

**Workflows:**
- `change_requests` — member-submitted field changes; `field`, `new_value`, `reason`, `status` (pending/approved/rejected), reviewed by State Admin.
- `opt_out_requests` — `reason`, `status` (requested → frozen → deleted/reactivated).
- `leader_kym_codes` — unique code per leader for leader-to-leader verification.

**Movement content:**
- `candidates` — `level` (presidential/state/lg), scope FK, uploaded_by; members see the one for their L.G (+ presidential).
- `notifications` — voting reminders + major updates; `audience` targeting by scope.
- `push_subscriptions` — Web Push endpoints per user (for the PWA notifications).

**Security:** every table gets **Row-Level Security** policies encoding the hierarchy
(a leader sees only their 10; a state admin sees only their state; national sees all).
RLS is the real authorization boundary — the UI just mirrors it.

**Open items blocking final schema** (need client): exact `membership_number` format;
the card design/graphic file; whether members log in with membership number, phone, or email.

---

## 2. Project & infra setup

1. Install deps: `@supabase/supabase-js`, `@supabase/ssr`, `zod`, `web-push`. (npm — repo already uses `package-lock.json`.)
2. `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`.
3. Supabase clients: `lib/supabase/server.ts` (Server Components / Actions — **`cookies()` is async, must await**), `lib/supabase/client.ts` (browser), `lib/supabase/middleware.ts` helper.
4. **`proxy.ts`** at repo root (the v16 rename of `middleware.ts`) — refreshes the Supabase session and guards protected routes.
5. Migrations & seed via Supabase CLI (`supabase/migrations/*.sql`) — schema, RLS policies, and geography seed (36 states → LGAs → wards).

---

## 3. PWA shell (per the official v16 PWA guide)

- `app/manifest.ts` — name, icons (192/512), `display: standalone`, theme colors → enables "Add to Home Screen".
- `public/sw.js` — service worker handling `push` + `notificationclick`.
- Security headers in `next.config.ts` (`headers()`), including no-cache + strict CSP for `/sw.js`.
- `InstallPrompt` client component (iOS "Add to Home Screen" hint; hidden when already standalone).
- VAPID keys generated with `web-push generate-vapid-keys`.
- Local testing over HTTPS: `next dev --experimental-https`.

---

## 4. Auth (Server Actions + Supabase, per v16 auth guide)

- Login form → Server Action → Supabase Auth; Zod validation server-side.
- Session in cookies, refreshed in `proxy.ts`; route protection via a `getUser()` check in a shared server util.
- Roles drive routing: after login, redirect by `role` (member → `/app`, leader → `/app` with leader tools, admins → their dashboards later).
- No public sign-up for members — the sign-up path only exists inside the Leader flow.

---

## 5. Members' app features (`app/(member)/…`)

1. **Home / voting view** — the candidate for the member's L.G + the presidential candidate; persuasive framing.
2. **Profile** — view all fields; **only profile photo** is directly editable (upload → Supabase Storage). All other edits open a **change request** (with reason) → State Admin approval.
3. **Membership card** — rendered from the client's official design with fields auto-placed + the unique membership number; downloadable/printable.
4. **Opt-out** — request + reason → account **frozen** → leader retention step → permanent delete or reactivate.
5. **Community links** — Telegram / WhatsApp group join.
6. **Notifications** — in-app list + Web Push (voting reminders, major updates).

## 6. Leader tools (inside the same app, role-gated)

1. **Register member** — form → Server Action; auto-generate membership number + card; enforce ≤10 members.
2. **My members** — list, edit info, download each member's card.
3. **KYM** — verify another leader by their unique code.

---

## 7. Suggested build order (each step independently reviewable)

| # | Deliverable |
|---|-------------|
| 1 | Supabase project + schema migrations + geography seed + RLS |
| 2 | Supabase client wiring, `proxy.ts`, env, base layout |
| 3 | Auth (login, session, role-based redirect) |
| 4 | Leader: register member + membership-number generation |
| 5 | Membership card render + download (needs card design asset) |
| 6 | Member: profile view + photo update + change-request flow |
| 7 | Member: voting/home view + candidates |
| 8 | Opt-out flow (freeze → retain → delete/reactivate) |
| 9 | PWA shell (manifest, SW, install prompt) |
| 10 | Web Push notifications + KYM |

---

## 8. Decisions needed from you / client before coding starts

- **Member login credential:** membership number, phone, or email? (blocks auth + registration UX)
- **Membership number format** (blocks generation logic) — proposed default: `TWM-<STATE>-<LGA>-<seq>`.
- **Card design file** (blocks step 5) — can proceed with a placeholder template meanwhile.
- **Push scope for Phase 1:** ship notifications now, or defer to a later phase?

## 9. Assumptions (correct me if wrong)

- npm as package manager; Tailwind v4 (already scaffolded); TypeScript throughout.
- Supabase Auth + RLS is the authorization source of truth.
- "36 states" in the doc is treated as 36 states **+ FCT** for Nigeria; confirm if FCT is excluded.
- One State Admin per state; a Leader owns exactly their registered members (cap 10).
