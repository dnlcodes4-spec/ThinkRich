# Authentic Design — Avoiding Generic / "AI-Generated" UI

Our UI should look like it was designed **for this movement**, by someone who understood the
subject — not like a template that could belong to any app. This doc names the specific traps
that make design read as generic or "AI-generated," and the habits that avoid them.

> Honest scope: this is a **taste-and-review** guardrail, not something a linter can enforce. It
> lives here, in the [UI Definition of Done](process-and-ui-dod.md#ui-definition-of-done), and in
> the [`code-reviewer`](../../.claude/agents/code-reviewer.md) agent's checks. The backstop is a
> human (or the reviewer agent) looking at it and asking: *does this feel considered, or default?*

## Why it matters here

This is an **official membership platform** that issues cards and guides votes. Generic,
templated UI undercuts trust. Distinctive, coherent design that leans into the brand (navy + gold,
the ascending mark, the "winning together" ethos) signals that the movement is real and serious.

---

## The anti-patterns (avoid these)

These are the looks generic and AI-generated design currently clusters around. If a screen drifts
into one of these **by default** (rather than by a deliberate, justified choice), rework it.

### Visual clichés
- ❌ **Purple→blue (or indigo) gradient hero** on white. (We have a real brand — use it.)
- ❌ **Warm cream `#F4F1EA` + serif display + terracotta accent** "editorial" template.
- ❌ **Near-black canvas with a single acid-green / vermilion pop.**
- ❌ **Glassmorphism everywhere** (frosted translucent cards as a default treatment).
- ❌ **`rounded-lg` / big pill radius on everything** — corners with no rationale. (Use our radius scale.)
- ❌ **An accent bar/rail glued to the top or left of every rounded card.**
- ❌ **Everything centered** — centered hero, centered cards, centered text blocks, down the page.

### Typography & structure clichés
- ❌ **Uppercase, letter-spaced "eyebrow" kicker labels above headings** (e.g. "OUR VISION",
  "A GRASSROOTS ENGINE FOR YOUR CAMPAIGN"). A tracked-out caps mini-label over every headline/section
  is a strong template/AI tell — fold the meaning into the headline or a real sentence, or drop it.
  (Plain, sentence-case data labels *under* a number are fine.)
- ❌ **Inter or Space Grotesk as the reflexive "safe" font** with no reason. (See [typography.md](typography.md).)
- ❌ **Emoji as section markers / bullet icons** (🚀 features, ✨ benefits). Use real icons or none.
- ❌ **Numbered markers `01 / 02 / 03`** on content that isn't actually a sequence. Numbering must
  encode real order (a process, a ranked list) — otherwise it's decoration.
- ❌ **The identical "hero + three feature cards + CTA band" landing skeleton** every SaaS uses.
- ❌ **Gradient text** on headings as a substitute for hierarchy.

### Content clichés
- ❌ **Lorem ipsum or vague filler** ("Empower your journey", "Seamless experience"). Use real,
  specific copy about *this* movement.
- ❌ **Generic stock-y phrasing on CTAs** ("Get Started") where a specific verb fits ("Register a
  member", "Download card").

---

## What to do instead

1. **Ground every screen in the subject.** Pull from the movement's world: the navy/gold mark, the
   ascending-arrow "winning together" motif, membership *cards*, states/LGAs/wards, the credential
   feel of a membership number. Specificity is what makes design feel authored.
2. **Use the brand we already have.** Navy + gold is distinctive and pre-decided — spend it, don't
   reach for a generic default. Tokens only ([brand-and-color.md](brand-and-color.md)).
3. **Make type a deliberate choice**, not a reflex. A clear scale, intentional weight/tracking, and
   **tabular monospace for membership numbers / data** (a real, subject-driven decision).
4. **Let structure encode meaning.** Dividers and numbering should reflect something true about
   the content, not decorate it — and skip the reflexive uppercase eyebrow over every section
   (see anti-patterns); earn the headline instead.
5. **Real content always.** Design with actual member names, real membership-number formats, real
   copy — never lorem, never placeholder platitudes.
6. **Spend boldness in one place.** One confident moment per view (a hero, a card, a stat), quiet
   around it. A highlight everywhere is a highlight nowhere.
7. **Motion with restraint.** Purposeful, quick (150–250ms); respects `prefers-reduced-motion`.
   Scattered animation is itself a tell of generic/AI output — less is usually more.
8. **Asymmetry and real layout** where it serves reading — don't center everything by default.

---

## The test
Before merging UI, ask: **"Could this screen be lifted, unchanged, into an unrelated app?"** If
yes, it's too generic — tie it back to the subject and brand. And: **"Did I choose this, or did it
choose itself?"** Every notable choice (colour, type, layout, motion) should have a reason you can
say out loud.

Referenced by the [UI Definition of Done](process-and-ui-dod.md#ui-definition-of-done) and
enforced-by-eye in review.
