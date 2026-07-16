import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type GeoLevel = "state" | "lga" | "ward" | "polling_unit" | null;

// Each admin provisions exactly the next tier down, with one in-scope geography
// pick. (unit_coordinator's leader inherits the coordinator's PU, so no pick.)
export const NEXT_TIER: Partial<Record<Role, { role: Role; level: GeoLevel }>> = {
  national_admin: { role: "state_admin", level: "state" },
  state_admin: { role: "lg_admin", level: "lga" },
  lg_admin: { role: "ward_admin", level: "ward" },
  ward_admin: { role: "unit_coordinator", level: "polling_unit" },
  unit_coordinator: { role: "leader", level: null },
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
