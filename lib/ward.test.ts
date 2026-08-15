import { describe, it, expect } from "vitest";
import { normalizeWardName, wardKey } from "./ward";

describe("ward", () => {
  it("collapses whitespace and tidies separators, preserving case", () => {
    expect(normalizeWardName("  Auna   South ")).toBe("Auna South");
    expect(normalizeWardName("SI ,  (Lekki I)")).toBe("SI, (Lekki I)");
    expect(normalizeWardName("riya - k / ung")).toBe("riya - k/ung");
  });

  it("does NOT uppercase (ward names are mixed-case place names)", () => {
    expect(normalizeWardName("Awkuzu III")).toBe("Awkuzu III");
  });

  it("rejects empty / too-short names", () => {
    expect(normalizeWardName("")).toBeNull();
    expect(normalizeWardName("   ")).toBeNull();
    expect(normalizeWardName("a")).toBeNull();
  });

  it("dedupe key is case/space-insensitive", () => {
    expect(wardKey("Auna  South")).toBe(wardKey("AUNA SOUTH"));
    expect(wardKey("auna south")).toBe(wardKey("Auna South"));
  });
});
