# CR-0010: Leadership section on both landings + President's profile page

- **Status:** In Progress <!-- Captured | Assessed | Planned | In Progress | Shipped | Rejected | Deferred -->
- **Requested by:** Client (relayed by engineer, with the officers' names and the President's written profile)
- **Date requested:** 2026-07-29
- **Channel:** working session
- **Related:** CR-0004 (candidate-first Think-Winners landing — partially superseded, see §3),
  CR-0006 / ADR-0010 (root black + green), CR-0008 (two-origin split),
  [design-method.md](../../design/design-method.md)

## 1. What the client asked for

> "Let's have a well designed unique section of the leaders of ThinkRich section in the main
> ThinkRich landing page and Think-Winners landing page. However the president and vice president
> have two images and there are some information specifically about the President."

Four executive officers were supplied, with images to be placed in `public/leaders`:

| Role | Name |
|------|------|
| President | Chief Amb. Dr Salami Saidi Oladimeji |
| Vice President | Oluwaseun Omoniyi Akinbiyi |
| Secretary | Idowu Olaitan Bolatito |
| Treasurer | Onayale Iyanuoluwa |

**Reading of the roster (confirmed by the client, 2026-07-29).** The list as supplied puts each role
label on the line **after** the name it belongs to, e.g. "Chief Amb Dr Salami Saidi Oladimeji /
PRESIDENT". Two entries confirm that reading independently: Salami is the President per his profile
document, and Oluwaseun is the last name with "VICE PRESIDENT" trailing it. Read the other way the
list would make Salami the Treasurer, which his own profile contradicts. Secretary and Treasurer
therefore resolve as tabled above. The client confirmed both this reading and the "Chief Amb. Dr"
styling, which is what publishes, even though his own profile document uses "Chief (Amb.)"
throughout and never cites a doctorate. A regression test pins the two ambiguous offices.

