# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Entries are derived from [Conventional Commits](https://www.conventionalcommits.org/).

## [Unreleased]

### Added
- **Dashboard feedback & state system.** The `/app` dashboards had good primitives but no rules:
  loading skeletons on only 4 of 17 routes, three different ways of showing success/error, no
  empty-state component, and the action-result shape copy-pasted per form. Foundation added: a
  shared `ActionState` type with `ok()`/`fail()`, a `useActionFeedback` hook that centralises the
  one rule (toast on success, inline on error, with a one-time-artifact exception), and `FormError`,
  `EmptyState`, `Select`, `Textarea` primitives plus `SkeletonList`/`SkeletonTable`. The rules are
  documented in [docs/design/feedback-and-states.md](docs/design/feedback-and-states.md) and pinned
  by the UI Definition of Done. Coverage sweep (loading on every route, `Suspense` on heavy
  sections, forms and empty states migrated) follows.
- **The community's four executive officers are named publicly, on both landings** (CR-0010). The
  layout is deliberately not a four-up card grid: we hold a full profile on the President and a name
  plus an office on the other three, so visual weight tracks office rank rather than pretending the
  four are equally documented. The President takes a spread with both his supplied images, the Vice
  President a double-width cell holding both of theirs, the Secretary and Treasurer a compact pair.
  The hook is specific rather than "meet the team": the President's signature is on every membership
  card the movement issues. One component serves both brands (ink+green on the umbrella, navy+gold on
  Think-Winners) with copy cut for each audience. The client's photographs are shipped as five
  normalised 4:5 crops, which also removed a photographer's watermark that a wider crop would have
  published; `public/leaders/CREDITS.md` records the recipe and what is wrong with the source set.
  - This partially reverses CR-0004, which said the Think-Winners landing would not show "the internal
    leadership chain". That decision is now scoped, in writing, to the **operational hierarchy**
    (National → State → LG → Ward → Polling Unit), which stays unpublished. Executive officers are a
    different thing and help rather than dilute a pitch to a campaign.
- **The umbrella landing uses the real ThinkRich Community logo.** The nav had been showing a
  hand-made "TR" monogram chip and the footer a text wordmark, both placeholders, while the client's
  artwork sat unused in `public/logos/`. The nav and compact footers now pair the real striding-figure
  mark with live text; the landing footer carries the full lockup, which made the tagline beside it
  redundant. Two traps in the source file are handled by the derivation rather than shipped: a **1px
  pale yellow frame baked into its edges**, invisible on white but a hard rectangle on every dark
  surface this brand uses (and `-trim` does not remove it, it stops at the frame), and a blackletter
  name that is illegible below ~120px, which is why small contexts get live text instead of the
  supplied wordmark. Recipe and findings in `public/logos/CREDITS.md`.

- **A full profile page for the President** at `/leaders/president` (CR-0010), carrying the client's
  profile document as an editorial page: a dark masthead with the portraits, the creed, and a record
  block of hard facts, then the narrative with headings set in the left margin and the six
  organizations he leads as a register. It lives on the apex origin, so the Think-Winners landing
  links across to it with `apexHref` (CR-0008).
- **Voter identity is held for everyone, and is unique system-wide** (CR-0009 §3.1, ADR-0015).
  The VIN moves into its own `voter_ids` table keyed by the number itself, referenced by both
  `members` and `profiles`. The client asked us to "set the VIN column to UNIQUE"; that could not be
  one constraint, because admins and members live in different tables and one person is legitimately
  both, so uniqueness is now a primary key instead of a trigger that would have raced. Every VIN is
  stripped of punctuation, uppercased and validated server-side before it is stored, so the same card
  cannot occupy two rows. Required for new members and new admin accounts; the existing fixture rows
  and the twelve pre-existing admin accounts are grandfathered by `NOT VALID` constraints.
- **Members can download their membership card at any time** (CR-0009 §3.5). Rendered server-side
  onto the client's supplied artwork and served through an authorized route, so a card can only be
  fetched by someone RLS already lets see that member, and a frozen or removed membership cannot
  produce a current card. Field positions were measured off the blank template rather than eyeballed.
  Adds `members.gender`, which the card's GENDER line needs.
- **An admin can change the role of anyone below them** (CR-0009 §3.3, ADR-0015), which is how a
  unit coordinator promotes a member to leader. It runs under the caller's own credentials with no
  service role, so `profiles_update` is the authorization boundary rather than an `if` statement.
