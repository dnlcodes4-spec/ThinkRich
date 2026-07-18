// Plain-language labels for internal role/status codes, so the UI reads like a
// product, not a database. One source of truth for user-facing terminology.
// (Draft glossary; refine as the client confirms wording.)
import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
type MemberStatus = Database["public"]["Enums"]["member_status"];

const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  leader: "Leader",
  unit_coordinator: "Unit Coordinator",
  ward_admin: "Ward Coordinator",
  lg_admin: "LGA Coordinator",
  state_admin: "State Coordinator",
  national_admin: "National Coordinator",
};

export function roleLabel(role: Role | string | null | undefined): string {
  return (role && ROLE_LABELS[role as Role]) || "Member";
}

// The coordinator tiers (everyone above a leader). Members and leaders are not
// "coordinators"; leaders manage members, coordinators manage the tiers below.
export function isCoordinator(role: Role | string | null | undefined): boolean {
  return (
    role === "unit_coordinator" ||
    role === "ward_admin" ||
    role === "lg_admin" ||
    role === "state_admin" ||
    role === "national_admin"
  );
}

const MEMBER_STATUS_LABELS: Record<MemberStatus, string> = {
  active: "Active",
  frozen: "Paused",
  deleted: "Removed",
};

export function memberStatusLabel(status: MemberStatus | string): string {
  return MEMBER_STATUS_LABELS[status as MemberStatus] ?? status;
}
