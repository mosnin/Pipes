import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("governance role safety", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("blocks owner role modification and owner transfer in this pass", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|owner", email: "owner@pipes.local", name: "Owner" });
    await expect(services.collaboration.updateMemberRole(ctx, ctx.userId, "Admin")).rejects.toThrow("Owner role cannot be changed");
  });
});
