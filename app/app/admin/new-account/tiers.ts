import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type GeoLevel = "state" | "lga" | "ward" | "polling_unit" | null;

export const ROLE_RANK: Record<Role, number> = {
  national_admin: 1,
  state_admin: 2,
  lg_admin: 3,
  ward_admin: 4,
  unit_coordinator: 5,
  leader: 6,
  member: 7,
};

// How deep a geographic path a role needs. A leader sits at a polling unit, the
// same as their coordinator.
export const ROLE_LEVEL: Record<Role, GeoLevel> = {
  national_admin: null,
  state_admin: "state",
  lg_admin: "lga",
  ward_admin: "ward",
  unit_coordinator: "polling_unit",
  leader: "polling_unit",
  member: "polling_unit",
};

// Who a caller may provision.
//
// The NATIONAL ADMIN IS NOT SCOPED: they may create any role below them, at any
// geography in the country. This matches what the database already allows
// (profiles_insert only requires a lower rank, and profile_in_scope is true for
// them), and what the client asked for. Every other admin stays on the strict
// next tier down, inside their own scope.
//
// `member` is absent everywhere on purpose: member records are created by a
// leader through registration (`members`), not by provisioning a profile.
export function allowedTargets(role: Role): { role: Role; level: GeoLevel }[] {
  if (role === "national_admin") {
    return (["state_admin", "lg_admin", "ward_admin", "unit_coordinator", "leader"] as const).map((r) => ({
      role: r as Role,
      level: ROLE_LEVEL[r as Role],
    }));
  }
  const next = NEXT_TIER[role];
  return next ? [next] : [];
}

// Which roles a caller may see and manage on the Team page. Same rule as
// provisioning: the national admin manages every level, everyone else manages
// exactly the tier below them.
export function manageableRoles(role: Role): Role[] {
  return allowedTargets(role).map((t) => t.role);
}

// Each non-national admin provisions exactly the next tier down.
export const NEXT_TIER: Partial<Record<Role, { role: Role; level: GeoLevel }>> = {
  state_admin: { role: "lg_admin", level: "lga" },
  lg_admin: { role: "ward_admin", level: "ward" },
  ward_admin: { role: "unit_coordinator", level: "polling_unit" },
  unit_coordinator: { role: "leader", level: "polling_unit" },
};

export const LEVEL_LABEL: Record<Exclude<GeoLevel, null>, string> = {
  state: "State",
  lga: "LGA",
  ward: "Ward",
  polling_unit: "Polling unit",
};

export function roleLabel(role: Role): string {
  return role.replace(/_/g, " ");
}
