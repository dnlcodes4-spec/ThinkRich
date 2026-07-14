# CR-0004: Candidate-first public landing (audience pivot)

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer after reviewing the movement's proposal document)
- **Date requested:** 2026-07-14
- **Channel:** working session
- **Related:** CR-0001 (dual landing), CR-0002 (supersedes its "landing = entice members" framing), [design-method.md](../../design/design-method.md)

## 1. What the client asked for

After stepping back to analyse the source proposal document, we established that it is fundamentally
a **pitch to a governorship campaign** — it has "What we offer a governorship campaign" (§8),
"Benefits to the candidate" (§9), and "Partnership proposal" (§12). The decision: the **public
Think-Winners landing should be candidate/partner-first** — the pitch itself is the public homepage,
not a member-enticement brochure.

## 2. Why — the underlying need

The movement's commercial engine is winning **campaign partnerships**; that is what the document
sells. The landing's primary job is to convert a campaign into a partner. Members remain the real
network behind the numbers, but are demoted to a trust note, not the primary call to action.

## 3. Impact analysis

- **Surfaces/flows affected:** the public Think-Winners landing (fully rebuilt). Members' app
  unaffected.
- **Reverses CR-0002's framing:** the member "Join via a leader / WhatsApp" section is removed; the
  primary CTA is now **"Partner with us."** Terminology: the 200,000 are **"voters"** (candidate
  framing); only **20,000 / 200,000** appear as figures; the internal leadership chain is **not**
  shown; no Ogun references.
- **New:** a **partnership request form** (client component + a **Zod-validated Server Action**,
  `app/think-winners/actions.ts`). **Submission destination is TBD** — flagged as a `TODO` in the
  action; **client to confirm** (email address / a `partnership_requests` table + admin notification
  / webhook).
- **Data/schema impact:** none yet. A `partnership_requests` table may be added once the destination
  is decided (expand-only, nullable columns, RLS scoped to admins).
- **Breaking change?** No — landing only, no live data.
- **Invariants at risk:** none. Members still cannot self-register; that path is simply
  de-emphasised (footer note: "join through a leader, not a public form").
- **Conflicts:** supersedes CR-0002's stated landing purpose (recorded here, not silently).
- **Risk flagged to client:** a public candidate pitch can read as "voters-for-hire" and dent
  grassroots authenticity, and is visible to opponents/press. The client chose the public homepage
  anyway — documented.
- **Size:** large (full landing rebuild + form).

## 4. Decision

- **Proceed** — client-directed after reviewing the document.
- **Needs an ADR?** No — this is audience/content + UI, not an architectural decision. (The reusable
  design method was captured separately in `docs/design/design-method.md`.)

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [x] T-017 — Rebuild the Think-Winners landing candidate-first (hero, sections, nav/CTA).
- [ ] T-021 — Wire the partnership-form submission destination (**blocked: client to confirm**).
- [ ] T-022 — Gate the internal `/think-winners/organization` reference page before any deploy
  (currently `noindex` but publicly reachable).

## 6. Rollback plan

Revert the landing commit — the earlier member-first version remains in git history.

## 7. Outcome

- **Shipped in:** _pending_ (built on `feat/think-winners-landing`; awaiting client confirmations —
  form destination + real partnerships contact).
- **Client confirmed:** _no_
