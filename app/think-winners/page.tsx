import { Reveal } from "@/components/marketing/reveal";
import { ThinkWinnersNav } from "@/components/marketing/nav";
import { Hero, NigeriaMap } from "@/components/marketing/hero";
import { Grain } from "@/components/marketing/motifs";
import { PartnershipForm } from "@/components/marketing/partnership-form";
import {
  IconNetwork,
  IconMegaphone,
  IconCommunity,
  IconHub,
  IconGrowth,
  IconFeedback,
  IconEducation,
  IconShield,
  IconSignal,
} from "@/components/marketing/icons";

// Candidate-first landing: a pitch to a campaign (content from CR-0001/0002/0003).
// Only 20,000 / 200,000 appear as figures; the internal leadership chain is not shown;
// no eyebrow kickers; every section is an authored treatment (see docs/design/design-method.md).
// Restructured for mobile (2026-07): fewer, denser sections — reach's stats live in the hero,
// benefits fold into "what we bring", and the manifesto merges vision + principles.

const pillars = [
  {
    title: "Organized",
    body: "A disciplined structure of trained leaders — not a crowd. Every voter is reached through a named, accountable leader.",
    Icon: IconNetwork,
  },
  {
    title: "Data-driven",
    body: "Coverage tracked community by community, so outreach and voter education land where they count.",
    Icon: IconSignal,
  },
  {
    title: "Peaceful & lawful",
    body: "Issue-based engagement conducted strictly within the law — protecting your candidacy's reputation.",
    Icon: IconShield,
  },
];

const offer = [
  { label: "Grassroots leadership network", Icon: IconNetwork },
  { label: "Structured voter outreach", Icon: IconMegaphone },
  { label: "Community engagement", Icon: IconCommunity },
  { label: "Volunteer coordination", Icon: IconHub },
  { label: "Leadership development", Icon: IconGrowth },
  { label: "Feedback from local communities", Icon: IconFeedback },
  { label: "Peaceful voter education", Icon: IconEducation },
  { label: "Lawful election-day mobilization", Icon: IconShield },
];

const benefits = [
  "Wider grassroots visibility",
  "Stronger community relationships",
  "Better understanding of local concerns",
  "Faster communication across the network",
  "Organized volunteer management",
  "Consistent engagement before, during & after elections",
];

const phases = [
  ["Leadership recruitment", "Identify and enlist committed community leaders."],
  ["Leadership training", "Equip leaders with the skills to mobilize responsibly."],
  ["Community engagement", "Open honest, issue-based conversations at the grassroots."],
  ["Grassroots mobilization", "Activate the network across every ward and community."],
  ["Election preparedness", "Ready every leader and voter for lawful participation."],
  ["Post-election engagement", "Sustain relationships and grow leadership capacity."],
];

const mission = [
  "Build responsible community leaders.",
  "Promote issue-based political participation.",
  "Connect voters with credible leadership.",
  "Strengthen democratic engagement from the grassroots.",
  "Deliver measurable voter education and mobilization.",
  "Build a winning political mobilization structure.",
];

const values = [
  "Integrity",
  "Leadership & Accountability",
  "Teamwork",
  "Smartwork",
  "Network",
  "Responsibility",
  "Respect",
  "Transparency",
  "Community Development",
];

const footerPillars = [
  ["Unity", "Thinking Together"],
  ["Commitment", "Working Together"],
  ["Strategy", "Moving Together"],
  ["Victory", "Winning Together"],
];

// Shared mobile-first rhythm: tighter on phones, generous on desktop.
const SECTION = "px-6 py-14 sm:py-20 lg:py-28";
const H2 = "font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl";

function Rule({ light = false }: { light?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`mb-5 h-px w-12 ${light ? "bg-gold-400" : "bg-gold-500"}`}
    />
  );
}

