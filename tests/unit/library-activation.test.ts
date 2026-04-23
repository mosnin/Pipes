import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("system library + onboarding activation", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("supports favorites, tags, archive/restore, and search", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|lib", email: "lib@pipes.local", name: "Lib" });
    const a = await services.systems.create(ctx, { name: "Support Router", description: "Ticket flow" });
    const b = await services.systems.create(ctx, { name: "Research Planner", description: "Knowledge workflow" });

    await services.library.setFavorite(ctx, a, true);
    await services.library.setTags(ctx, a, ["support", "ops"]);
    await services.library.markOpened(ctx, b);

    const favorites = await services.library.query(ctx, { status: "favorites" });
    expect(favorites.rows.some((row) => row.id === a)).toBe(true);

    const search = await services.library.query(ctx, { q: "support", status: "active" });
    expect(search.rows).toHaveLength(1);

    await services.library.archive(ctx, a);
    const archived = await services.library.query(ctx, { status: "archived" });
    expect(archived.rows.some((row) => row.id === a)).toBe(true);

    await services.library.restore(ctx, a);
    const active = await services.library.query(ctx, { status: "active" });
    expect(active.rows.some((row) => row.id === a)).toBe(true);
  });

  it("records onboarding completion and activation signals", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|onb", email: "onb@pipes.local", name: "Onb" });
    await services.onboarding.start(ctx);
    await services.systems.create(ctx, { name: "First", description: "" });
    await services.onboarding.complete(ctx, { chosenPath: "template", role: "ops", useCase: "support" });

    const audits = await repos.audits.list(ctx.workspaceId, { actionPrefix: "signal." });
    expect(audits.some((a) => a.action === "signal.onboarding_started")).toBe(true);
    expect(audits.some((a) => a.action === "signal.onboarding_completed")).toBe(true);
    expect(audits.some((a) => a.action === "signal.activation_achieved")).toBe(true);
  });
});
