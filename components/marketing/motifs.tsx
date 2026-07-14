/*
  Shared visual motifs for the Think-Winners landing, so sections read as one authored
  system rather than stock blocks: film grain for dark cinematic bands, and a network
  "connection" graphic (many communities → one candidate) that carries the movement's thesis.
*/

export function Grain({ opacity = 0.12 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 mix-blend-overlay"
      style={{ opacity }}
    >
      <svg className="h-full w-full">
        <filter id="tw-grain-shared">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.85"
            numOctaves="2"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#tw-grain-shared)" />
      </svg>
    </div>
  );
}

// Many community nodes on the left, converging through the network to one candidate node.
const COMMUNITY = [
  { x: 30, y: 34 },
  { x: 64, y: 20 },
  { x: 22, y: 78 },
  { x: 78, y: 66 },
  { x: 40, y: 116 },
  { x: 88, y: 110 },
  { x: 26, y: 150 },
  { x: 66, y: 158 },
  { x: 44, y: 190 },
  { x: 96, y: 176 },
];

export function ConnectionGraphic({ className = "" }: { className?: string }) {
  const target = { x: 360, y: 105 };
  return (
    <svg viewBox="0 0 400 210" fill="none" aria-hidden="true" className={className}>
      {COMMUNITY.map((n) => (
        <line
          key={`l-${n.x}-${n.y}`}
          x1={n.x}
          y1={n.y}
          x2={target.x}
          y2={target.y}
          stroke="#C9A227"
          strokeWidth="1"
          opacity="0.3"
        />
      ))}
      {COMMUNITY.map((n) => (
        <circle key={`c-${n.x}-${n.y}`} cx={n.x} cy={n.y} r="4.5" fill="#0a2a4e" />
      ))}
      <circle cx={target.x} cy={target.y} r="22" fill="#C9A227" opacity="0.16" />
      <circle
        className="tw-ignite"
        cx={target.x}
        cy={target.y}
        r="11"
        fill="#C9A227"
      />
    </svg>
  );
}
