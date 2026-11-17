/**
 * The decision service: asks the models, applies the policy, writes the
 * receipt, meters the cost. Every path has a safe fallback: if a model is
 * slow, down, over budget or unsure, Pipes leaves the judgment where it was
 * before (with the performer or a person), and never treats an error as a "no".
 */
import crypto from "node:crypto";
import { decideFast, deciderConfig, deliberate, type DecideResult, type DeliberateResult, type Question } from "@/lib/ai/openrouter/client";
import { mockDecideFast } from "@/lib/ai/openrouter/mock";
import { CONTRACTS, doneWhenQuestions, outcomeQuestions, routeQuestions, runState, triageQuestions } from "@/domain/decisions/contracts";
import { asChoice, asNoul, doneWhenVerdict, outcomePolicy, routePolicy, THRESHOLDS, type PolicyResult } from "@/domain/decisions/policy";
import type { DecisionKind, DecisionMode, DecisionReceipt, StepDecide, TierRecord } from "@/domain/decisions/types";
import { outgoingOptions } from "@/domain/runs/engine";
import type { NextOption, WorkflowRun } from "@/domain/runs/types";
import { createUsageService } from "@/domain/usage/service";
import { runtimeFlags } from "@/lib/env";
import type { RepositorySet } from "@/lib/repositories/contracts";

export const RECEIPT_KIND = "decision_receipt";

export type DecisionClients = {
  fast: (state: unknown, questions: Record<string, Question>) => Promise<DecideResult>;
  deliberate?: (system: string, user: string, schema: Record<string, unknown>) => Promise<DeliberateResult>;
};

/** Real models when OpenRouter is configured, the deterministic mock in mock mode, nothing otherwise. */
export function defaultClients(): DecisionClients | null {
  if (runtimeFlags.useMocks && !runtimeFlags.hasOpenRouter) return { fast: async (s, q) => mockDecideFast(s, q) };
  if (!runtimeFlags.hasOpenRouter) return null;
  return { fast: decideFast, deliberate: deciderConfig().deliberateModels.length ? deliberate : undefined };
}

/** Step types whose job is choosing a route. */
export const DECISION_NODE_TYPES = new Set(["Decision", "Router", "Condition", "Switch", "Branch"]);

const triageInFlight = new Map<string, Promise<(DecisionReceipt & { risk?: number; complete?: number }) | null>>();

