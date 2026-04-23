import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { pipesService } from "@/domain/services";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

const identity = { externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" };

describe("bounded service business rules", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("provisions user and workspace", async () => {
    const ctx = await pipesService.ensureProvisioned(identity);
    expect(ctx.workspaceId).toBeTruthy();
    expect(ctx.role).toBe("Owner");
  });

  it("enforces system creation limit for free plan", async () => {
    const ctx = await pipesService.ensureProvisioned({ externalId: "mock|new-user", email: "new@pipes.local", name: "New User" });
    await pipesService.createSystem(ctx, { name: "A" });
    await pipesService.createSystem(ctx, { name: "B" });
    await pipesService.createSystem(ctx, { name: "C" });
    await expect(pipesService.createSystem(ctx, { name: "D" })).rejects.toThrow("Plan limit reached");
  });

  it("creates and restores versions", async () => {
    const ctx = await pipesService.ensureProvisioned(identity);
    const systemId = (await pipesService.listSystems(ctx))[0].id;
    await pipesService.createVersion(ctx, systemId, "before");
    const versions = await pipesService.listVersions(ctx, systemId);
    expect(versions.length).toBeGreaterThan(0);
    await pipesService.restoreVersion(ctx, systemId, versions[0].id);
    expect((await pipesService.listVersions(ctx, systemId)).length).toBeGreaterThanOrEqual(1);
  });
});