- **Demotion is supported, with a rule** (CR-0009 §3.3): a leader still holding active members
  cannot be moved out of the role until those members are reassigned. Enforced by a trigger.

### Changed
- **Leaders are no longer capped at ten members** (CR-0009 §3.4). The trigger and function are
  dropped; ten becomes a milestone celebrated permanently on the leader's dashboard rather than a
  ceiling. Eleven documentation sites that described it as a limit were corrected. Note this is not
  cleanly reversible: restoring the cap would freeze any leader already past ten at their current
  count rather than un-registering anyone.
- **Any admin may now create any role below them** (CR-0009 §3.2), so a ward or LG admin can appoint
  a leader directly. This removes a restriction that lived only in application code: `profiles_insert`
  has always permitted it, and the old `NEXT_TIER` table contradicted the database.

### Fixed
- **A state closes for registration when it loses its last State Coordinator.** Noticed on the
  national map: Ogun and Oyo were shown as active with no coordinator and nobody registered. Their
  coordinators had been created, which opens the state, and then permanently deleted. Deleting an
  account only removes the auth user, so nothing reversed the activation, and both states sat open
  for member registration with nobody supervising them. The invariant was enforced on one edge only.
  It now holds on both: a trigger closes a state when its last coordinator is deleted, deactivated,
  moved, or given another role, and it logs why, because the absence of any such entry is what made
  the original case impossible to explain. Deliberately one-directional. The database only ever
  closes a state, never opens one, so the national coordinator can still hold a state shut while it
  has an admin or open one ahead of an appointment. Both opening paths (create and promote) now share
  one helper and log too; promoting someone to State Coordinator previously left their state shut,
  blocking registration there.
- **Active states on the national map are drawn inside their own borders.** The green status stroke
  was centred on each boundary, so half of it painted the neighbouring inactive state, and two active
  states that share an edge (Ogun and Oyo) merged into a single silhouette that contradicted the
  "2 of 37" beside it. The status border and the gold hover/selection border are now clipped to the
  state's own shape, and an active state carries a green wash so the fill says something too rather
  than looking identical to every inactive state with no members.
- **Leader verification actually works** (CR-0009 §3.6). It was reported as "not functional" and it
  was: `leader_kym_codes` held zero rows against fourteen profiles, because nothing ever minted a
  code. A leader had to find `/app/kym` and press a button, and nobody had, so every check correctly
  returned "not verified". Codes are now minted by the database whenever a leadership profile is
  created or promoted, and every existing leader and admin was backfilled.
- **Verification no longer depends on the service-role key.** The lookup moved to a `SECURITY
  DEFINER` function that returns only the holder's public identity, so a deploy missing
  `SUPABASE_SERVICE_ROLE_KEY` no longer 500s the whole feature.
- **Member profiles were invisible to every admin.** They were created with no geographic scope while
  the read and write policies both test exactly those columns, so `profile_in_scope` returned NULL
  for anyone but the member themselves. Found while planning the upgrade system, which could not
  have worked without fixing it. Scope is now backfilled and kept in step by a trigger.

### Changed
- **The product now lives on two origins** (CR-0008, ADR-0014). `thinkrichcommunity.com` serves the
  ThinkRich Community umbrella landing and nothing else; everything Think-Winners — its landing, now
  at the root, plus `/login` and every `/app` dashboard — moves to
  `thinkwinners.thinkrichcommunity.com`. One Vercel project and one build still serve both: the
  proxy branches on the `Host` header, redirecting misplaced paths (307, so a rollback is not stuck
  in browser caches) and mounting the Think-Winners subtree at its own origin's root. The routing
  table is a pure function with a unit-tested truth table, and the cross-origin link helpers are
  generated from the same definition, so a link cannot drift from the routing.
  The apex keeps one "Member login" link into the subdomain.
  Setup and rollback: [deployment.md](docs/engineering/deployment.md).
- **The split is configuration, not code.** `NEXT_PUBLIC_APEX_HOST` and
  `NEXT_PUBLIC_THINK_WINNERS_HOST` enable it; with either unset it is a no-op and every surface
  stays on one origin, which is what local dev and Vercel previews need. Unrecognised hosts, such as
  preview URLs, are left unsplit rather than redirected into production. Unsetting both is also the
  documented rollback.
