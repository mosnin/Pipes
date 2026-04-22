import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("governance export and lifecycle", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("produces workspace export manifest with trust metadata", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|exp", email: "exp@pipes.local", name: "Export" });
    await services.systems.create(ctx, { name: "A", description: "" });

    const manifest = await services.governance.workspaceExportManifest(ctx);
    expect(manifest.exportVersion).toBe("workspace_manifest_v1");
    expect(manifest.schemaVersion).toBe("pipes_schema_v1");
    expect(manifest.systems.length).toBeGreaterThan(0);
  });

  it("supports bounded workspace deactivate/reactivate and default retention", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|life", email: "life@pipes.local", name: "Life" });

    const before = await services.governance.getTrustSettings(ctx);
    expect(before.retention.archivedSystemRetentionDays).toBeGreaterThanOrEqual(30);

    await expect(services.governance.deactivateWorkspace(ctx, "maintenance", "WRONG")).rejects.toThrow("Confirmation phrase mismatch");
    const deactivated = await services.governance.deactivateWorkspace(ctx, "maintenance", "DEACTIVATE");
    expect(deactivated.workspaceState.state).toBe("deactivated");

    const active = await services.governance.reactivateWorkspace(ctx);
    expect(active.workspaceState.state).toBe("active");
  });
});
