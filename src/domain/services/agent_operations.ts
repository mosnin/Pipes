import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { AgentRun } from "@/domain/agent_builder/model";
import type { RunComparisonRecord, RunControlAction, RunControlStatus, RunTraceSummary, StrategyPreset, PromptVersion, StrategyVersion, SkillVersionBinding, ActiveBuilderPreset, ExperimentRecord, ExperimentAssignment, ExperimentOutcomeSummary } from "@/domain/agent_builder/operations";

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const PRESETS: Array<Pick<StrategyPreset, "id" | "name" | "batchingPosture" | "reviewHint">> = [
  { id: "architecture_first_preset", name: "Architecture first", batchingPosture: "balanced", reviewHint: "standard" },
  { id: "fast_draft_preset", name: "Fast draft", batchingPosture: "large_batches", reviewHint: "light" },
  { id: "cautious_review_preset", name: "Cautious review", batchingPosture: "small_batches", reviewHint: "strict" },
  { id: "subsystem_heavy_preset", name: "Subsystem heavy", batchingPosture: "balanced", reviewHint: "standard" },
  { id: "template_first_preset", name: "Template first", batchingPosture: "small_batches", reviewHint: "standard" }
];

export class AgentOperationsService {
  constructor(private readonly repos: RepositorySet) {}