- **The PWA narrowed from the whole origin to `/app`.** Service workers are origin-scoped, and after
  the split the root layout also renders a marketing site with nothing to install, so the registrar
  moved out of the root layout into the app shell and both it and the manifest now scope to `/app`.
  The manifest re-brands to Think-Winners navy (ADR-0008), since navy is what the installed app
  opens into. No install base existed to migrate.

### Added
- **Full elective-office coverage** (CR-0007, ADR-0013, migrations `0016`–`0018`). All seven offices
  Nigerians elect are now modelled, not three: President, Senate, House of Representatives,
  Governor, State House of Assembly, LG Chairman and Councillor. Offices, parties, elections and
  constituencies are **admin-editable reference data**, so the national admin can add and correct
  positions and dates without a deploy. `office_types.constituency_kind` declares what geography a
  seat is elected from, and scope validation, the member view and the permission check all branch
  on it. Seeded with INEC's 21 registered parties and the revised 2027 timetable (16 Jan / 6 Feb).
  Background: [nigeria-elective-offices.md](docs/project/nigeria-elective-offices.md).
- **Candidate permissions by geographic containment.** An admin may write a candidacy only if its
  constituency sits inside their own scope; national admin's scope is the country. Enforced in
  Postgres (`private.candidacy_in_scope`) on insert, update and delete, with candidacy writes going
  through the caller's client rather than the service role, so RLS is the real gate.
- **Members can browse any area's candidates**, defaulting to their own ward. `/app/vote` now lists
  every race that applies to a place, most local first, with all uploaded candidates per race and
  the movement's own pick marked. This is an awareness surface: nothing casts or counts a vote.

### Changed
- **The National Coordinator is no longer scoped anywhere in the app.** The database already
  treated them as unscoped; application code did not. They can now **create any role below them at
  any geography** (previously State Admin only, via a `NEXT_TIER` table) using a full
  state → LGA → ward → polling-unit cascade, and **manage every tier on the Team page**
  (previously State Admins only). Provisioning is now two explicit rules matching `profiles_insert`:
  the target must rank below the caller, and its path must sit inside the caller's scope. The
  national admin has no scope, so the second rule does not bind them. Other admins are unchanged:
  next tier down, own scope only.
- **The National Coordinator can register a member** into any polling unit in the country
  (migration `0019`), optionally attributing them to a leader there so the member stays inside the
  leadership chain. This also corrected the **≤10-members cap**, which counted by `registered_by`
  regardless of role and so would have capped the Coordinator at ten: the rule is "a *leader* may
  hold at most 10 active members", so it now applies only when the registrar is a leader. A member
  attributed to a leader still counts against that leader.
- **Ward Admins can reach the candidates screen**, since they own their ward's councillor race.
- **`candidates` replaced by `candidacies`.** The `candidate_level` enum
  (`presidential`/`state`/`lg`) and the one-candidate-per-scope unique indexes are gone; multiple
  candidates per race are now allowed. The old table held 0 rows, so nothing was migrated.

- **Electoral constituencies imported** from INEC's own workbook (T-031): **1,459** rows, being 109
  senatorial districts, 360 federal constituencies and 990 state constituencies, with names and
  codes. Senatorial LGA membership landed for **22 of 37 states** (427 links), so **5,017 wards now
  resolve to a senatorial district** and Senate races appear for members in those states. Extracted
  by `scripts/extract-constituencies.py`, imported by `scripts/import-constituencies.mjs`, both
  idempotent. Provenance and coverage: [docs/project/data/constituencies](docs/project/data/constituencies/README.md).
- **Elective-office RLS test suite** (`supabase/tests/elective_offices_rls_test.sql`): every role
  against every office kind, including the three overlay shapes that containment has to tell apart
  (a constituency inside one LGA, one spanning several, one that is ward-split), plus catalogue
  write-protection, draft/published gating, the scope triggers and the resolver.

### Fixed
- **`rls_test.sql` counted every member in the table**, so its expectations broke as soon as
  production held any real member. It now counts only its own fixtures.
- **Removed a stray `Seed LGA`** (Lagos, code `SEED`) inserted outside the migrations during early
  bootstrapping (migration `0020`). Geography counts now match the official figures exactly:
  **774 LGAs / 8,793 wards / 119,971 polling units**.

### Known gaps
- **House of Reps and State Assembly races still resolve for nobody.** Their constituencies exist
  and candidates can be attached to them, but no ward maps to one yet. Senate resolves in 22 of 37
  states. Finishing this needs a reviewed LGA alias table (the 2010 workbook and our 2015 LGA names
  spell ~40-60 LGAs differently) and, for state constituencies, INEC's ward-level delimitation,
  which is a different document. Tracked as **T-031b**.
