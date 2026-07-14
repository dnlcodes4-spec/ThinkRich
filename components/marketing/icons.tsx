import type { SVGProps } from "react";

// Custom line icons for the Think-Winners surface. Consistent 24px grid,
// currentColor stroke, round joins — crafted for the subject (network,
// mobilization, community), not pulled from a generic icon library.
type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

// One node branching to many — the movement's core idea.
export const IconNetwork = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="5" r="2.2" />
    <circle cx="5" cy="19" r="2.2" />
    <circle cx="19" cy="19" r="2.2" />
    <path d="M12 7.2v3.3m0 0-5.2 6.1m5.2-6.1 5.2 6.1" />
  </Base>
);

export const IconMegaphone = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 10v4a1 1 0 0 0 1 1h2l6 4V5L7 9H5a1 1 0 0 0-1 1Z" />
    <path d="M17 9a4 4 0 0 1 0 6" />
  </Base>
);

export const IconCommunity = (p: IconProps) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.5a3 3 0 0 1 0 5.8" />
    <path d="M18 13.4A5.5 5.5 0 0 1 20.5 18" />
  </Base>
);

export const IconHub = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="2.6" />
    <path d="M12 3v3.4M12 17.6V21M3 12h3.4M17.6 12H21M6 6l2.4 2.4M15.6 15.6 18 18M18 6l-2.4 2.4M8.4 15.6 6 18" />
  </Base>
);

export const IconGrowth = (p: IconProps) => (
  <Base {...p}>
    <path d="M4 20V13M9.5 20V9M15 20V14M20 20V5" />
    <path d="M3 9l5-4 4 2.5L21 3" />
    <path d="M21 3v4M21 3h-4" />
  </Base>
);

export const IconFeedback = (p: IconProps) => (
  <Base {...p}>
    <path d="M20 11.5A8 8 0 0 0 6 6.2L4 8" />
    <path d="M4 4v4h4" />
    <path d="M4 12.5A8 8 0 0 0 18 17.8L20 16" />
    <path d="M20 20v-4h-4" />
  </Base>
);

export const IconEducation = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 7 3 5v12l9 2 9-2V5l-9 2Z" />
    <path d="M12 7v12" />
  </Base>
);

export const IconShield = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 3 5 5.6v5.2c0 4.6 3.1 7.6 7 8.9 3.9-1.3 7-4.3 7-8.9V5.6L12 3Z" />
    <path d="m9 11.5 2 2 4-4" />
  </Base>
);

export const IconEye = (p: IconProps) => (
  <Base {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.4" />
  </Base>
);

export const IconPin = (p: IconProps) => (
  <Base {...p}>
    <path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10Z" />
    <circle cx="12" cy="11" r="2.2" />
  </Base>
);

export const IconSignal = (p: IconProps) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="1.6" />
    <path d="M8.3 8.3a5.2 5.2 0 0 0 0 7.4M15.7 8.3a5.2 5.2 0 0 1 0 7.4" />
    <path d="M5.5 5.5a9.2 9.2 0 0 0 0 13M18.5 5.5a9.2 9.2 0 0 1 0 13" />
  </Base>
);

export const IconCycle = (p: IconProps) => (
  <Base {...p}>
    <rect x="4" y="5" width="16" height="16" rx="2" />
    <path d="M4 10h16M8 3v4M16 3v4" />
    <path d="m9.5 15 1.8 1.8L15 13" />
  </Base>
);

// One origin fanning out into a spreading network — the "communication network
// across every community" made visual. Lines use currentColor; nodes carry brand fills.
export const NetworkGraphic = (p: IconProps) => (
  <svg viewBox="0 0 440 200" fill="none" aria-hidden="true" {...p}>
    <g stroke="currentColor" strokeWidth="1.5" opacity="0.55">
      <path d="M46 100 180 50M46 100 180 100M46 100 180 150" />
      <path d="M180 50 360 30M180 50 360 68" />
      <path d="M180 100 362 100M180 100 360 132" />
      <path d="M180 150 360 170M180 150 302 152" />
    </g>
    <g fill="currentColor" opacity="0.85">
      <circle cx="360" cy="30" r="4" />
      <circle cx="360" cy="68" r="4" />
      <circle cx="362" cy="100" r="4" />
      <circle cx="360" cy="132" r="4" />
      <circle cx="360" cy="170" r="4" />
      <circle cx="302" cy="152" r="4" />
    </g>
    <g className="fill-gold-400">
      <circle cx="180" cy="50" r="6" />
      <circle cx="180" cy="100" r="6" />
      <circle cx="180" cy="150" r="6" />
    </g>
    <circle cx="46" cy="100" r="12" className="fill-gold-500" />
    <circle cx="46" cy="100" r="4" className="fill-green-950" />
  </svg>
);

// Ascending mark — the logo's rising-arrow spirit; used as the brand glyph.
export const BrandMark = (p: IconProps) => (
  <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...p}>
    <rect x="1" y="1" width="30" height="30" rx="9" className="fill-green-700" />
    <path
      d="M7 21.5 13.5 15l3.5 3.5L25 10"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M25 10h-4.5M25 10v4.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
