import Image from "next/image";
import { Counter } from "./counter";
import { NIGERIA_PATH, NIGERIA_TRANSFORM } from "./nigeria-map-path";

/*
  The Think-Winners landing hero — candidate-first, cinematic "film still".
  No eyebrow kicker (see docs/design/authentic-design.md): the message lives in the
  headline + one real sentence, with reach as the proof and "Partner with us" as the action.
*/

function FilmGrain() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 opacity-[0.13] mix-blend-overlay"
    >
      <svg className="h-full w-full">
        <filter id="tw-hero-grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#tw-hero-grain)" />
      </svg>
    </div>
  );
}

function ReachAndCta() {
  return (
    <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-5">
      <div className="flex items-center gap-6">
        <div>
          <div className="font-mono text-3xl font-bold tabular-nums text-gold-400 sm:text-4xl">
            <Counter to={20000} />
          </div>
          <div className="mt-0.5 text-sm text-green-50/65">trained leaders</div>
        </div>
        <div className="h-10 w-px bg-green-50/20" />
        <div>
          <div className="font-mono text-3xl font-bold tabular-nums text-gold-400 sm:text-4xl">
            <Counter to={200000} />
          </div>
          <div className="mt-0.5 text-sm text-green-50/65">engaged voters</div>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href="#partnership"
          className="inline-flex min-h-12 items-center justify-center rounded-md bg-gold-500 px-7 text-sm font-bold text-green-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          Partner with us
        </a>
        <a
          href="#offer"
          className="inline-flex min-h-12 items-center justify-center rounded-md border border-green-50/35 px-6 text-sm font-semibold text-green-50 transition-colors hover:border-gold-400 hover:text-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
        >
          What we offer
        </a>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-dvh flex-col justify-end overflow-hidden bg-green-950 text-green-50"
    >
      <div aria-hidden="true" className="absolute inset-0">
        <Image
          src="/think-winners/img/hero-crowd.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="tw-kenburns object-cover object-center"
        />
      </div>
      {/* Grade to green at the base, keep the middle open */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgb(6,22,13) 5%, rgba(6,22,13,0.6) 32%, rgba(6,22,13,0.12) 60%, rgba(6,22,13,0.55) 100%)",
        }}
      />
      {/* Vignette */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(125% 90% at 50% 42%, transparent 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      {/* Shaft of gold light */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(42% 52% at 84% 14%, rgba(201,162,39,0.22), transparent 60%)",
        }}
      />
      <FilmGrain />
      {/* Letterbox bars */}
      <div aria-hidden="true" className="absolute inset-x-0 top-0 h-6 bg-green-950 sm:h-9" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-6 bg-green-950 sm:h-9" />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-6 pb-20 sm:px-8 sm:pb-28">
        <h1 className="max-w-4xl font-display text-5xl font-black leading-[0.9] text-balance [text-shadow:0_2px_40px_rgba(0,0,0,0.55)] sm:text-8xl">
          Thinking Together,
          <span className="mt-1 block font-medium italic text-gold-400">
            Winning Together
          </span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-green-50/85">
          An organized grassroots network that turns communities into votes —
          leader by leader, ward by ward.
        </p>
        <ReachAndCta />
      </div>
    </section>
  );
}

/* Reach graphic — Nigeria with community points igniting across the country. */
const CITIES = [
  { x: 250, y: 700, d: 0 },
  { x: 330, y: 660, d: 0.5 },
  { x: 470, y: 760, d: 1.1 },
  { x: 560, y: 690, d: 0.8 },
  { x: 545, y: 560, d: 0.2 },
  { x: 560, y: 440, d: 0.9 },
  { x: 640, y: 340, d: 1.4 },
  { x: 420, y: 380, d: 0.6 },
  { x: 720, y: 470, d: 1.7 },
];

export function NigeriaMap({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1024 1024" fill="none" aria-hidden="true" className={className}>
      <g transform={NIGERIA_TRANSFORM}>
        <path
          d={NIGERIA_PATH}
          fill="rgba(21,96,46,0.55)"
          stroke="rgba(217,190,104,0.55)"
          strokeWidth="9"
          strokeLinejoin="round"
        />
      </g>
      {CITIES.map((c) => (
        <g key={`${c.x}-${c.y}`}>
          <circle cx={c.x} cy={c.y} r="26" fill="rgba(217,190,104,0.14)" />
          <circle
            className="tw-ignite"
            cx={c.x}
            cy={c.y}
            r="9"
            fill="#D9BE68"
            style={{ animationDelay: `${c.d}s` }}
          />
        </g>
      ))}
    </svg>
  );
}
