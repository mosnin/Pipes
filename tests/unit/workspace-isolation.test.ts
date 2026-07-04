import { describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

// The seeded mock DB gives workspace wks_1 ownership of the sample system.
// The "intruder" is a fully valid Owner — but of a DIFFERENT workspace. A
// role check alone would let them through; only resource-ownership guards
// stop them. These tests lock in that every system-scoped operation refuses
// a system the caller's workspace does not own (IDOR protection).
const owner = { userId: "usr_1", workspaceId: "wks_1", role: "Owner", plan: "Pro", actorType: "user", actorId: "usr_1" } as const;
const intruder = { userId: "usr_evil", workspaceId: "wks_evil", role: "Owner", plan: "Pro", actorType: "user", actorId: "usr_evil" } as const;

async function seededSystemId() {
  const repos = createMockRepositories();
  const services = createBoundedServices(repos);
  const systemId = (await repos.systems.list(owner.workspaceId))[0]?.id;
  if (!systemId) throw new Error("expected a seeded system for wks_1");
  return { repos, services, systemId };
}

describe("workspace data isolation (IDOR)", () => {
  it("lets the owning workspace read its own system", async () => {
    const { services, systemId } = await seededSystemId();
    const bundle = await services.systems.getBundle(owner as never, systemId);
    expect(bundle.system.id).toBe(systemId);
  });

  it("denies reading another workspace's system bundle", async () => {
    const { services, systemId } = await seededSystemId();
    await expect(services.systems.getBundle(intruder as never, systemId)).rejects.toThrow(/not found/i);
  });

  it("denies mutating another workspace's graph", async () => {
    const { services, systemId } = await seededSystemId();
    await expect(
      services.graph.mutate(intruder as never, { action: "addNode", systemId, type: "Processor", title: "x" })
    ).rejects.toThrow(/not found/i);
  });

  it("denies deleting, renaming, and exporting another workspace's system", async () => {
    const { services, systemId } = await seededSystemId();
    await expect(services.systems.delete(intruder as never, systemId)).rejects.toThrow(/not found/i);
    await expect(services.systems.rename(intruder as never, systemId, "hacked")).rejects.toThrow(/not found/i);
    await expect(services.schema.export(intruder as never, systemId)).rejects.toThrow(/not found/i);
  });

  it("denies commenting on and reading presence of another workspace's system", async () => {
    const { services, systemId } = await seededSystemId();
    await expect(
      services.comments.add(intruder as never, { systemId, body: "leak" })
    ).rejects.toThrow(/not found/i);
    await expect(services.presence.list(intruder as never, systemId)).rejects.toThrow(/not found/i);
  });

  it("rejects a graph action with no systemId", async () => {
    const { services } = await seededSystemId();
    await expect(
      services.graph.mutate(owner as never, { action: "deleteNode", nodeId: "n_whatever" } as never)
    ).rejects.toThrow(/invalid graph action/i);
  });
});