The client also supplied a ~1,200-word written profile of the President ("PROFILE OF CHIEF AMB.
SALAMI SAIDI OLADIMEJI (THINKRICH)") covering early life, education, philosophy, career, six
organizations he leads, radio work on Wise FM 87.9, his book, awards, the IAWPA/UN Eminent Peace
Ambassador title, the Trisonet national coordinator role, and impact/legacy.

## 2. Why — the underlying need

The community is currently presented as an idea and a set of arms, with no visible human
accountability. Naming the executives, and showing the President's record in full, is a
**credibility move**: it tells prospective members who runs this, and tells a prospective campaign
partner who they would actually be signing with. It also grounds the "ThinkRich" name in the person
whose philosophy the movement is built on, which the arms copy alludes to but never attributes.

## 3. Impact analysis

- **Surfaces/flows affected:** public marketing only. The ThinkRich umbrella landing (`app/page.tsx`),
  the Think-Winners landing (`app/think-winners/page.tsx`), plus a **new public route** for the
  President's profile. Both landing navs gain an entry. Members' app, admin, and auth: untouched.
- **Data/schema impact:** **none.** The officers are static marketing content in a typed content
  module, not rows. No migration. Deliberately *not* modelled in Postgres: these four are not
  platform users in these roles, and a table would imply RLS, an admin CRUD surface, and a
  maintenance burden for content that changes roughly never. Revisit only if the client wants to
  edit it themselves.
- **Breaking change?** No. Additive sections on pages with no live data behind them.
- **Invariants at risk:** none. No authorization surface is touched, no member data is exposed. The
  officers' images and biography are client-supplied publicity material, published intentionally.
- **Conflicts with spec or another CR?** **Yes, one, resolved rather than ignored.** CR-0004 §3
  decided that on the Think-Winners landing "the internal leadership chain is **not** shown", to keep
  that page a pitch to a campaign rather than a brochure about the movement. Assessment: that
  decision was aimed at the **operational hierarchy** (National → State → LG → Ward → Polling Unit
  coordinators, the chain mapped on the internal `/think-winners/organization` page and gated by
  T-022), not at the community's **executive officers**. Naming four accountable executives supports
  the candidate pitch rather than diluting it. **Resolution:** proceed, with copy on the
  Think-Winners landing written for a campaign audience (who you would be partnering with), placed
  as credibility near the partnership section. The operational chain stays unpublished. CR-0004's
  "leadership chain not shown" is hereby scoped to the operational hierarchy, recorded here, not
  silently overridden.
- **Client assets:** supplied 2026-07-29, six files. Five ship as normalised 4:5 crops; see the
  photo findings in §9. The section still degrades to a designed monogram plate if a file is ever
  missing, rather than rendering a broken image.
- **Size:** medium (two landing sections, one new route, one content module, nav entries).

## 4. Decision

- **Proceed** — client-directed, additive, no data or security surface.
- **Needs an ADR?** No. Content and UI, no architectural decision. The one structural judgement
  (officers as a static content module, not a database table) is recorded in §3 above and is cheap
  to reverse.

## 5. Plan

Tasks created on the [task board](../task-board.md):

- [x] T-050 — Leadership content module: four officers + the President's structured profile, typed,
  single source for both landings and the profile page. `lib/leadership.ts`, with tests pinning the
  ambiguous Secretary/Treasurer reading.
- [x] T-051 — Leadership section component, brand-parametrised (ink+green on the umbrella,
  navy+gold on Think-Winners), mounted on both landings with audience-appropriate copy.
- [x] T-052 — President's profile route: full editorial page, linked from both landing sections.
- [x] T-053 — Leader portraits cropped and optimised into `public/leaders/`. Five normalised 4:5
  head-and-shoulders crops at 1000x1250; originals kept beside them with `CREDITS.md` recording the
  exact `magick` geometry so any crop can be redone. Note the file check runs at build time, so
  replacing an image needs a rebuild.

## 6. Rollback plan

Revert the feature commit. The sections are additive and self-contained; removing them returns both
landings to their current state with no data or migration consequences. The new profile route
disappears with it, so no dangling links remain once the landing sections go too.

## 7. Outcome

- **Shipped in:** _pending_ (built on `feat/leadership-section-and-president-profile`; roster and
  portraits confirmed, awaiting visual sign-off).
- **Client confirmed:** _no_

## 8. Resolved with the client (2026-07-29)

1. **Secretary vs Treasurer** — confirmed as read: Idowu Olaitan Bolatito is Secretary, Onayale
   Iyanuoluwa is Treasurer.
2. **"Chief Amb. Dr"** — confirmed; publish the roster's styling.
3. **Portraits** — supplied.

Still to confirm explicitly, cheap to close:

4. **Publishing the President's date and place of birth.** `presidentFacts` sets "1 December 1985"
   and "Abeokuta South, Ogun State" as a record block on the profile page. Both come from the
   client's own profile document, which is a reasonable basis, but personal biographical data
   deserves an itemised yes the way the three above got one. Removing it is a two-line change.

## 9. What the photographs changed

The supplied set is not a matched one, and two findings changed the build rather than just the
assets. Both are worth raising with the client.

1. **The Vice President has only one usable image.** `oluwaseun.jpeg` is a full-length shot across a
   hall: the head is roughly 170px tall inside 851x1280, so a head-and-shoulders crop lands near
   350px wide and is too soft for any tile in the section. `oluwaseun2.jpeg`, a studio portrait, is
   what ships. **The design changed as a result:** the supporting band was a 2+1+1 layout built
   around the Vice President holding two portraits, and is now equal thirds. A matching second
   portrait would let that hierarchy return, and is an open request.
2. **`idowu.jpeg` carries a photographer's watermark** ("Twelve02 Photography") in the bottom right.
   The shipped crop excludes it, but any future re-crop must keep excluding it: it is third-party
   branding on the client's own site. Ideally the client obtains a clean copy from the photographer.
3. **The five backgrounds do not match** (charcoal, brown, cream, terracotta, and a green outdoor
   wall). Duotone and a global colour grade were both tried and rejected: monochrome would strip the
   purple and gold of the aso-oke, which is part of these officers' identity rather than decoration,
   and no global grade reconciles five different rooms. The section unifies them through consistent
   framing instead. The durable fix is a single photo session, which is a client decision, not a
   code change.
