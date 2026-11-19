import { createConnectionService } from "@/domain/connections/service";
import { createDecisionService } from "@/domain/decisions/service";
import { createDesignService } from "@/domain/design/service";
import { recallProvider } from "@/domain/memory/recall";
import { createMemoryService, publicFact } from "@/domain/memory/service";
import { env } from "@/lib/env";
import { getSkill } from "@/lib/skills/catalog";
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
  const decisions = createDecisionService(repos);
  const runs = createRunService(repos, { onEvent: ({ type, run }) => triggers.deliver(type, run), decisions });
  const connections = createConnectionService(repos);
  const memory = createMemoryService(repos, undefined, recallProvider(env));

  return {
    design: createDesignService(repos),
    usage: createUsageService(repos),
    triggers,
    runs,
    decisions,
    connections,
    memory,

    /**
     * Complete the current step, then store any facts the performer asked
     * Pipes to remember. A fact that cannot be stored never undoes the
     * completion; it comes back in `remembered` with the reason.
     */
    async completeStep(ctx: AppContext, runId: string, input: Parameters<typeof runs.complete>[2] & { remember?: unknown }) {
      const before = await runs.get(ctx, runId);
      const run = await runs.complete(ctx, runId, input);
      const items = Array.isArray(input.remember) ? input.remember.slice(0, 10) : [];
      const step = before.steps[before.steps.length - 1];
      const remembered: Array<{ text: string; ok: boolean; id?: string; error?: string }> = [];
      for (const item of items) {
        const text = typeof item === "string" ? item : item && typeof item === "object" ? (item as { text?: unknown }).text : undefined;
        const key = item && typeof item === "object" ? (item as { key?: unknown }).key : undefined;
        const asked = item && typeof item === "object" ? (item as { scope?: unknown }).scope : undefined;
        const scope = asked === "private" ? "private" : asked === "team" || asked === "workspace" ? "team" : "workflow";
        try {
          const { fact } = await memory.remember(ctx, { scope, systemId: run.systemId, text, key, source: { type: "run", actorId: ctx.actorId, label: input.actorLabel ?? (ctx.actorType === "agent" ? "An agent" : "A person"), runId, nodeId: step?.nodeId, stepTitle: step?.nodeTitle } });
          remembered.push({ text: fact.text, ok: true, id: fact.id });
        } catch (error) {
          remembered.push({ text: String(text ?? ""), ok: false, error: (error as Error).message });
        }
      }
      return { run, remembered };
    },

    /** The current step with its connections resolved, ready to hand to a performer. */
    async currentStepWithConnections(ctx: AppContext, runId: string, options: { withSecrets: boolean }): Promise<CurrentStep & { connections: Awaited<ReturnType<typeof connections.resolve>>; memory: ReturnType<typeof publicFact>[]; guides?: Array<{ name: string; description: string; load: string }> }> {
      const current = await runs.current(ctx, runId);
      const resolved = current.step ? await connections.resolve(ctx.workspaceId, current.step.connectionIds, options.withSecrets) : [];
      const run = current.step ? await runs.get(ctx, runId) : null;
      const facts = run && current.step ? await memory.forStep(ctx, run.systemId, current.step).catch(() => []) : [];
      // A step that names a catalog skill points its performer to the procedure (docs/skills.md).
      const guides = (current.step?.skills ?? []).map((name) => getSkill(name)).filter((s) => s !== null).map((s) => ({ name: s.name, description: s.description, load: `get_skill { "name": "${s.name}" }` }));
      return { ...current, connections: resolved, memory: facts.map(publicFact), ...(guides.length ? { guides } : {}) };
    }
  };
}

export type WorkflowServices = ReturnType<typeof createWorkflowServices>;
