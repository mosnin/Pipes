import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("audit filtering", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("filters by actor, transport, system, action family, and outcome", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|audit", email: "audit@pipes.local", name: "Audit" });
    const systemId = await services.systems.create(ctx, { name: "S1", description: "" });

    await services.protocol.writeAudit(ctx, { action: "protocol.graph.addNode", targetType: "system", targetId: systemId, systemId, outcome: "success", metadata: JSON.stringify({ transport: "rest" }) });
    await services.protocol.writeAudit(ctx, { action: "protocol.graph.deleteNode", targetType: "system", targetId: systemId, systemId, outcome: "failure", metadata: JSON.stringify({ transport: "mcp" }) });

    const filtered = await services.protocol.listAudits(ctx, { actionPrefix: "protocol.graph", systemId, transport: "rest", outcome: "success" });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].action).toBe("protocol.graph.addNode");
  });
});
