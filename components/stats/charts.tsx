// Presentational chart primitives for the Statistics page. Server components
// (no client JS): inline SVG / flexbox driven by props, styled with brand
// tokens so they read the same in light and dark. Reveal animations live in
// globals.css (.stats-reveal-x / .stats-rise) and fall back to static under
// prefers-reduced-motion. Data is prepared in the page; these only draw.

const fmtPct = (value: number, total: number) => (total > 0 ? Math.round((value / total) * 100) : 0);

// Round an axis maximum up to a clean 1/2/5 * 10^n so the gridline labels read
// as round numbers instead of the raw data max.
function niceMax(v: number): number {
  const value = Math.max(1, v);
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const r = value / pow;
  const m = r <= 1 ? 1 : r <= 1.5 ? 1.5 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 3 ? 3 : r <= 4 ? 4 : r <= 5 ? 5 : r <= 7 ? 7 : 10;
  return m * pow;
}

/** A tiny trend line + fill for KPI cards. Stretches to the card width. */
export function Sparkline({ data, color, id }: { data: number[]; color: string; id: string }) {
  const w = 132;
  const h = 38;
  const p = 3;
  const peak = Math.max(...data, 0);
  if (!data.length || peak === 0) {
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
        <line x1={p} y1={h - p} x2={w - p} y2={h - p} style={{ stroke: "var(--color-border)", strokeWidth: 1 }} />
      </svg>
    );
  }
  const min = Math.min(...data);
  const n = data.length;
  const x = (i: number) => p + (n === 1 ? (w - 2 * p) / 2 : (i / (n - 1)) * (w - 2 * p));
  const y = (v: number) => h - p - ((v - min) / (peak - min || 1)) * (h - 2 * p);
  const pts = data.map((v, i) => `${x(i)},${y(v)}`);
  const area = `M ${x(0)},${h - p} ${pts.map((pt) => `L ${pt}`).join(" ")} L ${x(n - 1)},${h - p} Z`;
  const line = `M ${pts.join(" L ")}`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#spark-${id})`} />
      <path d={line} fill="none" style={{ stroke: color, strokeWidth: 1.75, strokeLinejoin: "round", strokeLinecap: "round", vectorEffect: "non-scaling-stroke" }} />
      <circle cx={x(n - 1)} cy={y(data[n - 1])} r={2.5} style={{ fill: color }} />
    </svg>
  );
}

/** A slim proportion meter for KPI cards (value against a max) + a caption. */
export function MiniMeter({ value, max, color, caption }: { value: number; max: number; color: string; caption: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--color-surface-muted)" }}>
        <div className="stats-reveal-x h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <p className="mt-1.5 text-[11px] text-muted">{caption}</p>
    </div>
  );
}

/**
 * Growth: the movement's size over time as a filled area under a rising line,
 * with a labelled y-axis so the scale is legible and the latest total called out
 * at the line's end. Reveals left-to-right, as the movement builds.
 */
export function GrowthChart({
  weeks,
  priorTotal,
}: {
  weeks: { label: string; count: number }[];
  priorTotal: number;
}) {
  const W = 680;
  const H = 228;
  const padL = 34;
  const padR = 20;
  const padT = 22;
  const padB = 30;
  const n = weeks.length;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const joined = weeks.reduce((s, w) => s + w.count, 0);
  const cum = weeks.map((_, i) => weeks.slice(0, i + 1).reduce((s, w) => s + w.count, priorTotal));
  const total = cum[n - 1] ?? priorTotal;

  if (total === 0) {
    return (
      <div className="mt-4 flex h-48 items-center justify-center rounded-card border border-dashed border-border">
        <p className="text-sm text-muted">No registrations yet. The chart fills in as people join.</p>
      </div>
    );
  }

  const yMax = niceMax(Math.max(...cum));
  const baseY = padT + plotH;
  const xMid = (i: number) => padL + (n === 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const yCum = (c: number) => baseY - (c / yMax) * plotH;

  const linePts = cum.map((c, i) => `${xMid(i)},${yCum(c)}`);
  const areaPath = `M ${xMid(0)},${baseY} ${linePts.map((p) => `L ${p}`).join(" ")} L ${xMid(n - 1)},${baseY} Z`;
  const linePath = `M ${linePts.join(" L ")}`;

  const gridVals = [0, yMax / 2, yMax];
  const xTicks = [0, Math.round((n - 1) / 3), Math.round((2 * (n - 1)) / 3), n - 1].filter((v, i, a) => a.indexOf(v) === i);
  const endX = xMid(n - 1);
  const endY = yCum(total);

  return (
    <figure className="mt-4">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`${total} people in the movement; ${joined} joined over the last ${n} weeks.`}
      >
        <defs>
          <linearGradient id="stats-growth-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-navy-600)" stopOpacity="0.42" />
            <stop offset="78%" stopColor="var(--color-navy-600)" stopOpacity="0.06" />
            <stop offset="100%" stopColor="var(--color-navy-600)" stopOpacity="0" />
          </linearGradient>
          <mask id="stats-growth-mask">
            <rect x="0" y="0" width={W} height={H} fill="#fff" className="stats-reveal-x" />
          </mask>
        </defs>

        {/* y grid + labels (static, so scale is present immediately) */}
        {gridVals.map((v) => {
          const gy = yCum(v);
          return (
            <g key={v}>
              <line x1={padL} y1={gy} x2={W - padR} y2={gy} style={{ stroke: "var(--color-border)", strokeOpacity: v === 0 ? 0.9 : 0.5, strokeWidth: 1 }} />
              <text x={padL - 8} y={gy + 3.5} textAnchor="end" style={{ fill: "var(--color-muted)", fontSize: 10.5 }}>
                {Math.round(v)}
              </text>
            </g>
          );
        })}

        <g mask="url(#stats-growth-mask)">
          <path d={areaPath} fill="url(#stats-growth-fill)" />
          <path
            d={linePath}
            fill="none"
            style={{ stroke: "var(--color-navy-700)", strokeWidth: 2.5, strokeLinejoin: "round", strokeLinecap: "round" }}
          />
          {cum.map((c, i) => (
            <circle key={i} cx={xMid(i)} cy={yCum(c)} r={2.25} style={{ fill: "var(--color-navy-700)" }} />
          ))}
          <circle cx={endX} cy={endY} r={5} style={{ fill: "var(--color-gold-600)", stroke: "var(--color-surface)", strokeWidth: 2 }} />
        </g>

        {/* endpoint total, drawn over everything and never wiped */}
        <text x={endX} y={Math.max(padT - 4, endY - 12)} textAnchor="end" style={{ fill: "var(--color-foreground)", fontSize: 16, fontWeight: 700 }}>
          {total.toLocaleString()}
        </text>

        {xTicks.map((i) => (
          <text
            key={`x-${i}`}
            x={xMid(i)}
            y={H - 9}
            textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}
            style={{ fill: "var(--color-muted)", fontSize: 11 }}
          >
            {weeks[i].label}
          </text>
        ))}
      </svg>
      <figcaption className="mt-2 text-xs text-muted">
        <span className="tabular-nums font-medium text-foreground">{joined.toLocaleString()}</span> joined in the last {n} weeks
      </figcaption>
    </figure>
  );
}

