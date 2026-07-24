"use client";

import { useState } from "react";
import { MAP_HEIGHT, MAP_WIDTH, NIGERIA_STATES } from "@/lib/geo/nigeria-states";

export type StateDatum = {
  name: string;
  members: number;
  leaders: number;
  active: boolean;
};

// Navy is the Think-Winners half of the brand, used here to keep the map
// distinct from the green ThinkRich accent that carries actions elsewhere.
// Fills are data-driven, so they are applied as inline styles (hex from the navy
// scale) rather than Tailwind classes, which the JIT cannot see through a runtime
// lookup. Five steps, because more than that stops being readable at a glance.
const ZERO_FILL = "#eaeef2"; // faint navy tint: a 0-member state still reads on white
const BUCKETS = ["#c3ccd6", "#8999aa", "#2c4867", "#123a63", "#071c33"];

const SELECTED_STROKE = "#0a2a4e"; // navy-700, the picked-state outline

/** Quantile-ish buckets off the observed maximum, so the scale adapts to real data. */
function bucketOf(count: number, max: number): number {
  if (count <= 0) return -1;
  if (max <= 0) return 0;
  const ratio = count / max;
  if (ratio > 0.75) return 4;
  if (ratio > 0.5) return 3;
  if (ratio > 0.25) return 2;
  if (ratio > 0.1) return 1;
  return 0;
}

export function NigeriaMap({ data }: { data: StateDatum[] }) {
  const byName = new Map(data.map((d) => [d.name, d]));
  const max = Math.max(0, ...data.map((d) => d.members));
  const [selected, setSelected] = useState<string | null>(null);

  const current = selected ? byName.get(selected) : undefined;
  const totalMembers = data.reduce((n, d) => n + d.members, 0);
  const activeStates = data.filter((d) => d.active).length;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_15rem]">
      <div className="rounded-card border border-border bg-surface p-3">
        <svg
          viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Map of Nigeria showing members by state. ${totalMembers} members across ${activeStates} active states.`}
        >
          {NIGERIA_STATES.map((s) => {
            const d = byName.get(s.name);
            const count = d?.members ?? 0;
            const b = bucketOf(count, max);
            const isSelected = selected === s.name;
            return (
              <path
                key={s.name}
                d={s.d}
                tabIndex={0}
                role="button"
                aria-label={`${s.name}: ${count} member${count === 1 ? "" : "s"}`}
                aria-pressed={isSelected}
                onClick={() => setSelected(isSelected ? null : s.name)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(isSelected ? null : s.name);
                  }
                }}
                style={{
                  fill: b < 0 ? ZERO_FILL : BUCKETS[b],
                  stroke: isSelected ? SELECTED_STROKE : "#ffffff",
                  strokeWidth: isSelected ? 2.5 : 0.75,
                }}
                className="cursor-pointer outline-none transition-[fill] hover:brightness-110 focus-visible:brightness-110"
              >
                <title>{`${s.name}: ${count} member${count === 1 ? "" : "s"}`}</title>
              </path>
            );
          })}
        </svg>

        <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
          <span className="mr-1 text-xs text-muted">Members</span>
          <span className="flex items-center gap-1">
            <span className="size-3 rounded-xs ring-1 ring-border" style={{ background: ZERO_FILL }} />
            <span className="text-xs text-muted">0</span>
          </span>
          {BUCKETS.map((c, i) => (
            <span key={c} className="flex items-center gap-1">
              <span className="size-3 rounded-xs" style={{ background: c }} />
              {i === BUCKETS.length - 1 ? (
                <span className="text-xs text-muted">{max}</span>
              ) : null}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-card border border-border bg-surface p-4">
        {current ? (
          <>
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              {current.name}
            </p>
            <p className="mt-0.5 text-xs text-muted">
              {current.active ? "Active" : "Not activated"}
            </p>
            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <dt className="text-xs text-muted">Members</dt>
                <dd className="font-display text-2xl font-semibold text-foreground">
                  {current.members}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Leaders</dt>
                <dd className="font-display text-2xl font-semibold text-foreground">
                  {current.leaders}
                </dd>
              </div>
            </dl>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-4 text-xs font-semibold text-primary underline-offset-4 hover:underline"
            >
              Clear selection
            </button>
          </>
        ) : (
          <>
            <p className="font-display text-lg font-semibold tracking-tight text-foreground">
              Nationwide
            </p>
            <dl className="mt-4 flex flex-col gap-3">
              <div>
                <dt className="text-xs text-muted">Members</dt>
                <dd className="font-display text-2xl font-semibold text-foreground">
                  {totalMembers}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Active states</dt>
                <dd className="font-display text-2xl font-semibold text-foreground">
                  {activeStates} <span className="text-sm font-normal text-muted">of 37</span>
                </dd>
              </div>
            </dl>
            <p className="mt-4 text-xs text-muted">
              Select a state to see its numbers.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
