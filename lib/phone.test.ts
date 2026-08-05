import { describe, it, expect } from "vitest";
import { normalizePhone, isValidPhone, formatPhone } from "./phone";

describe("phone", () => {
  it("normalises the accepted Nigerian forms to +234", () => {
    expect(normalizePhone("0803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("+234 803 123 4567")).toBe("+2348031234567");
    expect(normalizePhone("234-803-123-4567")).toBe("+2348031234567");
    expect(normalizePhone("8031234567")).toBe("+2348031234567");
    expect(normalizePhone("(0803) 123-4567")).toBe("+2348031234567");
  });

  it("rejects non-Nigerian / malformed numbers", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone(null)).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("0103 123 4567")).toBeNull(); // subscriber must start 7/8/9
    expect(normalizePhone("+1 415 555 0100")).toBeNull(); // wrong country
    expect(normalizePhone("080312345")).toBeNull(); // too short
  });

  it("isValidPhone agrees with normalize", () => {
    expect(isValidPhone("0803 123 4567")).toBe(true);
    expect(isValidPhone("nope")).toBe(false);
  });

  it("formats a normalised number for display", () => {
    expect(formatPhone("+2348031234567")).toBe("+234 803 123 4567");
  });
});
