import { describe, it, expect } from "vitest";
import { navForRole } from "./nav";

// CR-0026. A community partner has one admin, a member list and a count: no
// sub-accounts, so the nav drops Team and "Give app access". A political partner
// (or an unspecified kind, for back-compat) keeps the full coordinator set.

const hrefs = (role: string, kind?: "political" | "community") =>
  navForRole(role, kind).map((i) => i.href);

describe("navForRole for a partner admin", () => {
  it("omits the team and new-account destinations for a community partner", () => {
    const items = hrefs("partner_admin", "community");
    expect(items).not.toContain("/app/admin/team");
    expect(items).not.toContain("/app/admin/new-account");
    expect(items).not.toContain("/app/register");
    expect(items).toEqual(["/app", "/app/members", "/app/stats"]);
  });

  it("keeps register for a political partner", () => {
    expect(hrefs("partner_admin", "political")).toContain("/app/register");
  });

  it("defaults to the political list when no kind is given (back-compat)", () => {
    expect(navForRole("partner_admin")).toEqual(navForRole("partner_admin", "political"));
    expect(hrefs("partner_admin")).toContain("/app/register");
  });
});
