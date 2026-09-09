import { beforeEach, describe, expect, it, vi } from "vitest";

// Every action here creates or rewrites rows with the service role somewhere in
// its body, so the super-admin gate is the real boundary, not RLS. These tests
// pin the gate and the two pieces of logic that no constraint enforces: the
// ceiling may only widen, and a reset only targets an actual partner_admin.

const getUser = vi.fn();
const profileRole = vi.fn();
const partnersUpdate = vi.fn();
const partnersSelect = vi.fn();
const outsideMembers = vi.fn();
const outsideProfiles = vi.fn();
const requestUpdate = vi.fn();
const updateUserById = vi.fn();
const getUserById = vi.fn();
const provisionPartnerAdmin = vi.fn();
void requestUpdate;

function callerClient() {
  return {
    auth: { getUser: () => getUser() },
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: profileRole() }) }),
          }),
        };
      }
      if (table === "partners") {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: partnersSelect() }) }) }),
          update: (row: unknown) => {
            partnersUpdate(row);
            return {
              eq: () => ({ select: () => ({ maybeSingle: async () => ({ data: { id: "p-1", name: "X" }, error: null }) }) }),
            };
          },
        };
      }
      if (table === "partnership_requests") {
        return {
          update: (row: unknown) => {
            requestUpdate(row);
            return { eq: () => ({ neq: async () => ({ error: null }) }) };
          },
        };
      }
      throw new Error(`unexpected caller table ${table}`);
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({ createClient: async () => callerClient() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    auth: { admin: { updateUserById: (...a: unknown[]) => updateUserById(...a), getUserById: (...a: unknown[]) => getUserById(...a) } },
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          neq: () => ({ neq: async () => ({ count: table === "members" ? outsideMembers() : outsideProfiles() }) }),
          not: () => ({ neq: async () => ({ count: outsideProfiles() }) }),
        }),
      }),
    }),
  }),
  isAdminConfigured: () => true,
  ADMIN_NOT_CONFIGURED: "admin not configured",
}));
vi.mock("@/lib/partner-provisioning", () => ({
  provisionPartnerAdmin: (...a: unknown[]) => provisionPartnerAdmin(...a),
}));
vi.mock("@/lib/activity", () => ({ logActivityAs: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import {
  updatePartner,
  addPartnerAdmin,
  resetPartnerAdminPassword,
} from "./actions";

const PID = "11111111-1111-4111-8111-111111111111";
const STATE = "22222222-2222-4222-8222-222222222222";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockReturnValue({ data: { user: { id: "caller" } } });
  profileRole.mockReturnValue({ role: "super_admin" });
  partnersSelect.mockReturnValue({ id: PID, name: "Ada for Senate" });
  outsideMembers.mockReturnValue(0);
  outsideProfiles.mockReturnValue(0);
});

describe("updatePartner", () => {
  it("rejects a non-super caller and writes nothing", async () => {
    profileRole.mockReturnValue({ role: "national_admin" });
    const res = await updatePartner({ status: "idle" }, form({ partner_id: PID, name: "New name" }));
    expect(res.status).toBe("error");
    expect(partnersUpdate).not.toHaveBeenCalled();
  });

  it("refuses to narrow the ceiling when people are outside the new state", async () => {
    outsideMembers.mockReturnValue(3);
    const res = await updatePartner({ status: "idle" }, form({ partner_id: PID, name: "Ada", scopeStateId: STATE }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/3 people are already registered outside/i);
    expect(partnersUpdate).not.toHaveBeenCalled();
  });

  it("saves name and ceiling when everyone fits", async () => {
    const res = await updatePartner({ status: "idle" }, form({ partner_id: PID, name: "Ada Renamed", scopeStateId: STATE }));
    expect(res.status).toBe("success");
    expect(partnersUpdate).toHaveBeenCalledWith({ name: "Ada Renamed", scope_state_id: STATE });
  });
});

describe("addPartnerAdmin", () => {
  it("rejects a non-super caller", async () => {
    profileRole.mockReturnValue({ role: "partner_admin" });
    const res = await addPartnerAdmin(
      { status: "idle" },
      form({ partner_id: PID, adminFullName: "Bo", adminEmail: "bo@x.dev", adminVin: "VIN0000000000000001", adminPhone: "08030000000" }),
    );
    expect(res.status).toBe("error");
    expect(provisionPartnerAdmin).not.toHaveBeenCalled();
  });

  it("hands the temp password back on success", async () => {
    provisionPartnerAdmin.mockResolvedValue({ ok: true, userId: "u-9", tempPassword: "temp!Aa9", email: "bo@x.dev" });
    const res = await addPartnerAdmin(
      { status: "idle" },
      form({ partner_id: PID, adminFullName: "Bo Admin", adminEmail: "bo@x.dev", adminVin: "VIN0000000000000001", adminPhone: "08030000000" }),
    );
    expect(res.status).toBe("success");
    expect(res.tempPassword).toBe("temp!Aa9");
    expect(provisionPartnerAdmin).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ partnerId: PID, fullName: "Bo Admin" }),
    );
  });
});

describe("resetPartnerAdminPassword", () => {
  it("rejects a non-super caller", async () => {
    profileRole.mockReturnValue({ role: "national_admin" });
    const res = await resetPartnerAdminPassword({ status: "idle" }, form({ profile_id: PID }));
    expect(res.status).toBe("error");
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("refuses a target that is not a partner admin", async () => {
    // first profiles read = the gate (super_admin); second = the target row
    profileRole.mockReturnValueOnce({ role: "super_admin" }).mockReturnValueOnce({ role: "state_admin", partner_id: null });
    const res = await resetPartnerAdminPassword({ status: "idle" }, form({ profile_id: PID }));
    expect(res.status).toBe("error");
    expect(updateUserById).not.toHaveBeenCalled();
  });

  it("resets and returns a fresh temp password for a partner admin", async () => {
    profileRole
      .mockReturnValueOnce({ role: "super_admin" })
      .mockReturnValueOnce({ id: PID, full_name: "Bo", role: "partner_admin", partner_id: PID });
    updateUserById.mockResolvedValue({ error: null });
    getUserById.mockResolvedValue({ data: { user: { email: "bo@x.dev" } } });
    const res = await resetPartnerAdminPassword({ status: "idle" }, form({ profile_id: PID }));
    expect(res.status).toBe("success");
    expect(res.tempPassword).toBeTruthy();
    expect(updateUserById).toHaveBeenCalled();
  });
});
