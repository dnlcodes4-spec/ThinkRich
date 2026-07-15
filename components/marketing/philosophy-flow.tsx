import { Reveal } from "./reveal";

// The core loop as a connected flow: mindset leads to people, people to work,
// work to outcome. A single continuous line runs behind the nodes (the solid
// nodes sit on top of it), so it reads as one engine rather than four cells.
const beats = [
  { n: "01", label: "Think Right", sub: "the mindset" },
  { n: "02", label: "Connect Right", sub: "the people" },
  { n: "03", label: "Create Value", sub: "the work" },
  { n: "04", label: "Transform Lives", sub: "the outcome" },
];

function Dot({ n, size = "h-14 w-14" }: { n: string; size?: string }) {
  return (
    <span
      className={`relative z-10 grid ${size} shrink-0 place-items-center rounded-full bg-navy-900 font-mono text-sm font-bold text-gold-400 ring-1 ring-gold-400/30`}
    >
      {n}
    </span>
  );
}

export function PhilosophyFlow() {
  const last = beats.length - 1;
  return (
    <Reveal>
      {/* Desktop: four nodes over one continuous line */}
      <div className="relative hidden md:block">
        <div
          aria-hidden="true"
          className="absolute left-[12.5%] right-[12.5%] top-7 h-px -translate-y-1/2 bg-gold-400/35"
        />
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
            <div className="flex flex-col items-center self-stretch">
              <Dot n={b.n} size="h-12 w-12" />
              {i < last && <span aria-hidden="true" className="my-1 w-px flex-1 bg-gold-400/35" />}
            </div>
            <div className={i < last ? "pb-7 pt-2" : "pt-2"}>
              <p className="font-display text-xl font-semibold text-navy-50">{b.label}</p>
              <p className="mt-0.5 text-sm text-navy-50/55">{b.sub}</p>
            </div>
          </li>
        ))}
      </ol>
    </Reveal>
  );
}
