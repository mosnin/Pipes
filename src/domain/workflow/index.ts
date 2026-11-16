import { createConnectionService } from "@/domain/connections/service";
import { createDesignService } from "@/domain/design/service";
import { createRunService } from "@/domain/runs/service";
import type { CurrentStep } from "@/domain/runs/types";
import { createTriggerService } from "@/domain/triggers/service";
import { createUsageService } from "@/domain/usage/service";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";

/**
 * The workflow layer: design documents, runs, triggers, connections and usage,
 * wired together (run events go out through the system's outbound webhook).
 */
export function createWorkflowServices(repos: RepositorySet) {
  const triggers = createTriggerService(repos);
  const runs = createRunService(repos, { onEvent: ({ type, run }) => triggers.deliver(type, run) });
  const connections = createConnectionService(repos);

  return {
    design: createDesignService(repos),
    usage: createUsageService(repos),
    triggers,
    runs,
    connections,

    /** The current step with its connections resolved, ready to hand to a performer. */
    async currentStepWithConnections(ctx: AppContext, runId: string, options: { withSecrets: boolean }): Promise<CurrentStep & { connections: Awaited<ReturnType<typeof connections.resolve>> }> {
      const current = await runs.current(ctx, runId);
      const resolved = current.step ? await connections.resolve(ctx.workspaceId, current.step.connectionIds, options.withSecrets) : [];
      return { ...current, connections: resolved };
    }
  };
}

export type WorkflowServices = ReturnType<typeof createWorkflowServices>;
