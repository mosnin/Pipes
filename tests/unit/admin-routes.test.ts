import { beforeEach, describe, expect, it, vi } from "vitest";

const summary = { activation: {}, product: {}, protocol: {}, failures: {}, retention: {}, rates: {}, recentSignalCounts: [], recentSignals: [] };
const support = { workspace: { workspaceId: "wks_1", plan: { plan: "Free", status: "trialing" }, systems: [], invites: [], tokens: [], recentAudits: [], recentSignals: [], health: { activeSystems: 0, favorites: 0, taggedSystems: 0, recentReopens: 0 } }, audits: [], user: null, system: null, actorAudits: [] };

const mocked = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mocked }));

describe("admin endpoints", () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({
      identity: { email: "owner@pipes.local" },
      ctx: { workspaceId: "wks_1" },
        services: {
          access: { ensureInternalOperator: vi.fn() },
          insights: { summary: vi.fn().mockResolvedValue(summary) },
          admin: { inspectWorkspace: vi.fn().mockResolvedValue(support.workspace), findUser: vi.fn().mockResolvedValue(null), inspectSystem: vi.fn().mockResolvedValue(null) },
          protocol: { listAudits: vi.fn().mockResolvedValue([]) }
        }
      });
  });

  it("serves admin insights payload", async () => {
    const { GET } = await import("@/app/api/admin/insights/route");
    const res = await GET(new Request("http://localhost/api/admin/insights"));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data).toEqual(summary);
  });

  it("serves admin support payload", async () => {
    const { GET } = await import("@/app/api/admin/support/route");
    const res = await GET(new Request("http://localhost/api/admin/support"));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.workspace.workspaceId).toBe("wks_1");
  });
});
