import { Reveal } from "@/components/marketing/reveal";
import { Portrait as PortraitFrame } from "@/components/marketing/portrait";
import { Grain } from "@/components/marketing/motifs";
import {
  officers,
  fullName,
  portraitExists,
  presidentCredentials,
  presidentStandfirst,
  presidentStandfirstShort,
  type Officer,
} from "@/lib/leadership";

/*
  The ThinkRich Community's executive officers (CR-0010 · T-051).

  Concept "The council", chosen from three previewed alternatives. The organising
  idea: we hold real depth on one officer and a name plus an office on the other
  three, so visual weight tracks office rank rather than pretending four equal
  cards. The President takes a full spread with both his images; the remaining
  three share one band as equal thirds.

  Grounded in the subject rather than a generic "meet the team": the hook is that
  the President's signature is printed on every membership card this movement
  issues (see public/cards/), which is true, specific, and nobody else's line.
*/

export type Brand = "thinkrich" | "think-winners";

// Tailwind needs literal class strings, so the two brands are spelled out rather
// than interpolated. ThinkRich is ink + green (ADR-0010); Think-Winners is navy +
// gold (ADR-0008). Both sections run on the brand's dark ground.
const BRAND = {
  thinkrich: {
    bg: "bg-ink-950",
    text: "text-ink-50",
    muted: "text-ink-50/70",
    accent: "text-green-400",
    rule: "bg-green-400",
    hairline: "border-ink-50/12",
    divide: "divide-ink-50/12",
    field: "bg-ink-900 ring-1 ring-ink-50/8",
    monogram: "text-ink-50/30",
    ringBg: "ring-ink-950",
    glow: "rgba(0,151,82,0.12)",
  },
  "think-winners": {
    bg: "bg-navy-950",
    text: "text-navy-50",
    muted: "text-navy-50/70",
    accent: "text-gold-400",
    rule: "bg-gold-400",
    hairline: "border-navy-50/12",
    divide: "divide-navy-50/12",
    field: "bg-navy-900 ring-1 ring-navy-50/8",
    monogram: "text-navy-50/30",
    ringBg: "ring-navy-950",
    glow: "rgba(201,162,39,0.12)",
  },
} as const;

/*
  Two audiences, two cuts of the same four people. The umbrella speaks to someone
  deciding whether this community is real; Think-Winners speaks to a campaign
  deciding whether to sign with it (CR-0010 §3, scoping CR-0004's "leadership
  chain not shown" to the operational hierarchy, which stays unpublished).
*/
const COPY = {
  thinkrich: {
    heading: "The people who answer for it.",
    intro:
      "Four officers carry the ThinkRich Community. Their names are public, and the President’s signature is on every membership card the movement issues.",
    standfirst: presidentStandfirst,
  },
  "think-winners": {
    heading: "Who you would be partnering with.",
    intro:
      "Think-Winners is an arm of the ThinkRich Community, and these four officers are accountable for it. Named, reachable, and on the record before you sign anything.",
    standfirst: presidentStandfirstShort,
  },
} as const;

/** Officer-aware wrapper over the shared Portrait frame. */
function Portrait({
  officer,
  useAlt = false,
  className,
  sizes,
  b,
}: {
  officer: Officer;
  useAlt?: boolean;
  className: string;
  sizes: string;
  b: (typeof BRAND)[Brand];
}) {
  const src = useAlt && officer.portraitAlt ? officer.portraitAlt : officer.portrait;
  return (
    <PortraitFrame
      src={src}
      present={portraitExists(src)}
      alt={`${fullName(officer)}, ${officer.office} of the ThinkRich Community`}
      initials={officer.initials}
      className={className}
      sizes={sizes}
      field={b.field}
      monogram={b.monogram}
    />
  );
}

