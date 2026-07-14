"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArmMark } from "./arm-mark";
import { usePrefersReducedMotion } from "./use-reduced-motion";
import {
  IconGrowth,
  IconHub,
  IconCommunity,
  IconEducation,
  IconCycle,
  IconNetwork,
} from "./icons";

export type Arm = {
  key: string;
  abbr: string;
  name: string;
  focus: string;
  motto: string;
  blurb: string;
  mission: string;
  vision: string;
  highlights: string[];
  href?: string;
  live?: boolean;
};

// A domain glyph per arm (client-side; can't cross the server→client boundary as a prop).
const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  concept: IconGrowth,
  mcps: IconHub,
  thinkhelp: IconCommunity,
  academy: IconEducation,
  mclub: IconCycle,
  twm: IconNetwork,
};

export function ArmsExplorer({ arms }: { arms: Arm[] }) {
  const [active, setActive] = useState(0);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const interacted = useRef(false);
  const fromUrl = useRef(false);
  const reduce = usePrefersReducedMotion();

  // Deep-link: read the selected arm from ?arm= on mount (deferred a frame so the
  // initial render matches SSR — no hydration mismatch).
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const key = new URLSearchParams(window.location.search).get("arm");
      const idx = arms.findIndex((a) => a.key === key);
      if (idx >= 0) {
        fromUrl.current = true;
        if (idx > 0) setActive(idx);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [arms]);

  // Deep-link: reflect the choice in the URL — only after a real user interaction.
  useEffect(() => {
    if (!interacted.current) return;
    const url = new URL(window.location.href);
    url.searchParams.set("arm", arms[active].key);
    history.replaceState(null, "", url);
  }, [active, arms]);

  // Gentle "this is interactive" hint: one subtle self-advance on first scroll-in.
  useEffect(() => {
    if (reduce) return;
    const el = rootRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          io.disconnect();
          t = setTimeout(() => {
            if (!interacted.current && !fromUrl.current) setActive(1);
          }, 1500);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(t);
    };
  }, [reduce]);

  function select(i: number) {
    interacted.current = true;
    setActive(i);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const last = arms.length - 1;
    let next: number | null = null;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = active === 0 ? last : active - 1;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = last;
    if (next !== null) {
      e.preventDefault();
      select(next);
      tabs.current[next]?.focus();
    }
  }

  return (
    <div ref={rootRef}>
      {/* ── Desktop: index + cross-fading detail ── */}
      <div className="hidden lg:grid lg:grid-cols-[22rem_1fr] lg:gap-10">
        <div
          role="tablist"
          aria-orientation="vertical"
          aria-label="ThinkRich arms"
          onKeyDown={onKeyDown}
          className="flex flex-col gap-1.5"
        >
          {arms.map((a, i) => {
            const on = i === active;
            return (
              <button
                key={a.key}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                role="tab"
                id={`arm-tab-${i}`}
                aria-selected={on}
                aria-controls="arm-panel"
                tabIndex={on ? 0 : -1}
                onClick={() => select(i)}
                className={`group relative flex items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all ${
                  on
                    ? "bg-white shadow-sm ring-1 ring-navy-100"
                    : "hover:bg-white/70 focus-visible:bg-white/70"
                } focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400`}
              >
                {on && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 top-1/2 h-8 w-1 -translate-y-1/2 rounded-r-full bg-gold-500"
                  />
                )}
                <ArmMark abbr={a.abbr} className="w-11 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold leading-tight text-navy-950">
                    {a.name}
                  </span>
                  <span className="mt-0.5 block truncate text-sm text-navy-500">{a.focus}</span>
                </span>
                {a.live ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-gold-700">
                    <span aria-hidden="true" className="tw-ignite h-2 w-2 rounded-full bg-gold-500" />
                    Live
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-navy-300 transition-transform ${on ? "translate-x-0.5 text-gold-500" : ""}`}
                  >
                    →
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div role="tabpanel" id="arm-panel" aria-labelledby={`arm-tab-${active}`} className="lg:min-h-136">
          <ArmDetail key={arms[active].key} arm={arms[active]} />
        </div>
      </div>

      {/* ── Mobile: accordion ── */}
      <div className="flex flex-col gap-3 lg:hidden">
        {arms.map((a, i) => {
          const on = i === active;
          return (
            <div key={a.key} className="overflow-hidden rounded-2xl border border-navy-100 bg-white">
              <button
                onClick={() => {
                  interacted.current = true;
                  setActive(on ? -1 : i);
                }}
                aria-expanded={on}
                className="flex w-full items-center gap-3.5 p-4 text-left"
              >
                <ArmMark abbr={a.abbr} className="w-12 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-lg font-semibold leading-tight text-navy-950">
                    {a.name}
                  </span>
                  <span className="mt-0.5 block font-display text-base italic text-navy-700">
                    {a.motto}
                  </span>
                </span>
                {a.live ? (
                  <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-gold-700">
                    <span aria-hidden="true" className="h-2 w-2 rounded-full bg-gold-500" />
                    Live
                  </span>
                ) : (
                  <span
                    aria-hidden="true"
                    className={`shrink-0 text-navy-400 transition-transform ${on ? "rotate-180" : ""}`}
                  >
                    ⌄
                  </span>
                )}
              </button>
              {on && (
                <div className="tw-rise border-t border-navy-100 p-5">
                  <ArmBody arm={a} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ArmDetail({ arm }: { arm: Arm }) {
  const Icon = ICONS[arm.key];
  return (
    <div className="tw-rise overflow-hidden rounded-3xl border border-navy-100 bg-white shadow-sm">
      {/* Accent header */}
      <div className="relative overflow-hidden bg-navy-950 px-8 py-9 text-navy-50 sm:px-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(60% 90% at 88% 10%, rgba(201,162,39,0.2), transparent 60%), radial-gradient(50% 80% at 0% 100%, rgba(10,42,78,0.9), transparent 60%)",
          }}
        />
        {Icon && (
          <Icon className="pointer-events-none absolute -right-6 -top-8 h-44 w-44 text-gold-400/10" />
        )}
        <div className="relative flex items-center gap-4">
          <ArmMark abbr={arm.abbr} className="w-14 shrink-0 ring-1 ring-gold-400/30" />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-semibold text-navy-50">{arm.name}</p>
            <p className="text-sm text-navy-50/60">{arm.focus}</p>
          </div>
          {arm.live && (
            <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-gold-400/15 px-3 py-1 text-xs font-semibold text-gold-300">
              <span aria-hidden="true" className="tw-ignite h-1.5 w-1.5 rounded-full bg-gold-400" />
              Live now
            </span>
          )}
        </div>
        <p className="relative mt-6 font-display text-4xl font-medium italic leading-[1.05] text-gold-400 sm:text-5xl">
          {arm.motto}
        </p>
      </div>
      {/* Body */}
      <div className="px-8 py-9 sm:px-10">
        <ArmBody arm={arm} />
      </div>
    </div>
  );
}

function ArmBody({ arm }: { arm: Arm }) {
  return (
    <>
      <p className="text-lg leading-relaxed text-navy-800">{arm.blurb}</p>

      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <div>
          <p className="font-display text-base font-semibold text-gold-700">Mission</p>
          <p className="mt-1.5 leading-relaxed text-navy-800">{arm.mission}</p>
        </div>
        <div>
          <p className="font-display text-base font-semibold text-gold-700">Vision</p>
          <p className="mt-1.5 leading-relaxed text-navy-800">{arm.vision}</p>
        </div>
      </div>

      <ul className="mt-8 flex flex-wrap gap-2">
        {arm.highlights.map((h) => (
          <li
            key={h}
            className="rounded-full bg-navy-50 px-3.5 py-1.5 text-sm font-medium text-navy-700 ring-1 ring-navy-100"
          >
            {h}
          </li>
        ))}
      </ul>

      <div className="mt-8">
        {arm.live && arm.href ? (
          <Link
            href={arm.href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-gold-500 px-6 text-sm font-bold text-navy-950 transition-colors hover:bg-gold-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-400"
          >
            Enter the movement
            <span aria-hidden="true">→</span>
          </Link>
        ) : (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-navy-500">
            <span aria-hidden="true" className="h-px w-6 bg-navy-300" />
            Opening soon
          </span>
        )}
      </div>
    </>
  );
}