export function createDecisionService(repos: RepositorySet, options: { clients?: DecisionClients | null; mode?: DecisionMode } = {}) {
  const clients = options.clients === undefined ? defaultClients() : options.clients;
  const mode: DecisionMode = clients ? options.mode ?? deciderConfig().mode : "off";
  const usage = createUsageService(repos);
  const maxCost = deciderConfig().maxCostMicros;

  async function save(receipt: DecisionReceipt) {
    await repos.documents.put<DecisionReceipt>({ kind: RECEIPT_KIND, id: receipt.id, workspaceId: receipt.workspaceId, refId: receipt.runId ?? receipt.systemId, data: receipt });
    return receipt;
  }

  async function askFast(run: WorkflowRun, state: unknown, questions: Record<string, Question>): Promise<{ result?: DecideResult; tier: TierRecord }> {
    const started = Date.now();
    try {
      const result = await clients!.fast(state, questions);
      await usage.record(run.workspaceId, "decision_fast", { systemId: run.systemId, runId: run.id, costMicros: result.costMicros });
      return { result, tier: { tier: "fast", model: result.model, answers: result.answers, latencyMs: result.latencyMs, costMicros: result.costMicros } };
    } catch (error) {
      return { tier: { tier: "fast", model: deciderConfig().fastModels[0] ?? "unknown", latencyMs: Date.now() - started, costMicros: 0, error: (error as Error).message } };
    }
  }

  function base(run: WorkflowRun, kind: DecisionKind, contract: string, nodeId: string | undefined, state: unknown, opts: NextOption[] | Array<{ id: string; label: string }>): Omit<DecisionReceipt, "tiers" | "action" | "reason" | "costMicros"> {
    return {
      id: `dec_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
      workspaceId: run.workspaceId,
      systemId: run.systemId,
      runId: run.id,
      nodeId,
      kind,
      contract,
      mode,
      at: new Date().toISOString(),
      state,
      options: opts.map((o) => ("pipeId" in o ? { id: o.pipeId, label: o.label ?? `${o.routeKind} to ${o.toNodeTitle}` } : o))
    };
  }

  /**
   * The deliberate model, asked only when the fast one was unsure and the step
   * allows it. Its self-reported confidence is shown, never used as a gate: it
   * may only confirm the fast model's pick. Evidence quotes that do not appear
   * in the state are thrown away.
   */
  async function escalateRoute(run: WorkflowRun, state: unknown, options: NextOption[], fast: PolicyResult, consequence: StepDecide["consequence"]): Promise<{ policy: PolicyResult; tier?: TierRecord; rationale?: string }> {
    if (!clients?.deliberate) return { policy: fast };
    const ids = options.map((o) => o.pipeId);
    const schema = {
      type: "object",
      additionalProperties: false,
      required: ["choice", "confidence", "rationale", "evidence", "missing_information"],
      properties: {
        choice: { type: "string", enum: [...ids, "needs_human"] },
        confidence: { type: "number" },
        rationale: { type: "string" },
        evidence: { type: "array", items: { type: "object", additionalProperties: false, required: ["quote"], properties: { quote: { type: "string" } } } },
        missing_information: { type: "array", items: { type: "string" } }
      }
    };
    const system = "You choose the next route for a step in a business workflow. Answer only from the state you are given. Quote the exact text you relied on. If no route clearly fits, choose needs_human.";
    const user = JSON.stringify({ state, routes: options.map((o) => ({ id: o.pipeId, label: o.label, routeKind: o.routeKind, leadsTo: o.toNodeTitle })), priorJudgment: { choice: fast.choice, confidence: fast.confidence } });
    const started = Date.now();
    try {
      const res = await clients.deliberate(system, user, schema);
      await usage.record(run.workspaceId, "decision_deliberate", { systemId: run.systemId, runId: run.id, costMicros: res.costMicros });
      const answer = res.json as { choice?: string; rationale?: string; evidence?: Array<{ quote?: string }> };
      const haystack = JSON.stringify(state);
      const quotes = (answer.evidence ?? []).map((e) => String(e.quote ?? "")).filter(Boolean);
      const real = quotes.filter((q) => haystack.includes(q));
      const tier: TierRecord = { tier: "deliberate", model: res.model, answers: { ...answer, evidence: real }, latencyMs: res.latencyMs, costMicros: res.costMicros };
      if (!answer.choice || answer.choice === "needs_human" || (quotes.length && real.length * 2 < quotes.length)) {
        return { policy: { ...fast, action: "human", reason: "The deliberate model could not settle it from the evidence." }, tier, rationale: answer.rationale };
      }
      if (answer.choice !== fast.choice) return { policy: { ...fast, action: "human", reason: "The two models disagree, so a person should decide." }, tier, rationale: answer.rationale };
      const canAct = mode === "live" && consequence !== "high";
      return { policy: { ...fast, action: canAct ? "auto" : "suggest", reason: canAct ? "Both models agree on this route." : "Both models agree; decisions are in shadow mode." }, tier, rationale: answer.rationale };
    } catch (error) {
      return { policy: fast, tier: { tier: "deliberate", model: deciderConfig().deliberateModels[0] ?? "unknown", latencyMs: Date.now() - started, costMicros: 0, error: (error as Error).message } };
    }
  }

  async function triageOnce(run: WorkflowRun): Promise<(DecisionReceipt & { risk?: number; complete?: number }) | null> {
      const nodeId = run.currentNodeId;
      if (mode === "off" || !nodeId || run.status !== "waiting_approval") return null;
      const existing = (await repos.documents.list<DecisionReceipt>(RECEIPT_KIND, { refId: run.id })).map((d) => d.data).find((r) => r.kind === "approval_triage" && r.nodeId === nodeId && (r.state as { rev?: number })?.rev === (run.rev ?? 0));
      if (existing) return { ...existing, complete: existing.probability };
      const canSendBack = run.steps.some((s) => s.completedAt && s.nodeId !== nodeId);
      const state = { ...runState(run, nodeId), rev: run.rev ?? 0 };
      const fast = await askFast(run, state, triageQuestions(canSendBack));
      const decision = fast.result ? asChoice(fast.result.answers.decision) : undefined;
      const riskAnswer = fast.result?.answers.risk;
      const risk = riskAnswer?.type === "score" ? riskAnswer.score : undefined;
      const complete = fast.result ? asNoul(fast.result.answers.complete) : undefined;
      const options = [{ id: "approve", label: "Approve" }, { id: "reject", label: "Reject" }, ...(canSendBack ? [{ id: "send_back", label: "Send back" }] : [])];
      const sure = decision && decision.confidence >= THRESHOLDS.suggest;
      const receipt = await save({
        ...base(run, "approval_triage", CONTRACTS.approvalTriage, nodeId, state, options),
        tiers: [fast.tier],
        action: !fast.result ? "fallback" : sure ? "suggest" : "human",
        choice: decision?.choice,
        confidence: decision?.confidence,
        probability: complete,
        risk,
        reason: !fast.result ? "The decision model did not answer." : sure ? "A suggestion only. You decide." : "Pipes is not sure either way.",
        costMicros: fast.tier.costMicros
      });
      return { ...receipt, risk, complete };
  }

  return {
    mode,
    enabled: mode !== "off",

    /** Pick the route out of the run's current step, if its designer allowed it. */
    async routeStep(run: WorkflowRun): Promise<DecisionReceipt | null> {
      const nodeId = run.currentNodeId;
      if (mode === "off" || !nodeId || run.status !== "running") return null;
      const spec = run.snapshot.steps[nodeId];
      if (!spec?.decide?.route) return null;
      const options = outgoingOptions(run.snapshot, nodeId);
      if (options.length < 2) return null; // code rule: one route needs no judgment
      const state = runState(run, nodeId);
      const consequence = spec.decide.consequence ?? "medium";
      const fast = await askFast(run, state, routeQuestions(run, options));
      const tiers = [fast.tier];
      let policy: PolicyResult = fast.result ? routePolicy(fast.result.answers, { mode, consequence, liveOptions: options.map((o) => o.pipeId) }) : { action: "fallback", reason: "The decision model did not answer." };
      let rationale: string | undefined;
      if (fast.result && spec.decide.deliberate && (policy.action === "suggest" || policy.action === "human") && fast.tier.costMicros < maxCost) {
        const escalated = await escalateRoute(run, state, options, policy, consequence);
        policy = escalated.policy;
        rationale = escalated.rationale;
        if (escalated.tier) tiers.push(escalated.tier);
      }
      return save({ ...base(run, "route", CONTRACTS.route, nodeId, state, options), tiers, action: policy.action, choice: policy.choice, confidence: policy.confidence, reason: policy.reason, rationale, costMicros: tiers.reduce((a, t) => a + t.costMicros, 0) });
    },

    /** The performer reported an outcome no route matches: which route did it mean? */
    async mapOutcome(run: WorkflowRun, reported: string): Promise<DecisionReceipt | null> {
      const nodeId = run.currentNodeId;
      if (mode === "off" || !nodeId) return null;
      const options = outgoingOptions(run.snapshot, nodeId);
      if (options.length < 2) return null;
      const state = { ...runState(run, nodeId), reported };
      const fast = await askFast(run, state, outcomeQuestions(run, options));
      const policy: PolicyResult = fast.result ? outcomePolicy(fast.result.answers, { mode, liveOptions: options.map((o) => o.pipeId) }) : { action: "fallback", reason: "The decision model did not answer." };
      return save({ ...base(run, "outcome_map", CONTRACTS.outcomeMap, nodeId, state, options), tiers: [fast.tier], action: policy.action, choice: policy.choice, confidence: policy.confidence, reason: policy.reason, costMicros: fast.tier.costMicros });
    },

    /** Check a completion against the step's doneWhen. Never blocks; it flags. */
    async checkDoneWhen(run: WorkflowRun, completion: { output?: unknown; notes?: string }): Promise<DecisionReceipt | null> {
      const nodeId = run.currentNodeId;
      if (mode === "off" || !nodeId) return null;
      const spec = run.snapshot.steps[nodeId];
      if (!spec?.decide?.verifyDoneWhen || !spec.doneWhen) return null;
      const state = { ...runState(run, nodeId), reported: { output: completion.output ?? null, notes: completion.notes ?? null } };
      const fast = await askFast(run, state, doneWhenQuestions(spec.doneWhen));
      const probability = fast.result ? asNoul(fast.result.answers.met) : undefined;
      const verdict = doneWhenVerdict(probability);
      const reason = verdict === "met" ? "The output meets the step's finish line." : verdict === "not_met" ? "The output does not seem to meet the step's finish line." : fast.result ? "Not sure the output meets the finish line." : "The decision model did not answer.";
      return save({ ...base(run, "done_when", CONTRACTS.doneWhen, nodeId, state, [{ id: "met", label: spec.doneWhen }]), tiers: [fast.tier], action: fast.result ? "suggest" : "fallback", probability, reason, costMicros: fast.tier.costMicros });
    },

    /**
     * Triage for a person deciding an approval: a suggested decision, a risk
     * level and whether the work looks complete. Suggestions only: approvals
     * are always decided by a person.
     */
    async triageApproval(run: WorkflowRun): Promise<(DecisionReceipt & { risk?: number; complete?: number }) | null> {
      // Two page loads at once must not ask the model twice for the same approval.
      const key = `${run.id}:${run.rev ?? 0}`;
      const pending = triageInFlight.get(key);
      if (pending) return pending;
      const task = triageOnce(run).finally(() => triageInFlight.delete(key));
      triageInFlight.set(key, task);
      return task;
    },

    /** Record what actually happened after a decision, so its accuracy can be measured. */
    async label(receiptId: string, value: string, by: string) {
      const doc = await repos.documents.get<DecisionReceipt>(RECEIPT_KIND, receiptId);
      if (!doc) return null;
      const receipt = doc.data;
      const agreed = receipt.choice !== undefined ? receipt.choice === value : value === "met";
      const next = { ...receipt, label: { value, by, at: new Date().toISOString(), agreed } };
      await repos.documents.put<DecisionReceipt>({ kind: RECEIPT_KIND, id: receipt.id, workspaceId: doc.workspaceId, refId: doc.refId, data: next });
      return next;
    },

    async list(workspaceId: string, filter: { runId?: string } = {}): Promise<DecisionReceipt[]> {
      const docs = filter.runId ? await repos.documents.list<DecisionReceipt>(RECEIPT_KIND, { refId: filter.runId }) : await repos.documents.list<DecisionReceipt>(RECEIPT_KIND, { workspaceId });
      return docs
        .filter((d) => d.workspaceId === workspaceId)
        .map((d) => d.data)
        .sort((a, b) => b.at.localeCompare(a.at));
    },

    /**
     * How often decisions agreed with what people and performers then did, by
     * confidence band. This is the evidence for raising or lowering thresholds.
     */
    async calibration(workspaceId: string) {
      const receipts = await this.list(workspaceId);
      const bands = [
        { band: "90% and up", min: 0.9, max: 1.01 },
        { band: "70 to 89%", min: 0.7, max: 0.9 },
        { band: "40 to 69%", min: 0.4, max: 0.7 },
        { band: "Under 40%", min: 0, max: 0.4 }
      ].map((b) => {
        const inBand = receipts.filter((r) => r.confidence !== undefined && r.confidence >= b.min && r.confidence < b.max);
        const labelled = inBand.filter((r) => r.label);
        const agreed = labelled.filter((r) => r.label!.agreed).length;
        return { band: b.band, decisions: inBand.length, labelled: labelled.length, agreement: labelled.length ? agreed / labelled.length : null };
      });
      const byKind = (["route", "outcome_map", "done_when", "approval_triage"] as DecisionKind[]).map((kind) => {
        const of = receipts.filter((r) => r.kind === kind);
        return { kind, decisions: of.length, automated: of.filter((r) => r.action === "auto").length, suggested: of.filter((r) => r.action === "suggest").length, toPeople: of.filter((r) => r.action === "human").length, fallbacks: of.filter((r) => r.action === "fallback").length };
      });
      return { mode, total: receipts.length, costMicros: receipts.reduce((a, r) => a + r.costMicros, 0), bands, byKind };
    }
  };
}

export type DecisionService = ReturnType<typeof createDecisionService>;
