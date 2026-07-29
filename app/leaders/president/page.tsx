import type { Metadata } from "next";
import Link from "next/link";
import { ThinkRichNav } from "@/components/marketing/thinkrich-nav";
import { Grain } from "@/components/marketing/motifs";
import { Reveal } from "@/components/marketing/reveal";
import { Portrait } from "@/components/marketing/portrait";
import { thinkWinnersHref } from "@/lib/origins";
import {
  president,
  fullName,
  portraitExists,
  presidentCreed,
  presidentCredentials,
  presidentFacts,
  presidentOrganizations,
  presidentProfile,
  presidentStandfirst,
} from "@/lib/leadership";

// The President's full profile (CR-0010 · T-052). Lives on the apex origin: the
// Think-Winners landing links across to it with apexHref (CR-0008 / ADR-0014).
//
// Treatment: a dark masthead carrying the portraits and the creed, then the body
// as an editorial page with headings set in the left margin. Long-form prose is
// the point here, so the craft goes into measure, rhythm, and the record blocks,
// not into decoration.

export const metadata: Metadata = {
  title: "Chief Amb. Dr Salami Saidi Oladimeji, President of the ThinkRich Community",
  description:
    "The profile of Chief (Amb.) Salami Saidi Oladimeji, known as Thinkrich: philosopher, author, United Nations IAWPA Eminent Peace Ambassador, and President of the ThinkRich Community. The six organizations he leads, his humanitarian work, and the philosophy behind the movement.",
};

const TW_HOME = thinkWinnersHref("/");

/** The narrative splits around the register of organizations he leads. */
const BEFORE = new Set(["early-life", "education", "philosophy", "career"]);

const MARGIN_HEADING =
  "font-display text-xl font-semibold tracking-tight text-green-700 lg:pt-1 lg:text-right";
const BODY = "text-lg leading-relaxed text-ink-800";

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <Reveal
      as="section"
      className="grid gap-3 border-t border-ink-150 py-9 sm:py-11 lg:grid-cols-[190px_1fr] lg:gap-12"
    >
      <h2 className={MARGIN_HEADING}>{heading}</h2>
      <div className="max-w-2xl">{children}</div>
    </Reveal>
  );
}

