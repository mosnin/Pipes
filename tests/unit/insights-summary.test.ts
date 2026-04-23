import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("product insights summary", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("calculates activation, failure, and retention counters", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|insights", email: "insights@pipes.local", name: "Insights" });

    await services.signals.track(ctx, "onboarding_started");
    await services.signals.track(ctx, "onboarding_completed");
    await services.signals.track(ctx, "dashboard_search_used");
    await services.signals.track(ctx, "search_no_results");
    await services.signals.track(ctx, "autosave_failure");
    await services.signals.track(ctx, "editor_crash_boundary_triggered");
    await services.signals.track(ctx, "favorite_added");

    const summary = await services.insights.summary(ctx);
    expect(summary.activation.onboardingStarted).toBe(1);
    expect(summary.activation.onboardingCompleted).toBe(1);
    expect(summary.product.searchUsed).toBe(1);
    expect(summary.product.searchNoResults).toBe(1);
    expect(summary.failures.autosaveFailure).toBe(1);
    expect(summary.failures.editorCrashBoundary).toBe(1);
    expect(summary.retention.favoritesAdded).toBe(1);
    expect(summary.rates.searchNoResultRate).toBe(1);
  });
});