- Our polling-unit reference data is a generation behind INEC's (119,971 held vs 176,846 in use).
- **Activity log (national)**: an append-only `activity_log` (migration `0015`) with a read policy
  scoped to active National Coordinators and **no insert policy at all**, so only the service role
  can write (no user JWT can forge an entry). `lib/activity.ts` records best-effort (never throws,
  never blocks the action). A new `/app/logs` shows the feed with plain-language labels and filters.
  Wired: member registered, account deactivated/reactivated/deleted, state activated/deactivated,
  correction applied/declined.
- **Nigeria map on the National home**: an interactive SVG choropleth shading states by member
  count (navy scale), with a selectable side panel (members + leaders per state). Boundaries are
  precomputed to SVG paths at build time (`scripts/build-nigeria-map.mjs`), so the app ships **no
  runtime map library**. Source: geoBoundaries gbOpen NGA ADM1, CC BY 4.0.
- **Account page** (`/app/account`): every role can see their own name, role, email and area, and
  **change their password**. Fixes coordinators having no account surface (the account menu
  previously sent every role to the member-only profile page).
- **Permanent account delete** in Team: gated by a typed-name confirmation and refused (in plain
  words) while the account still holds members. The database `RESTRICT` foreign key is the backstop.
- **Login password show/hide** toggle (reusable `PasswordInput` + an `Input` trailing slot), and the
  ThinkRich logo mark now sits beside the wordmark in the dashboard sidebar and mobile header.

### Fixed
- **`createAdminClient()` now fails readably** when `SUPABASE_SERVICE_ROLE_KEY` is missing on a
  deployment, instead of an opaque 500. Pages that only need it for extras degrade (photos hidden, a
  "not configured" notice on Candidates/States); provisioning actions return the message inline.

### Added
- **Loading, error and not-found states across the app** (UI/UX overhaul Phase 5): the app had **no**
  `loading.tsx`, `error.tsx` or `not-found.tsx` anywhere, so every data page rendered with no loading
  feedback and any thrown error or `notFound()` fell through to Next's raw defaults. Adds a
  reduced-motion-aware `Skeleton` primitive plus skeletons shaped like the real content for the app
  segment, Members, Correction requests and Statistics (each announced to assistive tech via a
  `role="status"` region, with the boxes themselves `aria-hidden`); a plain-language **error boundary**
  ("Something went wrong", Try again / Go to home, showing only the digest, never the raw error); and a
  **not-found** page whose wording deliberately does not distinguish "does not exist" from "outside your
  area", so it never confirms a record RLS is hiding.
- **Skip to content link** in the app shell: the sidebar precedes the content in the DOM, so keyboard
  users can now jump past it. Sidebar and bottom-nav destinations also gained explicit
  `focus-visible` rings, matching the rest of the app instead of relying on the browser default.

### Changed
- Team roster: an empty area read as a bare dash; it now reads **"No area set"**.

### Added
- **Correction request review queue** (`/app/corrections`, UI/UX overhaul Phase 4): every correction
  a member has asked for, across the coordinator's scope, in one place. Previously these could only
  be found one member at a time on that member's detail page, and the Home KPI pointed at the member
  list. Shows the member (linked), the field, the new value and their reason, with **Approve & apply
  / Decline** inline plus a *Recently decided* section. Deciding is restricted to State and National
  Coordinators (re-checked server-side in `reviewChangeRequest`); lower tiers see the same queue
  read-only. Wired into coordinator nav, the Home KPI and a quick-action tile, and the review action
  now revalidates the queue and Home.

### Changed
- **UI/UX overhaul Phase 4 (coordinators):** Statistics dropped the last database wording, so
  `Frozen` / `Deleted` now read **Paused** / **Removed**.
- **UI/UX overhaul Phase 3 (leader experience):** the rules the database already enforced are now
  visible before a leader starts typing. **Register a member** leads with capacity (`3 of 10` +
  progress), replaces the form with a clear notice when the leader is **at the 10-member cap** or
  when their **state is not activated yet**, and groups the eight fields into *Member details*,
  *Bank details* and *Login*, each explaining why it is asked. **My members** reads `3 of 10 active`
  and only renders the Actions column when a member is actually paused (it was an always-empty
  column). **Member detail** reads in plain language ("Not provided", "Area", "Correction requests"
  with *Waiting for review / Applied / Declined*). Mobile nav tabs gained short labels, since five
  leader destinations share a 390px bar.
