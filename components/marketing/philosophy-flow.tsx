import { Reveal } from "./reveal";

// The core loop as a connected flow: mindset leads to people, people to work,
// work to outcome. A single connector line draws as the section scrolls into
// view (reuses the `.tw-connector` motif) and is masked by the solid nodes into
// clean segments, so it reads as one engine rather than four separate cells.
const beats = [
  { n: "01", label: "Think Right", sub: "the mindset" },
  { n: "02", label: "Connect Right", sub: "the people" },
  { n: "03", label: "Create Value", sub: "the work" },
  { n: "04", label: "Transform Lives", sub: "the outcome" },
];

function Dot({ n, size = "h-14 w-14" }: { n: string; size?: string }) {
  return (
    <span
      className={`grid ${size} shrink-0 place-items-center rounded-full bg-navy-900 font-mono text-sm font-bold text-gold-400 ring-1 ring-gold-400/30`}
    >
      {n}
    </span>
  );
}

export function PhilosophyFlow() {
  const last = beats.length - 1;
  return (
    <Reveal>
      {/* Desktop: four evenly-spaced nodes over one drawing line */}
      <div className="relative hidden md:block">
        <div className="pointer-events-none absolute inset-x-[12.5%] top-7 -translate-y-1/2" aria-hidden="true">
          <svg className="h-2 w-full" viewBox="0 0 100 4" preserveAspectRatio="none">
            <line
              x1="0"
              y1="2"
              x2="100"
              y2="2"
              pathLength={1}
              vectorEffect="non-scaling-stroke"
              stroke="rgba(217,190,104,0.55)"
              strokeWidth="1.5"
              strokeLinecap="round"
              className="tw-connector"
            />
          </svg>
        </div>
        <ol className="relative grid grid-cols-4">
          {beats.map((b) => (
            <li key={b.label} className="flex flex-col items-center px-3 text-center">
              <Dot n={b.n} />
              <span className="mt-4 font-display text-xl font-semibold text-navy-50">{b.label}</span>
              <span className="mt-1 text-sm text-navy-50/55">{b.sub}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Mobile: vertical path */}
      <ol className="flex flex-col md:hidden">
        {beats.map((b, i) => (
          <li key={b.label} className="flex gap-4">
            <div className="flex flex-col items-center">
              <Dot n={b.n} size="h-12 w-12" />
              {i < last && (
                <svg className="my-1 w-2 flex-1" viewBox="0 0 4 100" preserveAspectRatio="none" aria-hidden="true">
                  <line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="100"
                    pathLength={1}
                    vectorEffect="non-scaling-stroke"
                    stroke="rgba(217,190,104,0.55)"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    className="tw-connector"
                  />
                </svg>
              )}
            </div>
            <div className={i < last ? "pb-7 pt-1.5" : "pt-1.5"}>
              <p className="font-display text-xl font-semibold text-navy-50">{b.label}</p>
              <p className="mt-0.5 text-sm text-navy-50/55">{b.sub}</p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
