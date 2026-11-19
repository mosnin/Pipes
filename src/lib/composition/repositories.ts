import { resolveRuntimeMode } from "@/lib/env";
import { createConvexRepositories } from "@/lib/repositories/convex";
import { createMockRepositories } from "@/lib/repositories/mock";

/** The repositories for this runtime, without requiring a signed-in user (auth routes, webhooks, cron). */
export function getRepositories() {
  return resolveRuntimeMode().mode === "provider" ? createConvexRepositories() : createMockRepositories();
}
