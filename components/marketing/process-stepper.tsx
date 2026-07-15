"use client";

import { useState } from "react";

export type Phase = { title: string; body: string };

// An interactive "journey" through the process. Instead of six stacked
// paragraphs, the screen shows six short steps and one detail at a time:
// scannable, and it invites exploration (UX over a wall of text).
// Styled for a light section (bg-navy-50).
export function ProcessStepper({ phases }: { phases: Phase[] }) {
  const [active, setActive] = useState(0);
  const last = phases.length - 1;

  function onKeyDown(e: React.KeyboardEvent) {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = active === last ? 0 : active + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = active === 0 ? last : active - 1;
    if (next !== null) {
      e.preventDefault();
      setActive(next);
    }
  }

  return (
    <div>
      {/* Desktop: a horizontal path of nodes + one detail card */}
      <div className="hidden md:block">
        <div role="tablist" aria-label="Our process" onKeyDown={onKeyDown} className="flex items-start">
          {phases.map((p, i) => {
            const on = i === active;
            const done = i < active;
            return (
              <div key={p.title} className="flex flex-1 items-center last:flex-none">
                <button
                  role="tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setActive(i)}
                  className="group flex shrink-0 flex-col items-center text-center focus-visible:outline-none"
                >
                  <span
                    className={`grid h-12 w-12 place-items-center rounded-full font-display text-lg font-bold tabular-nums ring-1 transition-all ${
                      on
                        ? "scale-110 bg-gold-500 text-navy-950 ring-gold-400"
                        : done
                          ? "bg-gold-100 text-gold-700 ring-gold-300"
                          : "bg-white text-navy-400 ring-navy-200 group-hover:text-navy-700"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <span
                    className={`mt-3 w-28 text-sm leading-snug transition-colors ${
                      on ? "font-semibold text-navy-950" : "text-navy-500 group-hover:text-navy-800"
                    }`}
                  >
                    {p.title}
                  </span>
                </button>
                {i < last && (
                  <span aria-hidden="true" className="mx-1 mt-6 h-px flex-1 self-start">
                    <span className={`block h-px w-full ${i < active ? "bg-gold-400" : "bg-navy-200"}`} />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div key={active} className="tw-rise mt-10 rounded-2xl border border-navy-200 bg-white p-8 shadow-sm">
          <p className="font-display text-sm font-semibold text-gold-700">
            Step {active + 1} of {phases.length}
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-navy-950">{phases[active].title}</p>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-navy-800">{phases[active].body}</p>
        </div>
      </div>

      {/* Mobile: a compact vertical stepper; tap a step to reveal its detail */}
      <ol className="flex flex-col gap-2.5 md:hidden">
        {phases.map((p, i) => {
          const on = i === active;
          return (
            <li key={p.title} className="overflow-hidden rounded-xl border border-navy-200 bg-white">
              <button
                onClick={() => setActive(on ? -1 : i)}
                aria-expanded={on}
                className="flex w-full items-center gap-4 p-4 text-left"
              >
                <span
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold tabular-nums ring-1 transition-colors ${
                    on ? "bg-gold-500 text-navy-950 ring-gold-400" : "bg-navy-50 text-navy-500 ring-navy-200"
                  }`}
                >
                  {i + 1}
                </span>
                <span className={`flex-1 font-display text-lg font-semibold ${on ? "text-navy-950" : "text-navy-800"}`}>
                  {p.title}
                </span>
              </button>
              {on && <p className="tw-rise border-t border-navy-200 px-4 pb-4 pt-3 text-navy-800">{p.body}</p>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
