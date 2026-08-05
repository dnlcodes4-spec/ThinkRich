import { describe, it, expect } from "vitest";
import { normalizePollingUnitName, normalizePollingUnitCode, pollingUnitKey } from "./polling-unit";

describe("polling-unit", () => {
  it("uppercases, collapses whitespace, tidies separators", () => {
    expect(normalizePollingUnitName("  primary   school ,  ikot eyo okon ")).toBe(
      "PRIMARY SCHOOL, IKOT EYO OKON",
    );
    expect(normalizePollingUnitName("riya - k / ung")).toBe("RIYA - K/UNG");
  });

  it("rejects empty / too-short names", () => {
    expect(normalizePollingUnitName("")).toBeNull();
    expect(normalizePollingUnitName("   ")).toBeNull();
    expect(normalizePollingUnitName("a")).toBeNull();
  });

  it("normalises codes: pads bare numbers, uppercases the rest", () => {
    expect(normalizePollingUnitCode("8")).toBe("008");
    expect(normalizePollingUnitCode("013")).toBe("013");
    expect(normalizePollingUnitCode("pu-a")).toBe("PU-A");
    expect(normalizePollingUnitCode("")).toBeNull();
  });

  it("dedupe key is case/space-insensitive", () => {
    expect(pollingUnitKey("Primary  School")).toBe(pollingUnitKey("PRIMARY SCHOOL"));
  });
});
