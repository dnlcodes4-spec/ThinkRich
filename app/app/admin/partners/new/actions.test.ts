import { beforeEach, describe, expect, it, vi } from "vitest";
import { partnerOnboardSchema } from "@/lib/partners";

// Two things are worth pinning here, and neither can be caught by a type or a
// constraint.
//
// The ROLE GATE: onboarding creates an auth user with the service role, which
// bypasses RLS, so this check is the only thing standing between a national
// admin and a partner they may not make.
//
// The ROLLBACK: the flow writes to four places under two different clients, and
// a failure halfway leaves either an orphan auth user or an orphan partner row,
// neither of which any constraint would notice. So the mocks below model the
// whole chain and the tests assert the unwinding, not just the return value.

const getUser = vi.fn();
const profileRole = vi.fn();

// Caller-client (RLS) spies. `partnersInsert` records the row AND supplies the
// result the action sees, so a test sets both from one place.
const partnersInsert = vi.fn();
const partnersDelete = vi.fn();
const partnersDeleteEq = vi.fn();

// Admin-client (service-role) spies.
const stateLookup = vi.fn();
const vinOnMember = vi.fn();
const vinOnProfile = vi.fn();
const voterIdsUpsert = vi.fn();
const createUser = vi.fn();
const deleteUser = vi.fn();
const adminProfileInsert = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRole() }) }) }) };
      }
      if (table === "partners") {
        return {
          insert: (row: unknown) => {
            const result = partnersInsert(row);
            return { select: () => ({ single: async () => result }) };
          },
          delete: () => {
            partnersDelete();
            return {
              eq: async (col: string, value: string) => {
                partnersDeleteEq(col, value);
                return { error: null };
              },
            };
          },
        };
      }
      throw new Error(`unexpected caller table ${table}`);
    },
  }),
}));

const adminClient = {
  auth: { admin: { createUser, deleteUser } },
  from: (table: string) => ({
    select: () => ({
      eq: () => ({
        maybeSingle: async () => {
          if (table === "states") return { data: stateLookup() };
          if (table === "members") return { data: vinOnMember() };
          if (table === "profiles") return { data: vinOnProfile() };
          throw new Error(`unexpected admin select on ${table}`);
        },
      }),
    }),
    insert: async (row: unknown) => {
      if (table !== "profiles") throw new Error(`unexpected admin insert on ${table}`);
      return adminProfileInsert(row);
    },
    upsert: async (row: unknown, options: unknown) => {
      if (table !== "voter_ids") throw new Error(`unexpected admin upsert on ${table}`);
      return voterIdsUpsert(row, options);
    },
  }),
};

vi.mock("@/lib/supabase/admin", async () => {
  const actual = await vi.importActual<typeof import("@/lib/supabase/admin")>("@/lib/supabase/admin");
  return { ...actual, createAdminClient: () => adminClient, tryCreateAdminClient: () => adminClient };
});

// Logging is best effort and would otherwise reach for a real client.
vi.mock("@/lib/activity", () => ({ logActivityAs: vi.fn(async () => {}) }));

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
    vi.clearAllMocks();
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key");
    getUser.mockReturnValue({ data: { user: { id: "caller-1" } } });
    profileRole.mockReturnValue({ role: "super_admin" });
    // The happy path by default; each test breaks exactly one link.
    stateLookup.mockReturnValue({ id: "state-1" });
    vinOnMember.mockReturnValue(null);
    vinOnProfile.mockReturnValue(null);
    partnersInsert.mockReturnValue({ data: { id: "p-123" }, error: null });
    voterIdsUpsert.mockResolvedValue({ error: null });
    createUser.mockResolvedValue({ data: { user: { id: "u-123" } }, error: null });
    adminProfileInsert.mockReturnValue({ error: null });
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
    expect(partnersInsert).not.toHaveBeenCalled();
  });

  it("provisions the partner and its first admin on the happy path", async () => {
    const result = await onboardPartner(base);
    expect(result).toMatchObject({ status: "success", partnerId: "p-123", email: base.adminEmail });
    expect(result.tempPassword).toBeTruthy();
    // The partners row goes through the CALLER's client so RLS authorises it.
    expect(partnersInsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: base.name, kind: "community", code: "BB1", scope_state_id: null, created_by: "caller-1" }),
    );
    // A partner_admin carries no geography, only a partner_id.
    const profile = adminProfileInsert.mock.calls[0][0];
    expect(profile).toMatchObject({ id: "u-123", role: "partner_admin", partner_id: "p-123", status: "active" });
    expect(profile).not.toHaveProperty("state_id");
    expect(deleteUser).not.toHaveBeenCalled();
    expect(partnersDelete).not.toHaveBeenCalled();
  });

  it("rolls back the auth user AND the partner row when the profile insert fails", async () => {
    adminProfileInsert.mockReturnValue({ error: { message: "boom" } });

    const result = await onboardPartner(base);

    expect(result.status).toBe("error");
    expect(result.partnerId).toBeUndefined();
    expect(deleteUser).toHaveBeenCalledWith("u-123");
    expect(partnersDelete).toHaveBeenCalled();
    expect(partnersDeleteEq).toHaveBeenCalledWith("id", "p-123");
  });

  it("rolls back the partner row when the auth user cannot be created", async () => {
    createUser.mockResolvedValue({ data: null, error: { message: "User already registered" } });

    const result = await onboardPartner(base);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.adminEmail).toMatch(/already in use/i);
    expect(partnersDeleteEq).toHaveBeenCalledWith("id", "p-123");
    expect(adminProfileInsert).not.toHaveBeenCalled();
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("turns a duplicate code into a field error and writes nothing downstream", async () => {
    partnersInsert.mockReturnValue({ data: null, error: { code: "23505" } });

    const result = await onboardPartner(base);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.code).toMatch(/already taken/i);
    expect(createUser).not.toHaveBeenCalled();
    expect(voterIdsUpsert).not.toHaveBeenCalled();
    // Nothing was created, so there is nothing to unwind.
    expect(partnersDelete).not.toHaveBeenCalled();
  });

  it("refuses a VIN that is already registered before creating the partner", async () => {
    vinOnMember.mockReturnValue({ id: "member-1" });

    const result = await onboardPartner(base);

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.adminVin).toMatch(/already registered/i);
    expect(partnersInsert).not.toHaveBeenCalled();
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a ceiling state that does not exist, without creating anything", async () => {
    stateLookup.mockReturnValue(null);

    const result = await onboardPartner({ ...base, scopeStateId: "11111111-2222-3333-4444-555555555555" });

    expect(result.status).toBe("error");
    expect(result.fieldErrors?.scopeStateId).toBeTruthy();
    expect(partnersInsert).not.toHaveBeenCalled();
  });
});