- **App UI/UX overhaul (Phase 1 + 2):** the member app moves from a flat list of links to a real
  product. Added a navigation shell (`components/app-shell/`): desktop sidebar + mobile bottom tabs
  driven by the caller's role, plus a header with a notifications bell (unread badge) and account
  menu. `/app` is now a role-aware home (member / leader / coordinator dashboards). Redesigned the
  **login** into a split brand layout (green ThinkRich panel + navy Think-Winners sign-in card).
  Polished the member surfaces: **Who to vote for** leads with the local chairman; **My details**
  (renamed from "Your profile") reads in plain language. Introduced a plain-language glossary
  (`lib/terms.ts`) and updated `StatusPill` (`frozen → Paused`, `deleted → Removed`,
  `rejected → Declined`).
- **Removed dark mode (light-only, for now):** dropped the theme toggle, the `@media dark` /
  `[data-theme="dark"]` token blocks, and the pre-paint theme script. May return for the dashboard.
- **ThinkRich → black + green** (CR-0006 / ADR-0010, amending ADR-0008): the ThinkRich umbrella
  (root site + member app + shared UI primitives) rebrands from navy + gold to a near-black `ink-*`
  scale + the **logo green** (`green-*` re-sampled from the ThinkRich Community logo). Root
  components swap `navy-* → ink-*` and `gold-* → green-*`; the member app/primitives get it via the
  semantic tokens (light + dark). **Think-Winners keeps navy + gold** (untouched).
- **Premium pass (root):** replaced the philosophy four-cell grid with a connected "one idea,
  four moves" flow whose links draw in on scroll; finished purging em dashes from the remaining
  user-facing copy (page titles, meta descriptions, form messages, login). Fixed the `#community`
  image alt to match the photo.
- **Premium copy + component pass:** rewrote the marketing copy into scannable fragments and
  purged em dashes from all user-facing copy. Replaced the Think-Winners process timeline with an
  interactive step-through "journey" (one step in focus at a time), and reframed "What we bring"
  from an eight-item list into three themed capability cards (the vital few).
- **Type system** (ADR-0009): replaced the scaffold's Geist with **Hanken Grotesk** (body) +
  **Zodiak** (ThinkRich display, self-hosted Fontshare serif) + Fraunces retained for
  Think-Winners; per-surface display face via `--font-display-face`. Removes the "AI-default"
  Geist tell. JetBrains Mono still carries numerals pending consolidation onto Hanken tabular-nums.
- **ThinkRich landing polish:** wired client-generated hero photography (optimised), removed the
  per-slide eyebrow labels, set the slider cadence to 5s, and fixed `#join`'s self-referential CTA.
- **Mobile-first restructure:** Think-Winners rebuilt from 9 sections to 6 (dropped the redundant
  reach band, folded benefits into "what we bring", merged vision + principles), and both landings
  compacted (Think-Winners ~13.4→8.9 phone screens; root ~8.4→6.8). Added cross-nav CTAs
  (ThinkRich → Think-Winners, and Think-Winners → back to ThinkRich).
- **Rule:** banned em dashes project-wide as an AI tell (authentic-design.md).

### Fixed
- Arms explorer: guard the mobile-accordion collapsed state (`active = -1`) so the desktop
  panel and deep-link URL effect no longer crash on `arms[-1]`; the mobile accordion now uses
  its own state and starts collapsed.
- Hero slider: auto-advance no longer freezes on hover/focus of the full-screen hero (explicit
  Pause/Play only); each segment's progress restarts from 0; completed segments stay filled.
- Gated the internal `/think-winners/organization` page — 404s in production unless
  `ENABLE_INTERNAL_PAGES=1` (T-022), on top of its existing noindex.

### Added
- Voting-reminder campaign (T-026, N1): a leader/admin can **send a voting reminder** from
  `/app/notifications` that fans out to every member in their scope with a login, **personalised by
  LGA** — naming their LGA chairman candidate where one is set ("Voting reminder: your LGA chairman
  candidate is Ada Chairman") and linking to their `/app/vote` screen. Members in LGAs without a
  candidate get a generic nudge. This is the **manual** trigger; a scheduled variant would call the
  same logic from an edge function on a pg_cron schedule (noted, not built). Verified live (leader
  sent → member received the personalised reminder).
- Leader verification / KYM (T-010, migration `0014`): a `/app/kym` page where a leader/admin mints a
  personal, no-ambiguous-character code (`ABC-DEF-GHJ`) to share, and verifies another leader by
  entering their code — returning a clear **verified** (name, role, geography) or **not verified**
  result. Only **active** leaders verify (a deactivated one fails). New `leader_kym_codes` table (one
  per leader; RLS: read own); verification runs through a service-role action that returns only the
  leader's public identity, never the code table. Verified live (generate → verify a real leader →
  reject a bogus code).
