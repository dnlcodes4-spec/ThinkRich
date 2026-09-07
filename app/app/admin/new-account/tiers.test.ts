import { describe, it, expect } from "vitest";
import { allowedTargets, scopeColumnsToClear } from "./tiers";

// A partner admin shares rank 1 with the national admin, so `allowedTargets`
// already offers every role strictly below rank 1 and never super_admin,
// partner_admin or national_admin. This locks that in (CR-0026 / T-100).
describe("allowedTargets", () => {
  it("lets a partner_admin target state_admin..leader, never national/super/partner", () => {
    const targets = allowedTargets("partner_admin").map((t) => t.role);
    expect(targets).toEqual([
      "state_admin",
      "lg_admin",
      "ward_admin",
      "unit_coordinator",
      "leader",
    ]);
  });
});

// A role change must null every scope column deeper than the target role's own
// level, mirroring the DB's `profiles_scope_matches_role` check (0040). Without
// this, promoting e.g. a ward_admin to lg_admin leaves `ward_id` set, and the
// check constraint rejects the update.
describe("scopeColumnsToClear", () => {
  it("clears nothing for a level-less role (super/national admin already has none set)", () => {
    expect(scopeColumnsToClear(null)).toEqual(["state_id", "lga_id", "ward_id", "polling_unit_id"]);
  });

  it("keeps only state for state_admin", () => {
    expect(scopeColumnsToClear("state")).toEqual(["lga_id", "ward_id", "polling_unit_id"]);
  });

  it("keeps state and lga for lg_admin", () => {
    expect(scopeColumnsToClear("lga")).toEqual(["ward_id", "polling_unit_id"]);
  });

  it("keeps state, lga and ward for ward_admin", () => {
    expect(scopeColumnsToClear("ward")).toEqual(["polling_unit_id"]);
  });

  it("clears nothing for a polling-unit-level role (leader/unit_coordinator/member)", () => {
    expect(scopeColumnsToClear("polling_unit")).toEqual([]);
  });
});