/**
 * Movement makeup as a tier ladder: one row per tier, senior at the top down to
 * the grassroots, each with its own bar (gold = owner, navy = the admin
 * hierarchy, green = leaders and voters). Full labels, no truncation.
 */
export function TierLadder({
  rows,
  emptyLabel = "No one registered yet.",
}: {
  rows: { label: string; value: number; color: string }[];
  emptyLabel?: string;
}) {
  const shown = rows.filter((r) => r.value > 0);
  const total = shown.reduce((s, r) => s + r.value, 0);
  const max = Math.max(1, ...rows.map((r) => r.value));

  if (total === 0) return <p className="mt-4 text-sm text-muted">{emptyLabel}</p>;

  return (
    <ul className="mt-4 flex flex-col gap-2.5">
      {shown.map((r, i) => (
        <li key={r.label} className="grid grid-cols-[7rem_1fr_auto] items-center gap-3 text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="truncate text-foreground">{r.label}</span>
          </span>
          <span className="h-2.5 rounded-full" style={{ background: "var(--color-surface-muted)" }}>
            <span
              className="stats-reveal-x block h-full rounded-full"
              style={{ width: `max(5px, ${(r.value / max) * 100}%)`, background: r.color, animationDelay: `${Math.min(i * 45, 400)}ms` }}
            />
          </span>
          <span className="flex items-baseline justify-end gap-1.5">
            <span className="tabular-nums font-semibold text-foreground">{r.value}</span>
            <span className="w-8 text-right text-[10px] tabular-nums text-muted">{fmtPct(r.value, total)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Ranked horizontal bars (biggest first), gradient-filled, with count + share. */
export function DistributionBars({ items }: { items: { name: string; count: number }[] }) {
  const total = items.reduce((s, i) => s + i.count, 0);
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ul className="mt-4 flex flex-col gap-3">
      {items.map((b, i) => (
        <li key={b.name} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_auto]">
          <span className="truncate text-foreground">{b.name}</span>
          <span className="h-2.5 rounded-full" style={{ background: "var(--color-surface-muted)" }}>
            <span
              className="stats-reveal-x block h-full rounded-full"
              style={{
                width: `${(b.count / max) * 100}%`,
                background: "linear-gradient(90deg, var(--color-navy-500), var(--color-navy-700))",
                animationDelay: `${Math.min(i * 45, 400)}ms`,
              }}
            />
          </span>
          <span className="flex items-baseline justify-end gap-1.5">
            <span className="tabular-nums font-semibold text-foreground">{b.count}</span>
            <span className="w-8 text-right text-[10px] tabular-nums text-muted">{fmtPct(b.count, total)}%</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** A proportion spine + legend for two/three short-labelled categories. */
export function SegmentedBar({
  segments,
  emptyLabel = "No data yet.",
}: {
  segments: { label: string; value: number; color: string }[];
  emptyLabel?: string;
}) {
  const shown = segments.filter((s) => s.value > 0);
  const total = shown.reduce((s, x) => s + x.value, 0);

  if (total === 0) {
    return (
      <div className="mt-3">
        <div className="h-4 w-full rounded-full bg-surface-muted" />
        <p className="mt-3 text-sm text-muted">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <div className="mt-3">
      <div
        className="stats-reveal-x flex h-4 w-full gap-px overflow-hidden rounded-full"
        style={{ background: "var(--color-border)" }}
        role="img"
        aria-label={shown.map((s) => `${s.label}: ${s.value}`).join(", ")}
      >
        {shown.map((s) => (
          <span key={s.label} style={{ width: `${(s.value / total) * 100}%`, background: s.color }} title={`${s.label}: ${s.value} (${fmtPct(s.value, total)}%)`} />
        ))}
      </div>
      <ul className="mt-3.5 flex flex-col gap-2">
        {shown.map((s, i) => (
          <li key={s.label} className="stats-rise flex items-center gap-2 text-xs" style={{ animationDelay: `${Math.min(i * 45, 400)}ms` }}>
            <span className="size-2.5 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="text-muted">{s.label}</span>
            <span className="ml-auto flex items-baseline gap-1.5">
              <span className="tabular-nums font-semibold text-foreground">{s.value}</span>
              <span className="tabular-nums text-[10px] text-muted">{fmtPct(s.value, total)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
