import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.fn();
vi.mock("@/lib/composition/server", () => ({ getServerApp: mocked }));

const trust = { auth: { mode: "shared", allowedDomains: [], enforceDomainMatch: false }, retention: { archivedSystemRetentionDays: 365, inviteExpiryDays: 7, staleTokenDays: 90, auditRetentionDays: 365, signalRetentionDays: 365 }, workspaceState: { state: "active" }, deletionSemantics: { systems: "archive_restore_supported" } };

describe("trust settings route integration", () => {
  beforeEach(() => {
    mocked.mockReset();
    mocked.mockResolvedValue({
      ctx: {},
      services: {
        governance: {
          getTrustSettings: vi.fn().mockResolvedValue(trust),
          updateEnterpriseAuth: vi.fn().mockResolvedValue(trust),
          updateRetentionPolicy: vi.fn().mockResolvedValue(trust),
          deactivateWorkspace: vi.fn().mockResolvedValue(trust),
          reactivateWorkspace: vi.fn().mockResolvedValue(trust),
          workspaceExportManifest: vi.fn().mockResolvedValue({ exportVersion: "workspace_manifest_v1", schemaVersion: "pipes_schema_v1", systems: [] })
        }
      }
    });
  });

  it("serves trust settings and workspace export manifest", async () => {
    const trustRoute = await import("@/app/api/settings/trust/route");
    const exportRoute = await import("@/app/api/settings/export/workspace/route");
    const trustRes = await trustRoute.GET();
    const trustBody = await trustRes.json();
    expect(trustBody.ok).toBe(true);

    const exportRes = await exportRoute.GET();
    const exportBody = await exportRes.json();
    expect(exportBody.ok).toBe(true);
    expect(exportBody.data.exportVersion).toBe("workspace_manifest_v1");
  });
});
