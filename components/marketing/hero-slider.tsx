"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Grain } from "./motifs";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const DURATION = 6800;

type Cta = { label: string; href: string; primary?: boolean; arrow?: boolean };
type Slide = {
  key: string;
  image: string;
  alt: string;
  pill: string;
  pillHref?: string;
  lead: string;
  accent: string;
  body: string;
  ctas: Cta[];
};

const slides: Slide[] = [
  {
    key: "community",
    image: "/thinkrich/img/leaders.jpg",
    alt: "Young Nigerian leaders",
    pill: "Now live — the Think-Winners Movement",
    pillHref: "/think-winners",
    lead: "Creating value",
    accent: "for mankind.",
    body: "A community of people who think right, connect right, and build together — leaders, entrepreneurs, savers, learners, and changemakers creating lasting value.",
    ctas: [
      { label: "Explore the community", href: "#arms", primary: true },
      { label: "Enter Think-Winners", href: "/think-winners", arrow: true },
    ],
  },
  {
    key: "twm",
    image: "/think-winners/img/hero-crowd.jpg",
    alt: "A Nigerian grassroots crowd",
    pill: "Live now — the flagship arm",
    lead: "Thinking Together,",
    accent: "Winning Together.",
    body: "The Think-Winners Movement is mobilizing — an organized grassroots network of 20,000 leaders turning communities into votes. It is the one platform you can step into today.",
    ctas: [
      { label: "Enter the movement", href: "/think-winners", primary: true, arrow: true },
      { label: "See the six arms", href: "#arms" },
    ],
  },
  {
    key: "arms",
    image: "/thinkrich/img/community.jpg",
    alt: "Young Nigerian graduates",
    pill: "One community · six arms",
    lead: "Six arms.",
    accent: "One purpose.",
    body: "Leadership, cooperative finance, humanitarian service, education, wealth-building, and civic mobilization — pick the arm that matches your purpose, or grow through several.",
    ctas: [{ label: "Explore the arms", href: "#arms", primary: true }],
  },
];

// Navy panel diagonal — content lives on navy (never on the image, so nothing is cut).
const PANEL = "polygon(0 0, 58% 0, 47% 100%, 0 100%)";
const SEAM = "polygon(0 0, 58.5% 0, 47.5% 100%, 0 100%)";

