import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { buildMembershipCard } from "@/lib/membership-card";

export const metadata: Metadata = {
  title: "Organizational structure (Think-Winners, internal)",
  robots: { index: false, follow: false },
};

// T-022 gate: this internal page maps the leadership chain and must not be
// publicly reachable on a real deploy. It stays open in development; in
// production it 404s unless explicitly opted in via ENABLE_INTERNAL_PAGES=1.
// (noindex above is defence-in-depth, not the gate.)
function internalPagesEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_INTERNAL_PAGES === "1"
  );
}

// Internal verification page (CR-0003). NOT linked from the public site and must be
// auth-gated (or removed) before any real deploy — it maps the leadership chain.
const LEVELS = [
  {
    n: 1,
    level: "National",
    role: "National Admin",
    code: "national_admin",
    scope: "All 37 (36 states + FCT)",
    oversees: "State Admins",
    apex: true,
  },
  {
    n: 2,
    level: "State",
    role: "State Admin",
    code: "state_admin",
    scope: "One state · state_id",
    oversees: "L.G Admins",
  },
  {
    n: 3,
    level: "Local Government",
    role: "L.G Admin",
    code: "lg_admin",
    scope: "One LGA · lga_id",
    oversees: "Ward Admins",
  },
  {
    n: 4,
    level: "Ward",
    role: "Ward Admin",
    code: "ward_admin",
    scope: "One ward · ward_id",
    oversees: "Polling Unit Coordinators",
    isNew: true,
  },
  {
    n: 5,
    level: "Polling Unit",
    role: "PU Coordinator",
    code: "unit_coordinator",
    scope: "One polling unit · polling_unit_id",
    oversees: "Leaders",
  },
  {
    n: 6,
    level: "Leader",
    role: "Leader",
    code: "leader",
    scope: "The members they register",
    oversees: "Members (serves directly)",
  },
];

function Fan({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-navy-700">
      <svg width="72" height="30" viewBox="0 0 72 30" fill="none" aria-hidden="true">
        <path
          d="M36 0 V8 M36 8 C36 18 12 16 10 30 M36 8 C36 20 36 20 36 30 M36 8 C36 18 60 16 62 30"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-50"
        />
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-navy-700/70">
        each oversees many · {label}
      </span>
    </div>
  );
}

