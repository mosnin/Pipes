import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

async function setup() {
  const repos = createMockRepositories();
  const services = createBoundedServices(repos);
  const owner = await repos.users.provision({ externalId: "mock|owner", email: "owner@pipes.local", name: "Owner User" });
  return { repos, services, owner };
}

describe("billing + invite business flow", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("maps billing webhook event into plan state", async () => {
    const { repos } = await setup();
    await repos.entitlements.upsertPlanState({ workspaceId: "wks_1", plan: "Builder", status: "active" });
    const state = await repos.entitlements.getPlanState("wks_1");
    expect(state.plan).toBe("Builder");
  });

  it("blocks over-limit system creation after downgrade without deleting data", async () => {
    const { repos, services, owner } = await setup();
    await repos.entitlements.upsertPlanState({ workspaceId: owner.workspaceId, plan: "Pro", status: "active" });
    await services.systems.create(owner, { name: "A" });
    await services.systems.create(owner, { name: "B" });
    await services.systems.create(owner, { name: "C" });
    await services.systems.create(owner, { name: "D" });
    await repos.entitlements.upsertPlanState({ workspaceId: owner.workspaceId, plan: "Free", status: "active" });
    await expect(services.systems.create(owner, { name: "E" })).rejects.toThrow("Plan limit reached");
    expect((await services.systems.list(owner)).length).toBe(4);
  });

  it("supports invite creation and acceptance", async () => {
    const { repos, services, owner } = await setup();
    await repos.entitlements.upsertPlanState({ workspaceId: owner.workspaceId, plan: "Pro", status: "active" });
    const invite = await services.collaboration.invite(owner, "invitee@pipes.local", "Editor");
    const recipient = await repos.users.provision({ externalId: "mock|recipient", email: "invitee@pipes.local", name: "Recipient" });
    await services.collaboration.acceptInvite(recipient, invite.token);

    const members = await repos.memberships.list(owner.workspaceId);
    expect(members.some((m) => m.userId === recipient.userId && m.role === "Editor")).toBe(true);

    const invites = await repos.invites.list(owner.workspaceId);
    expect(invites.find((i) => i.token === invite.token)?.status).toBe("accepted");
  });
});
