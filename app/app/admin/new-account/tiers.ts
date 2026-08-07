import type { Database } from "@/lib/database.types";

export type Role = Database["public"]["Enums"]["user_role"];
export type GeoLevel = "state" | "lga" | "ward" | "polling_unit" | null;

export const ROLE_RANK: Record<Role, number> = {
  super_admin: 0,
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
  super_admin: null,
  national_admin: null,
  state_admin: "state",
  lg_admin: "lga",
  ward_admin: "ward",
  unit_coordinator: "polling_unit",
  leader: "polling_unit",
  member: "polling_unit",
};

// Who a caller may provision: EVERY role that ranks strictly below them.
//
// This is a restatement of `profiles_insert`, not an extension of it. That policy
// has always required only two things (rank strictly below the caller, and a
// geographic path inside the caller's scope), so the database already permitted a
// ward admin to create a leader. The old `NEXT_TIER` table pinned each admin to
// exactly one role below them, which was application code contradicting the
// database, the same defect CR-0007 §4a corrected for the national admin.
//
// CR-0009 §3.2: the client asked for "any admin above leader should be able to
// register anyone to be a leader". Generalising to "everything below you" answers
// that and deletes the national-admin special case, which becomes an instance of
// the general rule rather than a branch: they rank 1, so everything is below them.
//
// The caller's own scope still constrains WHERE, and it is enforced in the
// database. This function only decides WHAT the role picker offers.
//
// `member` is absent on purpose: member records are created through registration
// (`members`), not by provisioning a profile.
// Peer special-case (CR-0015): a super_admin may also provision another super_admin
// (rank 0, so not "strictly below" itself). No lower tier can target a super_admin.
export function allowedTargets(role: Role): { role: Role; level: GeoLevel }[] {
  return ROLE_ORDER.filter(
    (r) =>
      r !== "member" &&
      (ROLE_RANK[r] > ROLE_RANK[role] || (role === "super_admin" && r === "super_admin")),
  ).map((r) => ({ role: r, level: ROLE_LEVEL[r] }));
}

// Which roles a caller may see and manage on the Team page. Same rule as
// provisioning: everything below you.
export function manageableRoles(role: Role): Role[] {
  return allowedTargets(role).map((t) => t.role);
}

// Hierarchy order, most senior first. Drives the role picker's ordering so it
// always reads top-down.
export const ROLE_ORDER: Role[] = [
  "super_admin",
  "national_admin",
  "state_admin",
  "lg_admin",
  "ward_admin",
  "unit_coordinator",
  "leader",
  "member",
];

export const LEVEL_LABEL: Record<Exclude<GeoLevel, null>, string> = {
  state: "State",
  lga: "LGA",
  ward: "Ward",
  polling_unit: "Polling unit",
};

export function roleLabel(role: Role): string {
  return role.replace(/_/g, " ");
}
