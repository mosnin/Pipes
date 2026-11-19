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

  it("blocks changing your own role, and changing the Owner", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|owner", email: "owner@pipes.local", name: "Owner" });
    await expect(services.collaboration.updateMemberRole(ctx, ctx.userId, "Admin")).rejects.toThrow("your own role");
    await expect(services.collaboration.removeMember(ctx, ctx.userId)).rejects.toThrow("remove yourself");
  });

  it("moves ownership in one step and keeps the old Owner as an Admin", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const owner = await repos.users.provision({ externalId: "mock|owner2", email: "owner2@pipes.local", name: "Owner" });
    const other = await repos.users.provision({ externalId: "mock|member2", email: "member2@pipes.local", name: "Member" });
    await repos.memberships.add(owner.workspaceId, other.userId, "Editor");
    const admin = { ...owner, role: "Admin" as const };
    await expect(services.collaboration.transferOwnership(admin, other.userId)).rejects.toThrow("Owner role");
    await expect(services.collaboration.updateMemberRole(admin, other.userId, "Admin")).rejects.toThrow("cannot give the Admin");
    await services.collaboration.transferOwnership(owner, other.userId);
    const roles = Object.fromEntries((await repos.memberships.list(owner.workspaceId)).map((m) => [m.userId, m.role]));
    expect(roles[other.userId]).toBe("Owner");
    expect(roles[owner.userId]).toBe("Admin");
    await services.collaboration.removeMember({ ...owner, role: "Admin" }, other.userId).catch((e: Error) => expect(e.message).toMatch(/Owner cannot/));
  });
});
