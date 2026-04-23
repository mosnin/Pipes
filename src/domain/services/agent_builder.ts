import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { ApprovalRequestSchema, RunEventSchema, RunPlanSchema, type RunEvent, type RunStatus } from "@/domain/agent_builder/model";
import { classifyRisk, GraphActionPayloadSchema, GraphActionProposalSchema, riskToApplyMode, type GraphActionPayload, type GraphActionProposal } from "@/domain/agent_builder/actions";
import { getAgentStreamingProvider } from "@/lib/ai/agent_stream";
import { AccessService, EntitlementService, GraphService, SchemaExportService, VersionService } from "@/domain/services/bounded";
import { validateSystem } from "@/domain/validation";
import { AgentToolService } from "@/domain/services/agent_tools";
import { PlanRevisionSchema, ProposalBatchSchema, RoleActivitySchema, RunStageSchema, type RunStage } from "@/domain/agent_builder/staged";
import { getSkillDefinition, isSkillAllowedForRole } from "@/domain/services/agent_skills";
import { SubAgentTaskSchema, type ReconciliationRecord, type SkillInvocation, type SubAgentContextPack, type SubAgentResult, type SubAgentTask } from "@/domain/agent_builder/sub_agents";
import type { SubAgentExecutionRequest } from "@/lib/ai/sub_agents";
import { ModalReadySubAgentExecutor, type SubAgentExecutor } from "@/lib/runtime/sub_agent_executor";
import { AffectedRegionService, BatchReviewService, ProposalDiffService, ProposalPreviewService, ReviewSelectionService } from "@/domain/services/agent_review";
import { AgentMemoryService } from "@/domain/services/agent_memory";
import { AgentEvaluationService } from "@/domain/services/agent_evaluation";
import { AgentPolicyService } from "@/domain/services/agent_policy";
import { AgentRuntimeService } from "@/domain/services/agent_runtime";
import type { RunPolicySnapshot } from "@/domain/agent_builder/policy";

const now = () => new Date().toISOString();

export interface AgentRuntime {
  executeRun(input: { service: AgentRunService; ctx: AppContext; runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }): Promise<void>;
}

export class InlineAgentRuntime implements AgentRuntime {
  async executeRun(input: { service: AgentRunService; ctx: AppContext; runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
    await input.service.executeRunInline(input.ctx, { runId: input.runId, message: input.message, systemName: input.systemName, systemDescription: input.systemDescription, onEvent: input.onEvent });
  }
}

export class ModalReadyAgentRuntime implements AgentRuntime {
  constructor(private readonly inline: AgentRuntime = new InlineAgentRuntime()) {}
  async executeRun(input: { service: AgentRunService; ctx: AppContext; runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
    return this.inline.executeRun(input);
  }
}

function buildPorts(bundle: Awaited<ReturnType<RepositorySet["systems"]["getBundle"]>>) {
  return bundle.nodes.flatMap((node) => [
    node.portIds[0] ? { id: node.portIds[0], nodeId: node.id, key: "in", label: "in", direction: "input", dataType: "any", required: false } : null,
    node.portIds[1] ? { id: node.portIds[1], nodeId: node.id, key: "out", label: "out", direction: "output", dataType: "any", required: false } : null
  ].filter(Boolean)) as any[];
}

export class AgentRunService {
  private readonly access: AccessService;
  private readonly graph: GraphService;
  private readonly schemaExport: SchemaExportService;
  private readonly versions: VersionService;
  private readonly tools: AgentToolService;
  private readonly diffService: ProposalDiffService;
  private readonly selectionService: ReviewSelectionService;
  private readonly previewService: ProposalPreviewService;
  private readonly regionService: AffectedRegionService;
  private readonly batchReviewService: BatchReviewService;
  private readonly memoryService: AgentMemoryService;
  private readonly evaluationService: AgentEvaluationService;
  private readonly policyService: AgentPolicyService;
  private readonly runtimeService: AgentRuntimeService;

  constructor(
    private readonly repos: RepositorySet,
    private readonly runtime: AgentRuntime = new ModalReadyAgentRuntime(),
    private readonly subAgentExecutor: SubAgentExecutor = new ModalReadySubAgentExecutor()
  ) {
    this.access = new AccessService();
    this.graph = new GraphService(this.repos, this.access);
    this.schemaExport = new SchemaExportService(this.repos, this.access);
    this.versions = new VersionService(this.repos, this.access, this.schemaExport, new EntitlementService(this.repos));
    this.tools = new AgentToolService(this.repos);
    this.diffService = new ProposalDiffService(this.repos);
    this.selectionService = new ReviewSelectionService(this.diffService);
    this.previewService = new ProposalPreviewService(this.diffService, this.repos);
    this.regionService = new AffectedRegionService(this.repos);
    this.batchReviewService = new BatchReviewService(this.repos, this, this.selectionService);
    this.memoryService = new AgentMemoryService(this.repos);
    this.evaluationService = new AgentEvaluationService(this.repos);
    this.policyService = new AgentPolicyService(this.repos);
    this.runtimeService = new AgentRuntimeService(this.repos);
  }

  async createSession(ctx: AppContext, input: { systemId?: string; title?: string }) { return this.repos.agentBuilder.createSession({ workspaceId: ctx.workspaceId, systemId: input.systemId, title: input.title ?? "System Builder Session", createdBy: ctx.userId }); }
  async listSessions(ctx: AppContext, systemId?: string) { return this.repos.agentBuilder.listSessions({ workspaceId: ctx.workspaceId, systemId }); }

  async createRun(ctx: AppContext, input: { sessionId: string; systemId?: string; message: string }) {
    const userMessage = await this.repos.agentBuilder.addMessage({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, role: "user", body: input.message });
    const run = await this.repos.agentBuilder.createRun({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, userMessageId: userMessage.id });
    await this.appendEvent({ sessionId: input.sessionId, runId: run.id, workspaceId: ctx.workspaceId, systemId: input.systemId, type: "run_created", at: now(), sequence: 1, status: "created" });
    return { run, userMessage };
  }

