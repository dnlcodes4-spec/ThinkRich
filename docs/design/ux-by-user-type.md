# UX by User Type

The platform has very different users with very different goals and devices. Design for each
persona's real context, not a one-size-fits-all screen. All roles share the
[design system](README.md); this doc captures what differs.

Roles are defined in [security-model.md](../architecture/security-model.md). Access is enforced
by the database — **the UI only ever shows what a role is allowed to see** (never render, then
hope to hide).

---

## Member / Voter — mobile PWA, primary audience

**Context:** on a phone, possibly older/low-cost, variable network, wide range of tech-literacy.
**Goals:** see who to vote for, view profile & membership card, request a change, opt out, join
the group.

**UX priorities**
- **Maximum clarity, minimum steps.** Big, obvious primary actions; one task per screen.
- **Card-based, single column**, comfortable spacing, thumb-reachable CTAs.
- **The voting view is the hero:** the candidate for *their* L.G, unmistakable.
- **Membership card** front-and-centre; easy to view/download.
- Forgiving forms for change requests (clear labels, inline errors, reason field).
- Reassuring, calm tone; honest empty/loading states; works on slow networks (skeletons, PWA offline messaging).
- Notifications (voting reminder, updates) are clear and non-spammy.
- **Never** show admin/leader controls to a member.

## Leader — mobile-first, sometimes desktop

**Context:** manages **exactly 10 members**; registers and maintains them; often on a phone in the field.
**Goals:** register a member (generate card), view/edit their 10, KYM-verify another leader.

**UX priorities**
- **Registration flow** is the core: stepped, validated, hard to get wrong; **prevent
  double-submit** (protects no-duplicate-registration); clear success with the generated card.
- **"My members"** as a **card list on mobile**, table on desktop; quick access to each member's
  card download and edit.
- Show the **10-member limit** clearly (e.g. "7 of 10 registered"); block/soft-warn at the cap.
- KYM verification is quick: enter code → clear verified/unverified result.

## Unit / L.G / State / National Admins — desktop-primary dashboards, responsive

**Context:** oversight and administration, mostly at a desk, but must work on a phone in a pinch.
Scope widens up the hierarchy (unit → national), so **information density and breadth grow**, but
the interaction patterns stay consistent.

**Shared admin UX**
- **Dashboard shell:** sidebar (desktop) / bottom-nav + drawer (mobile); search prominent.
- **Member management:** search by membership number or name; **table on desktop, card list on
  mobile**; detail view; card print/download; review change requests (approve/reject with reason).
- **Stats/reports:** KPI tiles + charts (follow the `dataviz` guidance); scannable, not decorative.
- **Messaging:** templates + custom; full history; clear recipient.
- **Bulk actions** on desktop (selection + toolbar); selection mode + action sheet on mobile.
- **Destructive actions** (deactivate admin, delete) confirmed with named consequences + audit trail.

**What differs by level**
| Role | Emphasis |
|------|----------|
| **Unit Coordinator** | members across the wards in their unit; lighter tooling |
| **L.G Admin** | members across wards/units in the L.G; reward distribution downward |
| **State Admin** | whole-state oversight; **approves change requests**; uploads state candidates; reward to L.G |
| **National Admin** | all 36 states; activate states / manage State Admins (create/view/edit/deactivate); presidential candidate; cross-state search; national stats |

Higher levels get **more scope and more powerful/rarer actions** (e.g. activating a state) —
those powerful actions get extra confirmation and clear affordance, and are visually distinct
from everyday actions.

## Visitor — public website, desktop & mobile

**Context:** discovering ThinkRich Community / Think-Winners; deciding to engage.
**Goals:** understand the products; find the Think-Winners entry point; make an enquiry.

**UX priorities**
- **Conversion-focused, trustworthy, on-brand.** Strong hero, clear value, prominent CTAs
  (Learn More / Join / Contact) and enquiry number per product.
- The **Think-Winners landing** is the star (only fully-functional product): vision, mission,
  values, leadership, **live member count**, persuasive copy aimed at partners/candidates.
- Fast, accessible, great on mobile; other products show info + contact only.

---

## Cross-cutting UX rules
- **Match presentation to device** (tables→cards, sidebar→bottom nav) — see
  [responsive-and-dashboards.md](responsive-and-dashboards.md).
- **One primary action per view**; navy for primary, gold for genuine highlights.
- **Every data view** has loading/empty/error/success states.
- **Role-appropriate UI only** — the database enforces access; the UI must not even hint at
  controls a role can't use.
- **Consistency across surfaces:** a button, form, or card behaves the same everywhere.