- In-app notifications (T-023, migration `0012`): a notification centre at `/app/notifications` (own
  notifications, newest first, unread markers, mark-read / mark-all-read) plus an **unread badge** on
  `/app`. Leaders/admins can **send an announcement** that fans out to every member in their scope
  who has a login (recipients resolved through the sender's RLS-scoped member view; fan-out insert
  via the service role). Wired the first system event: a **change-request decision notifies the
  member** (N3). Per-recipient `notifications` table (RLS: a user reads only their own); sending +
  mark-read go through service-role actions. Web Push (Q4) is a later layer over the same rows.
  Verified live (leader announcement → member received it, unread badge, mark-read clears it).
- Admin management (T-021): a scoped `/app/admin/team` where an admin views and **deactivates /
  reactivates the tier directly below them** (national → state admins, state → LG admins, LG → ward
  admins, ward → unit coordinators, unit coordinator → leaders), reusing the `NEXT_TIER` map.
  Deactivating sets the profile status **and bans the auth user**, so their sign-in is blocked
  immediately; reactivating reverses both. The list is RLS-scoped (an admin sees only their own
  scope); the action re-checks in code that the target is exactly the direct tier below. Verified
  live (national deactivated a state admin: status inactive + auth-banned; reactivate reverses).
- Member change-requests + leader photo upload (T-006 completed, migration `0011`): a member can
  **request a correction** to one of their details from `/app/profile` (name, DOB, VIN, email, bank
  details) with a reason; a **state-level admin reviews** it on a new member detail page
  (`/app/members/[id]`) and, on approval, the value is **applied to the member record** (DB triggers
  still guard age/uniqueness). The member sees their own requests' status. That detail page is also
  where a **leader/admin uploads a member's passport photo** (the counterpart to member self-upload,
  for members without a login), reusing the private `member-photos` bucket. New `change_requests`
  table (allowed fields enforced by a DB check; one open request per field) readable by member +
  in-scope leaders/admins (RLS); submit/review/upload go through service-role actions with authz
  re-checked in code. Roster member names now link to the detail page. Verified live end-to-end
  (member submits → admin approves → value applied; leader photo upload).
- Candidates + member voting view (T-007, migration `0010`): a member's hero screen at `/app/vote`
  shows the movement's candidates for **their own geography** — their **LGA chairman** (the hero),
  their **governor**, and the **president** — each with photo, party, running mate, and slogan, and
  a graceful "not announced yet" state. Admins manage the one candidate for their scope at
  `/app/admin/candidates` (national → presidential, state admin → their state, LG admin → their
  LGA), including a photo upload to a new **public** `candidate-photos` bucket. New `candidates`
  table (`level` presidential/state/lg with matching geography; one per scope) readable by any
  signed-in user (RLS); writes go through service-role Server Actions that derive level+geography
  from the caller's role/profile (never the form). Verified live: national admin published the
  presidential candidate; a member saw all three, hero = their LGA chairman. **The office taxonomy
  (presidential/state/lg) + fields follow the documented data-model; the client should confirm the
  exact set.**
- Member profile + passport photo (T-006, partial): a signed-in member has a profile at
  `/app/profile` showing their details (name, membership number, status, DOB, email, polling-unit
  path, all read-only) and can upload/replace their **passport photo**. Photos live in a new
  **private** Storage bucket `member-photos` (migration `0008`, 5 MB, JPEG/PNG/WebP): all access is
  server-mediated. The service role writes (authorized in code by confirming the row is the caller's
  own, since members can't update their row under RLS), reads use short-lived signed URLs, and no
  `storage.objects` policies exist so nothing else can touch the PII. Verified live (member uploads,
  renders, persists). Deferred: leader-side photo upload and the details change-request flow.
- Member login provisioning (T-017): a registered member can now be given their own login. A member
  needs three linked things to be recognised by RLS — an `auth.users` row, a `profiles` row with
  `role = 'member'`, and `members.user_id` — so provisioning creates all three via the service-role
  client (with rollback if any step fails) and returns a one-time temporary password. It runs
  **automatically at registration when an email was captured** (the temp password shows on the
  success screen beside the membership number; a provisioning failure is a note, never a failed
  registration), and on demand from the roster's new **Login** column ("Provision login" for members
  who have an email but no login yet; "Enabled" once done; "No email" otherwise). Authorization is
  re-checked in code by reusing RLS visibility (if the caller can see the member, they may manage
  it) and refusing members. Verified live: registered with email → member signed in with the temp
  password; roster button provisioned a login end-to-end.
