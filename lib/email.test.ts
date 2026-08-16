import { describe, it, expect } from "vitest";
import { emailField } from "./email";

describe("emailField", () => {
  const s = emailField();

  it("accepts a normal address", () => {
    const r = s.safeParse("admin@example.com");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data).toBe("admin@example.com");
  });

  it("trims surrounding whitespace, then validates (the mobile-keyboard bug)", () => {
    for (const raw of ["admin@example.com ", " admin@example.com", "  admin@example.com  ", "admin@example.com\n"]) {
      const r = s.safeParse(raw);
      expect(r.success).toBe(true);
      if (r.success) expect(r.data).toBe("admin@example.com");
    }
  });

  it("still rejects a genuinely invalid address", () => {
    for (const bad of ["", "not-an-email", "a@b", "a @b.com"]) {
      expect(s.safeParse(bad).success).toBe(false);
    }
  });

  it("uses the given message", () => {
    const r = emailField("Custom message.").safeParse("nope");
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Custom message.");
  });
});
