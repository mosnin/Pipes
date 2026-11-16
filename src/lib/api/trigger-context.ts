import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

/** The context a trigger (webhook or schedule) acts under: the system's workspace, as a non-human actor. */
export async function triggerContext(repositories: RepositorySet, workspaceId: string, actorId: string): Promise<AppContext> {
  const plan = await repositories.entitlements.getPlan(workspaceId);
  return { userId: actorId, workspaceId, role: "Editor", plan, actorType: "agent", actorId };
}