- National-admin bootstrap (T-016, ADR-0012): a **dev-only** page at `/dev/national-admins` that
  creates, lists, and deletes national admins with a generated temporary password, solving the
  chain's start point (nothing sits above a national admin). Gated strictly on
  `NODE_ENV !== "production"` — the page `notFound()`s and every Server Action refuses in a prod
  build (verified: prod returns 404, dev returns 200); it lives outside the proxy-gated `/app`
  because bootstrapping runs with no session. Production's first national admin is a deliberate
  one-time DB seed instead (ADR-0012). Extracted the shared `generateTempPassword` helper. Verified
  live: created an admin, signed in as them, reached the provisioning page, deleted them (auth user
  + profile both removed).
- Admin account provisioning (T-015): an admin creates the **next tier down** within their own
  scope at `/app/admin/new-account` (National→State→LG→Ward→Unit-coordinator→Leader). The Server
  Action re-enforces the same hierarchy the RLS `profiles_insert` policy does, because the
  service-role client used to create the auth user + profile bypasses RLS; the chosen geography is
  validated to sit inside the caller's scope, and a temporary password is returned once (change on
  first sign-in). The auth user is rolled back if the profile insert fails (no orphan users). The
  admin service-role client is isolated in `lib/supabase/admin.ts` (server-only by convention +
  runtime env guard). Deferred: member login provisioning (invite flow). Verified live end-to-end
  (National provisioned a State admin, who then signed in and saw only their in-scope LGAs).
- Member roster (T-006a): a scoped list of members at `/app/members` — a leader sees the members
  they registered, admins see their geography, all via RLS (no app-side scope logic). Responsive
  table (desktop) / cards (mobile) on the primitives, with the membership number, registered date,
  and status; empty state + a "View members" entry on `/app`.
- Member registration (T-004): a leader registers a member via a server-validated form. Geography
  is auto-derived from the leader's own polling unit; the membership number `TWM-<STATE>-<LGA>-<seq>`
  is assigned atomically by the DB (per-LGA counter + BEFORE INSERT trigger). Enforces NIN
  uniqueness, age ≥18, and the ≤10-active-members cap, with friendly errors. Email is captured for
  the member's future login account. Deferred: passport-photo upload (needs Storage) and provisioning
  the member's login account (invite flow). Verified live end-to-end (numbers, sequence, invariants).
- Authentication (T-003, ADR-0011, resolves Q1): **email + password** sign-in via Supabase Auth.
  Server-validated `signIn`/`signOut` actions, a login form on the (now black + green) primitives,
  a safe `next` redirect, and sign-out + role display on `/app`. No public sign-up (accounts are
  provisioned). Login-page + invalid-credentials e2e; happy path verified with a provisioned account.
- Identity + membership + hierarchical RLS (T-001b): corrected geography to `polling_units`
  (child of ward, CR-0002); `profiles` + `members` with the `role`/`member_status` enums and the
  invariants (immutable `TWM-<STATE>-<LGA>-<seq>`, unique NIN, age ≥18, ≤10 active/leader,
  geographic consistency); full hierarchical RLS (National→…→Member) with role-rank provisioning
  (no privilege escalation) and member self-reads only. Helpers live in a non-exposed `private`
  schema (security advisors clean). Verified by `supabase/tests/rls_test.sql`; types regenerated.
- Dual-brand palette (T-014, from CR-0001): **ThinkRich Community = navy**, **Think-Winners
  Movement = green**, switched via `data-brand` (only the primary hue + focus ring change; gold
  accent, neutrals, surfaces, status shared). Added an AA-verified `green-*` scale (green-700
  `#15602E` = 7.65:1 both ways), light/dark variants, a brands demo on the gallery, and an E2E
  asserting the switch. Recorded in ADR-0007 (amends ADR-0006). Green is provisional pending the
  official asset. Also re-applied Q5/Q6 roadmap resolutions lost in the parallel-merge churn.