  async streamRun(ctx: AppContext, input: { runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
    await this.runtime.executeRun({ service: this, ctx, ...input });
  }

  async executeRunInline(ctx: AppContext, input: { runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
    const run = await this.repos.agentBuilder.getRun(input.runId);
    if (!run) throw new Error("run_not_found");
    if (!run.systemId) throw new Error("run_missing_system");
    const bundle = await this.repos.systems.getBundle(run.systemId);
    const policy = await this.policyService.resolveRunPolicySnapshot(ctx, { runId: run.id, systemId: run.systemId });
    const continuation = await this.memoryService.buildRunContinuation(ctx, { systemId: run.systemId, runId: run.id, sessionId: run.sessionId, message: input.message });

    let seq = (await this.repos.agentBuilder.listRunEvents({ runId: run.id })).length;
    const publish = async (event: Omit<RunEvent, "id" | "sequence">) => {
      const stored = await this.appendEvent({ ...event, sequence: ++seq });
      if (input.onEvent) await input.onEvent(stored);
      return stored;
    };

    const enterStage = async (stage: RunStage, summary?: string, status: RunStatus = "running") => {
      await this.repos.agentBuilder.addStageRecord({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId!, stage: RunStageSchema.parse(stage), status: "entered", summary, at: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "plan_updated", at: now(), text: `stage:${stage}${summary ? ` · ${summary}` : ""}`, status });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_stage_entered", targetType: "agent_run_stage", targetId: stage, outcome: "success" });
    };
    const invokeRole = async (stage: RunStage, role: "architect" | "validator" | "builder" | "explainer", summary: string) => {
      const startedAt = now();
      await this.repos.agentBuilder.addRoleActivity(RoleActivitySchema.omit({ id: true }).parse({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, stage, role, summary, startedAt, completedAt: now() }));
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_role_invoked", targetType: "agent_role", targetId: role, outcome: "success", metadata: JSON.stringify({ stage }) });
    };

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "planning", startedAt: now() });
    await enterStage("intake", "User request accepted.", "planning");
    await enterStage("inspect_context", "Collecting concise context pack.", "planning");
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_started", at: now(), status: "planning" });

    await invokeRole("design_structure", "architect", "Shaping high-level subsystem layout.");
    await enterStage("plan", "Creating staged plan with assumptions and risks.", "planning");
    const plan = await this.repos.agentBuilder.upsertPlan(RunPlanSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
      runId: run.id,
      workspaceId: run.workspaceId,
      systemId: run.systemId,
      summary: `Inspect system state, validate constraints, propose typed graph actions, and request approval for risky changes. Strategy=${continuation.strategy.name}. Policy=${policy.risk.posture}/${policy.approval.strictness}. Memory=${continuation.retrieved.summary.join(" | ") || "none"}.`,
      status: "created",
      confidence: 0.77,
      requiresApproval: true,
      steps: [
        { id: "step_1", title: "Gather system + validation context", toolNames: ["get_system_summary", "get_validation_report"], expectedActionTypes: [] },
        { id: "step_2", title: "Propose bounded graph actions", toolNames: ["propose_graph_actions"], expectedActionTypes: ["add_annotation", "delete_node"] }
      ]
    }));
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "plan_created", at: now(), text: plan.summary, status: "planning" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_plan_created", targetType: "agent_plan", targetId: plan.id, outcome: "success" });
    await this.repos.agentBuilder.addPlanRevision(PlanRevisionSchema.omit({ id: true }).parse({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, version: 1, summary: plan.summary, assumptions: ["System intent follows user prompt.", "Prefer incremental safe edits first."], openQuestions: ["Should risky deletes be approved now?"], unresolvedRisks: ["Potential destructive edit candidate detected."], recommendedNextSteps: ["Gather validation context", "Propose small safe batch first"], createdAt: now() }));

