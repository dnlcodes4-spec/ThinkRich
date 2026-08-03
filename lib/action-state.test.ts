import { describe, it, expect } from "vitest";
import { idle, ok, fail } from "./action-state";

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
});
