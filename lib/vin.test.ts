import { describe, it, expect } from "vitest";
import { sanitizeVin, isValidVin, normalizeVin, VIN_LENGTH } from "./vin";

const VALID = "90F5B05EEB1234567AB"; // 19 chars

describe("sanitizeVin", () => {
  it("strips the separators people actually type", () => {
    expect(sanitizeVin("90F5B-05EEB-1234567AB")).toBe(VALID);
    expect(sanitizeVin("90F5B 05EEB 1234567AB")).toBe(VALID);
    expect(sanitizeVin("  90F5B/05EEB.1234567AB  ")).toBe(VALID);
  });

  it("uppercases, because VIN letters are always capitals", () => {
    expect(sanitizeVin("90f5b05eeb1234567ab")).toBe(VALID);
  });

  it("caps the SANITISED value at 19, not the raw one", () => {
    // 19 real characters plus separators must survive intact: capping the raw
    // string would truncate this to "90F5B-05EEB-1234567" and lose "AB".
    expect(sanitizeVin("90F5B-05EEB-1234567AB")).toHaveLength(VIN_LENGTH);
    expect(sanitizeVin(VALID + "EXTRA")).toBe(VALID);
  });
});

describe("isValidVin", () => {
  it("accepts exactly 19 uppercase alphanumerics", () => {
    expect(isValidVin(VALID)).toBe(true);
  });

  it("rejects the wrong length", () => {
    expect(isValidVin(VALID.slice(0, 18))).toBe(false);
    expect(isValidVin("")).toBe(false);
  });

  it("rejects anything unsanitised", () => {
    expect(isValidVin("90f5b05eeb1234567ab")).toBe(false);
    expect(isValidVin("90F5B-05EEB-1234567")).toBe(false);
  });
});

describe("normalizeVin", () => {
  it("returns the storable form for anything a user might type", () => {
    expect(normalizeVin("90f5b-05eeb-1234567ab")).toBe(VALID);
  });

  it("returns null for absent or unusable input", () => {
    expect(normalizeVin(null)).toBeNull();
    expect(normalizeVin("")).toBeNull();
    expect(normalizeVin("too-short")).toBeNull();
  });

  it("is idempotent, so re-normalising a stored value is safe", () => {
    expect(normalizeVin(normalizeVin("90F5B 05EEB 1234567AB"))).toBe(VALID);
  });

  it("collapses punctuation variants onto ONE key, which is what makes the PK work", () => {
    const variants = ["90F5B-05EEB-1234567AB", "90F5B 05EEB 1234567AB", "90f5b05eeb1234567ab"];
    expect(new Set(variants.map(normalizeVin)).size).toBe(1);
  });
});