export default function OrganizationPage() {
  if (!internalPagesEnabled()) notFound();

  return (
    <main className="bg-navy-50 text-navy-950">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">
          Internal · leadership model (CR-0003)
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Organizational structure
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-navy-800">
          The full chain, top to bottom. <strong>Every level is a leader except Member.</strong>
          The apex (#1) is the National Admin; authority narrows at each step down to a single
          Leader with the members they register. This page is for verification only and is not part of the
          public site.
        </p>

        {/* Vertical org chart */}
        <div className="mt-12 flex flex-col items-stretch">
          {LEVELS.map((lvl, i) => (
            <div key={lvl.code} className="flex flex-col items-stretch">
              <div
                className={`relative overflow-hidden rounded-2xl border bg-white p-5 shadow-sm sm:p-6 ${
                  lvl.apex
                    ? "border-gold-300 ring-1 ring-gold-200"
                    : "border-navy-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* level badge */}
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-mono text-lg font-bold tabular-nums text-white ${
                      lvl.apex ? "bg-gold-500 text-navy-950" : "bg-navy-700"
                    }`}
                  >
                    {lvl.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <h2 className="font-display text-2xl font-bold tracking-tight text-navy-950">
                        {lvl.role}
                      </h2>
                      <code className="rounded bg-navy-100 px-1.5 py-0.5 font-mono text-xs text-navy-800">
                        {lvl.code}
                      </code>
                      {lvl.isNew && (
                        <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-navy-950">
                          new · CR-0003
                        </span>
                      )}
                      {lvl.apex && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                          #1 · the apex
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy-800">
                      <span className="font-semibold text-navy-900">{lvl.level} level</span>
                      <span aria-hidden="true" className="text-navy-300">
                        •
                      </span>
                      <span>{lvl.scope}</span>
                    </div>
                    <p className="mt-2 text-sm text-navy-700">
                      Oversees{" "}
                      <span className="font-semibold text-navy-900">{lvl.oversees}</span>
                    </p>
                  </div>
                </div>
              </div>
              {i < LEVELS.length - 1 && <Fan label={LEVELS[i + 1].level} />}
            </div>
          ))}

          {/* Members — the base, the only non-leaders */}
          <div className="mt-1 flex flex-col items-center py-1 text-navy-700">
            <svg width="2" height="22" viewBox="0 0 2 22" aria-hidden="true">
              <line x1="1" y1="0" x2="1" y2="22" stroke="currentColor" strokeWidth="1.5" className="opacity-50" />
            </svg>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-navy-300 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-navy-100 font-mono text-xs font-bold uppercase text-navy-700">
                base
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-navy-950">
                    Member
                  </h2>
                  <code className="rounded bg-navy-100 px-1.5 py-0.5 font-mono text-xs text-navy-800">
                    member
                  </code>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-navy-600">
                    not a leader
                  </span>
                </div>
                <p className="mt-2 text-sm text-navy-800">
                  Registered by a Leader (never self-registers) · deduplicated by{" "}
                  <span className="font-semibold">NIN</span> · assigned to a polling unit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules / projection summary */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-navy-200 bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold-600">
              The invariants
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-navy-800">
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                Every role except <strong>Member</strong> is a leader.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                A <strong>Leader</strong> holds at most <strong>10</strong> active members.
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                Scope narrows at each step; enforced in the database (RLS).
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                Geography: State → LGA → Ward → Polling Unit.
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border border-gold-200 bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold-600">
              Projected goal
            </h3>
            <div className="mt-4 flex items-center gap-6">
              <div>
                <div className="font-mono text-3xl font-extrabold tabular-nums text-navy-700">
                  20,000
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-navy-700/70">
                  Leaders
                </div>
              </div>
              <span aria-hidden="true" className="text-2xl text-gold-500">
                →
              </span>
              <div>
                <div className="font-mono text-3xl font-extrabold tabular-nums text-navy-700">
                  200,000
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-navy-700/70">
                  Members
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-navy-700">
              The two figures shown publicly. Everything between them is the structure above.
            </p>
          </div>
        </div>

        <MembershipCardPreview />
      </div>
    </main>
  );
}

// Membership card preview (CR-0009 §3.5). Renders the real generator with mock
// data, so what is shown here is what a member actually downloads: same code
// path, same artwork, same fitting rules. A hand-made mockup would drift.
//
// The long and overflowing rows are deliberate. Nigerian names and LGA names run
// much longer than the client's sample ("Okesooto Olanrewaju"), and the card has
// to stay readable for all of them, so the cases that stress it are on screen
// next to the ordinary one rather than left to be discovered in print.
const CARD_SAMPLES = [
  {
    caption: "Typical",
    note: "Fields at full size, matching the artwork the client approved.",
    data: {
      fullName: "Okesooto Olanrewaju",
      gender: "male",
      stateName: "Oyo",
      lgaName: "Ibadan South-West",
      wardNumber: 12,
      membershipNumber: "TWM-OG-01-000001",
    },
  },
  {
    caption: "Long values",
    note: "A longer name, state and LGA. Each row shrinks on its own; the short rows keep full size.",
    data: {
      fullName: "Oluwadamilare Chukwuemeka Adeyemi",
      gender: "female",
      stateName: "Federal Capital Territory",
      lgaName: "Municipal Area Council",
      wardNumber: 7,
      membershipNumber: "TWM-FC-01-004821",
    },
  },
  {
    caption: "Beyond the floor",
    note: "Past the smallest legible size the name is truncated rather than allowed to run off the card.",
    data: {
      fullName: "Oluwadamilareoluwa Chukwuemeka-Adeyemi Oluwaseunfunmi",
      gender: "female",
      stateName: "Akwa Ibom",
      lgaName: "Ogun Waterside",
      wardNumber: 120,
      membershipNumber: "TWM-AK-31-999999",
    },
  },
];

async function MembershipCardPreview() {
  const cards = await Promise.all(
    CARD_SAMPLES.map(async (s) => ({ ...s, svg: await buildMembershipCard(s.data) })),
  );

  return (
    <section className="mt-16 border-t border-navy-200 pt-12">
      <h2 className="font-display text-2xl font-bold tracking-tight">Membership card</h2>
      <p className="mt-3 max-w-2xl text-navy-800">
        Generated by the same code that serves a member&rsquo;s download, filled with mock details.
        The ward number is a <strong>system-assigned</strong> position within the LGA, not an INEC
        ward code.
      </p>

      <div className="mt-8 flex flex-col gap-10">
        {cards.map((c) => (
          <figure key={c.caption} className="m-0">
            <div
              className="overflow-hidden rounded-2xl border border-navy-200 bg-white shadow-sm [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
              // Trusted input: the SVG is built server-side by our own generator
              // from the literals above, and every value it interpolates is
              // XML-escaped in `renderCardSvg`.
              dangerouslySetInnerHTML={{ __html: c.svg }}
            />
            <figcaption className="mt-3">
              <span className="text-sm font-bold text-navy-900">{c.caption}</span>
              <span className="ml-2 text-sm text-navy-700">{c.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
