import Image from "next/image";
import Link from "next/link";
import { Reveal } from "@/components/marketing/reveal";
import { Grain } from "@/components/marketing/motifs";
import { ThinkRichNav } from "@/components/marketing/thinkrich-nav";
import { HeroSlider } from "@/components/marketing/hero-slider";
import { ArmsExplorer } from "@/components/marketing/arms-explorer";

// ThinkRich Community — the umbrella front door (T-016). Purpose: inspire prospective members
// about the community and route them to the arm that fits — above all to Think-Winners, the one
// LIVE platform. Content: docs/project/content/thinkrich-community-arms.md. Navy + gold; no
// eyebrow kickers; arm logos are branded PLACEHOLDERS until the client supplies the real ones.

// "Get involved" routes to the arms explorer ("there is an arm for your purpose").
// TODO(T-021): point at a real community join/contact flow once the client confirms
// the destination (self-serve signup isn't the model — members are leader-registered).
const GET_INVOLVED = "#arms";

const focusAreas = [
  "Personal Development",
  "Entrepreneurship",
  "Financial Empowerment",
  "Innovation",
  "Education",
  "Humanitarian Service",
  "Civic Responsibility",
  "Digital Transformation",
];

const arms = [
  {
    key: "concept",
    abbr: "CI",
    name: "ThinkRich Concept International",
    focus: "Leadership & value creation",
    motto: "Creating Value for Mankind",
    blurb:
      "A leadership, innovation, and value-creation organization. It turns ideas into opportunities, and opportunities into lasting value.",
    mission:
      "Build leaders who connect the right people to verifiable opportunities through leadership development, innovation, entrepreneurship, technology, education, and strategic partnerships.",
    vision:
      "A globally recognized leadership and value-creation organization developing transformational leaders and connecting millions to verifiable opportunities.",
    highlights: [
      "Leadership development",
      "Entrepreneurship & innovation",
      "Strategic partnerships",
      "Ethical, transformational leadership",
    ],
  },
  {
    key: "mcps",
    abbr: "MCPS",
    name: "ThinkRich MCPS Cooperative",
    focus: "Cooperative finance",
    motto: "Let's Get Richer Together",
    blurb:
      "A non-interest, member-owned, democratically managed cooperative promoting financial inclusion, economic empowerment, and collective prosperity.",
    mission:
      "Empower members through cooperative savings, interest-free loans, entrepreneurship, and shared opportunities that foster sustainable wealth and financial independence.",
    vision:
      "A leading non-interest multipurpose cooperative that transforms lives and builds prosperous communities through unity, integrity, and collective wealth creation.",
    highlights: [
      "Regular savings",
      "Interest-free loans",
      "Investments & entrepreneurship",
      "Capacity building",
    ],
  },
  {
    key: "thinkhelp",
    abbr: "TH",
    name: "ThinkHelp International Foundation",
    focus: "Humanitarian service",
    motto: "Get Help",
    blurb:
      "A non-profit humanitarian organization improving lives through food, healthcare, and material support to vulnerable individuals and communities.",
    mission:
      "Provide meaningful support and sustainable opportunities that improve the quality of life for individuals and communities.",
    vision:
      "A leading humanitarian foundation recognized for creating hope, empowering people, and transforming communities worldwide.",
    highlights: [
      "Food, healthcare & material support",
      "Education support",
      "Youth & women empowerment",
      "Community development",
    ],
  },
  {
    key: "academy",
    abbr: "TA",
    name: "ThinkRich Academy",
    focus: "Education & mentorship",
    motto: "Be Rich",
    blurb:
      "A citadel of learning where people are taught how to think rich to be rich. It builds the mindset, knowledge, skills, and leadership for purposeful living.",
    mission:
      "Empower people with the right mindset, knowledge, and practical skills to achieve success and create lasting value.",
    vision:
      "A leading academy developing transformational leaders, entrepreneurs, and value creators who think rich and live rich.",
    highlights: [
      "Practical education",
      "Mentorship",
      "Leadership development",
      "Continuous learning",
    ],
  },
  {
    key: "mclub",
    abbr: "$M",
    name: "ThinkRich $M Club",
    focus: "Wealth-building",
    motto: "Put in Mind",
    blurb:
      "A social and business community building sustainable wealth through financial education, technology-driven investing, and strategic networking. Members keep control of their capital through regulated brokers.",
    mission:
      "Train and empower members on wealth creation: compounding profits, disciplined investing, and smart financial management for long-term success.",
    vision:
      "1,000+ members in every state. A global network of financially empowered individuals building communities of dollar millionaires.",
    highlights: [
      "Financial education & mentorship",
      "AI-powered copy trading",
      "Regulated investment platforms",
      "Networking & growth coaching",
    ],
  },
  {
    key: "twm",
    abbr: "TWM",
    name: "Think-Winners Movement",
    focus: "Civic mobilization",
    motto: "Thinking Together, Winning Together",
    blurb:
      "A socio-political movement building an organized network of leaders who connect the right people to the right candidates through education, engagement, and lawful grassroots mobilization.",
    mission:
      "Build responsible community leaders, promote issue-based participation, and connect voters with credible leadership from the grassroots.",
    vision:
      "The largest grassroots leadership and voter-mobilization movement in Nigeria.",
    highlights: [
      "Grassroots leadership network",
      "Voter education & mobilization",
      "20,000 leaders → 200,000 voters",
      "Live today",
    ],
    href: "/think-winners",
    live: true,
  },
];

