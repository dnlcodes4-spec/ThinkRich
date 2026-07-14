import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Organizational structure — Think-Winners (internal)",
  robots: { index: false, follow: false },
};

// Internal verification page (CR-0003). NOT linked from the public site and must be
// auth-gated (or removed) before any real deploy — it maps the leadership chain.
const LEVELS = [
  {
    n: 1,
    level: "National",
    role: "National Admin",
    code: "national_admin",
    scope: "All 37 — 36 states + FCT",
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
    scope: "Their registered members (≤10)",
    oversees: "Members — serves directly",
  },
];

function Fan({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-green-700">
      <svg width="72" height="30" viewBox="0 0 72 30" fill="none" aria-hidden="true">
        <path
          d="M36 0 V8 M36 8 C36 18 12 16 10 30 M36 8 C36 20 36 20 36 30 M36 8 C36 18 60 16 62 30"
          stroke="currentColor"
          strokeWidth="1.5"
          className="opacity-50"
        />
      </svg>
      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-green-700/70">
        each oversees many · {label}
      </span>
    </div>
  );
}

export default function OrganizationPage() {
  return (
    <main className="bg-green-50 text-green-950">
      <div className="mx-auto max-w-3xl px-6 py-16 lg:py-20">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold-600">
          Internal · leadership model (CR-0003)
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
          Organizational structure
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-green-800">
          The full chain, top to bottom. <strong>Every level is a leader except Member</strong> —
          the apex (#1) is the National Admin; authority narrows at each step down to a single
          Leader with up to ten members. This page is for verification only and is not part of the
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
                    : "border-green-200"
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* level badge */}
                  <span
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-full font-mono text-lg font-bold tabular-nums text-white ${
                      lvl.apex ? "bg-gold-500 text-green-950" : "bg-green-700"
                    }`}
                  >
                    {lvl.n}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                      <h2 className="font-display text-2xl font-bold tracking-tight text-green-950">
                        {lvl.role}
                      </h2>
                      <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs text-green-800">
                        {lvl.code}
                      </code>
                      {lvl.isNew && (
                        <span className="rounded bg-gold-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-green-950">
                          new · CR-0003
                        </span>
                      )}
                      {lvl.apex && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gold-600">
                          #1 · the apex
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-green-800">
                      <span className="font-semibold text-green-900">{lvl.level} level</span>
                      <span aria-hidden="true" className="text-green-300">
                        •
                      </span>
                      <span>{lvl.scope}</span>
                    </div>
                    <p className="mt-2 text-sm text-green-700">
                      Oversees{" "}
                      <span className="font-semibold text-green-900">{lvl.oversees}</span>
                    </p>
                  </div>
                </div>
              </div>
              {i < LEVELS.length - 1 && <Fan label={LEVELS[i + 1].level} />}
            </div>
          ))}

          {/* Members — the base, the only non-leaders */}
          <div className="mt-1 flex flex-col items-center py-1 text-green-700">
            <svg width="2" height="22" viewBox="0 0 2 22" aria-hidden="true">
              <line x1="1" y1="0" x2="1" y2="22" stroke="currentColor" strokeWidth="1.5" className="opacity-50" />
            </svg>
          </div>
          <div className="rounded-2xl border-2 border-dashed border-green-300 bg-white p-5 sm:p-6">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-green-100 font-mono text-xs font-bold uppercase text-green-700">
                base
              </span>
              <div>
                <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight text-green-950">
                    Member
                  </h2>
                  <code className="rounded bg-green-100 px-1.5 py-0.5 font-mono text-xs text-green-800">
                    member
                  </code>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-green-600">
                    not a leader
                  </span>
                </div>
                <p className="mt-2 text-sm text-green-800">
                  Registered by a Leader (never self-registers) · deduplicated by{" "}
                  <span className="font-semibold">NIN</span> · assigned to a polling unit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Rules / projection summary */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-green-200 bg-white p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gold-600">
              The invariants
            </h3>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-green-800">
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
                <div className="font-mono text-3xl font-extrabold tabular-nums text-green-700">
                  20,000
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-700/70">
                  Leaders
                </div>
              </div>
              <span aria-hidden="true" className="text-2xl text-gold-500">
                →
              </span>
              <div>
                <div className="font-mono text-3xl font-extrabold tabular-nums text-green-700">
                  200,000
                </div>
                <div className="mt-1 text-xs font-semibold uppercase tracking-wider text-green-700/70">
                  Members
                </div>
              </div>
            </div>
            <p className="mt-4 text-sm text-green-700">
              The two figures shown publicly. Everything between them is the structure above.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