export default function ThinkWinnersLanding() {
  return (
    <main className="bg-white text-navy-950">
      <ThinkWinnersNav />
      <Hero />

      {/* ───────────── Who we are (message + reach + pillars) ───────────── */}
      <section id="about" className={`scroll-mt-20 bg-white ${SECTION} mx-auto max-w-6xl`}>
        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-12">
          <Reveal>
            <Rule />
            <h2 className={H2}>We connect the right people to the right candidates.</h2>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-navy-800">
              Think-Winners builds an organized network of trained leaders — reaching communities
              across Nigeria through education, engagement, and lawful grassroots mobilization,
              community by community.
            </p>
          </Reveal>
          <Reveal delay={120} className="hidden lg:block">
            <NigeriaMap className="mx-auto w-full max-w-md drop-shadow-[0_0_40px_rgba(201,162,39,0.12)]" />
          </Reveal>
        </div>

        <div className="mt-12 grid gap-6 sm:mt-16 sm:grid-cols-3 sm:gap-10">
          {pillars.map(({ title, body, Icon }, i) => (
            <Reveal key={title} delay={i * 90} className="border-t-2 border-gold-500 pt-5">
              <Icon className="h-7 w-7 text-navy-700" />
              <h3 className="mt-3 font-display text-xl font-semibold text-navy-950 sm:text-2xl">
                {title}
              </h3>
              <p className="mt-2 text-navy-800">{body}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ───────────── What we bring (capabilities + outcomes) ───────────── */}
      <section
        id="offer"
        className="relative scroll-mt-20 overflow-hidden bg-navy-950 text-navy-50"
      >
        <Grain opacity={0.1} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 60% at 12% 8%, rgba(201,162,39,0.12), transparent 60%)",
          }}
        />
        <div className={`relative mx-auto max-w-6xl ${SECTION}`}>
          <Rule light />
          <h2 className={H2}>What we bring to your campaign.</h2>
          <p className="mt-4 max-w-md text-lg text-navy-50/85">
            A full grassroots operation — the people, the training, and the discipline to move votes.
          </p>

          <ul className="mt-10 grid gap-x-10 sm:mt-12 sm:grid-cols-2">
            {offer.map(({ label, Icon }, i) => (
              <Reveal
                as="li"
                key={label}
                delay={i * 40}
                className="flex items-center gap-3.5 border-b border-navy-50/12 py-3.5 sm:py-4"
              >
                <span
                  aria-hidden="true"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-navy-50/5 text-gold-400 ring-1 ring-navy-50/12"
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <span className="font-display text-base font-medium text-navy-50 sm:text-lg">
                  {label}
                </span>
              </Reveal>
            ))}
          </ul>

          <div className="mt-10 sm:mt-14">
            <p className="font-display text-base font-semibold text-gold-400">
              What it changes for your candidacy
            </p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {benefits.map((b) => (
                <li
                  key={b}
                  className="rounded-full bg-navy-50/5 px-3.5 py-2 text-sm font-medium text-navy-50/90 ring-1 ring-navy-50/12"
                >
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────── How we work (compact timeline) ───────────── */}
      <section id="how" className={`scroll-mt-20 bg-navy-50 ${SECTION} mx-auto max-w-4xl`}>
        <Rule />
        <h2 className={H2}>How we work — recruitment to results.</h2>
        <ol className="mt-10 sm:mt-14">
          {phases.map(([title, body], i) => {
            const isLast = i === phases.length - 1;
            return (
              <Reveal as="li" key={title} delay={i * 60}>
                <div className="grid grid-cols-[auto_1fr] gap-x-4 sm:gap-x-8">
                  <div className="flex flex-col items-center">
                    <span className="font-display text-3xl font-black leading-none tabular-nums text-navy-700/25 sm:text-5xl">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className="my-1.5 w-0.5 flex-1 rounded bg-linear-to-b from-gold-400 to-navy-200"
                      />
                    )}
                  </div>
                  <div className={isLast ? "pb-0 pt-0.5" : "pb-7 pt-0.5 sm:pb-12"}>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-navy-950 sm:text-2xl">
                      {title}
                    </h3>
                    <p className="mt-1 text-navy-800 sm:text-lg">{body}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </ol>
      </section>

      {/* ───────────── What we stand for (vision + mission + values + lawful) ───────────── */}
      <section className={`bg-white ${SECTION} mx-auto max-w-5xl`}>
        <Reveal>
          <Rule />
          <p className="font-display text-2xl font-medium leading-[1.12] text-balance text-navy-950 sm:text-4xl lg:text-5xl">
            Our vision: to become the{" "}
            <span className="font-semibold">
              largest grassroots leadership and voter-mobilization movement
            </span>{" "}
            in <span className="italic text-navy-700">Nigeria.</span>
          </p>
        </Reveal>

        <ol className="mt-10 divide-y divide-navy-200 border-y border-navy-200 sm:mt-14">
          {mission.map((m, i) => {
            const [verb, ...rest] = m.replace(/\.$/, "").split(" ");
            return (
              <Reveal as="li" key={m} delay={i * 50} className="flex items-baseline gap-4 py-3.5 sm:py-5">
                <span aria-hidden="true" className="mt-2 h-px w-5 shrink-0 bg-gold-500" />
                <p className="font-display text-lg leading-snug text-navy-900 sm:text-2xl">
                  <span className="font-semibold italic text-navy-700">{verb}</span>{" "}
                  {rest.join(" ")}.
                </p>
              </Reveal>
            );
          })}
        </ol>

        <p className="mt-10 max-w-3xl font-display text-xl font-medium italic leading-snug text-balance text-navy-800 sm:mt-14 sm:text-2xl">
          &ldquo;We operate peacefully, lawfully, and responsibly — promoting civic participation,
          respect for democratic institutions, and issue-based engagement with communities across
          Nigeria.&rdquo;
        </p>
        <ul className="mt-6 flex flex-wrap gap-2">
          {values.map((v) => (
            <li
              key={v}
              className="rounded-full bg-navy-50 px-3.5 py-1.5 text-sm font-medium text-navy-800 ring-1 ring-navy-200"
            >
              {v}
            </li>
          ))}
        </ul>
      </section>

      {/* ───────────── Partnership (dark band + form) ───────────── */}
      <section
        id="partnership"
        className="relative scroll-mt-20 overflow-hidden bg-navy-950 text-navy-50"
      >
        <Grain opacity={0.1} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 60% at 85% 90%, rgba(201,162,39,0.12), transparent 60%)",
          }}
        />
        <div className={`relative mx-auto max-w-6xl ${SECTION}`}>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr] lg:items-start lg:gap-12">
            <div>
              <Rule light />
              <h2 className={H2}>Partner with Think-Winners.</h2>
              <p className="mt-5 max-w-md text-lg text-navy-50/85">
                We invite your campaign to build a structured grassroots engagement system with us —
                expanding outreach, strengthening coordination, and growing long-term leadership
                capacity.
              </p>
              <ul className="mt-7 grid gap-2.5">
                {[
                  "Expands community outreach",
                  "Strengthens volunteer coordination",
                  "Enhances voter education",
                  "Promotes peaceful democratic participation",
                  "Builds long-term leadership capacity",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-3 text-navy-50/90">
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-500 text-[11px] font-bold text-navy-950"
                    >
                      ✓
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <PartnershipForm />
          </div>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="bg-navy-950 text-navy-50">
        <div className="mx-auto max-w-6xl px-6 py-12 sm:py-14">
          <div className="grid grid-cols-2 gap-8 border-b border-navy-50/10 pb-8 sm:grid-cols-4 sm:pb-10">
            {footerPillars.map(([word, sub]) => (
              <div key={word}>
                <div className="text-lg font-bold tracking-tight text-gold-400">{word}</div>
                <div className="mt-1 text-sm text-navy-50/60">{sub}</div>
              </div>
            ))}
          </div>

          <p className="mt-8 max-w-2xl text-sm leading-relaxed text-navy-50/70 sm:mt-10">
            Think-Winners is powered by real community members, registered and led by leaders on the
            ground — the network behind every number on this page. Community members join through a
            leader, not a public form.
          </p>

          <div className="mt-8 flex flex-col gap-2 text-sm text-navy-50/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-navy-50">
              Think-Winners Movement — Thinking Together, Winning Together
            </p>
            <p>A project of the ThinkRich Community.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
