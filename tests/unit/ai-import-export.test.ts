import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";
import { AiSystemDraftSchema } from "@/lib/ai";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("ai + template + import/export", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("validates AI draft schema and rejects malformed output", () => {
    expect(() => AiSystemDraftSchema.parse({ systemName: "x", nodes: [] })).toThrow();
  });

  it("gates AI generation by entitlement plan", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|a", email: "a@pipes.local", name: "A" });
    await repos.entitlements.upsertPlanState({ workspaceId: ctx.workspaceId, plan: "Pro", status: "active" });
    await expect(services.ai.generateDraft(ctx, { prompt: "build" })).rejects.toThrow("Builder");
  });

  it("supports generate draft then commit integration flow", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|b", email: "b@pipes.local", name: "B" });
    await repos.entitlements.upsertPlanState({ workspaceId: ctx.workspaceId, plan: "Builder", status: "active" });
    const draft = await services.ai.generateDraft(ctx, { prompt: "support router" });
    const committed = await services.ai.commitDraft(ctx, draft);
    expect(committed.systemId).toBeTruthy();
  });

  it("imports canonical schema with diagnostics and exports deterministically", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|c", email: "c@pipes.local", name: "C" });
    await repos.entitlements.upsertPlanState({ workspaceId: ctx.workspaceId, plan: "Builder", status: "active" });
    const draft = await services.ai.commitDraft(ctx, await services.ai.generateDraft(ctx, { prompt: "ops flow" }));
    const exported = await services.importExport.exportSystem(ctx, draft.systemId);
    const imported = await services.importExport.importSchema(ctx, exported.canonical, "new");
    expect(imported.ok).toBe(true);
    if (!("systemId" in imported)) throw new Error("Expected systemId from new import.");
    const exportedAgain = await services.importExport.exportSystem(ctx, imported.systemId as string);
    expect(exportedAgain.schemaVersion).toBe("pipes_schema_v1");
  });

  it("applies only selected AI changes and skips rejected changes", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|sel", email: "sel@pipes.local", name: "Sel" });
    await repos.entitlements.upsertPlanState({ workspaceId: ctx.workspaceId, plan: "Builder", status: "active" });
    const created = await services.systems.create(ctx, { name: "Selective", description: "" });
    const before = await services.systems.getBundle(ctx, created);

    const suggestion = {
      summary: "test selective edits",
      changes: [
        { id: "c1", action: "addNode", payload: { id: "n_ai", type: "Agent", title: "AI Node", x: 100, y: 100 } },
        { id: "c2", action: "addPipe", payload: { fromNodeId: "n_ai", toNodeId: before.nodes[0]?.id } }
      ]
    };

    const result = await services.ai.applyEdits(ctx, created, suggestion, ["c1"]);
    expect(result.appliedChangeIds).toEqual(["c1"]);
    const after = await services.systems.getBundle(ctx, created);
    expect(after.nodes.some((n) => n.title === "AI Node")).toBe(true);
  });

  it("plans and applies existing-system merge with checkpoint safety", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|merge", email: "merge@pipes.local", name: "Merge" });
    await repos.entitlements.upsertPlanState({ workspaceId: ctx.workspaceId, plan: "Builder", status: "active" });
    const target = await services.ai.commitDraft(ctx, await services.ai.generateDraft(ctx, { prompt: "target flow" }));
    const source = await services.ai.commitDraft(ctx, await services.ai.generateDraft(ctx, { prompt: "source flow" }));
    const exported = await services.importExport.exportSystem(ctx, source.systemId);

    const plan = await services.importExport.planMerge(ctx, exported.canonical, target.systemId);
    expect(plan.ok).toBe(true);
    const applied = await services.importExport.applyMerge(ctx, plan, "safe_upsert");
    expect(applied.ok).toBe(true);
    const versions = await services.versions.list(ctx, target.systemId);
    expect(versions.length).toBeGreaterThan(0);
  });
});