  private async control(ctx: AppContext, run: AgentRun, action: RunControlAction, status: RunControlStatus, reason?: string) {
    await this.repos.agentBuilder.addEvent({
      sessionId: run.sessionId,
      runId: run.id,
      workspaceId: run.workspaceId,
      systemId: run.systemId,
      type: action === "cancel" ? "run_canceled" : "plan_updated",
      at: now(),
      sequence: (await this.repos.agentBuilder.listRunEvents({ runId: run.id })).length + 1,
      status: action === "pause" ? "blocked" : action === "cancel" ? "canceled" : action === "resume" ? "running" : run.status,
      text: `${action}:${status}${reason ? ` · ${reason}` : ""}`,
      metadata: { action, status }
    });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: `run_${action}d`, targetType: "agent_run", targetId: run.id, outcome: status === "rejected" ? "failure" : "success", metadata: reason });
  }

  async pauseRun(ctx: AppContext, runId: string, reason: string) {
    const run = await this.mustRun(runId);
    await this.repos.agentBuilder.updateRun({ runId, status: "blocked" });
    await this.control(ctx, run, "pause", "applied", reason);
    return run;
  }

  async resumeRun(ctx: AppContext, runId: string) {
    const run = await this.mustRun(runId);
    await this.repos.agentBuilder.updateRun({ runId, status: "running" });
    await this.control(ctx, run, "resume", "applied");
    return run;
  }

  async cancelRun(ctx: AppContext, runId: string, reason: string) {
    const run = await this.mustRun(runId);
    await this.repos.agentBuilder.updateRun({ runId, status: "canceled", endedAt: now(), error: reason });
    await this.control(ctx, run, "cancel", "applied", reason);
    return run;
  }

  async retryRun(ctx: AppContext, runId: string) {
    const run = await this.mustRun(runId);
    const newRun = await this.repos.agentBuilder.createRun({ sessionId: run.sessionId, workspaceId: run.workspaceId, systemId: run.systemId, userMessageId: run.userMessageId });
    await this.control(ctx, run, "retry", "applied", `retry_to:${newRun.id}`);
    return newRun;
  }

  async forkRun(ctx: AppContext, runId: string) {
    const run = await this.mustRun(runId);
    const fork = await this.repos.agentBuilder.createRun({ sessionId: run.sessionId, workspaceId: run.workspaceId, systemId: run.systemId, userMessageId: run.userMessageId });
    const snapshot = await this.repos.agentBuilder.getRunPolicySnapshot({ runId });
    if (snapshot) {
      await this.repos.agentBuilder.addRunPolicySnapshot({ runId: fork.id, workspaceId: snapshot.workspaceId, systemId: snapshot.systemId, policyId: snapshot.policyId, resolvedFromScope: snapshot.resolvedFromScope, tool: snapshot.tool, risk: snapshot.risk, approval: snapshot.approval, runtime: snapshot.runtime, cost: snapshot.cost, concurrency: snapshot.concurrency, escalation: snapshot.escalation, createdAt: now() });
    }
    await this.control(ctx, run, "fork", "applied", `fork_to:${fork.id}`);
    return { run: fork, contextCopied: true };
  }

  async getReplay(ctx: AppContext, runId: string) {
    await this.mustRun(runId);
    const [stages, roles, tasks, tools, proposals, approvals, policyDecisions, escalations] = await Promise.all([
      this.repos.agentBuilder.listStageRecords({ runId }),
      this.repos.agentBuilder.listRoleActivities({ runId }),
      this.repos.agentBuilder.listSubAgentTasks({ runId }),
      this.repos.agentBuilder.listToolCalls({ runId }),
      this.repos.agentBuilder.listProposals({ runId }),
      this.repos.agentBuilder.listApprovalRequests({ runId }),
      this.repos.agentBuilder.listPolicyDecisionRecords({ runId }),
      this.repos.agentBuilder.listEscalationRecords({ runId })
    ]);
    const summary: RunTraceSummary = { id: id("trace"), runId, workspaceId: ctx.workspaceId, stageCount: stages.length, toolCallCount: tools.length, proposalCount: proposals.length, approvalCount: approvals.length, policyDecisionCount: policyDecisions.length, escalationCount: escalations.length, createdAt: now() };
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "replay_opened", targetType: "agent_run", targetId: runId, outcome: "success" });
    return { summary, stages, roles, tasks, tools, proposals, approvals, policyDecisions, escalations };
  }

  async compareRuns(ctx: AppContext, leftRunId: string, rightRunId: string) {
    const [left, right] = await Promise.all([this.getReplay(ctx, leftRunId), this.getReplay(ctx, rightRunId)]);
    const leftScore = left.summary.proposalCount + left.summary.approvalCount - left.summary.escalationCount;
    const rightScore = right.summary.proposalCount + right.summary.approvalCount - right.summary.escalationCount;
    const record: RunComparisonRecord = { id: id("cmp"), workspaceId: ctx.workspaceId, leftRunId, rightRunId, summary: `left=${leftScore}, right=${rightScore}`, leftScore, rightScore, createdAt: now() };
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "run_compared", targetType: "run_comparison", targetId: record.id, outcome: "success" });
    return record;
  }

  async listBuilderPresets(ctx: AppContext): Promise<StrategyPreset[]> {
    const active = await this.getActivePreset(ctx);
    return PRESETS.map((preset) => ({ id: preset.id, workspaceId: ctx.workspaceId, name: preset.name, batchingPosture: preset.batchingPosture, reviewHint: preset.reviewHint, strategyVersionId: undefined, promptVersionId: undefined, createdAt: now(), updatedAt: now() })).map((row) => ({ ...row, updatedAt: active?.presetId === row.id ? active.updatedAt : row.updatedAt }));
  }

  async setActivePreset(ctx: AppContext, presetId: string): Promise<ActiveBuilderPreset> {
    const entry = await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, scope: "workspace", type: "builder_strategy", source: "user_saved", confidence: "high", status: "active", title: "active_builder_preset", summary: presetId, detail: "workspace-selected preset", tags: ["agent_ops", "preset_selected"], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "preset_selected", targetType: "builder_preset", targetId: presetId, outcome: "success" });
    return { id: entry.id, workspaceId: ctx.workspaceId, presetId, status: "active", createdAt: entry.createdAt, updatedAt: entry.updatedAt };
  }

  async listPromptVersions(ctx: AppContext): Promise<PromptVersion[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "decision_memory" });
    return rows.filter((row) => row.tags.includes("prompt_version")).map((row, index) => ({ id: row.id, workspaceId: ctx.workspaceId, promptArtifactId: "default_builder_prompt", version: index + 1, body: row.detail ?? row.summary, status: "active", createdAt: row.createdAt }));
  }

  async listStrategyVersions(ctx: AppContext): Promise<StrategyVersion[]> {
    const rows = await this.repos.agentMemory.listBuilderStrategies({ workspaceId: ctx.workspaceId });
    return rows.map((row, index) => ({ id: row.id, workspaceId: row.workspaceId, strategyName: row.name, version: index + 1, configJson: JSON.stringify({ planningDirectives: row.planningDirectives, batchingDirectives: row.batchingDirectives, reviewPosture: row.reviewPosture }), status: row.status === "active" ? "active" : "candidate", createdAt: row.createdAt }));
  }

  async listSkillBindings(ctx: AppContext): Promise<SkillVersionBinding[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "architecture_preference" });
    return rows.map((row, index) => ({ id: row.id, workspaceId: row.workspaceId, skillId: row.title, version: index + 1, status: row.status === "active" ? "active" : "candidate", notes: row.summary, createdAt: row.createdAt }));
  }

  async listExperiments(ctx: AppContext): Promise<ExperimentRecord[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "review_preference" });
    return rows.map((row) => ({ id: row.id, workspaceId: row.workspaceId, name: row.title, objective: row.summary, status: "running", variantIds: row.tags.filter((tag) => tag.startsWith("variant:")).map((tag) => tag.replace("variant:", "")), createdAt: row.createdAt }));
  }

  async assignExperimentVariant(ctx: AppContext, input: { runId: string; experimentId: string; variantId: string }): Promise<ExperimentAssignment> {
    const assignment: ExperimentAssignment = { id: id("expasg"), workspaceId: ctx.workspaceId, runId: input.runId, experimentId: input.experimentId, variantId: input.variantId, assignedAt: now() };
    await this.repos.agentMemory.addDecisionRecord({ workspaceId: ctx.workspaceId, runId: input.runId, category: "architecture_direction", title: `experiment:${input.experimentId}`, decision: input.variantId, rationale: "operator assigned variant", state: "accepted", confidence: "high", createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "experiment_variant_assigned", targetType: "agent_run", targetId: input.runId, outcome: "success", metadata: JSON.stringify(assignment) });
    return assignment;
  }

  async summarizeExperimentOutcomes(ctx: AppContext, experimentId: string): Promise<ExperimentOutcomeSummary[]> {
    const decisions = await this.repos.agentMemory.listDecisionRecords({ workspaceId: ctx.workspaceId });
    const grouped = decisions.filter((row) => row.title === `experiment:${experimentId}`).reduce<Record<string, number>>((acc, row) => {
      acc[row.decision] = (acc[row.decision] ?? 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped).map(([variantId, runCount]) => ({ id: id("expout"), workspaceId: ctx.workspaceId, experimentId, variantId, runCount, avgScore: Math.min(1, 0.5 + runCount * 0.1), notes: "First pass bounded rollout summary.", createdAt: now() }));
  }

  private async getActivePreset(ctx: AppContext): Promise<ActiveBuilderPreset | null> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "builder_strategy" });
    const latest = rows.filter((row) => row.title === "active_builder_preset").sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!latest) return null;
    return { id: latest.id, workspaceId: latest.workspaceId, presetId: latest.summary, status: "active", createdAt: latest.createdAt, updatedAt: latest.updatedAt };
  }

  private async mustRun(runId: string) {
    const run = await this.repos.agentBuilder.getRun(runId);
    if (!run) throw new Error("run_not_found");
    return run;
  }
}
