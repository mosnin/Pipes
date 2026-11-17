import crypto from "node:crypto";
import type { Plan } from "@/domain/pipes_schema_v1/schema";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const USAGE_KIND = "usage_event";

/** Everything Pipes meters. Each event is one unit unless `quantity` says otherwise. */
export type UsageMetric = "run_started" | "step_completed" | "api_call" | "mcp_call" | "webhook_received" | "decision_fast" | "decision_deliberate";

export type UsageEvent = {
  metric: UsageMetric;
  quantity: number;
  at: string;
  month: string;
  systemId?: string;
  runId?: string;
  actorType?: string;
  /** What the event cost Pipes, in integer micro-dollars (decisions report model spend). */
  costMicros?: number;
};

/** Included each month per plan; usage beyond it is billable (Pro, Builder) or blocked (Free). */
export const MONTHLY_INCLUDED: Record<Plan, Record<"runs" | "steps" | "calls", number>> = {
  Free: { runs: 100, steps: 1_000, calls: 2_000 },
  Pro: { runs: 5_000, steps: 50_000, calls: 100_000 },
  Builder: { runs: 50_000, steps: 500_000, calls: 1_000_000 }
};

/** Overage prices in US cents per unit, for plans that allow overage. */
export const OVERAGE_CENTS: Record<"runs" | "steps" | "calls", number> = { runs: 0.5, steps: 0.05, calls: 0.01 };

export function monthKey(date = new Date()): string {
  return date.toISOString().slice(0, 7);
}

/** Billable groups. Decisions are metered on their own (count and model spend) and are not in a group. */
const METRIC_GROUP: Partial<Record<UsageMetric, "runs" | "steps" | "calls">> = {
  run_started: "runs",
  step_completed: "steps",
  api_call: "calls",
  mcp_call: "calls",
  webhook_received: "calls"
};

export type UsageSummary = {
  month: string;
  plan: Plan;
  totals: Record<"runs" | "steps" | "calls", number>;
  included: Record<"runs" | "steps" | "calls", number>;
  overage: Record<"runs" | "steps" | "calls", number>;
  overageCents: number;
  byMetric: Record<UsageMetric, number>;
  daily: Array<{ day: string; runs: number; steps: number; calls: number }>;
  /** Decision model calls this month and what they cost, in micro-dollars. */
  decisions: { fast: number; deliberate: number; costMicros: number };
};

/** Pluggable hook for a billing provider that charges metered usage. */
export interface UsageReporter {
  report(input: { workspaceId: string; metric: UsageMetric; quantity: number; at: string }): Promise<void>;
}

export function createUsageService(repos: RepositorySet, reporter?: UsageReporter) {
  return {
    /**
     * Record one usage event. Pass `id` when the event belongs to something
     * that can be retried (a run start, a step completion): the same id is
     * written once, so a retried request is never billed twice.
     */
    async record(workspaceId: string, metric: UsageMetric, extra: { quantity?: number; systemId?: string; runId?: string; actorType?: string; id?: string; costMicros?: number } = {}) {
      const at = new Date().toISOString();
      const event: UsageEvent = { metric, quantity: extra.quantity ?? 1, at, month: monthKey(), systemId: extra.systemId, runId: extra.runId, actorType: extra.actorType, costMicros: extra.costMicros ? Math.round(extra.costMicros) : undefined };
      const id = extra.id ? `use_${extra.id}` : `use_${crypto.randomUUID()}`;
      if (extra.id && (await repos.documents.get(USAGE_KIND, id))) return;
      await repos.documents.put<UsageEvent>({ kind: USAGE_KIND, id, workspaceId, refId: `${workspaceId}:${event.month}`, data: event });
      if (reporter) await reporter.report({ workspaceId, metric, quantity: event.quantity, at }).catch(() => undefined);
    },

    async summary(workspaceId: string, plan: Plan, month = monthKey()): Promise<UsageSummary> {
      const docs = await repos.documents.list<UsageEvent>(USAGE_KIND, { refId: `${workspaceId}:${month}` });
      const totals = { runs: 0, steps: 0, calls: 0 };
      const byMetric = { run_started: 0, step_completed: 0, api_call: 0, mcp_call: 0, webhook_received: 0, decision_fast: 0, decision_deliberate: 0 } as Record<UsageMetric, number>;
      const days = new Map<string, { runs: number; steps: number; calls: number }>();
      const decisions = { fast: 0, deliberate: 0, costMicros: 0 };
      for (const doc of docs) {
        const event = doc.data;
        if (event.metric === "decision_fast" || event.metric === "decision_deliberate") {
          byMetric[event.metric] += event.quantity;
          decisions[event.metric === "decision_fast" ? "fast" : "deliberate"] += event.quantity;
          decisions.costMicros += event.costMicros ?? 0;
          continue;
        }
        const group = METRIC_GROUP[event.metric];
        if (!group) continue;
        totals[group] += event.quantity;
        byMetric[event.metric] += event.quantity;
        const day = event.at.slice(0, 10);
        const bucket = days.get(day) ?? { runs: 0, steps: 0, calls: 0 };
        bucket[group] += event.quantity;
        days.set(day, bucket);
      }
      const included = MONTHLY_INCLUDED[plan];
      const overage = {
        runs: Math.max(0, totals.runs - included.runs),
        steps: Math.max(0, totals.steps - included.steps),
        calls: Math.max(0, totals.calls - included.calls)
      };
      const overageCents = plan === "Free" ? 0 : Math.round(overage.runs * OVERAGE_CENTS.runs + overage.steps * OVERAGE_CENTS.steps + overage.calls * OVERAGE_CENTS.calls);
      const daily = [...days.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, v]) => ({ day, ...v }));
      return { month, plan, totals, included, overage, overageCents, byMetric, daily, decisions };
    },

    /** Free workspaces stop at their included runs; paid plans run on and pay overage. */
    async canStartRun(workspaceId: string, plan: Plan): Promise<{ allowed: boolean; reason?: string }> {
      if (plan !== "Free") return { allowed: true };
      const summary = await this.summary(workspaceId, plan);
      if (summary.totals.runs >= summary.included.runs) {
        return { allowed: false, reason: `The Free plan includes ${summary.included.runs} runs a month and this workspace has used them. Upgrade to keep running.` };
      }
      return { allowed: true };
    }
  };
}

export type UsageService = ReturnType<typeof createUsageService>;