    await enterStage("validate_design", "Validator role critiques plan assumptions.", "planning");
    await invokeRole("validate_design", "validator", "Raised open questions and unresolved risks.");
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_open_question_raised", targetType: "agent_plan", targetId: plan.id, outcome: "success" });
    await this.repos.agentBuilder.addPlanRevision(PlanRevisionSchema.omit({ id: true }).parse({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, version: 2, summary: "Revised plan: safe batch first, risky batch requires approval.", critique: "Validator recommends explicit approval boundary before destructive operations.", assumptions: ["Validation report should guide edits."], openQuestions: ["Confirm destructive changes?"], unresolvedRisks: ["Delete operations remain review-required."], recommendedNextSteps: ["Run context tools", "Create proposal batches by stage"], createdAt: now() }));
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_plan_revised", targetType: "agent_plan", targetId: plan.id, outcome: "success" });

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "tooling" });
    await enterStage("design_structure", "Architect role generated structure strategy.", "tooling");
    const systemSummary = await this.callTool(ctx, run, publish, policy, "get_system_summary", {});
    const validationReport = await this.callTool(ctx, run, publish, policy, "get_validation_report", {});

    const subAgentTasks = await this.delegateSubAgents({
      ctx,
      run,
      bundle,
      message: input.message,
      stage: "design_structure",
      summary: (systemSummary ?? {}) as Record<string, unknown>,
      validationReport: (validationReport ?? {}) as Record<string, unknown>,
      memorySummary: continuation.retrieved.summary.slice(0, 4),
      strategyName: continuation.strategy.name
    });
    const reconciliation = await this.reconcileSubAgentOutputs({
      ctx,
      run,
      stage: "propose_actions",
      taskArtifacts: subAgentTasks
    });
    await publish({
      sessionId: run.sessionId,
      runId: run.id,
      workspaceId: run.workspaceId,
      systemId: run.systemId,
      type: "plan_updated",
      at: now(),
      text: `sub-agent reconciliation: ${reconciliation.record.decision} · ${reconciliation.record.summary}`,
      status: reconciliation.record.decision === "blocked" ? "blocked" : "tooling"
    });

    for (const item of reconciliation.proposalInputs) {
      const proposal = await this.createProposal(ctx, run, policy, ++seq, item.payload, item.rationale);
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_proposed", at: now(), graphActionProposal: proposal });
      const batchStatus = proposal.status === "pending_review" ? "review_required" : proposal.status === "proposed" ? "created" : "rejected";
      await this.repos.agentBuilder.addProposalBatch(ProposalBatchSchema.omit({ id: true }).parse({
        runId: run.id,
        workspaceId: run.workspaceId,
        systemId: run.systemId,
        stage: "propose_actions",
        summary: item.summary,
        rationale: item.rationale,
        proposalIds: [proposal.id],
        status: batchStatus,
        createdAt: now(),
        updatedAt: now()
      }));
      if (proposal.status === "pending_review") {
        const approval = await this.repos.agentBuilder.addApprovalRequest(ApprovalRequestSchema.omit({ id: true }).parse({ runId: run.id, proposalId: proposal.id, workspaceId: run.workspaceId, systemId: run.systemId, targetType: "graph_action", targetRef: proposal.id, reason: proposal.rationale, status: "pending", requestedAt: now() }));
        await this.repos.agentBuilder.updateRun({ runId: run.id, status: "waiting_for_approval" });
        await enterStage("wait_for_approval", "Risky proposal awaiting explicit human decision.", "waiting_for_approval");
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "approval_requested", at: now(), status: "waiting_for_approval", text: approval.reason });
      } else if (proposal.status === "proposed") {
        await this.repos.agentBuilder.updateRun({ runId: run.id, status: "applying" });
        await enterStage("apply", "Applying reconciled safe batch.", "applying");
        const applied = await this.applyProposal(ctx, proposal.id, publish, policy);
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: applied.status === "applied" ? "graph_action_auto_applied" : "graph_action_apply_failed", at: now(), text: applied.error, graphActionProposal: applied, status: applied.status === "applied" ? "applying" : "blocked" });
      }
    }

    let fullText = "";
    const provider = getAgentStreamingProvider();

    for await (const chunk of provider.streamBuilderResponse({ systemId: run.systemId, systemName: input.systemName, systemDescription: input.systemDescription, message: input.message, nodeIds: bundle.nodes.map((n) => n.id), pipeIds: bundle.pipes.map((p) => p.id) })) {
      if (chunk.type === "text_delta") {
        fullText += chunk.text;
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_delta", at: now(), text: chunk.text });
        continue;
      }
      const proposal = await this.createProposal(ctx, run, policy, ++seq, chunk.action, chunk.rationale);
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_proposed", at: now(), graphActionProposal: proposal });
      await invokeRole("propose_actions", "builder", `Generated ${proposal.actionType} proposal.`);
      const batchStatus = proposal.status === "pending_review" ? "review_required" : proposal.status === "proposed" ? "created" : "rejected";
      await this.repos.agentBuilder.addProposalBatch(ProposalBatchSchema.omit({ id: true }).parse({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, stage: "propose_actions", summary: `Batch for ${proposal.actionType}`, rationale: proposal.rationale, proposalIds: [proposal.id], status: batchStatus, createdAt: now(), updatedAt: now() }));
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_proposal_batch_created", targetType: "proposal_batch", targetId: proposal.id, outcome: "success" });

      if (proposal.status === "pending_review") {
        const approval = await this.repos.agentBuilder.addApprovalRequest(ApprovalRequestSchema.omit({ id: true }).parse({ runId: run.id, proposalId: proposal.id, workspaceId: run.workspaceId, systemId: run.systemId, targetType: "graph_action", targetRef: proposal.id, reason: proposal.rationale, status: "pending", requestedAt: now() }));
        await this.repos.agentBuilder.updateRun({ runId: run.id, status: "waiting_for_approval" });
        await enterStage("wait_for_approval", "Risky proposal awaiting explicit human decision.", "waiting_for_approval");
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "approval_requested", at: now(), status: "waiting_for_approval", text: approval.reason });
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_approval_requested", targetType: "approval_request", targetId: approval.id, outcome: "success" });
        continue;
      }

      if (proposal.status === "forbidden") {
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_apply_failed", at: now(), text: "forbidden_action", graphActionProposal: proposal, status: "blocked" });
        await this.repos.agentBuilder.updateRun({ runId: run.id, status: "blocked" });
        continue;
      }

      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "applying" });
      await enterStage("apply", "Applying safe batch.", "applying");
      const applied = await this.applyProposal(ctx, proposal.id, publish, policy);
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_batch_auto_applied", targetType: "proposal_batch", targetId: proposal.id, outcome: applied.status === "applied" ? "success" : "failure" });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: applied.status === "applied" ? "graph_action_auto_applied" : "graph_action_apply_failed", at: now(), text: applied.error, graphActionProposal: applied, status: applied.status === "applied" ? "applying" : "blocked" });
    }

    await this.repos.agentBuilder.addMessage({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, role: "assistant", body: fullText });
    await invokeRole("summarize", "explainer", "Summarized staged work and remaining risks.");
    await enterStage("summarize", "Explainer role produced summary.", "running");
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_completed", at: now(), text: fullText });

    const pending = await this.repos.agentBuilder.listApprovalRequests({ runId: run.id, status: "pending" });
    if (pending.length > 0) {
      const proposals = await this.repos.agentBuilder.listProposals({ runId: run.id });
      const openQuestions = (await this.repos.agentBuilder.listPlanRevisions({ runId: run.id })).flatMap((row) => row.openQuestions).slice(0, 6);
      await this.memoryService.persistRunMemory(ctx, {
        runId: run.id,
        systemId: run.systemId,
        sessionId: run.sessionId,
        summary: fullText.slice(0, 220) || "Run paused pending approval.",
        openQuestions,
        approvedCount: proposals.filter((proposal) => proposal.status === "approved" || proposal.status === "applied").length,
        rejectedCount: proposals.filter((proposal) => proposal.status === "rejected").length,
        strategyId: continuation.strategy.id,
        linkedMemoryEntryIds: continuation.retrieved.memoryEntries.map((row) => row.id),
        linkedPatternIds: continuation.retrieved.patternArtifacts.map((row) => row.id),
        linkedDecisionIds: continuation.retrieved.decisionRecords.map((row) => row.id)
      });
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "waiting_for_approval" });
      await this.evaluationService.evaluateRun(ctx, { runId: run.id, systemId: run.systemId, strategy: continuation.strategy, reusedPatternIds: continuation.retrieved.patternArtifacts.map((row) => row.id) });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_waiting", at: now(), status: "waiting_for_approval", text: "Waiting for approval." });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_batch_review_required", targetType: "agent_run", targetId: run.id, outcome: "success" });
      return;
    }

    const proposals = await this.repos.agentBuilder.listProposals({ runId: run.id });
    const openQuestions = (await this.repos.agentBuilder.listPlanRevisions({ runId: run.id })).flatMap((row) => row.openQuestions).slice(0, 6);
    await this.memoryService.persistRunMemory(ctx, {
      runId: run.id,
      systemId: run.systemId,
      sessionId: run.sessionId,
      summary: fullText.slice(0, 220),
      openQuestions,
      approvedCount: proposals.filter((proposal) => proposal.status === "approved" || proposal.status === "applied").length,
      rejectedCount: proposals.filter((proposal) => proposal.status === "rejected").length,
      strategyId: continuation.strategy.id,
      linkedMemoryEntryIds: continuation.retrieved.memoryEntries.map((row) => row.id),
      linkedPatternIds: continuation.retrieved.patternArtifacts.map((row) => row.id),
      linkedDecisionIds: continuation.retrieved.decisionRecords.map((row) => row.id)
    });

    await enterStage("completed", "Run completed.", "completed");
    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "completed", endedAt: now() });
    await this.evaluationService.evaluateRun(ctx, { runId: run.id, systemId: run.systemId, strategy: continuation.strategy, reusedPatternIds: continuation.retrieved.patternArtifacts.map((row) => row.id) });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_completed", at: now(), status: "completed" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_run_stage_completed", targetType: "agent_run_stage", targetId: "completed", outcome: "success" });
  }

  private async callTool(ctx: AppContext, run: { id: string; workspaceId: string; systemId?: string; sessionId: string }, publish: (event: Omit<RunEvent, "id" | "sequence">) => Promise<RunEvent>, policy: RunPolicySnapshot, toolName: any, toolInput: Record<string, unknown>) {
    if (!run.systemId) return null;
    const denied = !this.policyService.isToolAllowed(policy, toolName);
    if (denied) {
      await this.repos.agentBuilder.addPolicyDecisionRecord({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, policySnapshotId: policy.id, decisionType: "tool_blocked", subject: toolName, explanation: `Tool ${toolName} blocked by policy.`, createdAt: now() });
      await this.repos.agentBuilder.addEscalationRecord({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, reason: `tool_blocked_by_policy:${toolName}`, suggestedAction: "Request operator policy update or continue without this tool.", severity: "blocking", createdAt: now() });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "tool_blocked_by_policy", targetType: "agent_tool", targetId: toolName, outcome: "failure" });
      return null;
    }
    const startedAt = now();
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_started", at: startedAt, text: toolName, status: "tooling" });
    try {
      const output = await this.tools.runTool(ctx, run.systemId, toolName, toolInput);
      await this.repos.agentBuilder.addToolCall({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, toolName, inputJson: JSON.stringify(toolInput), outputJson: JSON.stringify(output), status: "completed", startedAt, completedAt: now() });
      const priorUsage = await this.repos.agentBuilder.getRuntimeUsageRecord({ runId: run.id });
      const usage = await this.policyService.recordRuntimeUsage(ctx, { runId: run.id, providerCalls: (priorUsage?.providerCalls ?? 0) + 1 });
      if (usage.providerCalls > policy.runtime.maxProviderCallsPerRun) {
        await this.repos.agentBuilder.addPolicyDecisionRecord({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, policySnapshotId: policy.id, decisionType: "budget_limit_hit", subject: "provider_calls", explanation: `Provider calls exceeded: ${usage.providerCalls}/${policy.runtime.maxProviderCallsPerRun}`, createdAt: now() });
      }
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_completed", at: now(), text: toolName, status: "tooling" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_tool_called", targetType: "agent_tool", targetId: toolName, outcome: "success" });
      return output;
    } catch (error) {
      await this.repos.agentBuilder.addToolCall({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, toolName, inputJson: JSON.stringify(toolInput), status: "failed", error: (error as Error).message, startedAt, completedAt: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_failed", at: now(), text: `${toolName}: ${(error as Error).message}`, status: "blocked" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_tool_failed", targetType: "agent_tool", targetId: toolName, outcome: "failure" });
      return null;
    }
  }

  private async createProposal(ctx: AppContext, run: { id: string; sessionId: string; workspaceId: string; systemId?: string }, policy: RunPolicySnapshot, sequence: number, payloadInput: unknown, rationale: string) {
    const payload = GraphActionPayloadSchema.parse(payloadInput);
    const riskClass = classifyRisk(payload);
    const applyMode = riskToApplyMode(riskClass);
    const validationStatus = payload.actionType === "update_annotation" || payload.actionType === "create_group" || payload.actionType === "update_group" ? "unsupported" : "valid";
    const autoApplyAllowed = policy.risk.safeAutoApplyEnabled && policy.risk.maxAutoAppliedActionsPerRun > 0;
    const forceReview = (policy.approval.requireApprovalForDelete && (payload.actionType === "delete_node" || payload.actionType === "delete_pipe")) || (policy.approval.requireApprovalForStructural && ["add_node", "delete_node", "add_pipe", "delete_pipe"].includes(payload.actionType));
    const status = forceReview ? "pending_review" : riskClass === "safe_auto_apply" && validationStatus === "valid" && autoApplyAllowed ? "proposed" : riskClass === "review_required" ? "pending_review" : "forbidden";
    await this.repos.agentBuilder.addPolicyDecisionRecord({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, policySnapshotId: policy.id, decisionType: status === "proposed" ? "auto_apply_allowed" : "auto_apply_blocked", subject: payload.actionType, explanation: `status=${status}, posture=${policy.risk.posture}`, createdAt: now() });
    return this.repos.agentBuilder.addProposal(GraphActionProposalSchema.omit({ id: true }).parse({ runId: run.id, sessionId: run.sessionId, workspaceId: run.workspaceId, targetSystemId: run.systemId, actionId: `action_${Math.random().toString(36).slice(2, 10)}`, actionType: payload.actionType, actor: { actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId }, payload, rationale, riskClass, applyMode, sequence, validationStatus, status, proposedAt: now() } as never));
  }

  async applyProposal(ctx: AppContext, proposalId: string, publish?: (event: Omit<RunEvent, "id" | "sequence">) => Promise<RunEvent>, policy?: RunPolicySnapshot) {
    const proposal = await this.repos.agentBuilder.getProposal(proposalId);
    if (!proposal) throw new Error("proposal_not_found");
    const requiresCheckpoint = proposal.riskClass === "review_required" || proposal.actionType === "delete_node" || proposal.actionType === "delete_pipe";
    let versionCheckpointId: string | undefined;

    if (requiresCheckpoint) {
      try {
        await this.versions.create(ctx, proposal.targetSystemId, `Agent checkpoint ${new Date().toISOString()}`);
        const versions = await this.repos.versions.list(proposal.targetSystemId);
        versionCheckpointId = versions[0]?.id;
        if (publish) await publish({ sessionId: proposal.sessionId, runId: proposal.runId, workspaceId: proposal.workspaceId, systemId: proposal.targetSystemId, type: "graph_version_checkpoint_created", at: now(), text: versionCheckpointId, status: "applying" });
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_checkpoint_created", targetType: "version", targetId: versionCheckpointId, outcome: "success" });
      } catch (error) {
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_checkpoint_failed", targetType: "version", targetId: proposal.id, outcome: "failure" });
        throw error;
      }
    }

    if (policy && policy.risk.maxAutoAppliedActionsPerRun <= 0 && proposal.status === "approved") {
      await this.repos.agentBuilder.addPolicyDecisionRecord({ runId: proposal.runId, workspaceId: proposal.workspaceId, systemId: proposal.targetSystemId, policySnapshotId: policy.id, decisionType: "auto_apply_blocked", subject: proposal.actionType, explanation: "Policy forbids auto apply.", createdAt: now() });
      throw new Error("auto_apply_blocked_by_policy");
    }
    await this.applyPayloadThroughTrustedPath(ctx, proposal.payload, proposal.targetSystemId);
    const bundle = await this.repos.systems.getBundle(proposal.targetSystemId);
    const report = validateSystem(bundle.system as never, bundle.nodes as never, buildPorts(bundle) as never, bundle.pipes as never);
    await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "applied", appliedAt: now() });
    await this.repos.agentBuilder.addAppliedAction({ proposalId: proposal.id, runId: proposal.runId, sessionId: proposal.sessionId, workspaceId: proposal.workspaceId, targetSystemId: proposal.targetSystemId, actionType: proposal.actionType, appliedAt: now(), validationIssueCount: report.issues.length, versionCheckpointId });
    return { ...proposal, status: "applied" as const, appliedAt: now() };
  }

  async reviewApproval(ctx: AppContext, input: { requestId: string; decision: "approved" | "rejected"; note?: string }) {
    if (ctx.role !== "Owner" && ctx.role !== "Admin") throw new Error("final_approval_requires_owner_or_admin");
    const request = await this.repos.agentBuilder.getApprovalRequest(input.requestId);
    if (!request) throw new Error("approval_not_found");
    await this.repos.agentBuilder.updateApprovalRequest({ requestId: request.id, status: input.decision, decidedAt: now(), decidedBy: ctx.userId, decisionNote: input.note });
    if (input.decision === "rejected") {
      await this.repos.agentBuilder.updateProposal({ proposalId: request.proposalId, status: "rejected" });
      await this.repos.agentBuilder.updateRun({ runId: request.runId, status: "blocked" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: request.systemId as never, action: "agent_approval_rejected", targetType: "approval_request", targetId: request.id, outcome: "success" });
      return { resumed: false };
    }

    await this.repos.agentBuilder.updateProposal({ proposalId: request.proposalId, status: "approved" });
    await this.repos.agentBuilder.updateRun({ runId: request.runId, status: "applying" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: request.systemId as never, action: "agent_approval_approved", targetType: "approval_request", targetId: request.id, outcome: "success" });
    await this.applyProposal(ctx, request.proposalId);
    await this.repos.agentBuilder.updateRun({ runId: request.runId, status: "completed", endedAt: now() });
    await this.evaluationService.evaluateRun(ctx, { runId: request.runId, systemId: request.systemId });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: request.systemId as never, action: "agent_run_resumed", targetType: "agent_run", targetId: request.runId, outcome: "success" });
    return { resumed: true };
  }

  async reviewProposal(ctx: AppContext, input: { proposalId: string; decision: "approved" | "rejected"; note?: string }) {
    if (ctx.role !== "Owner" && ctx.role !== "Admin") throw new Error("final_approval_requires_owner_or_admin");
    const proposal = await this.repos.agentBuilder.getProposal(input.proposalId);
    if (!proposal) throw new Error("proposal_not_found");
    if (input.decision === "rejected") {
      await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "rejected", reviewDecision: { by: ctx.userId, at: now(), decision: "rejected", note: input.note } });
      await this.repos.agentBuilder.updateRun({ runId: proposal.runId, status: "blocked" });
      return { resumed: false };
    }
    await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "approved", reviewDecision: { by: ctx.userId, at: now(), decision: "approved", note: input.note } });
    await this.applyProposal(ctx, proposal.id);
    await this.repos.agentBuilder.updateRun({ runId: proposal.runId, status: "completed", endedAt: now() });
    if (proposal.targetSystemId) await this.evaluationService.evaluateRun(ctx, { runId: proposal.runId, systemId: proposal.targetSystemId });
    return { resumed: true };
  }

  private buildSubsystemPartitions(bundle: Awaited<ReturnType<RepositorySet["systems"]["getBundle"]>>) {
    const nodes = bundle.nodes;
    if (nodes.length <= 2) {
      const first = nodes[0]?.id ? [nodes[0].id] : [];
      const second = nodes[1]?.id ? [nodes[1].id] : first;
      return [
        { id: "subsystem_primary", nodeIds: first.length ? first : nodes.map((n) => n.id), summary: "Primary subsystem scope." },
        { id: "subsystem_secondary", nodeIds: second.length ? second : nodes.map((n) => n.id), summary: "Secondary subsystem scope." }
      ];
    }
    const pivot = Math.ceil(nodes.length / 2);
    return [
      { id: "subsystem_core", nodeIds: nodes.slice(0, pivot).map((n) => n.id), summary: "Core flow subsystem." },
      { id: "subsystem_safety", nodeIds: nodes.slice(pivot).map((n) => n.id), summary: "Reliability and guardrail subsystem." }
    ];
  }

  private buildContextPack(input: {
    bundle: Awaited<ReturnType<RepositorySet["systems"]["getBundle"]>>;
    subsystem: { id: string; nodeIds: string[]; summary: string };
    stage: RunStage;
    systemGoalSummary: string;
    validationIssues: string[];
  }): SubAgentContextPack {
    const localNodes = input.bundle.nodes.filter((node) => input.subsystem.nodeIds.includes(node.id));
    const adjacentNodeIds = new Set<string>();
    for (const pipe of input.bundle.pipes) {
      if (input.subsystem.nodeIds.includes(pipe.fromNodeId as string) && !input.subsystem.nodeIds.includes(pipe.toNodeId as string)) adjacentNodeIds.add(pipe.toNodeId as string);
      if (input.subsystem.nodeIds.includes(pipe.toNodeId as string) && !input.subsystem.nodeIds.includes(pipe.fromNodeId as string)) adjacentNodeIds.add(pipe.fromNodeId as string);
    }
    return {
      subsystemId: input.subsystem.id,
      subsystemSummary: input.subsystem.summary,
      selectedNodeIds: input.subsystem.nodeIds.slice(0, 8),
      localContracts: localNodes.map((node) => `${node.title}:${node.type}`).slice(0, 8),
      adjacentSubsystemSummaries: input.bundle.nodes.filter((node) => adjacentNodeIds.has(node.id)).map((node) => `${node.title} (${node.type})`).slice(0, 6),
      systemGoalSummary: input.systemGoalSummary,
      relevantValidationIssues: input.validationIssues.slice(0, 6),
      stage: input.stage,
      recentRunNotes: [`scope:${input.subsystem.id}`, `bounded_nodes:${input.subsystem.nodeIds.length}`]
    };
  }

  private async delegateSubAgents(input: {
    ctx: AppContext;
    run: { id: string; sessionId: string; workspaceId: string; systemId?: string };
    bundle: Awaited<ReturnType<RepositorySet["systems"]["getBundle"]>>;
    message: string;
    stage: RunStage;
    summary: Record<string, unknown>;
    validationReport: Record<string, unknown>;
    memorySummary: string[];
    strategyName: string;
  }): Promise<Array<{ task: SubAgentTask; skill: SkillInvocation; result: SubAgentResult }>> {
    if (!input.run.systemId) return [];
    const partitions = this.buildSubsystemPartitions(input.bundle);
    const validationIssues = Array.isArray((input.validationReport as any)?.issues)
      ? (input.validationReport as any).issues.map((issue: any) => String(issue.message ?? issue.code ?? "issue"))
      : [];
    await this.repos.agentBuilder.addOrchestrationStep({ runId: input.run.id, workspaceId: input.run.workspaceId, systemId: input.run.systemId, stage: input.stage, decision: "decompose", summary: `Delegated ${partitions.length} subsystem tasks.`, at: now() });
    const roleByIndex: SubAgentTask["role"][] = ["architect_sub_agent", "validation_sub_agent", "subsystem_builder_sub_agent", "diff_reviewer_sub_agent"];
    const skillByIndex = ["design_subsystem_structure", "validate_subsystem_edges", "add_memory_and_guardrails", "refine_contracts_and_ports"];
    const artifacts: Array<{ task: SubAgentTask; skill: SkillInvocation; result: SubAgentResult }> = [];
    for (let idx = 0; idx < partitions.length; idx += 1) {
      const subsystem = partitions[idx];
      const contextPack = this.buildContextPack({
        bundle: input.bundle,
        subsystem,
        stage: input.stage,
        systemGoalSummary: `${input.message.slice(0, 140)} (${String(input.summary?.nodeCount ?? input.bundle.nodes.length)} nodes).`,
        validationIssues
      });
      contextPack.recentRunNotes = [...contextPack.recentRunNotes, ...input.memorySummary, `strategy:${input.strategyName}`].slice(0, 10);
      const task = await this.repos.agentBuilder.addSubAgentTask(SubAgentTaskSchema.omit({ id: true }).parse({
        runId: input.run.id,
        workspaceId: input.run.workspaceId,
        systemId: input.run.systemId,
        stage: input.stage,
        role: roleByIndex[idx % roleByIndex.length],
        skillId: skillByIndex[idx % skillByIndex.length],
        title: `Analyze ${subsystem.id}`,
        contextPack,
        status: "created",
        createdAt: now()
      }));
      await this.repos.agentBuilder.updateSubAgentTask({ taskId: task.id, status: "queued" });
      await this.repos.agentBuilder.updateSubAgentTask({ taskId: task.id, status: "running", startedAt: now() });
      const skill = await this.repos.agentBuilder.addSkillInvocation({
        taskId: task.id,
        runId: input.run.id,
        workspaceId: input.run.workspaceId,
        systemId: input.run.systemId,
        skillId: task.skillId,
        inputSummary: `${contextPack.subsystemSummary} / ${contextPack.selectedNodeIds.length} nodes`,
        status: "started",
        createdAt: now()
      });
      try {
        if (!isSkillAllowedForRole(task.skillId, task.role)) throw new Error("skill_role_mismatch");
        const executionInput: SubAgentExecutionRequest = { role: task.role, skillId: task.skillId, contextPack, userMessage: input.message };
        const policySnapshot = await this.policyService.resolveRunPolicySnapshot(input.ctx, { runId: input.run.id, systemId: input.run.systemId });
        const execution = await this.runtimeService.executeSubAgent(input.ctx, { task: { id: task.id, runId: task.runId, workspaceId: task.workspaceId, role: task.role, skillId: task.skillId, contextPack }, request: executionInput, policy: policySnapshot });
        const heuristicConflicts = (idx > 0 && input.message.toLowerCase().includes("delet"))
          || contextPack.relevantValidationIssues.some((issue) => issue.toLowerCase().includes("delete"));
        const conflictSignals = heuristicConflicts
          ? Array.from(new Set([...execution.output.conflictSignals, "potential_destructive_change"]))
          : execution.output.conflictSignals;
        const result = await this.repos.agentBuilder.addSubAgentResult({
          taskId: task.id,
          runId: input.run.id,
          workspaceId: input.run.workspaceId,
          systemId: input.run.systemId,
          planSummary: execution.output.planRefinement ?? `Refined plan for ${subsystem.id}: ${getSkillDefinition(task.skillId)?.purpose ?? "analyze"} using bounded context.`,
          critique: execution.output.critique ?? (contextPack.relevantValidationIssues[0] ? `Top issue: ${contextPack.relevantValidationIssues[0]}` : "No blocking validation issue in scope."),
          proposedActionTypes: execution.output.proposalInputs.map((item) => item.actionType),
          openQuestions: execution.output.openQuestions,
          conflictSignals,
          createdAt: now()
        });
        await this.repos.agentBuilder.addSkillInvocation({
          taskId: task.id,
          runId: input.run.id,
          workspaceId: input.run.workspaceId,
          systemId: input.run.systemId,
          skillId: task.skillId,
          inputSummary: skill.inputSummary,
          status: "completed",
          outputSummary: `${result.planSummary ?? ""} [${execution.metadata.target}:${execution.metadata.harness}]`,
          createdAt: skill.createdAt,
          completedAt: now()
        });
        await this.repos.agentBuilder.updateSubAgentTask({ taskId: task.id, status: conflictSignals.length ? "blocked" : "completed", completedAt: now(), error: conflictSignals.length ? conflictSignals.join(", ") : undefined });
        artifacts.push({ task: { ...task, status: conflictSignals.length ? "blocked" : "completed", completedAt: now() }, skill, result });
      } catch (error) {
        await this.repos.agentBuilder.addSkillInvocation({
          taskId: task.id,
          runId: input.run.id,
          workspaceId: input.run.workspaceId,
          systemId: input.run.systemId,
          skillId: task.skillId,
          inputSummary: skill.inputSummary,
          status: "failed",
          outputSummary: (error as Error).message,
          createdAt: skill.createdAt,
          completedAt: now()
        });
        await this.repos.agentBuilder.updateSubAgentTask({ taskId: task.id, status: "failed", completedAt: now(), error: (error as Error).message });
      }
    }
    return artifacts;
  }

  private async reconcileSubAgentOutputs(input: {
    ctx: AppContext;
    run: { id: string; workspaceId: string; systemId?: string };
    stage: RunStage;
    taskArtifacts: Array<{ task: SubAgentTask; result: SubAgentResult }>;
  }): Promise<{ record: ReconciliationRecord; proposalInputs: Array<{ payload: GraphActionPayload; rationale: string; summary: string }> }> {
    if (!input.run.systemId) throw new Error("run_missing_system");
    const hasConflict = input.taskArtifacts.some((item) => item.result.conflictSignals.length > 0);
    const decision: ReconciliationRecord["decision"] = hasConflict ? "review_required" : "merged";
    const summary = hasConflict ? "Conflicting specialist outputs detected; risky changes flagged for human review." : "Merged specialist outputs into staged proposal inputs.";
    const record = await this.repos.agentBuilder.addReconciliationRecord({
      runId: input.run.id,
      workspaceId: input.run.workspaceId,
      systemId: input.run.systemId,
      inputTaskIds: input.taskArtifacts.map((item) => item.task.id),
      decision,
      summary,
      createdAt: now()
    });
    const proposalInputs = input.taskArtifacts.flatMap((item) => item.result.proposedActionTypes.map((actionType) => {
      if (actionType === "delete_node") {
        return {
          payload: { actionType: "delete_node", nodeId: item.task.contextPack.selectedNodeIds[0] ?? "unknown_node" } as GraphActionPayload,
          rationale: `${item.task.contextPack.subsystemId}: requested by specialist result`,
          summary: `${item.task.contextPack.subsystemId} · risky cleanup batch`
        };
      }
      return {
        payload: { actionType: "add_annotation", body: `Subsystem ${item.task.contextPack.subsystemId}: ${item.result.planSummary ?? "refinement"}`, nodeId: item.task.contextPack.selectedNodeIds[0] } as GraphActionPayload,
        rationale: `${item.task.contextPack.subsystemId}: safe refinement`,
        summary: `${item.task.contextPack.subsystemId} · safe refinement batch`
      };
    }));
    await this.repos.agentBuilder.addProposalBatch(ProposalBatchSchema.omit({ id: true }).parse({
      runId: input.run.id,
      workspaceId: input.run.workspaceId,
      systemId: input.run.systemId,
      stage: input.stage,
      summary: "Reconciled subsystem outputs",
      rationale: record.summary,
      proposalIds: [],
      status: record.decision === "review_required" ? "review_required" : "created",
      createdAt: now(),
      updatedAt: now()
    }));
    await this.repos.agentBuilder.addPlanRevision(PlanRevisionSchema.omit({ id: true }).parse({
      runId: input.run.id,
      workspaceId: input.run.workspaceId,
      systemId: input.run.systemId,
      version: 3,
      summary: `Reconciliation outcome: ${record.decision}`,
      critique: input.taskArtifacts.map((item) => item.result.critique).filter(Boolean).join(" | "),
      assumptions: ["Sub-agent outputs are bounded by subsystem context packs."],
      openQuestions: input.taskArtifacts.flatMap((item) => item.result.openQuestions),
      unresolvedRisks: hasConflict ? ["Conflicting subsystem outputs require review before destructive apply."] : [],
      recommendedNextSteps: hasConflict ? ["Approve or reject risky batch.", "Apply safe batch now."] : ["Apply safe batch."],
      createdAt: now()
    }));
    return { record, proposalInputs };
  }

  private async applyPayloadThroughTrustedPath(ctx: AppContext, payload: GraphActionPayload, systemId: string) {
    if (payload.actionType === "add_node") return this.graph.mutate(ctx, { action: "addNode", systemId, type: payload.nodeType, title: payload.title, description: payload.description, x: payload.position.x, y: payload.position.y });
    if (payload.actionType === "update_node") return this.graph.mutate(ctx, { action: "updateNode", nodeId: payload.nodeId, title: payload.title, description: payload.description });
    if (payload.actionType === "move_node") return this.graph.mutate(ctx, { action: "updateNode", nodeId: payload.nodeId, position: payload.position });
    if (payload.actionType === "delete_node") return this.graph.mutate(ctx, { action: "deleteNode", nodeId: payload.nodeId });
    if (payload.actionType === "add_pipe") return this.graph.mutate(ctx, { action: "addPipe", systemId, fromNodeId: payload.fromNodeId, toNodeId: payload.toNodeId });
    if (payload.actionType === "delete_pipe") return this.graph.mutate(ctx, { action: "deletePipe", pipeId: payload.pipeId });
    if (payload.actionType === "add_annotation") return this.repos.comments.add({ systemId, authorId: ctx.userId, body: payload.body, nodeId: payload.nodeId });
    if (payload.actionType === "create_version_checkpoint") return this.versions.create(ctx, systemId, payload.name);
    if (payload.actionType === "request_review" || payload.actionType === "no_op_explanation") return;
    throw new Error(`unsupported_action_${payload.actionType}`);
  }

  async listRunEvents(ctx: AppContext, input: { runId?: string; sessionId?: string }) { return this.repos.agentBuilder.listRunEvents(input); }
  async listMessages(ctx: AppContext, sessionId: string) { return this.repos.agentBuilder.listMessages({ sessionId }); }
  async listProposals(ctx: AppContext, input: { runId?: string; systemId?: string; status?: GraphActionProposal["status"] }) { return this.repos.agentBuilder.listProposals(input); }
  async listAppliedActions(ctx: AppContext, input: { runId?: string; systemId?: string }) { return this.repos.agentBuilder.listAppliedActions(input); }
  async listApprovals(ctx: AppContext, input: { runId?: string; systemId?: string; status?: "pending" | "approved" | "rejected" }) { return this.repos.agentBuilder.listApprovalRequests(input); }
  async getPlan(ctx: AppContext, runId: string) { return this.repos.agentBuilder.getPlan(runId); }
  async listToolCalls(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listToolCalls({ runId }); }
  async listStageRecords(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listStageRecords({ runId }); }
  async listPlanRevisions(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listPlanRevisions({ runId }); }
  async listRoleActivities(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listRoleActivities({ runId }); }
  async listProposalBatches(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listProposalBatches({ runId }); }
  async listBatchDiffItems(ctx: AppContext, input: { runId: string; batchId: string }) { return this.diffService.listBatchDiffItems(input.runId, input.batchId); }
  async validateBatchSelection(ctx: AppContext, input: { runId: string; batchId: string; selectedDiffIds: string[] }) { return this.selectionService.validateSelection(input.runId, input.batchId, input.selectedDiffIds); }
  async getBatchPreview(ctx: AppContext, input: { runId: string; batchId: string; selectedDiffIds?: string[]; previewEnabled?: boolean }) { return this.previewService.listBatchPreview(input.runId, input.batchId, input.selectedDiffIds, input.previewEnabled); }
  async getAffectedRegion(ctx: AppContext, input: { runId: string; batchId: string; selectedProposalIds?: string[] }) { return this.regionService.deriveForBatch(input.runId, input.batchId, input.selectedProposalIds); }
  async reviewBatchSelection(ctx: AppContext, input: { runId: string; batchId: string; decision: "approve_all" | "reject_all" | "approve_selected"; selectedDiffIds?: string[]; note?: string }) { return this.batchReviewService.decide(ctx, input); }
  async listSubAgentTasks(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listSubAgentTasks({ runId }); }
  async listSubAgentResults(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listSubAgentResults({ runId }); }
  async listSkillInvocations(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listSkillInvocations({ runId }); }
  async listOrchestrationSteps(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listOrchestrationSteps({ runId }); }
  async listReconciliationRecords(ctx: AppContext, runId: string) { return this.repos.agentBuilder.listReconciliationRecords({ runId }); }
  async listEvaluations(ctx: AppContext, input: { runId?: string; systemId?: string; scope?: "run" | "plan" | "proposal_batch" | "applied_change" | "strategy" | "skill" | "pattern" }) { return this.repos.agentBuilder.listEvaluationRecords({ workspaceId: ctx.workspaceId, runId: input.runId, systemId: input.systemId, scope: input.scope }); }
  async listStrategyPerformance(ctx: AppContext, input: { systemId?: string; runId?: string; strategyId?: string }) { return this.repos.agentBuilder.listStrategyPerformanceRecords({ workspaceId: ctx.workspaceId, ...input }); }
  async listSkillPerformance(ctx: AppContext, input: { systemId?: string; runId?: string; skillId?: string }) { return this.repos.agentBuilder.listSkillPerformanceRecords({ workspaceId: ctx.workspaceId, ...input }); }
  async listPatternLifecycle(ctx: AppContext, input: { systemId?: string; patternArtifactId?: string }) {
    const [promoted, demoted] = await Promise.all([
      this.repos.agentBuilder.listPatternPromotionRecords({ workspaceId: ctx.workspaceId, ...input }),
      this.repos.agentBuilder.listPatternDemotionRecords({ workspaceId: ctx.workspaceId, ...input })
    ]);
    return { promoted, demoted };
  }
  async listLearningArtifacts(ctx: AppContext, input: { systemId?: string; runId?: string }) { return this.repos.agentBuilder.listLearningArtifacts({ workspaceId: ctx.workspaceId, ...input }); }
  async listMemoryEntries(ctx: AppContext, input: { systemId?: string; sessionId?: string }) { return this.memoryService.listMemory(ctx, input); }
  async listBuilderStrategies(ctx: AppContext, input: { systemId?: string }) { return this.memoryService.listStrategies(ctx, input); }
  async setBuilderStrategy(ctx: AppContext, input: { systemId?: string; name: "architecture_first" | "template_first" | "subsystem_first" | "validation_heavy" | "cautious_review" | "aggressive_draft_then_review"; summary?: string }) { return this.memoryService.setPreferredStrategy(ctx, input); }
  async listPatternArtifacts(ctx: AppContext, input: { systemId?: string; tag?: string }) { return this.memoryService.listPatterns(ctx, input); }
  async savePatternArtifact(ctx: AppContext, input: { systemId: string; runId?: string; title: string; summary: string; intendedUse: string; inputContractSummary: string; outputContractSummary: string; riskNotes: string; tags?: string[]; subsystemId?: string; proposalId?: string; batchId?: string }) { return this.memoryService.savePattern(ctx, input); }
  async listDecisionRecords(ctx: AppContext, input: { systemId?: string; runId?: string }) { return this.memoryService.listDecisions(ctx, input); }
  async recordDecisionMemory(ctx: AppContext, input: { systemId?: string; runId?: string; category: "decomposition" | "naming" | "review_policy" | "guardrail" | "template_preference" | "architecture_direction"; title: string; decision: string; rationale: string; state: "accepted" | "rejected" | "tentative"; staleAfter?: string }) { return this.memoryService.recordDecision(ctx, input); }

  private async appendEvent(event: Omit<RunEvent, "id">) { return this.repos.agentBuilder.addEvent(RunEventSchema.omit({ id: true }).parse(event)); }
}

export function normalizeRunStatus(events: Array<{ type: string; status?: RunStatus }>): RunStatus {
  const terminal = [...events].reverse().find((event) => event.status);
  return terminal?.status ?? "created";
}