const philosophy = [
  "Think Right",
  "Connect Right",
  "Create Value",
  "Transform Lives",
];

function Rule({ light = false }: { light?: boolean }) {
  return (
    <div
      aria-hidden="true"
      className={`mb-6 h-px w-12 ${light ? "bg-gold-400" : "bg-gold-500"}`}
    />
  );
}

export default function ThinkRichLanding() {
  return (
    <main className="bg-white text-navy-950">
      <ThinkRichNav />

      {/* ───────────── Hero — slider (ThinkRich · Think-Winners · Arms) ───────────── */}
      <HeroSlider />

      {/* ───────────── The Community ───────────── */}
      <section id="community" className="scroll-mt-20 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20 lg:py-28">
          <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Rule />
              <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
                A community built to turn purpose into prosperity.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-navy-800">
                ThinkRich exists to build leaders who connect the right people
                to verifiable opportunities by creating sustainable value for
                members and society, through initiatives and partnerships across
                eight fronts.
              </p>
            </div>
            <Reveal
              delay={100}
              className="relative aspect-4/3 overflow-hidden rounded-2xl ring-1 ring-navy-200"
            >
              <Image
                src="/think-winners/img/hero-v2.jpeg"
                alt="Young Nigerian graduates"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover object-center"
              />
            </Reveal>
          </div>

          <div className="mt-10 flex flex-wrap items-baseline gap-x-6 gap-y-2 sm:mt-16">
            {focusAreas.map((f, i) => (
              <Reveal
                as="span"
                key={f}
                delay={i * 40}
                className={`font-display text-2xl leading-tight tracking-tight sm:text-3xl ${
                  i % 2
                    ? "font-medium italic text-navy-700"
                    : "font-semibold text-navy-950"
                }`}
              >
                {f}
                {i < focusAreas.length - 1 && (
                  <span
                    aria-hidden="true"
                    className="ml-6 hidden align-middle text-xl not-italic text-gold-500 sm:inline"
                  >
                    ·
                  </span>
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────── Featured: Think-Winners (live) ───────────── */}
      <section
        id="live"
        className="relative overflow-hidden bg-navy-950 text-navy-50"
      >
        <Image
          src="/think-winners/img/hero-crowd.jpg"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-center"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-navy-950/80" />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to right, rgb(5,21,39) 15%, rgba(5,21,39,0.4) 75%)",
          }}
        />
        <Grain opacity={0.08} />
        <div className="relative mx-auto max-w-6xl px-6 py-14 sm:py-20 lg:py-28">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3.5 py-1.5 text-sm font-semibold text-gold-300">
              <span
                aria-hidden="true"
                className="tw-ignite h-1.5 w-1.5 rounded-full bg-gold-400"
              />
              Live now
            </span>
            <h2 className="mt-5 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              The Think-Winners Movement is mobilizing. Join it first.
            </h2>
            <p className="mt-5 text-lg text-navy-50/85">
              The community&rsquo;s flagship arm: an organized grassroots
              network of leaders turning communities into votes through
              education, engagement, and lawful mobilization. It&rsquo;s the one
              platform you can step into today.
            </p>
            <Link
              href="/think-winners"
              className="mt-8 inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md bg-gold-500 px-7 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
            >
              Enter the movement
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ───────────── The Arms — interactive explorer ───────────── */}
      <section id="arms" className="scroll-mt-20 bg-navy-50/60">
        <div className="mx-auto max-w-6xl px-6 py-14 sm:py-20 lg:py-28">
          <div className="max-w-2xl">
            <Rule />
            <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
              Six arms, one purpose.
            </h2>
            <p className="mt-5 text-lg text-navy-800">
              Each arm pursues a distinct mission under the same idea by
              creating value for mankind. Choose the one that fits you; one is
              live today, the rest are opening soon.
            </p>
          </div>

          <div className="mt-10 sm:mt-14">
            <ArmsExplorer arms={arms} />
          </div>
        </div>
      </section>

      {/* ───────────── Philosophy (four-beat) ───────────── */}
      <section
        id="philosophy"
        className="relative scroll-mt-20 overflow-hidden bg-navy-950 text-navy-50"
      >
        <Grain opacity={0.08} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(50% 60% at 15% 10%, rgba(201,162,39,0.12), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-14 sm:py-20 lg:py-28">
          <Rule light />
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Our core philosophy.
          </h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-navy-50/10 bg-navy-50/10 sm:grid-cols-2 lg:grid-cols-4">
            {philosophy.map((p, i) => (
              <Reveal
                as="li"
                key={p}
                delay={i * 80}
                className="bg-navy-950 p-8"
              >
                <span className="font-mono text-sm text-gold-400">
                  0{i + 1}
                </span>
                <p className="mt-3 font-display text-2xl font-semibold text-navy-50">
                  {p}.
                </p>
              </Reveal>
            ))}
          </ol>
          <p className="mt-10 font-display text-xl italic text-navy-50/70">
            Building leaders, connecting opportunities, creating value.
          </p>
        </div>
      </section>

      {/* ───────────── Get involved ───────────── */}
      <section id="join" className="scroll-mt-20 bg-gold-500 text-navy-950">
        <div className="mx-auto max-w-4xl px-6 py-14 text-center sm:py-20 lg:py-24">
          <h2 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl lg:text-5xl">
            Join a community creating value for mankind.
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-navy-950/80">
            Whether you want to lead, learn, build wealth, serve, or mobilize,
            there is an arm for your purpose. Start with the one that&rsquo;s
            live.
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/think-winners"
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md bg-navy-950 px-8 text-sm font-bold text-navy-50 transition-colors hover:bg-navy-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy-950"
            >
              Enter Think-Winners
              <span aria-hidden="true">→</span>
            </Link>
            <a
              href={GET_INVOLVED}
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-navy-950/30 px-7 text-sm font-bold text-navy-950 transition-colors hover:border-navy-950"
            >
              Get involved
            </a>
          </div>
        </div>
      </section>

      {/* ───────────── Footer ───────────── */}
      <footer className="bg-navy-950 text-navy-50">
        <div className="mx-auto max-w-6xl px-6 py-14">
          <div className="flex flex-col gap-8 border-b border-navy-50/10 pb-10 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-sm">
              <p className="font-display text-xl font-semibold">
                Think<span className="text-gold-400">Rich</span> Community
              </p>
              <p className="mt-2 text-sm text-navy-50/60">
                Creating Value for Mankind · Thinking Together, Winning
                Together.
              </p>
            </div>
            <ul className="grid grid-cols-1 gap-x-10 gap-y-1.5 text-sm text-navy-50/70 sm:grid-cols-2">
              {arms.map((a) => (
                <li key={a.key}>
                  {a.live && a.href ? (
                    <Link href={a.href} className="hover:text-gold-400">
                      {a.name} <span className="text-gold-400">· live</span>
                    </Link>
                  ) : (
                    a.name
                  )}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-8 text-sm text-navy-50/50">
            © {new Date().getFullYear()} ThinkRich Community. All rights
            reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
