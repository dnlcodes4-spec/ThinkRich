import { beforeEach, describe, expect, it, vi } from "vitest";

// The partnership form is a public, unauthenticated endpoint that writes with the
// service role. Three behaviours matter and none is a type or a constraint:
// the honeypot silently swallows bots, a duplicate from an open request is
// dropped, and a real submission lands + notifies the super admins.

const insert = vi.fn();
const openLookup = vi.fn();
const superAdmins = vi.fn();
const notify = vi.fn();

const adminClient = {
  from: (table: string) => {
    if (table === "partnership_requests") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: openLookup() }) }),
          }),
        }),
        insert: (row: unknown) => {
          insert(row);
          return { select: () => ({ single: async () => ({ data: { id: "req-1" } }) }) };
        },
      };
    }
    if (table === "profiles") {
      return { select: () => ({ eq: async () => ({ data: superAdmins() }) }) };
    }
    throw new Error(`unexpected table ${table}`);
  },
};

vi.mock("@/lib/supabase/admin", () => ({
  tryCreateAdminClient: () => adminClient,
}));
vi.mock("@/lib/notify", () => ({ notify: (...args: unknown[]) => notify(...args) }));

import { requestPartnership } from "./actions";

const form = (fields: Record<string, string>) => {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
};

const valid = {
  name: "Ada Candidate",
  organization: "Ada for Senate",
  email: "ada@example.com",
  message: "We have thousands of supporters and want them organised on the platform.",
};

beforeEach(() => {
  vi.clearAllMocks();
  openLookup.mockReturnValue(null);
  superAdmins.mockReturnValue([{ id: "su-1" }, { id: "su-2" }]);
});

describe("requestPartnership", () => {
  it("silently swallows a submission with the honeypot filled", async () => {
    const res = await requestPartnership({ status: "idle" }, form({ ...valid, company: "a bot" }));
    expect(res.status).toBe("success");
    expect(insert).not.toHaveBeenCalled();
  });

  it("returns field errors for an invalid submission", async () => {
    const res = await requestPartnership({ status: "idle" }, form({ ...valid, message: "too short" }));
    expect(res.status).toBe("error");
    expect(res.fieldErrors?.message).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it("drops a duplicate while an earlier request is still open", async () => {
    openLookup.mockReturnValue({ id: "already-open" });
    const res = await requestPartnership({ status: "idle" }, form(valid));
    expect(res.status).toBe("success");
    expect(insert).not.toHaveBeenCalled();
  });

  it("stores a real submission and notifies every super admin", async () => {
    const res = await requestPartnership({ status: "idle" }, form({ ...valid, role: "Campaign Director" }));
    expect(res.status).toBe("success");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ organization: "Ada for Senate", role_title: "Campaign Director" }),
    );
    expect(notify).toHaveBeenCalledWith(
      ["su-1", "su-2"],
      expect.objectContaining({ type: "partnership.request", link: "/app/admin/partners/requests" }),
    );
  });

  it("still acknowledges when the notification throws", async () => {
    notify.mockRejectedValueOnce(new Error("push down"));
    const res = await requestPartnership({ status: "idle" }, form(valid));
    expect(res.status).toBe("success");
    expect(insert).toHaveBeenCalled();
  });
});
