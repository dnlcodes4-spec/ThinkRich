# Notifications — System & UX

Notifications were previously scattered (the `notifications`/`push_subscriptions` tables in
[data-model.md](data-model.md), Web Push in [ADR-0004](decisions/0004-pwa-for-members-app.md),
toasts in [components.md](../design/components.md)). This doc consolidates them into one system:
what we send, through which channels, how it's delivered, and how it looks — plus how it's tested.

> Phase-1 scope is an **open question** (roadmap Q4): ship push in Phase 1 or defer? This doc
> defines the whole system so either choice is a subset, not a redesign.

## Principles

1. **Respectful, not spammy.** Notify only when it's useful or actionable; batch/limit noise.
2. **Actionable.** Every notification has a clear purpose and, where relevant, a deep link to act.
3. **Scoped & private.** A user only ever receives notifications for their own scope; **push
   payloads carry no sensitive PII** (title + link, not full member records). RLS governs the
   in-app list.
4. **Layered.** In-app history is the source of truth; push is an optional re-engagement layer.
5. **Honest states.** Loading/empty/error handled; never a silently broken bell icon.

---

## Channels

| Channel | What | Notes |
|---------|------|-------|
| **In-app** | A notification centre (list + unread badge) and transient **toasts** for immediate feedback | The canonical record; always available; styled per [components.md](../design/components.md#feedback--system-states). |
| **Web Push** | Browser/PWA push via **VAPID** (`web-push`) | Re-engages users not in the app. iOS needs the PWA **installed** to the home screen (iOS 16.4+). Requires a stored subscription. |
| **External group links** | **Telegram / WhatsApp** group **join links** | These are *links we surface*, not a channel we deliver into — we don't send messages to those groups from the platform. Treat as onboarding CTAs, not notification delivery. |

Email/SMS are **out of scope** unless a future ADR adds them.

---

## Notification catalog

The events the system produces. `Trigger` is the domain event; `Audience` is scoped by role/geo.

| # | Notification | Trigger | Audience (scope) | Channels | Priority |
|---|--------------|---------|------------------|----------|----------|
| N1 | **Voting reminder** | scheduled / campaign event | Members, by their **L.G** | in-app + push | high |
| N2 | **Major update / announcement** | admin publishes | Scoped audience (national/state/L.G) | in-app + push | normal |
| N3 | **Change request decided** | State Admin approves/rejects | The requesting **member** | in-app (+ push) | normal |
| N4 | **Opt-out status change** | account frozen / reactivated / deleted | The **member** + their **leader** | in-app | high |
| N5 | **Membership card ready** | registration completes | The **member** + registering **leader** | in-app | normal |
| N6 | **New member registered** | leader registers a member | The **leader** (confirmation) | in-app / toast | low |
| N7 | **Admin message received** | higher admin messages a lower one | The recipient **admin** | in-app | normal |
| N8 | **KYM verification** | a leader is verified via code | (optional) the **leader** | in-app | low |

Copy is specific and action-oriented (see [design/authentic-design.md](../design/authentic-design.md)):
e.g. N1 → *"Reminder: your candidate for Ikeja is Ada Obi. Tap to view."* — not *"You have a new notification."*

---

## Data & delivery

**Tables** (see [data-model.md](data-model.md)):
- `notifications` — `id`, `type` (N1–N8), `audience`/scope, `title`, `body`, `link`, `created_at`,
  and per-recipient **read state** (a `notification_reads` join, or per-row recipient).
- `push_subscriptions` — `id`, `user_id`, `endpoint`, `keys` (one per device/browser).

**Delivery pipeline**
1. A domain event fires (Server Action or scheduled job) → **create the in-app notification(s)**
   for the scoped audience.
2. If the recipient has push subscriptions and the type is push-enabled → **enqueue a push** with
   a minimal payload (`title`, `link`), signed with the server-only `VAPID_PRIVATE_KEY`.
3. The **service worker** (`public/sw.js`) shows the notification and routes the click to `link`.

**Reliability**
- **Idempotency / dedup:** a `(type, subject_id, recipient)` key prevents duplicate sends (e.g. a
  retried Server Action mustn't double-notify).
- **Retry:** transient push failures retry with backoff; on `410 Gone`/`404`, **delete the dead
  subscription**.
- **Preferences (future):** a per-user preference + quiet-hours model; until then, transactional
  notifications (N3–N6) always send in-app; broadcast types (N1–N2) respect any campaign controls.

**Security & privacy**
- In-app reads are **RLS-scoped** — a user can only read their own notifications.
- Push payloads contain **no member PII** beyond a name/first-name + link; the detail loads
  in-app behind auth.
- `VAPID_PRIVATE_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are **server-only** ([security-model.md](security-model.md)).

---

## UX (per the design system)

- **Notification centre:** a list with unread emphasis, grouped by recency; each row = icon +
  title + time + tap-to-act; **empty state** ("You're all caught up") and loading skeletons.
- **Toasts:** immediate feedback for the current action (N5/N6); brief, one at a time, auto-dismiss
  (except errors needing action). See [components.md](../design/components.md#feedback--system-states).
- **Push permission priming:** never request push permission on first load. Ask **in context**
  after a relevant action, explaining the value; on iOS, guide the user to **install to home
  screen** first (push only works installed).
- **Unread badge** on the bell/tab; clears on read.
- Respect `prefers-reduced-motion` for any bell/badge animation.

## Testing

Covered in the [testing strategy](../engineering/testing-strategy.md#notifications--event-driven).
In short: unit-test trigger/dedup/copy logic; integration-test the pipeline + **RLS on
`push_subscriptions` and notification reads** (allow/deny per recipient) + dead-subscription
cleanup with a mocked push service; one E2E for the voting-reminder journey and the push
permission prompt.

## Open questions
- **Q4 (roadmap):** push in Phase 1 or later? (This system supports either.)
- Preferences/quiet-hours model — needed for Phase 1, or deferred?
- Do broadcast announcements (N2) need scheduling/campaign tooling now?
