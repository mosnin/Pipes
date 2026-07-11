import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { looperService } from "@/domain/services";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("schema export through service layer", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("exports persisted graph data", async () => {
    const ctx = await looperService.ensureProvisioned({ externalId: "mock|usr_1", email: "owner@pipes.local", name: "Alex Rivera" });
    const systemId = (await looperService.listSystems(ctx))[0].id;
    await looperService.addNode(ctx, systemId, { type: "Agent", title: "Live Node", x: 10, y: 20 });
    const schema = JSON.parse(await looperService.exportSchema(ctx, systemId));
    expect(schema.nodes.some((node: { title: string }) => node.title === "Live Node")).toBe(true);
  });
});
