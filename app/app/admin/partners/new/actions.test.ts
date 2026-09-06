import { beforeEach, describe, expect, it, vi } from "vitest";
import { partnerOnboardSchema } from "@/lib/partners";

// The role gate is the thing worth pinning: onboarding a partner creates an auth
// user with the service role, which bypasses RLS, so the check in the action is
// the only thing standing between a national admin and a partner they may not
// make. Everything below the gate (the provisioning chain) is covered by the
// database's own constraints and is not re-simulated here.

const getUser = vi.fn();
const profileRole = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({ maybeSingle: async () => ({ data: profileRole() }) }),
        }),
      };
    },
  }),
}));

vi.mock("@/lib/supabase/admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/admin")>("@/lib/supabase/admin");
  return { ...actual, createAdminClient: () => ({}) };
});

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));

const { onboardPartner } = await import("./actions");

const base = {
  name: "Bridge Builders",
  kind: "community" as const,
  scopeStateId: null,
  code: "BB1",
  adminFullName: "Ada Obi",
  adminEmail: "ada@example.com",
  adminVin: "90F5B05EEB1234567AB",
  adminPhone: "0803 123 4567",
};

describe("partnerOnboardSchema", () => {
  it("normalises the code to uppercase and validates the shape", () => {
    expect(partnerOnboardSchema.parse({ ...base, code: "abc1" }).code).toBe("ABC1");
  });

  it("rejects a code that is too long or has punctuation", () => {
    expect(partnerOnboardSchema.safeParse({ ...base, code: "ABCDEFG" }).success).toBe(false);
    expect(partnerOnboardSchema.safeParse({ ...base, code: "AB-1" }).success).toBe(false);
  });

  it("accepts a nationwide ceiling as null and rejects a non-uuid state", () => {
    expect(partnerOnboardSchema.parse(base).scopeStateId).toBeNull();
    expect(partnerOnboardSchema.safeParse({ ...base, scopeStateId: "lagos" }).success).toBe(false);
  });
});

describe("onboardPartner", () => {
  beforeEach(() => {
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    getUser.mockReturnValue({ data: { user: { id: "caller-1" } } });
    profileRole.mockReturnValue({ role: "super_admin" });
  });

  it("rejects a non-super_admin caller", async () => {
    profileRole.mockReturnValue({ role: "national_admin" });
    const result = await onboardPartner(base);
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/super admin/i);
  });

  it("rejects a caller with no profile at all", async () => {
    profileRole.mockReturnValue(null);
    const result = await onboardPartner(base);
    expect(result.status).toBe("error");
    expect(result.message).toMatch(/super admin/i);
  });

  it("rejects a signed-out caller", async () => {
    getUser.mockReturnValue({ data: { user: null } });
    const result = await onboardPartner(base);
    expect(result).toEqual({ status: "error", message: "You must be signed in." });
  });

  it("reports bad input as field errors rather than throwing", async () => {
    const result = await onboardPartner({ ...base, code: "!!", adminEmail: "not-an-email" });
    expect(result.status).toBe("error");
    expect(result.fieldErrors?.code).toBeTruthy();
    expect(result.fieldErrors?.adminEmail).toBeTruthy();
  });
});
