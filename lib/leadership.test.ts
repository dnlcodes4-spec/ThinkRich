import { describe, it, expect } from "vitest";
import {
  officers,
  president,
  fullName,
  presidentOrganizations,
  presidentProfile,
  presidentCredentials,
} from "./leadership";

// CR-0010. These four names and offices go on two public landings, so the tests
// guard the things that would be quietly wrong rather than loudly broken.

describe("the roster", () => {
  it("holds exactly the four executive offices, once each", () => {
    expect(officers.map((o) => o.office)).toEqual([
      "President",
      "Vice President",
      "Secretary",
      "Treasurer",
    ]);
  });

  // The client's list wrote each office on the line AFTER its name, which is
  // ambiguous enough to get backwards. Salami and Oluwaseun anchor the reading
  // independently, so pin the two that don't: a swapped office is a public error.
  it("assigns Secretary and Treasurer the way the source list reads", () => {
    const byOffice = Object.fromEntries(officers.map((o) => [o.office, o.name]));
    expect(byOffice["Secretary"]).toBe("Idowu Olaitan Bolatito");
    expect(byOffice["Treasurer"]).toBe("Onayale Iyanuoluwa");
    expect(byOffice["President"]).toBe("Salami Saidi Oladimeji");
    expect(byOffice["Vice President"]).toBe("Oluwaseun Omoniyi Akinbiyi");
  });

  it("puts the President first, since the section's layout destructures on it", () => {
    expect(officers[0]).toBe(president);
    expect(president.office).toBe("President");
  });

  // Only the President has two usable portraits. The Vice President's second
  // supplied file is a full-length event photo that cannot carry a tile (CR-0010
  // §8), so the section renders equal thirds below the President's spread. If a
  // replacement ever lands, this test is the reminder to revisit that layout.
  it("gives only the President a second portrait", () => {
    const withAlt = officers.filter((o) => o.portraitAlt).map((o) => o.office);
    expect(withAlt).toEqual(["President"]);
  });

  it("keeps every portrait path distinct, so no two officers share a photo", () => {
    const paths = officers.flatMap((o) => [o.portrait, o.portraitAlt].filter(Boolean));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("derives initials that match the name shown beside them", () => {
    for (const o of officers) {
      expect(o.initials).toHaveLength(2);
      // Both letters must come from the officer's own name, not a stale paste.
      const letters = new Set(o.name.toUpperCase().replace(/[^A-Z]/g, ""));
      for (const ch of o.initials) expect(letters.has(ch)).toBe(true);
    }
  });
});

describe("fullName", () => {
  it("carries the honorific when the client gave one", () => {
    expect(fullName(president)).toBe("Chief Amb. Dr Salami Saidi Oladimeji");
  });

  it("returns the bare name when there is none", () => {
    expect(fullName(officers[1])).toBe("Oluwaseun Omoniyi Akinbiyi");
  });
});

describe("the President's profile", () => {
  it("lists the six organizations the profile document names", () => {
    expect(presidentOrganizations).toHaveLength(6);
    expect(presidentOrganizations.map((o) => o.org)).toContain(
      "ThinkHelp International Foundation",
    );
  });

  it("gives every narrative section a body, so none renders as an empty heading", () => {
    for (const s of presidentProfile) {
      expect(s.body.length).toBeGreaterThan(0);
      for (const p of s.body) expect(p.trim()).not.toBe("");
    }
  });

  it("keeps section ids unique, since the page splits the narrative by id", () => {
    const ids = presidentProfile.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("shows three credentials, which is what the section's layout is built for", () => {
    expect(presidentCredentials).toHaveLength(3);
  });
});

describe("copy hygiene", () => {
  // Em dashes are banned project-wide as an AI tell (docs/design/authentic-design.md).
  it("uses no em dashes in anything that reaches the page", () => {
    const prose = [
      ...officers.map((o) => `${fullName(o)} ${o.office} ${o.note ?? ""}`),
      ...presidentCredentials,
      ...presidentOrganizations.flatMap((o) => [o.role, o.org, o.body]),
      ...presidentProfile.flatMap((s) => [s.heading, ...s.body]),
    ].join(" ");
    expect(prose).not.toContain("—");
  });
});