export function HeroSlider() {
  const [active, setActive] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [playing, setPlaying] = useState(true);
  const reduce = usePrefersReducedMotion();
  const touchX = useRef<number | null>(null);
  const effPaused = hovered || !playing;

  const go = (n: number) => setActive((n + slides.length) % slides.length);

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label="ThinkRich Community"
      className="relative h-dvh min-h-[42rem] overflow-hidden bg-navy-950 text-navy-50"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
      onBlurCapture={() => setHovered(false)}
      onTouchStart={(e) => {
        touchX.current = e.changedTouches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) go(active + (dx < 0 ? 1 : -1));
        touchX.current = null;
      }}
    >
      {slides.map((s, i) => {
        const on = i === active;
        const near = on || i === (active + 1) % slides.length;
        return (
          <div
            key={s.key}
            aria-hidden={!on}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              on ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
          >
            <Image
              src={s.image}
              alt={on ? s.alt : ""}
              fill
              priority={near}
              sizes="100vw"
              className={`object-cover object-center ${on ? "tw-kenburns" : ""}`}
            />
            {/* Mobile: left-weighted navy wash for legibility */}
            <div aria-hidden="true" className="absolute inset-0 bg-navy-950/55 lg:hidden" />
            <div
              aria-hidden="true"
              className="absolute inset-0 lg:hidden"
              style={{
                background:
                  "linear-gradient(100deg, rgb(5,21,39) 20%, rgba(5,21,39,0.62) 58%, rgba(5,21,39,0.3) 100%)",
              }}
            />
            {/* Desktop: navy diagonal panel with a gold seam */}
            <div aria-hidden="true" className="absolute inset-0 hidden lg:block">
              <div className="absolute inset-0 bg-gold-500" style={{ clipPath: SEAM }} />
              <div className="absolute inset-0 bg-navy-950" style={{ clipPath: PANEL }} />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(100deg, transparent 46%, rgba(5,21,39,0.55) 58%, transparent 82%)",
                }}
              />
            </div>
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(45% 55% at 6% 22%, rgba(201,162,39,0.14), transparent 60%)" }}
      />
      <Grain opacity={0.07} />

      {/* Content — cross-fades with the active slide */}
      <div className="relative mx-auto flex h-full max-w-6xl items-center px-6">
        <div className="relative w-full max-w-md">
          {slides.map((s, i) => {
            const on = i === active;
            return (
              <div
                key={s.key}
                aria-hidden={!on}
                className={`transition-all duration-500 ${
                  on ? "opacity-100" : "pointer-events-none absolute inset-0 translate-y-2 opacity-0"
                }`}
              >
                {s.pillHref ? (
                  <Link
                    href={s.pillHref}
                    className="inline-flex items-center gap-2 rounded-full border border-gold-400/40 bg-gold-400/10 px-3.5 py-1.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-gold-400/20"
                  >
                    <span aria-hidden="true" className="tw-ignite h-2 w-2 rounded-full bg-gold-400" />
                    {s.pill}
                    <span aria-hidden="true">→</span>
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gold-400/15 px-3.5 py-1.5 text-sm font-semibold text-gold-300">
                    <span aria-hidden="true" className="tw-ignite h-1.5 w-1.5 rounded-full bg-gold-400" />
                    {s.pill}
                  </span>
                )}
                <h1 className="mt-6 font-display text-6xl font-black leading-[0.92] text-balance [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-7xl">
                  {s.lead}
                  <span className="mt-1 block font-medium italic text-gold-400">{s.accent}</span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-navy-50/85">{s.body}</p>
                <div className="mt-9 flex flex-wrap gap-3">
                  {s.ctas.map((c) =>
                    c.href.startsWith("#") ? (
                      <a key={c.label} href={c.href} className={ctaCls(c)}>
                        {c.label}
                        {c.arrow && <span aria-hidden="true"> →</span>}
                      </a>
                    ) : (
                      <Link key={c.label} href={c.href} className={ctaCls(c)}>
                        {c.label}
                        {c.arrow && <span aria-hidden="true"> →</span>}
                      </Link>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Screen-reader announcement */}
      <div aria-live="polite" className="sr-only">
        {`Slide ${active + 1} of ${slides.length}: ${slides[active].lead} ${slides[active].accent}`}
      </div>

      {/* Controls: pause/play + segmented progress */}
      <div className="absolute inset-x-0 bottom-7 z-10">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-6">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            aria-label={playing ? "Pause slideshow" : "Play slideshow"}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-navy-50/25 text-navy-50 transition-colors hover:border-gold-400 hover:text-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          >
            {playing ? (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>
          <div className="flex max-w-xs flex-1 items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.key}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}: ${s.lead} ${s.accent}`}
                aria-current={i === active}
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-navy-50/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold-400"
              >
                <span
                  className="block h-full w-0 rounded-full bg-gold-400"
                  style={
                    reduce
                      ? { width: i === active ? "100%" : "0%" }
                      : i === active
                        ? {
                            animation: `tw-progress ${DURATION}ms linear forwards`,
                            animationPlayState: effPaused ? "paused" : "running",
                          }
                        : { width: "0%" }
                  }
                  onAnimationEnd={i === active ? () => go(active + 1) : undefined}
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ctaCls(c: Cta) {
  return c.primary
    ? "inline-flex min-h-12 items-center justify-center rounded-md bg-gold-500 px-6 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
    : "inline-flex min-h-12 items-center justify-center rounded-md border border-navy-50/30 px-6 text-sm font-semibold text-navy-50 transition-colors hover:border-gold-400 hover:text-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400";
}
