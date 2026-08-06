import { describe, it, expect } from "vitest";
import { isAdult } from "./age";

describe("isAdult", () => {
  it("accepts someone well over 18", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 20);
    expect(isAdult(d.toISOString().slice(0, 10))).toBe(true);
  });
  it("accepts exactly 18 today", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 18);
    expect(isAdult(d.toISOString().slice(0, 10))).toBe(true);
  });
  it("rejects a 10-year-old", () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 10);
    expect(isAdult(d.toISOString().slice(0, 10))).toBe(false);
  });
  it("rejects an unparseable date", () => {
    expect(isAdult("not-a-date")).toBe(false);
  });
});
