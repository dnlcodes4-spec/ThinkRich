"use client";

import { useEffect, useRef, useState } from "react";
import { MAP_HEIGHT, MAP_WIDTH, NIGERIA_STATES } from "@/lib/geo/nigeria-states";

export type StateDatum = {
  name: string;
  members: number;
  leaders: number;
  active: boolean;
};

// The map gets its own dark navy world (the Think-Winners half of the brand) so
// it reads as a distinct hero on the otherwise light, green dashboard. Fills are
// data-driven and applied inline (Tailwind's JIT can't see a runtime lookup).
const MAP_BG = "#0b1f38";
const CARD_BORDER = "#1c3a5e";
const PANEL_BG = "#12294a";
const STATE_BORDER = "#0b1f38"; // same as ground: states separate by hairline gaps
const ZERO_FILL = "#1d3b5a"; // an empty state still reads on the dark ground
// Sequential brightening blue: more members reads as brighter, not just darker.
const BUCKETS = ["#2f6aa6", "#4489cf", "#63a8ea", "#8ec7f6", "#c2e2ff"];
const GOLD = "#f4c95d"; // hover + selection: pops on navy, never fades to the edge
const ACTIVE_BORDER = "#4bbf87"; // green = a state that is active (open for registration)
const TEXT = "#eaf1f8";
const MUTED = "#9fb6cf";

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

function fillFor(count: number, max: number) {
  const b = bucketOf(count, max);
  return b < 0 ? ZERO_FILL : BUCKETS[b];
}

function ExpandIcon({ open }: { open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="size-4" aria-hidden="true">
      {open ? (
        <path d="M9 4H5a1 1 0 0 0-1 1v4M15 4h4a1 1 0 0 1 1 1v4M9 20H5a1 1 0 0 1-1-1v-4M15 20h4a1 1 0 0 0 1-1v-4" />
      ) : (
        <path d="M4 9V5a1 1 0 0 1 1-1h4M20 9V5a1 1 0 0 0-1-1h-4M4 15v4a1 1 0 0 0 1 1h4M20 15v4a1 1 0 0 1-1 1h-4" />
      )}
    </svg>
  );
}

function TapIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className="size-4 shrink-0" aria-hidden="true">
      <path d="M9 11V6a2 2 0 1 1 4 0v5" />
      <path d="M13 11V9a2 2 0 1 1 4 0v5a6 6 0 0 1-6 6h-1a6 6 0 0 1-5.2-3l-1.6-2.8a1.6 1.6 0 0 1 2.7-1.6L7 15" />
    </svg>
  );
}

export function NigeriaMap({ data }: { data: StateDatum[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);

  // Escape leaves fullscreen; lock body scroll while the overlay is up.
  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);

  const board = (
    <MapBoard
      data={data}
      selected={selected}
      setSelected={setSelected}
      fullscreen={fullscreen}
      onToggleFullscreen={() => setFullscreen((v) => !v)}
    />
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 overflow-auto p-3 sm:p-6" style={{ background: MAP_BG }}>
        {board}
      </div>
    );
  }
  return board;
}

