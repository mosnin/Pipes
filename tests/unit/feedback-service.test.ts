import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("feedback service", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("validates feedback payload and persists rows", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|fb", email: "owner@pipes.local", name: "Owner" });

    await expect(services.feedback.create(ctx, { category: "bug", severity: "high", summary: "short", page: "/dashboard" } as any)).rejects.toThrow("at least 8 characters");
    await expect(services.feedback.create(ctx, { category: "bug", severity: "high", summary: "Valid summary", page: "/dashboard", systemId: "bad id with spaces" } as any)).rejects.toThrow("systemId format is invalid");

    const created = await services.feedback.create(ctx, { category: "bug", severity: "high", summary: "Invite flow failed", details: "Could not send invite", page: "/settings/collaboration", systemId: "k17m5s9x1q2y4z8" });
    expect(created.id).toBeTruthy();

    const items = await services.feedback.list(ctx);
    expect(items[0]?.status).toBe("new");

    await services.feedback.updateStatus(ctx, { id: created.id, status: "reviewing" });
    const updated = await services.feedback.list(ctx, { status: "reviewing" });
    expect(updated.length).toBe(1);
    const statusAudits = await repos.audits.list(ctx.workspaceId, { actionPrefix: "feedback.status_updated" });
    expect(statusAudits).toHaveLength(1);
    expect(statusAudits[0]?.actorId).toBe(ctx.actorId);
    expect(statusAudits[0]?.targetId).toBe(created.id);

    await expect(services.feedback.updateStatus(ctx, { id: created.id, status: "invalid" as any })).rejects.toThrow("Invalid feedback status");
  });
});
