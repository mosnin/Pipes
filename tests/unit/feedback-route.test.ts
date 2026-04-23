import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mocked }));

describe("feedback route", () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({
      identity: { email: "owner@pipes.local" },
      ctx: { workspaceId: "wks_1", userId: "usr_1", actorType: "user", actorId: "usr_1", role: "Owner", plan: "Pro" },
      services: {
        feedback: { create: vi.fn().mockResolvedValue({ id: "fbk_1" }) }
      }
    });
  });

  it("submits structured feedback", async () => {
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: "bug", severity: "high", summary: "Something broke", details: "extra", page: "/dashboard" }) }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBe("fbk_1");
  });

  it("returns 400 on malformed system id", async () => {
    mocked.mockResolvedValueOnce({
      identity: { email: "owner@pipes.local" },
      ctx: { workspaceId: "wks_1", userId: "usr_1", actorType: "user", actorId: "usr_1", role: "Owner", plan: "Pro" },
      services: {
        feedback: { create: vi.fn().mockRejectedValue(new Error("Feedback systemId format is invalid.")) }
      }
    });
    const { POST } = await import("@/app/api/feedback/route");
    const res = await POST(new Request("http://localhost/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category: "bug", severity: "high", summary: "Something broke", page: "/dashboard", systemId: "bad id" }) }));
    expect(res.status).toBe(400);
  });
});
