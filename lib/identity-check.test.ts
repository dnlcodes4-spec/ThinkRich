import { describe, it, expect, vi } from "vitest";
import { identityRegistrationStatus } from "@/lib/identity-check";

function clientReturning(result: { data?: unknown; error?: unknown }) {
  const rpc = vi.fn().mockResolvedValue(result);
  // Only the rpc method is exercised.
  return { client: { rpc } as never, rpc };
}

describe("identityRegistrationStatus", () => {
  it("passes only the identifiers that are set", async () => {
    const { client, rpc } = clientReturning({ data: "available", error: null });
    await identityRegistrationStatus(client, { nin: "123", vin: null });
    expect(rpc).toHaveBeenCalledWith("identity_registration_status", { p_nin: "123" });
  });

  it("passes both when both are set", async () => {
    const { client, rpc } = clientReturning({ data: "taken_here", error: null });
    await identityRegistrationStatus(client, { nin: "123", vin: "ABC" });
    expect(rpc).toHaveBeenCalledWith("identity_registration_status", { p_nin: "123", p_vin: "ABC" });
  });

  it("returns the bucket the function reports", async () => {
    const { client } = clientReturning({ data: "taken_elsewhere", error: null });
    expect(await identityRegistrationStatus(client, { vin: "ABC" })).toBe("taken_elsewhere");
  });

  it("falls back to 'unknown' on error or null so the caller keeps its default message", async () => {
    const err = clientReturning({ data: null, error: { message: "boom" } });
    expect(await identityRegistrationStatus(err.client, { nin: "1" })).toBe("unknown");
    const nullish = clientReturning({ data: null, error: null });
    expect(await identityRegistrationStatus(nullish.client, { nin: "1" })).toBe("unknown");
  });
});