- Database foundation (T-001, geography): `states → lgas → wards` + `units`/`unit_wards` schema
  with reference-data RLS (world-readable, service-role writes); the **37** states (36 + FCT)
  seeded; generated types (`lib/database.types.ts`); and a documented LGA/ward **import path**
  (`supabase/README.md`) pending an authoritative dataset. Membership-number format confirmed
  (`TWM-<STATE>-<LGA>-<seq>`); duplicate-registration key deferred (soft-warn now). Migrations in
  `supabase/migrations/` applied to the project; security advisor clean. Identity (`profiles`,
  `members`) + hierarchical RLS follow in the next migration.
- Test tooling (T-013): **Vitest** + React Testing Library (unit/component) and **Playwright**
  (E2E on a dedicated port), with `test` / `test:watch` / `test:e2e` / `typecheck` scripts and a
  **GitHub Actions CI** workflow (lint → typecheck → unit → build, plus an E2E job) on every PR.
  First tests: `cn`, `Button`, `Input`, `StatusPill` (14 unit) + a home/theme-toggle E2E (2).
- Fixed a hydration warning by adding `suppressHydrationWarning` to `<html>` (the no-flash theme
  script sets `data-theme` before hydration) — surfaced by the new E2E.
- Base UI primitives (T-012) in `components/ui/`: `Button` (6 variants, 3 sizes, loading/disabled),
  `Input` (label/hint/error + a11y wiring), `Card`, `StatusPill` and `RoleBadge` (icon+text, never
  colour alone), `RecordCard` and `DataTable` (the mobile-card / desktop-table building blocks) —
  all token-driven and accessible; a `cn()` helper; a component gallery home page. No automated
  tests yet (blocked on T-013).
- Design tokens implemented in code (T-011): brand navy/gold scales + semantic tokens as
  Tailwind v4 utilities in `app/globals.css`, light/dark theming via `data-theme` with a
  no-flash inline script and a `ThemeToggle`, real project metadata, and a token-verification
  home page. Verified: lint + production build pass; both theme rule-sets compile.
- Governance hardening: intellectual-honesty/pushback rule (AGENTS.md §8 + reviewer agent),
  authentic-design guidance to avoid generic/AI-generated UI (`docs/design/authentic-design.md`
  + UI DoD), a learnings log (`docs/engineering/learnings.md`) with a "capture learnings" DoD
  step, a consolidated notification system doc (`docs/architecture/notifications.md`), and
  notification/event-driven testing added to the testing strategy.
- Design system (`docs/design/`): design principles, brand & colour system (navy/gold tokens
  sampled from the logo and WCAG-AA contrast-verified, with light/dark and the gold-on-white
  rule), typography, layout/spacing/grid, responsive & dashboard rules (tables→cards on mobile),
  component guidelines, accessibility (WCAG 2.1 AA) standards, UX-by-user-type, and a design
  process with a UI Definition of Done. Recorded in ADR-0006. Brand asset `public/logo.jpeg` tracked.
- Engineering governance suite: architecture docs (C4), Architecture Decision Records,
  SDLC, Git workflow, coding standards, code review checklist, testing strategy,
  Definition of Ready/Done, roadmap, and in-repo task board.
- Engineering Handbook (`docs/HANDBOOK.md`): a plain-language, junior-friendly guide to the
  whole setup and the practices behind it.
- Client change-management process (`docs/project/change-management.md`) with a Change
  Request register and template for safely integrating client-requested changes.
- Solo-engineer guidance in CONTRIBUTING.
- Claude Code project configuration (`.claude/`): operating rules in AGENTS.md;
  slash commands (`/cr`, `/adr`, `/task`, `/start-task`, `/ship`); a tuned
  `code-reviewer` subagent; guardrail hooks (block commits on `main`, lint edited
  files); and a safe-command permission allow-list.
- Root project docs: README, CONTRIBUTING, SECURITY, and this CHANGELOG; `.env.example`.
- GitHub templates: pull request template, issue templates, CODEOWNERS.

<!--
Release template — copy when cutting a version:

## [X.Y.Z] - YYYY-MM-DD
### Added        (new features)
### Changed      (changes in existing functionality)
### Deprecated   (soon-to-be removed features)
### Removed      (now removed features)
### Fixed        (bug fixes)
### Security     (vulnerability fixes)
-->