export default function PresidentProfilePage() {
  const hasPortrait = portraitExists(president.portrait);
  const hasAlt = president.portraitAlt ? portraitExists(president.portraitAlt) : false;

  return (
    <main className="bg-white text-ink-950">
      <ThinkRichNav base="/" />

      {/* ───────────── Masthead ───────────── */}
      <header className="relative overflow-hidden bg-ink-950 text-ink-50">
        <Grain opacity={0.08} />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            background:
              "radial-gradient(55% 60% at 80% 0%, rgba(0,151,82,0.14), transparent 62%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 pt-28 pb-14 sm:pt-32 sm:pb-20 lg:pt-36 lg:pb-24">
          <Link
            href="/#leaders"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-ink-50/60 transition-colors hover:text-green-400"
          >
            <span aria-hidden="true">←</span>
            The ThinkRich Community leadership
          </Link>

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-end lg:gap-14">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-balance sm:text-5xl lg:text-6xl">
                {fullName(president)}
              </h1>
              <p className="mt-4 text-lg font-semibold text-green-400">
                President, ThinkRich Community
              </p>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-50/75">
                {presidentStandfirst}
              </p>

              <blockquote className="mt-9 border-l-2 border-green-500 pl-5">
                <p className="font-display text-2xl leading-snug text-balance italic text-ink-50 sm:text-3xl">
                  &ldquo;{presidentCreed}&rdquo;
                </p>
              </blockquote>
            </div>

            {/* Both supplied images, the second held back as the secondary crop. */}
            <div className="grid grid-cols-5 gap-3 sm:gap-4">
              <Portrait
                src={president.portrait}
                present={hasPortrait}
                alt={`${fullName(president)}, President of the ThinkRich Community`}
                className="col-span-3 aspect-4/5 rounded-2xl"
                sizes="(max-width: 1024px) 55vw, 26vw"
                initials={president.initials}
                field="bg-ink-900 ring-1 ring-ink-50/8"
                monogram="text-ink-50/30"
                preload
              />
              <Portrait
                src={president.portraitAlt ?? president.portrait}
                present={hasAlt}
                alt={`${fullName(president)}, second portrait`}
                className="col-span-2 mt-10 aspect-3/4 self-end rounded-2xl"
                sizes="(max-width: 1024px) 36vw, 17vw"
                initials={president.initials}
                field="bg-ink-900 ring-1 ring-ink-50/8"
                monogram="text-ink-50/30"
              />
            </div>
          </div>

          {/* The record block: hard facts, monospaced, the way this product sets data. */}
          <dl className="mt-12 grid gap-x-8 gap-y-5 border-t border-ink-50/12 pt-8 sm:mt-14 sm:grid-cols-2 lg:grid-cols-4">
            {presidentFacts.map((f) => (
              <div key={f.label}>
                <dt className="text-sm text-ink-50/50">{f.label}</dt>
                <dd className="mt-1.5 font-mono text-sm leading-relaxed text-ink-50">
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* ───────────── The profile ───────────── */}
      <article className="mx-auto max-w-5xl px-6 py-12 sm:py-16 lg:py-20">
        <ul className="mb-10 flex flex-wrap gap-2 sm:mb-12">
          {presidentCredentials.map((c) => (
            <li
              key={c}
              className="rounded-full bg-ink-50 px-3.5 py-2 text-sm font-medium text-ink-800 ring-1 ring-ink-150"
            >
              {c}
            </li>
          ))}
        </ul>

        {presidentProfile
          .filter((s) => BEFORE.has(s.id))
          .map((s) => (
            <Section key={s.id} heading={s.heading}>
              {s.body.map((p, i) => (
                <p key={p} className={`${BODY} ${i > 0 ? "mt-5" : ""}`}>
                  {p}
                </p>
              ))}
            </Section>
          ))}

        {/* The six organizations, as a register rather than prose: it is a list of
            offices, and a list is what reads. */}
        <Reveal
          as="section"
          className="grid gap-3 border-t border-ink-150 py-9 sm:py-11 lg:grid-cols-[190px_1fr] lg:gap-12"
        >
          <div>
            <h2 className={MARGIN_HEADING}>What he leads</h2>
            <p className="mt-2 text-sm text-ink-400 lg:text-right">
              Six organizations, alongside the community itself.
            </p>
          </div>
          <ol className="max-w-2xl divide-y divide-ink-150">
            {presidentOrganizations.map((o) => (
              <li key={o.org} className="py-6 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-green-700">{o.role}</p>
                <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-balance sm:text-2xl">
                  {o.org}
                </h3>
                <p className="mt-2.5 leading-relaxed text-ink-800">{o.body}</p>
              </li>
            ))}
          </ol>
        </Reveal>

        {presidentProfile
          .filter((s) => !BEFORE.has(s.id))
          .map((s) => (
            <Section key={s.id} heading={s.heading}>
              {s.body.map((p, i) => (
                <p key={p} className={`${BODY} ${i > 0 ? "mt-5" : ""}`}>
                  {p}
                </p>
              ))}
            </Section>
          ))}
      </article>

      {/* ───────────── Close ───────────── */}
      <section className="bg-green-500 text-ink-950">
        <div className="mx-auto max-w-4xl px-6 py-14 sm:py-20">
          <p className="max-w-2xl font-display text-2xl leading-snug font-medium text-balance sm:text-3xl">
            The community he leads is open. One arm of it is live and mobilizing today.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <a
              href={TW_HOME}
              className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-md bg-ink-950 px-7 text-sm font-bold text-ink-50 transition-colors hover:bg-ink-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-950"
            >
              Enter Think-Winners
              <span aria-hidden="true">→</span>
            </a>
            <Link
              href="/#arms"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-ink-950/30 px-7 text-sm font-bold text-ink-950 transition-colors hover:border-ink-950"
            >
              See all six arms
            </Link>
          </div>
        </div>
      </section>

      <footer className="bg-ink-950 text-ink-50">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="font-display text-xl font-semibold">
            Think<span className="text-green-400">Rich</span> Community
          </Link>
          <p className="text-sm text-ink-50/50">
            © {new Date().getFullYear()} ThinkRich Community. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}
