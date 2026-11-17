import type { WorkflowRails } from "@/domain/rails/types";
import { sanitizeStepRails, sanitizeWorkflowRails } from "@/domain/rails/validate";
import type { RouteSpec, StepSpec } from "@/domain/runs/types";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const DESIGN_KIND = "system_design";

/**
 * Everything about a workflow that is not the graph itself: what each step
 * should do (step specs), how routes behave (route specs), the editor's
 * richer node definitions, and subsystem groupings. One document per system,
 * saved on the server so runs, agents and teammates all see the same thing.
 */
export type SystemDesign = {
  steps: Record<string, StepSpec>;
  routes: Record<string, RouteSpec>;
  nodeDefinitions: Record<string, unknown>;
  subsystems: unknown[];
  /** Workflow-level execution rails (budgets, concurrency). See docs/rails.md. */
  rails?: WorkflowRails;
};

export const EMPTY_DESIGN: SystemDesign = { steps: {}, routes: {}, nodeDefinitions: {}, subsystems: [] };

function cleanList(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined;
  const list = values.map((v) => String(v).trim()).filter(Boolean).slice(0, 25);
  return list.length ? list : undefined;
}

function cleanText(value: unknown, max = 4000): string | undefined {
  if (typeof value !== "string") return undefined;
  const text = value.trim().slice(0, max);
  return text || undefined;
}

export function sanitizeStepSpec(input: any): StepSpec {
  const max = Number(input?.maxIterations);
  const role = input?.approverRole;
  return {
    instructions: cleanText(input?.instructions),
    doneWhen: cleanText(input?.doneWhen, 1000),
    skills: cleanList(input?.skills),
    connectionIds: cleanList(input?.connectionIds),
    maxIterations: Number.isFinite(max) && max >= 1 ? Math.min(Math.floor(max), 100) : undefined,
    exitCondition: cleanText(input?.exitCondition, 1000),
    approverRole: role === "Owner" || role === "Admin" || role === "Editor" ? role : undefined,
    rails: sanitizeStepRails(input?.rails)
  };
}

export function sanitizeRouteSpec(input: any): RouteSpec {
  const kinds = ["default", "success", "failure", "conditional", "loop"];
  return {
    routeKind: kinds.includes(input?.routeKind) ? input.routeKind : "default",
    label: cleanText(input?.label, 80),
    conditionLabel: cleanText(input?.conditionLabel, 200),
    notes: cleanText(input?.notes, 1000)
  };
}

export function createDesignService(repos: RepositorySet) {
  return {
    async get(systemId: string): Promise<SystemDesign> {
      const doc = await repos.documents.get<SystemDesign>(DESIGN_KIND, systemId);
      return { ...EMPTY_DESIGN, ...(doc?.data ?? {}) };
    },

    /** Merge a partial update. Step and route specs are sanitized; node definitions and subsystems are editor-owned. */
    async update(workspaceId: string, systemId: string, patch: Partial<SystemDesign>): Promise<SystemDesign> {
      const current = await this.get(systemId);
      const next: SystemDesign = {
        steps: patch.steps ? Object.fromEntries(Object.entries(patch.steps).map(([id, spec]) => [id, sanitizeStepSpec(spec)])) : current.steps,
        routes: patch.routes ? Object.fromEntries(Object.entries(patch.routes).map(([id, spec]) => [id, sanitizeRouteSpec(spec)])) : current.routes,
        nodeDefinitions: patch.nodeDefinitions ?? current.nodeDefinitions,
        subsystems: patch.subsystems ?? current.subsystems,
        rails: "rails" in patch ? sanitizeWorkflowRails(patch.rails) : current.rails
      };
      await repos.documents.put<SystemDesign>({ kind: DESIGN_KIND, id: systemId, workspaceId, refId: systemId, data: next });
      return next;
    }
  };
}

export type DesignService = ReturnType<typeof createDesignService>;
