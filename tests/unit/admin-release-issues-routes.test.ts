import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mocked }));

describe("admin release and issue routes", () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({
      identity: { email: "owner@pipes.local" },
      ctx: { workspaceId: "wks_1", userId: "usr_1" },
      services: {
        access: { ensureInternalOperator: vi.fn() },
        release: { summary: vi.fn().mockResolvedValue({ environment: { workspaceId: "wks_1" }, summaries: {}, checklist: { criticalFlows: [] }, links: [], issues: { items: [], openCount: 0 }, }) },
        triage: { list: vi.fn().mockResolvedValue({ items: [], failureGroups: [], openCount: 0 }) },
        feedback: { updateStatus: vi.fn().mockImplementation(async (_ctx: any, input: any) => { if (!["new", "reviewing", "closed"].includes(input.status)) throw new Error("Invalid feedback status."); }) }
      }
    });
  });

  it("serves admin release summary", async () => {
    const { GET } = await import("@/app/api/admin/release/route");
    const res = await GET(new Request("http://localhost/api/admin/release"));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.environment.workspaceId).toBe("wks_1");
  });

  it("serves issue triage list and status updates", async () => {
    const { GET, PATCH } = await import("@/app/api/admin/issues/route");
    const listRes = await GET(new Request("http://localhost/api/admin/issues"));
    const listBody = await listRes.json();
    expect(listBody.ok).toBe(true);

    const patchRes = await PATCH(new Request("http://localhost/api/admin/issues", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "fbk_1", status: "closed" }) }));
    const patchBody = await patchRes.json();
    expect(patchBody.ok).toBe(true);

    const badRes = await PATCH(new Request("http://localhost/api/admin/issues", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: "fbk_1", status: "bogus" }) }));
    expect(badRes.status).toBe(400);
  });
});
