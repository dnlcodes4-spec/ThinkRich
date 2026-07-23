import type { ComponentProps } from "react";

// Small inline stroke-icon set for the nav shell. No external icon dependency:
// every glyph is currentColor + 1.75 stroke, so it inherits text colour and
// stays crisp at tab/sidebar sizes. Add a name here, then reference it from nav.
export type IconName =
  | "home"
  | "vote"
  | "profile"
  | "register"
  | "members"
  | "verify"
  | "overview"
  | "team"
  | "access"
  | "candidates"
  | "states"
  | "bell"
  | "inbox"
  | "more"
  | "signout"
  | "chevron";

const paths: Record<IconName, React.ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5M5 9.5V21h14V9.5" />,
  vote: (
    <>
      <path d="m9 12 2 2 4-4" />
      <rect x="3" y="4" width="18" height="16" rx="2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </>
  ),
  register: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 20a6 6 0 0 1 12 0M18 8v6M15 11h6" />
    </>
  ),
  members: (
    <>
      <circle cx="8" cy="8" r="3" />
      <path d="M2 20a6 6 0 0 1 12 0M16 5.5a3 3 0 0 1 0 5.8M22 20a6 6 0 0 0-4-5.6" />
    </>
  ),
  verify: (
    <>
      <path d="M12 3 4 6v6c0 5 3.5 7.5 8 9 4.5-1.5 8-4 8-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  overview: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  team: (
    <>
      <circle cx="12" cy="6" r="2.5" />
      <circle cx="5.5" cy="16" r="2.5" />
      <circle cx="18.5" cy="16" r="2.5" />
      <path d="M12 8.5v3M7.5 14.5 10 12M16.5 14.5 14 12" />
    </>
  ),
  access: (
    <>
      <rect x="3" y="4" width="14" height="16" rx="2" />
      <path d="M17 12h5M19.5 9.5 22 12l-2.5 2.5" />
    </>
  ),
  candidates: (
    <>
      <circle cx="12" cy="7" r="3.5" />
      <path d="M6 20a6 6 0 0 1 12 0M12 20v-3" />
    </>
  ),
  states: (
    <>
      <circle cx="12" cy="10" r="3" />
      <path d="M12 21c4-4.5 7-7.3 7-11a7 7 0 1 0-14 0c0 3.7 3 6.5 7 11Z" />
    </>
  ),
  bell: <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 0 0 4 0" />,
  inbox: (
    <>
      <path d="M3 13h4l1.5 2.5h7L17 13h4" />
      <path d="M5.5 5h13l2.5 8v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4z" />
    </>
  ),
  more: (
    <>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </>
  ),
  signout: <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 12H3m0 0 3.5-3.5M3 12l3.5 3.5" />,
  chevron: <path d="m6 9 6 6 6-6" />,
};

export function Icon({
  name,
  className = "size-5",
  ...props
}: { name: IconName } & ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
