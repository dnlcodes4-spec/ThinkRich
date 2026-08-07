import type { IconName } from "./icons";
import type { Role } from "@/lib/terms";

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** Compact label for the mobile bottom bar, where five tabs share ~390px. */
  short?: string;
};

// Navigation destinations per role, in display order. The shell renders these as
// a desktop sidebar and a mobile bottom bar (overflow past 5 goes to a "More"
// sheet). Notifications and the profile/sign-out menu live in the header, so they
// are intentionally NOT listed here. Labels use the plain-language glossary.
//
// This mirrors RLS: a member's list never contains an admin destination. The UI
// hiding is a courtesy, not the control (RLS is the boundary, ADR-0005).
const MEMBER: NavItem[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/vote", label: "Who to vote for", icon: "vote", short: "Vote" },
  { href: "/app/profile", label: "My details", icon: "profile", short: "Details" },
];

const LEADER: NavItem[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/register", label: "Register a voter", icon: "register", short: "Register" },
  { href: "/app/members", label: "My voters", icon: "members", short: "Voters" },
  { href: "/app/kym", label: "Verify a leader", icon: "verify", short: "Verify" },
  { href: "/app/stats", label: "Overview", icon: "overview" },
];

// Coordinator tiers share a base; higher tiers add destinations they can act on.
const COORDINATOR_BASE: NavItem[] = [
  { href: "/app", label: "Home", icon: "home" },
  { href: "/app/members", label: "Registered voters", icon: "members", short: "Voters" },
  { href: "/app/corrections", label: "Correction requests", icon: "inbox", short: "Requests" },
  { href: "/app/stats", label: "Statistics", icon: "overview", short: "Stats" },
  { href: "/app/admin/team", label: "Team", icon: "team" },
  { href: "/app/admin/new-account", label: "Give app access", icon: "access", short: "Access" },
  { href: "/app/kym", label: "Verify a leader", icon: "verify", short: "Verify" },
  // CR-0018: add polling units the INEC seed missed, scoped to the caller's area.
  { href: "/app/geography/add-unit", label: "Add polling unit", icon: "layers", short: "Add unit" },
];

const CANDIDATES: NavItem = {
  href: "/app/admin/candidates",
  label: "Who to vote for",
  icon: "candidates",
  short: "Candidates",
};
const STATES: NavItem = { href: "/app/admin/states", label: "States", icon: "states" };
// Leaders + every coordinator tier may register voters within their scope
// (national anywhere) — CR-0017 item 7.
const REGISTER: NavItem = {
  href: "/app/register",
  label: "Register a voter",
  icon: "register",
  short: "Register",
};
// National only: the platform-wide activity log (RLS restricts reads to them).
const LOGS: NavItem = { href: "/app/logs", label: "Activity", icon: "inbox", short: "Activity" };
// National only: browse the geography data (states / LGAs / wards / polling units).
const GEOGRAPHY: NavItem = { href: "/app/geography", label: "Geography", icon: "layers", short: "Geography" };

export function navForRole(role: Role | string | null | undefined): NavItem[] {
  switch (role) {
    case "member":
      return MEMBER;
    case "leader":
      return LEADER;
    case "super_admin":
    case "national_admin":
      return [...COORDINATOR_BASE, REGISTER, CANDIDATES, STATES, GEOGRAPHY, LOGS];
    // Ward admins are included: they own their ward's councillor race (CR-0007).
    case "state_admin":
    case "lg_admin":
    case "ward_admin":
      return [...COORDINATOR_BASE, REGISTER, CANDIDATES];
    case "unit_coordinator":
      return [...COORDINATOR_BASE, REGISTER];
    default:
      return MEMBER;
  }
}

// A destination is active when the path is the item itself or nested under it.
// "/app" only matches exactly, so it isn't lit up on every child route.
export function isActive(pathname: string, href: string): boolean {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}
