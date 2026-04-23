import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mocked }));

describe("collaboration route integration", () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({
      ctx: {},
      services: {
        governance: { memberDirectory: vi.fn().mockResolvedValue({ members: [{ userId: "usr_1", role: "Admin" }], invites: [{ email: "a@b.com", role: "Viewer", status: "pending", expiresAt: "2026-01-01" }] }) },
        collaboration: { invite: vi.fn(), updateMemberRole: vi.fn() }
      }
    });
  });

  it("returns filtered member directory payload", async () => {
    const { GET } = await import("@/app/api/workspace/collaborators/route");
    const res = await GET(new Request("http://localhost/api/workspace/collaborators?q=usr"));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.members[0].userId).toBe("usr_1");
  });
});
