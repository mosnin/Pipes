import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("admin support inspection", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("returns workspace support summary with audits and signals", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|support", email: "support@pipes.local", name: "Support" });
    const systemId = await services.systems.create(ctx, { name: "Ops", description: "" });

    await services.signals.track(ctx, "onboarding_started");
    await services.protocol.writeAudit(ctx, { action: "protocol.system.create", targetType: "system", targetId: systemId, outcome: "success", systemId, metadata: JSON.stringify({ transport: "rest" }) });

    const inspection = await services.admin.inspectWorkspace(ctx);
    expect(inspection.workspaceId).toBe(ctx.workspaceId);
    expect(inspection.systems.length).toBeGreaterThan(0);
    expect(inspection.recentAudits.length).toBeGreaterThan(0);
    expect(inspection.recentSignals.some((row) => row.action === "signal.onboarding_started")).toBe(true);
  });
});
