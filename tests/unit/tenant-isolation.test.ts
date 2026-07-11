import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

// Regression guard for the cross-tenant IDOR found in the security audit:
// role checks proved the caller had a role in THEIR workspace but never bound
// the target systemId to it, so any user could read/edit/delete another
// tenant's system by passing its id. The service-layer ownership guards close
// this, returning the SAME non-revealing "System not found" for both a
// cross-tenant system and a nonexistent one (no existence oracle). These tests
// must never regress.
describe("cross-tenant isolation (IDOR)", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("blocks reading, editing, and deleting another workspace's system by id", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);

    const alice = await repos.users.provision({ externalId: "mock|alice", email: "alice@a.test", name: "Alice" });
    const bob = await repos.users.provision({ externalId: "mock|bob", email: "bob@b.test", name: "Bob" });
    expect(alice.workspaceId).not.toBe(bob.workspaceId);

    const sysId = await services.systems.create(alice, { name: "Alice secret loop" });

    // Bob, a legitimate user in his OWN workspace, must not reach Alice's system.
    await expect(services.systems.getBundle(bob, sysId)).rejects.toThrow(/System not found/);
    await expect(services.systems.delete(bob, sysId)).rejects.toThrow(/System not found/);
    await expect(services.systems.rename(bob, sysId, "hacked")).rejects.toThrow(/System not found/);
    await expect(services.systems.archive(bob, sysId)).rejects.toThrow(/System not found/);

    // Alice still has full access to her own system.
    const bundle = await services.systems.getBundle(alice, sysId);
    expect(bundle.system.name).toBe("Alice secret loop");
  });

  it("reports a clean 'System not found.' for ids that do not exist", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const alice = await repos.users.provision({ externalId: "mock|alice2", email: "alice2@a.test", name: "Alice" });
    await expect(services.systems.getBundle(alice, "sys_does_not_exist")).rejects.toThrow(/System not found/);
  });
});
