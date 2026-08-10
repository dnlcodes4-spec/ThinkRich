import { describe, it, expect } from "vitest";
import { z } from "zod";
import { idle, ok, fail, zodFail } from "./action-state";

describe("action-state", () => {
  it("idle has no status noise", () => {
    expect(idle).toEqual({ status: "idle" });
  });
  it("ok carries extra payload and optional message", () => {
    expect(ok({ tempPassword: "x", message: "Done." })).toEqual({
      status: "success",
      message: "Done.",
      tempPassword: "x",
    });
    expect(ok()).toEqual({ status: "success" });
  });
  it("fail carries a message and optional field errors", () => {
    expect(fail("Bad", { email: "Taken" })).toEqual({
      status: "error",
      message: "Bad",
      fieldErrors: { email: "Taken" },
    });
    expect(fail("Bad")).toEqual({ status: "error", message: "Bad" });
  });

  describe("zodFail", () => {
    const schema = z.object({
      full_name: z.string().min(2, "Enter your full name."),
      phone: z.string().min(1, "Enter your phone number."),
    });

    it("uses the exact field message when one field fails", () => {
      const parsed = schema.safeParse({ full_name: "Ada", phone: "" });
      expect(parsed.success).toBe(false);
      if (parsed.success) return;
      expect(zodFail(parsed.error)).toEqual({
        status: "error",
        message: "Enter your phone number.",
        fieldErrors: { phone: "Enter your phone number." },
      });
    });

    it("lists each specific message (newline-joined) when several fail", () => {
      const parsed = schema.safeParse({ full_name: "", phone: "" });
      if (parsed.success) return;
      const result = zodFail(parsed.error);
      expect(result.status).toBe("error");
      expect(result.fieldErrors).toEqual({
        full_name: "Enter your full name.",
        phone: "Enter your phone number.",
      });
      expect(result.message).toBe("Enter your full name.\nEnter your phone number.");
    });

    it("keeps the first message per field", () => {
      const one = z.object({ vin: z.string().min(1, "Enter the VIN.").max(3, "Too long.") });
      const parsed = one.safeParse({ vin: "" });
      if (parsed.success) return;
      expect(zodFail(parsed.error).fieldErrors).toEqual({ vin: "Enter the VIN." });
    });
  });
});
