import { getAuthService } from "@/lib/auth";
import { resolveRuntimeMode } from "@/lib/env";
import { createConvexRepositories } from "@/lib/repositories/convex";
import { createMockRepositories } from "@/lib/repositories/mock";
import { createBoundedServices } from "@/domain/services/bounded";

/** The repositories for this runtime, without requiring a signed-in user (auth routes, webhooks, cron). */
export function getRepositories() {
  return resolveRuntimeMode().mode === "provider" ? createConvexRepositories() : createMockRepositories();
}

export async function getServerApp() {
  const runtime = resolveRuntimeMode();
  const identity = await getAuthService().requireUser();
  const repositories = getRepositories();

  const ctx = await repositories.users.provision(identity);
  const plan = await repositories.entitlements.getPlan(ctx.workspaceId);
  const services = createBoundedServices(repositories);

  return {
    identity,
    ctx: { ...ctx, plan },
    services,
    repositories,
    runtimeMode: runtime.mode,
    runtimeWarning: runtime.warning
  };
}
