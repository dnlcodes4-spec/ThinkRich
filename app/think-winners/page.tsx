import { Reveal } from "@/components/marketing/reveal";
import { Counter } from "@/components/marketing/counter";
import { ThinkWinnersNav } from "@/components/marketing/nav";
import { Hero, NigeriaMap } from "@/components/marketing/hero";
import { Grain, ConnectionGraphic } from "@/components/marketing/motifs";
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
  IconEye,
  IconPin,
  IconSignal,
  IconCycle,
} from "@/components/marketing/icons";

// Candidate-first landing: a pitch to a campaign (content from CR-0001/0002/0003).
// Only 20,000 / 200,000 appear as figures; the internal leadership chain is not shown;
// no eyebrow kickers; every section is an authored treatment (see docs/design/design-method.md).

const pillars = [
  {
    title: "Organized",
    body: "A disciplined structure of trained leaders — not a crowd. Every voter is reached through a named, accountable leader.",
    Icon: IconNetwork,
  },
  {
    title: "Data-driven",
    body: "Coverage tracked community by community, so outreach and voter education land where they count — and you can see it.",
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
  { label: "Lawful election-day mobilization support", Icon: IconShield },
];

const benefits = [
  { label: "Wider grassroots visibility", Icon: IconEye },
  { label: "Stronger community relationships", Icon: IconCommunity },
  { label: "Better understanding of local concerns", Icon: IconPin },
  { label: "Faster communication across the network", Icon: IconSignal },
  { label: "Organized volunteer management", Icon: IconHub },
  { label: "Consistent engagement — before, during, and after elections", Icon: IconCycle },
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

function Rule({ light = false }: { light?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`mb-6 h-px w-12 ${light ? "bg-gold-400" : "bg-gold-500"}`}
    />
  );
}

export default function ThinkWinnersLanding() {
  return (
    <main className="bg-white text-green-950">
      <ThinkWinnersNav />
      <Hero />

      {/* ───────────── Who we are — the connection ───────────── */}
      <section id="about" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr] lg:items-center">
            <Reveal>
              <Rule />
              <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                We connect the right people to the right candidates.
              </h2>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-green-800">
                Think-Winners builds an organized network of leaders — reaching
                communities across Nigeria through education, engagement, and
                lawful grassroots mobilization, while promoting peaceful
                participation in the democratic process.
              </p>
            </Reveal>
            <Reveal delay={120}>
              <ConnectionGraphic className="mx-auto w-full max-w-md" />
            </Reveal>
          </div>

          <div className="mt-20 grid gap-10 sm:grid-cols-3">
            {pillars.map(({ title, body, Icon }, i) => (
              <Reveal key={title} delay={i * 90} className="border-t-2 border-gold-500 pt-6">
                <Icon className="h-8 w-8 text-green-700" />
                <h3 className="mt-4 font-display text-2xl font-semibold text-green-950">
                  {title}
                </h3>
                <p className="mt-2 text-green-800">{body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Reach (the proof) ───────────── */}
      <section
        id="reach"
        className="relative scroll-mt-20 overflow-hidden bg-green-950 text-green-50"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(45% 55% at 85% 30%, rgba(201,162,39,0.14), transparent 60%), radial-gradient(60% 60% at 0% 100%, rgba(21,96,46,0.7), transparent 60%)",
          }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 lg:grid-cols-[1fr_0.85fr] lg:py-28">
          <Reveal>
            <Rule light />
            <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              An organized network across every community.
            </h2>
            <p className="mt-5 max-w-lg text-lg text-green-50/85">
              A structure this precise disseminates your campaign&rsquo;s message
              and voter education rapidly — reaching every corner of the ground
              game, community by community.
            </p>
            <div className="mt-10 flex gap-10 divide-x divide-green-50/15">
              <div className="pr-10">
                <div className="font-mono text-4xl font-bold tabular-nums text-gold-400 sm:text-5xl">
                  <Counter to={20000} />
                </div>
                <div className="mt-1 text-sm text-green-50/65">trained leaders</div>
              </div>
              <div className="pl-10">
                <div className="font-mono text-4xl font-bold tabular-nums text-gold-400 sm:text-5xl">
                  <Counter to={200000} />
                </div>
                <div className="mt-1 text-sm text-green-50/65">engaged voters</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <NigeriaMap className="mx-auto w-full max-w-sm drop-shadow-[0_0_40px_rgba(201,162,39,0.15)] lg:max-w-md" />
          </Reveal>
        </div>
      </section>

      {/* ───────────── What we bring (editorial index) ───────────── */}
      <section id="offer" className="scroll-mt-20 bg-green-50">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.35fr]">
            <div className="lg:sticky lg:top-24 lg:self-start">
              <Rule />
              <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                What we bring to your campaign.
              </h2>
              <p className="mt-5 max-w-sm text-lg text-green-800">
                A full grassroots operation — the people, the training, and the
                discipline to move votes.
              </p>
            </div>
            <ul className="grid gap-x-12 sm:grid-cols-2">
              {offer.map(({ label, Icon }, i) => (
                <Reveal
                  as="li"
                  key={label}
                  delay={i * 40}
                  className="flex items-center gap-4 border-b border-green-200 py-5"
                >
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-green-700 ring-1 ring-green-200"
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="font-display text-lg font-medium text-green-900">
                    {label}
                  </span>
                </Reveal>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* ───────────── Benefits (dark cinematic band) ───────────── */}
      <section
        id="benefits"
        className="relative scroll-mt-20 overflow-hidden bg-green-950 text-green-50"
      >
        <Grain opacity={0.1} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 60% at 15% 10%, rgba(201,162,39,0.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <Rule light />
          <h2 className="max-w-2xl font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            What it means for your candidacy.
          </h2>
          <div className="mt-16 grid gap-x-12 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map(({ label, Icon }, i) => (
              <Reveal key={label} delay={i * 60}>
                <Icon className="h-8 w-8 text-gold-400" />
                <p className="mt-4 font-display text-xl font-medium leading-snug text-green-50">
                  {label}
                </p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── How we work (expressive timeline) ───────────── */}
      <section id="how" className="scroll-mt-20 bg-green-50">
        <div className="mx-auto max-w-4xl px-6 py-20 lg:py-28">
          <Rule />
          <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            How we work — recruitment to results.
          </h2>
          <ol className="mt-16">
            {phases.map(([title, body], i) => {
              const isLast = i === phases.length - 1;
              return (
                <Reveal as="li" key={title} delay={i * 60}>
                  <div className="grid grid-cols-[auto_1fr] gap-x-6 sm:gap-x-8">
                    <div className="flex flex-col items-center">
                      <span className="font-display text-4xl font-black leading-none tabular-nums text-green-700/25 sm:text-5xl">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {!isLast && (
                        <span
                          aria-hidden="true"
                          className="my-2 w-0.5 flex-1 rounded bg-linear-to-b from-gold-400 to-green-200"
                        />
                      )}
                    </div>
                    <div className={isLast ? "pb-0 pt-1" : "pb-12 pt-1"}>
                      <h3 className="font-display text-2xl font-semibold tracking-tight text-green-950">
                        {title}
                      </h3>
                      <p className="mt-1.5 text-lg text-green-800">{body}</p>
                    </div>
                  </div>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ───────────── Principled & lawful (dark, map watermark) ───────────── */}
      <section
        id="principles"
        className="relative scroll-mt-20 overflow-hidden bg-green-950 text-green-50"
      >
        <NigeriaMap className="pointer-events-none absolute -right-24 top-1/2 hidden w-160 -translate-y-1/2 opacity-[0.06] lg:block" />
        <Grain opacity={0.09} />
        <div className="relative mx-auto max-w-5xl px-6 py-20 lg:py-28">
          <Rule light />
          <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
            Principled, peaceful, and lawful.
          </h2>
          <p className="mt-8 max-w-3xl font-display text-2xl font-medium italic leading-snug text-balance text-green-50/90 sm:text-3xl">
            &ldquo;We operate peacefully, lawfully, and responsibly — promoting
            civic participation, respect for democratic institutions, and
            issue-based engagement with communities across Nigeria.&rdquo;
          </p>
          <div className="mt-14 flex flex-wrap items-baseline gap-x-6 gap-y-2">
            {values.map((v, i) => (
              <Reveal
                as="span"
                key={v}
                delay={i * 40}
                className={`font-display text-2xl leading-tight tracking-tight sm:text-3xl ${
                  i % 2
                    ? "font-medium italic text-gold-400"
                    : "font-semibold text-green-50"
                }`}
              >
                {v}
                {i < values.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="ml-6 hidden align-middle text-xl not-italic text-gold-500/70 sm:inline"
                  >
                    ·
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Vision & mission (light manifesto) ───────────── */}
      <section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 py-20 lg:py-28">
          <Reveal>
            <Rule />
            <p className="font-display text-3xl font-medium leading-[1.1] text-balance text-green-950 sm:text-4xl lg:text-5xl">
              Our vision: to become the{" "}
              <span className="font-semibold">
                largest grassroots leadership and voter-mobilization movement
              </span>{" "}
              in <span className="italic text-green-700">Nigeria.</span>
            </p>
          </Reveal>
          <ol className="mt-16 divide-y divide-green-200 border-y border-green-200">
            {mission.map((m, i) => {
              const [verb, ...rest] = m.replace(/\.$/, "").split(" ");
              return (
                <Reveal
                  as="li"
                  key={m}
                  delay={i * 50}
                  className="flex items-baseline gap-5 py-5"
                >
                  <span aria-hidden="true" className="mt-2 h-px w-6 shrink-0 bg-gold-500" />
                  <p className="font-display text-xl leading-snug text-green-900 sm:text-2xl">
                    <span className="font-semibold italic text-green-700">{verb}</span>{" "}
                    {rest.join(" ")}.
                  </p>
                </Reveal>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ───────────── Partnership (dark band + form) ───────────── */}
      <section
        id="partnership"
        className="relative scroll-mt-20 overflow-hidden bg-green-950 text-green-50"
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
        <div className="relative mx-auto max-w-6xl px-6 py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.1fr] lg:items-start">
            <div>
              <Rule light />
              <h2 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                Partner with Think-Winners.
              </h2>
              <p className="mt-5 max-w-md text-lg text-green-50/85">
                We invite your campaign to partner with us in building a
                structured grassroots engagement system — expanding outreach,
                strengthening coordination, and growing long-term leadership
                capacity.
              </p>
              <ul className="mt-8 grid gap-2.5">
                {[
                  "Expands community outreach",
                  "Strengthens volunteer coordination",
                  "Enhances voter education",
                  "Promotes peaceful democratic participation",
                  "Builds long-term leadership capacity",
                ].map((p) => (
                  <li key={p} className="flex items-center gap-3 text-green-50/90">
                    <span
                      aria-hidden="true"
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-gold-500 text-[11px] font-bold text-green-950"
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
      <footer className="bg-green-950 text-green-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="grid grid-cols-2 gap-8 border-b border-green-50/10 pb-10 sm:grid-cols-4">
            {footerPillars.map(([word, sub]) => (
              <div key={word}>
                <div className="text-lg font-bold tracking-tight text-gold-400">
                  {word}
                </div>
                <div className="mt-1 text-sm text-green-50/60">{sub}</div>
              </div>
            ))}
          </div>

          <p className="mt-10 max-w-2xl text-sm leading-relaxed text-green-50/70">
            Think-Winners is powered by real community members, registered and
            led by leaders on the ground — the network behind every number on
            this page. Community members join through a leader, not a public form.
          </p>

          <div className="mt-8 flex flex-col gap-2 text-sm text-green-50/60 sm:flex-row sm:items-center sm:justify-between">
            <p className="font-semibold text-green-50">
              Think-Winners Movement — Thinking Together, Winning Together
            </p>
            <p>A project of the ThinkRich Community.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