function MapBoard({
  data,
  selected,
  setSelected,
  fullscreen,
  onToggleFullscreen,
}: {
  data: StateDatum[];
  selected: string | null;
  setSelected: (v: string | null) => void;
  fullscreen: boolean;
  onToggleFullscreen: () => void;
}) {
  const byName = new Map(data.map((d) => [d.name, d]));
  const max = Math.max(0, ...data.map((d) => d.members));
  const totalMembers = data.reduce((n, d) => n + d.members, 0);
  const activeStates = data.filter((d) => d.active).length;

  const wrapRef = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<{ x: number; y: number; name: string; members: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const current = selected ? byName.get(selected) : undefined;

  const showTip = (name: string, e: React.MouseEvent) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTip({ x: e.clientX - rect.left, y: e.clientY - rect.top, name, members: byName.get(name)?.members ?? 0 });
    setHovered(name);
  };
  const clearTip = () => {
    setTip(null);
    setHovered(null);
  };

  // Selected first, then hovered (if different), drawn on top so their gold
  // outline is never clipped by a neighbour painted afterwards.
  const outlined = [selected, hovered !== selected ? hovered : null].filter(Boolean) as string[];

  return (
    <div
      className="relative flex flex-col overflow-hidden rounded-card border shadow-sm"
      style={{ background: MAP_BG, borderColor: CARD_BORDER, color: TEXT, height: fullscreen ? "100%" : undefined }}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <p className="flex items-center gap-2 text-sm font-medium" style={{ color: MUTED }}>
          <TapIcon />
          {current ? "Showing one state. Tap it again to clear." : "Tap a state to see its numbers."}
        </p>
        <button
          type="button"
          onClick={onToggleFullscreen}
          aria-label={fullscreen ? "Exit full screen" : "View full screen"}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{ borderColor: CARD_BORDER, color: TEXT, outlineColor: GOLD }}
        >
          <ExpandIcon open={fullscreen} />
          {fullscreen ? "Close" : "Full screen"}
        </button>
      </div>

      <div className={`grid flex-1 gap-4 p-4 ${fullscreen ? "lg:grid-cols-[1fr_17rem]" : "lg:grid-cols-[1fr_15rem]"}`}>
        <div ref={wrapRef} className="relative min-h-0">
          <svg
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="h-auto w-full"
            style={{ maxHeight: fullscreen ? "82vh" : undefined }}
            role="img"
            aria-label={`Map of Nigeria showing members by state. ${totalMembers} members across ${activeStates} active states. Tap a state for its numbers.`}
          >
            {NIGERIA_STATES.map((s) => {
              const count = byName.get(s.name)?.members ?? 0;
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
                  onMouseMove={(e) => showTip(s.name, e)}
                  onMouseLeave={clearTip}
                  onFocus={() => setHovered(s.name)}
                  onBlur={() => setHovered((h) => (h === s.name ? null : h))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(isSelected ? null : s.name);
                    }
                  }}
                  style={{ fill: fillFor(count, max), stroke: STATE_BORDER, strokeWidth: 0.75, cursor: "pointer" }}
                  className="outline-none transition-[fill] hover:brightness-110 focus-visible:brightness-110"
                >
                  <title>{`${s.name}: ${count} member${count === 1 ? "" : "s"}`}</title>
                </path>
              );
            })}

            {/* Active states get a persistent green outline (open for
                registration), drawn over the fills so shared edges stay crisp. */}
            {NIGERIA_STATES.map((s) => {
              if (!byName.get(s.name)?.active) return null;
              return (
                <path
                  key={`active-${s.name}`}
                  d={s.d}
                  style={{ fill: "none", stroke: ACTIVE_BORDER, strokeWidth: 1.5, pointerEvents: "none" }}
                />
              );
            })}

            {/* Presence markers: any state with members OR leaders gets a dot,
                so leader-only states (which have no member-count fill) still read
                as active. Non-interactive; the state path underneath takes taps. */}
            {NIGERIA_STATES.map((s) => {
              const d = byName.get(s.name);
              if (!d || (d.members <= 0 && d.leaders <= 0)) return null;
              return (
                <circle
                  key={`dot-${s.name}`}
                  cx={s.cx}
                  cy={s.cy}
                  r={5}
                  style={{ fill: GOLD, stroke: MAP_BG, strokeWidth: 1.4, pointerEvents: "none" }}
                />
              );
            })}

            {outlined.map((name) => {
              const s = NIGERIA_STATES.find((x) => x.name === name);
              if (!s) return null;
              return (
                <path
                  key={`outline-${name}`}
                  d={s.d}
                  style={{
                    fill: "none",
                    stroke: GOLD,
                    strokeWidth: name === selected ? 3 : 2,
                    pointerEvents: "none",
                  }}
                />
              );
            })}
          </svg>

          {tip ? (
            <div
              className="pointer-events-none absolute z-10 translate-x-[-50%] translate-y-[-130%] whitespace-nowrap rounded-md px-2.5 py-1.5 text-xs font-semibold shadow-lg"
              style={{ left: tip.x, top: tip.y, background: "#0a1830", border: `1px solid ${CARD_BORDER}`, color: TEXT }}
            >
              {tip.name}
              <span className="ml-1.5 font-normal" style={{ color: MUTED }}>
                {tip.members} member{tip.members === 1 ? "" : "s"}
              </span>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-2 px-1">
            <span className="mr-1 text-xs" style={{ color: MUTED }}>Members</span>
            <span className="flex items-center gap-1">
              <span className="size-3 rounded-xs" style={{ background: ZERO_FILL, boxShadow: `inset 0 0 0 1px ${CARD_BORDER}` }} />
              <span className="text-xs" style={{ color: MUTED }}>0</span>
            </span>
            {BUCKETS.map((c, i) => (
              <span key={c} className="flex items-center gap-1">
                <span className="size-3 rounded-xs" style={{ background: c }} />
                {i === BUCKETS.length - 1 ? <span className="text-xs" style={{ color: MUTED }}>{max}</span> : null}
              </span>
            ))}
            <span className="ml-2 flex items-center gap-1.5">
              <span className="inline-block size-3 rounded-xs" style={{ boxShadow: `inset 0 0 0 1.5px ${ACTIVE_BORDER}` }} />
              <span className="text-xs" style={{ color: MUTED }}>active state</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2.5 rounded-full" style={{ background: GOLD, boxShadow: `0 0 0 1px ${MAP_BG}` }} />
              <span className="text-xs" style={{ color: MUTED }}>has members or leaders</span>
            </span>
          </div>
        </div>

        <div className="rounded-card p-4" style={{ background: PANEL_BG }}>
          {current ? (
            <>
              <p className="font-display text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
                {current.name}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: current.active ? "#7fd4a3" : MUTED }}>
                {current.active ? "Active" : "Not activated"}
              </p>
              <dl className="mt-4 flex flex-col gap-3">
                <Metric label="Members" value={current.members} />
                <Metric label="Leaders" value={current.leaders} />
              </dl>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="mt-4 text-xs font-semibold underline-offset-4 hover:underline"
                style={{ color: GOLD }}
              >
                Clear selection
              </button>
            </>
          ) : (
            <>
              <p className="font-display text-lg font-semibold tracking-tight" style={{ color: TEXT }}>
                Nationwide
              </p>
              <dl className="mt-4 flex flex-col gap-3">
                <Metric label="Members" value={totalMembers} />
                <Metric label="Active states" value={`${activeStates} of 37`} />
              </dl>
              <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: MUTED }}>
                <TapIcon />
                Tap any state on the map.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-xs" style={{ color: MUTED }}>{label}</dt>
      <dd className="font-display text-2xl font-semibold" style={{ color: TEXT }}>{value}</dd>
    </div>
  );
}
