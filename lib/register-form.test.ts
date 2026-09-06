import { describe, it, expect } from "vitest";
import { registerSchema, readRegisterForm } from "./register-form";

function fd(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

// A full valid submission. Email is required for everyone as of CR-0025.
const validBase = {
  full_name: "Ada Obi",
  date_of_birth: "1990-01-01",
  nin: "12345678901",
  vin: "90F5B05EEB1234567AB",
  gender: "male",
  phone: "08031234567",
  email: "ada@example.com",
  polling_unit_id: "11111111-1111-4111-8111-111111111111",
};

describe("register-form", () => {
  it("accepts a full submission", () => {
    const parsed = registerSchema.safeParse(readRegisterForm(fd(validBase)));
    expect(parsed.success).toBe(true);
  });

  it("requires an email (CR-0025) — a blank email is rejected", () => {
    const parsed = registerSchema.safeParse(readRegisterForm(fd({ ...validBase, email: "" })));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const emailIssue = parsed.error.issues.find((i) => i.path[0] === "email");
    expect(emailIssue?.message).toBe("Enter the voter's email address.");
  });

  it("requires an email — an omitted email field is rejected, not a raw null error", () => {
    const noEmail = { ...validBase };
    delete (noEmail as Partial<typeof validBase>).email;
    const input = readRegisterForm(fd(noEmail));
    expect(input.email).toBe("");
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const messages = parsed.error.issues.map((i) => i.message).join(" | ");
    expect(messages).not.toContain("received null");
    expect(messages).not.toContain("expected string");
  });

  it("rejects a malformed email", () => {
    const parsed = registerSchema.safeParse(readRegisterForm(fd({ ...validBase, email: "not-an-email" })));
    expect(parsed.success).toBe(false);
  });

  it("trims whitespace around the email (mobile keyboards append it)", () => {
    const parsed = registerSchema.safeParse(readRegisterForm(fd({ ...validBase, email: "  ada@example.com " })));
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data.email).toBe("ada@example.com");
  });

  it("coalesces every absent field to a string (no nulls reach the schema)", () => {
    const input = readRegisterForm(fd({}));
    expect(input.full_name).toBe("");
    expect(input.email).toBe("");
    expect(input.vin).toBe("");
    expect(input.polling_unit_id).toBeUndefined();
    expect(input.registered_by).toBeUndefined();
  });

  it("ignores a client-submitted partner_id — the partition comes from the caller's profile, not the form (CR-0026)", () => {
    const input = readRegisterForm(fd({ ...validBase, partner_id: "22222222-2222-4222-8222-222222222222" }));
    expect(input).not.toHaveProperty("partner_id");
    const parsed = registerSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (!parsed.success) return;
    expect(parsed.data).not.toHaveProperty("partner_id");
  });

  it("gives every empty required field its own friendly message", () => {
    const parsed = registerSchema.safeParse(readRegisterForm(fd({})));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const messages = parsed.error.issues.map((i) => i.message).join(" | ");
    expect(messages).toContain("Enter the voter's full name.");
    expect(messages).toContain("Enter the voter's email address.");
    expect(messages).toContain("Enter the voter's card number (VIN).");
  });
});
