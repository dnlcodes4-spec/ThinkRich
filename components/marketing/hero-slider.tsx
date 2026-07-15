"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Grain } from "./motifs";
import { usePrefersReducedMotion } from "./use-reduced-motion";

const DURATION = 5000;

type Cta = { label: string; href: string; primary?: boolean; arrow?: boolean };
type Slide = {
  key: string;
  image: string;
  alt: string;
  lead: string;
  accent: string;
  body: string;
  ctas: Cta[];
};

const slides: Slide[] = [
  {
    key: "community",
    image: "/thinkrich/img/hero-leaders.jpg",
    alt: "Three young Nigerian professionals standing together",
    lead: "Creating value",
    accent: "for mankind.",
    body: "People who think right, connect right, and build together. Leaders, entrepreneurs, savers, learners, and changemakers creating lasting value.",
    ctas: [
      { label: "Explore the community", href: "#arms", primary: true },
      { label: "Enter Think-Winners", href: "/think-winners", arrow: true },
    ],
  },
  {
    key: "twm",
    image: "/thinkrich/img/hero-movement.jpg",
    alt: "A large Nigerian grassroots crowd gathered at sunset",
    lead: "Thinking Together,",
    accent: "Winning Together.",
    body: "The Think-Winners Movement is mobilizing. An organized grassroots network of 20,000 leaders turning communities into votes. Step into it today.",
    ctas: [
      { label: "Enter the movement", href: "/think-winners", primary: true, arrow: true },
      { label: "See the six arms", href: "#arms" },
    ],
  },
  {
    key: "arms",
    image: "/thinkrich/img/hero-grassroots.jpg",
    alt: "Community members planning together around a table",
    lead: "Six arms.",
    accent: "One purpose.",
    body: "Leadership, cooperative finance, humanitarian service, education, wealth-building, civic mobilization. Pick the arm that matches your purpose, or grow through several.",
    ctas: [{ label: "Explore the arms", href: "#arms", primary: true }],
  },
];

// Ink panel diagonal: content lives on the panel (never on the image, so nothing is cut).
const PANEL = "polygon(0 0, 58% 0, 47% 100%, 0 100%)";
const SEAM = "polygon(0 0, 58.5% 0, 47.5% 100%, 0 100%)";

export function HeroSlider() {
  const [active, setActive] = useState(0);
  // Advance runs continuously; only the explicit Pause/Play button holds it
  // (satisfies WCAG 2.2.2). We deliberately do NOT pause on hover or focus: the
  // hero is full-screen, so cursor-hover or a focused CTA would otherwise freeze
  // it and read as a broken timer.
  const [playing, setPlaying] = useState(true);
  const reduce = usePrefersReducedMotion();
  const touchX = useRef<number | null>(null);
  const effPaused = !playing;

  const go = (n: number) => setActive((n + slides.length) % slides.length);

  return (
    <section
      id="top"
      aria-roledescription="carousel"
      aria-label="ThinkRich Community"
      className="relative h-dvh min-h-[42rem] overflow-hidden bg-ink-950 text-ink-50"
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
            {/* Mobile: left-weighted ink wash for legibility */}
            <div aria-hidden="true" className="absolute inset-0 bg-ink-950/55 lg:hidden" />
            <div
              aria-hidden="true"
              className="absolute inset-0 lg:hidden"
              style={{
                background:
                  "linear-gradient(100deg, rgb(10,10,11) 20%, rgba(10,10,11,0.62) 58%, rgba(10,10,11,0.3) 100%)",
              }}
            />
            {/* Desktop: ink diagonal panel with a green seam */}
            <div aria-hidden="true" className="absolute inset-0 hidden lg:block">
              <div className="absolute inset-0 bg-green-500" style={{ clipPath: SEAM }} />
              <div className="absolute inset-0 bg-ink-950" style={{ clipPath: PANEL }} />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(100deg, transparent 46%, rgba(10,10,11,0.55) 58%, transparent 82%)",
                }}
              />
            </div>
          </div>
        );
      })}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(45% 55% at 6% 22%, rgba(0,151,82,0.14), transparent 60%)" }}
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
                <h1 className="font-display text-6xl font-black leading-[0.92] text-balance [text-shadow:0_2px_30px_rgba(0,0,0,0.45)] sm:text-7xl">
                  {s.lead}
                  <span className="mt-1 block font-medium italic text-green-400">{s.accent}</span>
                </h1>
                <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-50/85">{s.body}</p>
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
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-ink-50/25 text-ink-50 transition-colors hover:border-green-400 hover:text-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
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
                className="group relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-50/25 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-green-400"
              >
                <span
                  // Remount the active fill each advance so its CSS animation
                  // restarts from 0 (a reused node keeps the old timeline —
                  // that's what made the bar appear to start mid-way).
                  key={i === active ? `fill-${active}` : `fill-idle-${i}`}
                  className="block h-full w-0 rounded-full bg-green-400"
                  style={
                    reduce
                      ? { width: i <= active ? "100%" : "0%" }
                      : i < active
                        ? { width: "100%" }
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
    ? "inline-flex min-h-12 items-center justify-center rounded-md bg-green-500 px-6 text-sm font-bold text-ink-950 transition-colors hover:bg-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400"
    : "inline-flex min-h-12 items-center justify-center rounded-md border border-ink-50/30 px-6 text-sm font-semibold text-ink-50 transition-colors hover:border-green-400 hover:text-green-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-400";
}
