import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";
import { env } from "@/lib/env";

const DB_FILE = path.join(process.cwd(), ".pipes-db.json");

describe("release review service", () => {
  beforeEach(() => {
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
  });

  it("builds operator release summary with failure grouping", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|release", email: "ops@pipes.local", name: "Ops" });

    await repos.audits.add({ actorType: "user", actorId: ctx.userId, workspaceId: ctx.workspaceId, action: "auth.login", targetType: "auth", outcome: "failure" });
    await services.signals.track(ctx, "onboarding_started");
    await services.signals.track(ctx, "editor_crash_boundary_triggered");
    await services.feedback.create(ctx, { category: "bug", severity: "high", summary: "Editor failed to recover", details: "Crashed during drag", page: "/systems/sys_1" });

    const summary = await services.release.summary(ctx);
    expect(summary.environment.workspaceId).toBe(ctx.workspaceId);
    expect(summary.summaries.failures.some((item: any) => item.key === "signup_auth_failures")).toBe(true);
    expect(summary.issues.items.length).toBeGreaterThan(0);
    expect(summary.links.some((link: any) => link.href === "/docs")).toBe(true);
  });

  it("reports runtime mode from effective config path", async () => {
    const repos = createMockRepositories();
    const services = createBoundedServices(repos);
    const ctx = await repos.users.provision({ externalId: "mock|release-mode", email: "ops@pipes.local", name: "Ops" });
    const prevMocks = env.PIPES_USE_MOCKS;
    const prevConvex = env.CONVEX_URL;
    const prevClerkSecret = env.CLERK_SECRET_KEY;
    const prevClerkPub = env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    try {
      (env as any).PIPES_USE_MOCKS = true;
      (env as any).CONVEX_URL = "https://convex.example";
      const forcedMockSummary = await services.release.summary(ctx);
      expect(forcedMockSummary.environment.runtimeMode).toBe("mock");
      expect(forcedMockSummary.environment.configurationWarning).toBeNull();

      (env as any).PIPES_USE_MOCKS = false;
      (env as any).CONVEX_URL = undefined;
      const fallbackSummary = await services.release.summary(ctx);
      expect(fallbackSummary.environment.runtimeMode).toBe("fallback_mock");
      expect(String(fallbackSummary.environment.configurationWarning ?? "")).toContain("CONVEX_URL");

      (env as any).CLERK_SECRET_KEY = undefined;
      (env as any).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = undefined;
      (env as any).CONVEX_URL = "https://convex.example";
      const providerSummary = await services.release.summary(ctx);
      expect(providerSummary.environment.runtimeMode).toBe("fallback_mock");
      expect(providerSummary.environment.providerReadiness.authConfigured).toBe(false);

      (env as any).CLERK_SECRET_KEY = "sk_test_abc";
      (env as any).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "pk_test_abc";
      const fullProviderSummary = await services.release.summary(ctx);
      expect(fullProviderSummary.environment.runtimeMode).toBe("provider");
    } finally {
      (env as any).PIPES_USE_MOCKS = prevMocks;
      (env as any).CONVEX_URL = prevConvex;
      (env as any).CLERK_SECRET_KEY = prevClerkSecret;
      (env as any).NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = prevClerkPub;
    }
  });
});
