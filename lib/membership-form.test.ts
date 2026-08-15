import { describe, it, expect } from "vitest";
import { membershipSchema, readMembershipForm } from "./membership-form";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

// Everything a valid submission needs EXCEPT the VIN (added per-case below).
const validBase = {
  full_name: "Ada Obi",
  date_of_birth: "1990-01-01",
  nin: "12345678901",
  gender: "male",
  phone: "08031234567",
  polling_unit_id: "11111111-1111-4111-8111-111111111111",
};

describe("membership-form", () => {
  it("accepts a full submission with a VIN", () => {
    const parsed = membershipSchema.safeParse(readMembershipForm(fd({ ...validBase, vin: "90F5B05EEB1234567AB" })));
    expect(parsed.success).toBe(true);
  });

  it("accepts a submission with NO vin field (the staff-with-VIN case) as undefined", () => {
    // Regression: the form omits the VIN field when the profile already has one.
    // formData.get('vin') is null, which must become undefined, not blow up Zod.
    const input = readMembershipForm(fd(validBase));
    expect(input.vin).toBeUndefined();
    const parsed = membershipSchema.safeParse(input);
    expect(parsed.success).toBe(true);
  });

  it("never surfaces a raw null-type error; empty fields get friendly messages", () => {
    const parsed = membershipSchema.safeParse(readMembershipForm(fd({})));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const messages = parsed.error.issues.map((i) => i.message).join(" | ");
    // The bug the client hit:
    expect(messages).not.toContain("received null");
    expect(messages).not.toContain("expected string");
    // The intended field messages instead:
    expect(messages).toContain("Enter your full name.");
    expect(messages).toContain("Choose your home polling unit.");
    // vin is optional, so an absent vin is never itself an error.
    const vinIssue = parsed.error.issues.find((i) => i.path[0] === "vin");
    expect(vinIssue).toBeUndefined();
  });

  it("coalesces every absent field to a string (no nulls reach the schema)", () => {
    const input = readMembershipForm(fd({}));
    expect(input.full_name).toBe("");
    expect(input.date_of_birth).toBe("");
    expect(input.nin).toBe("");
    expect(input.gender).toBe("");
    expect(input.phone).toBe("");
    expect(input.polling_unit_id).toBe("");
    expect(input.vin).toBeUndefined();
  });
});