export function Leadership({
  brand,
  profileHref,
}: {
  brand: Brand;
  /** Where the President's profile lives. Cross-origin from Think-Winners (CR-0008). */
  profileHref: string;
}) {
  const b = BRAND[brand];
  const copy = COPY[brand];
  const [pres, vp, ...rest] = officers;

  return (
    <section
      id="leaders"
      className={`relative scroll-mt-20 overflow-hidden ${b.bg} ${b.text}`}
    >
      <Grain opacity={0.08} />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(50% 55% at 12% 6%, ${b.glow}, transparent 60%)` }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20 lg:py-28">
        <Reveal>
          <div aria-hidden="true" className={`mb-6 h-px w-12 ${b.rule}`} />
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            {copy.heading}
          </h2>
          <p className={`mt-5 max-w-xl text-lg leading-relaxed ${b.muted}`}>{copy.intro}</p>
        </Reveal>

        {/* ── The President: the one confident moment in this section.
             His primary fills the whole column rather than sharing it, because a
             side-by-side pair computed SMALLER than the three supporting portraits
             below and inverted the hierarchy. The second image insets off the
             bottom corner, ringed in the section's own ground so it reads as one
             editorial pair rather than a second person. ── */}
        <div className="mt-12 grid gap-8 sm:mt-16 lg:grid-cols-[0.95fr_1.05fr] lg:items-end lg:gap-14">
          <Reveal className="relative mb-14 sm:mb-16">
            <Portrait
              officer={pres}
              b={b}
              className="aspect-4/5 w-full rounded-2xl"
              sizes="(max-width: 640px) 84vw, (max-width: 1024px) 60vw, 42vw"
            />
            {/* Wrapped rather than positioned directly: Portrait sets `relative` on
                its own root, which wins the cascade against an `absolute` passed in. */}
            <div className="absolute -right-3 -bottom-12 w-[38%] sm:-right-4 sm:-bottom-14">
              <Portrait
                officer={pres}
                useAlt
                b={b}
                className={`aspect-3/4 w-full rounded-xl ring-6 ${b.ringBg}`}
                sizes="(max-width: 640px) 32vw, (max-width: 1024px) 23vw, 16vw"
              />
            </div>
          </Reveal>

          <Reveal delay={120}>
            <h3 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
              {fullName(pres)}
            </h3>
            <p className={`mt-2 text-lg font-semibold ${b.accent}`}>{pres.office}</p>
            <p className={`mt-5 text-lg leading-relaxed ${b.muted}`}>{copy.standfirst}</p>

            <ul className={`mt-7 divide-y border-y ${b.divide} ${b.hairline}`}>
              {presidentCredentials.map((c) => (
                <li key={c} className="flex items-baseline gap-3.5 py-3">
                  <span aria-hidden="true" className={`h-px w-4 shrink-0 ${b.rule}`} />
                  <span className="text-sm">{c}</span>
                </li>
              ))}
            </ul>

            <a
              href={profileHref}
              className={`group mt-7 inline-flex min-h-11 items-center gap-1.5 text-sm font-bold ${b.accent} hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current`}
            >
              Read his full profile
              <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </a>
          </Reveal>
        </div>

        {/* ── The other three, equal to each other. They were a 2+1+1 band while the
             Vice President was expected to have two portraits; only one of the two
             supplied is usable (CR-0010 §8), so equal thirds is now the honest shape.
             The hierarchy is already carried by the President's spread above, which
             is the right place for it. Subgrid keeps names and offices on shared
             baselines however the names wrap. ── */}
        <div
          className={`mt-12 grid grid-cols-2 gap-x-4 gap-y-9 border-t pt-10 sm:mt-16 sm:gap-x-8 sm:gap-y-10 sm:pt-12 lg:grid-cols-3 lg:grid-rows-[auto_auto_auto] ${b.hairline}`}
        >
          {[vp, ...rest].map((o, i) => (
            <Reveal
              key={o.key}
              delay={i * 90}
              className="lg:row-span-3 lg:grid lg:grid-rows-subgrid lg:gap-y-0"
            >
              <Portrait
                officer={o}
                b={b}
                className="aspect-4/5 self-start rounded-xl"
                sizes="(max-width: 640px) 45vw, 30vw"
              />
              <h3 className="mt-4 font-display text-lg leading-tight font-semibold tracking-tight text-balance sm:text-xl lg:text-2xl">
                {fullName(o)}
              </h3>
              <p className={`mt-1.5 self-start text-sm font-semibold ${b.accent}`}>{o.office}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
