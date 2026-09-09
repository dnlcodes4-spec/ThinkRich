import { beforeEach, describe, expect, it, vi } from "vitest";

// move_member_to_partition does the work and writes the audit row (migration
// 0056); the action only gates on super_admin for a friendly message and maps
// "core" to an omitted p_target_partner. These tests pin exactly that.

const getUser = vi.fn();
const profileRole = vi.fn();
const rpc = vi.fn();

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: () => getUser() },
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table ${table}`);
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: profileRole() }) }) }) };
    },
    rpc: (name: string, args: unknown) => rpc(name, args),
  }),
}));

import { moveMember } from "./move-actions";

const MEMBER = "11111111-1111-4111-8111-111111111111";
const PARTNER = "22222222-2222-4222-8222-222222222222";

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  getUser.mockResolvedValue({ data: { user: { id: "super-1" } } });
  profileRole.mockReturnValue({ role: "super_admin" });
  rpc.mockResolvedValue({ data: "TWM-LA-IKJ-000007", error: null });
});

describe("moveMember", () => {
  it("rejects a caller who is not a super admin, before any rpc", async () => {
    profileRole.mockReturnValue({ role: "national_admin" });
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: "core" }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/super admin/i);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects a signed-out caller", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: "core" }));
    expect(res.status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });

  it("omits p_target_partner for a move to the core movement", async () => {
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: "core" }));
    expect(rpc).toHaveBeenCalledWith("move_member_to_partition", { p_member: MEMBER });
    expect(res).toEqual({ status: "success", message: "Member moved.", newNumber: "TWM-LA-IKJ-000007" });
  });

  it("passes the partner id for a move to a partner", async () => {
    rpc.mockResolvedValue({ data: "TWM-ACME-LA-IKJ-000001", error: null });
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: PARTNER }));
    expect(rpc).toHaveBeenCalledWith("move_member_to_partition", {
      p_member: MEMBER,
      p_target_partner: PARTNER,
    });
    expect(res.newNumber).toBe("TWM-ACME-LA-IKJ-000001");
  });

  it("surfaces an rpc error message", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "the member is outside the destination organisation's state ceiling" },
    });
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: PARTNER }));
    expect(res.status).toBe("error");
    expect(res.message).toMatch(/ceiling/i);
  });

  it("rejects a bad target", async () => {
    const res = await moveMember({ status: "idle" }, form({ member_id: MEMBER, target: "not-a-uuid" }));
    expect(res.status).toBe("error");
    expect(rpc).not.toHaveBeenCalled();
  });
});
