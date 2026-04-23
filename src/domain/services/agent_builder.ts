import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { ApprovalRequestSchema, RunEventSchema, RunPlanSchema, type RunEvent, type RunStatus } from "@/domain/agent_builder/model";
import { classifyRisk, GraphActionPayloadSchema, GraphActionProposalSchema, riskToApplyMode, type GraphActionPayload, type GraphActionProposal } from "@/domain/agent_builder/actions";
import { getAgentStreamingProvider } from "@/lib/ai/agent_stream";
import { AccessService, EntitlementService, GraphService, SchemaExportService, VersionService } from "@/domain/services/bounded";
import { validateSystem } from "@/domain/validation";
import { AgentToolService } from "@/domain/services/agent_tools";

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

  constructor(private readonly repos: RepositorySet, private readonly runtime: AgentRuntime = new ModalReadyAgentRuntime()) {
    this.access = new AccessService();
    this.graph = new GraphService(this.repos, this.access);
    this.schemaExport = new SchemaExportService(this.repos, this.access);
    this.versions = new VersionService(this.repos, this.access, this.schemaExport, new EntitlementService(this.repos));
    this.tools = new AgentToolService(this.repos);
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

    let seq = (await this.repos.agentBuilder.listRunEvents({ runId: run.id })).length;
    const publish = async (event: Omit<RunEvent, "id" | "sequence">) => {
      const stored = await this.appendEvent({ ...event, sequence: ++seq });
      if (input.onEvent) await input.onEvent(stored);
      return stored;
    };

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "planning", startedAt: now() });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_started", at: now(), status: "planning" });

    const plan = await this.repos.agentBuilder.upsertPlan(RunPlanSchema.omit({ id: true, createdAt: true, updatedAt: true }).parse({
      runId: run.id,
      workspaceId: run.workspaceId,
      systemId: run.systemId,
      summary: "Inspect system state, validate constraints, propose typed graph actions, and request approval for risky changes.",
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

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "tooling" });
    await this.callTool(ctx, run, publish, "get_system_summary", {});
    await this.callTool(ctx, run, publish, "get_validation_report", {});

    let fullText = "";
    const provider = getAgentStreamingProvider();

    for await (const chunk of provider.streamBuilderResponse({ systemId: run.systemId, systemName: input.systemName, systemDescription: input.systemDescription, message: input.message, nodeIds: bundle.nodes.map((n) => n.id), pipeIds: bundle.pipes.map((p) => p.id) })) {
      if (chunk.type === "text_delta") {
        fullText += chunk.text;
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_delta", at: now(), text: chunk.text });
        continue;
      }
      const proposal = await this.createProposal(ctx, run, ++seq, chunk.action, chunk.rationale);
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_proposed", at: now(), graphActionProposal: proposal });

      if (proposal.status === "pending_review") {
        const approval = await this.repos.agentBuilder.addApprovalRequest(ApprovalRequestSchema.omit({ id: true }).parse({ runId: run.id, proposalId: proposal.id, workspaceId: run.workspaceId, systemId: run.systemId, targetType: "graph_action", targetRef: proposal.id, reason: proposal.rationale, status: "pending", requestedAt: now() }));
        await this.repos.agentBuilder.updateRun({ runId: run.id, status: "waiting_for_approval" });
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
      const applied = await this.applyProposal(ctx, proposal.id, publish);
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: applied.status === "applied" ? "graph_action_auto_applied" : "graph_action_apply_failed", at: now(), text: applied.error, graphActionProposal: applied, status: applied.status === "applied" ? "applying" : "blocked" });
    }

    await this.repos.agentBuilder.addMessage({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, role: "assistant", body: fullText });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_completed", at: now(), text: fullText });

    const pending = await this.repos.agentBuilder.listApprovalRequests({ runId: run.id, status: "pending" });
    if (pending.length > 0) {
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "waiting_for_approval" });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_waiting", at: now(), status: "waiting_for_approval", text: "Waiting for approval." });
      return;
    }

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "completed", endedAt: now() });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_completed", at: now(), status: "completed" });
  }

  private async callTool(ctx: AppContext, run: { id: string; workspaceId: string; systemId?: string; sessionId: string }, publish: (event: Omit<RunEvent, "id" | "sequence">) => Promise<RunEvent>, toolName: any, toolInput: Record<string, unknown>) {
    if (!run.systemId) return;
    const startedAt = now();
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_started", at: startedAt, text: toolName, status: "tooling" });
    try {
      const output = await this.tools.runTool(ctx, run.systemId, toolName, toolInput);
      await this.repos.agentBuilder.addToolCall({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, toolName, inputJson: JSON.stringify(toolInput), outputJson: JSON.stringify(output), status: "completed", startedAt, completedAt: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_completed", at: now(), text: toolName, status: "tooling" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_tool_called", targetType: "agent_tool", targetId: toolName, outcome: "success" });
    } catch (error) {
      await this.repos.agentBuilder.addToolCall({ runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, toolName, inputJson: JSON.stringify(toolInput), status: "failed", error: (error as Error).message, startedAt, completedAt: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "tool_call_failed", at: now(), text: `${toolName}: ${(error as Error).message}`, status: "blocked" });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: "agent_tool_failed", targetType: "agent_tool", targetId: toolName, outcome: "failure" });
    }
  }

  private async createProposal(ctx: AppContext, run: { id: string; sessionId: string; workspaceId: string; systemId?: string }, sequence: number, payloadInput: unknown, rationale: string) {
    const payload = GraphActionPayloadSchema.parse(payloadInput);
    const riskClass = classifyRisk(payload);
    const applyMode = riskToApplyMode(riskClass);
    const validationStatus = payload.actionType === "update_annotation" || payload.actionType === "create_group" || payload.actionType === "update_group" ? "unsupported" : "valid";
    const status = riskClass === "safe_auto_apply" && validationStatus === "valid" ? "proposed" : riskClass === "review_required" ? "pending_review" : "forbidden";
    return this.repos.agentBuilder.addProposal(GraphActionProposalSchema.omit({ id: true }).parse({ runId: run.id, sessionId: run.sessionId, workspaceId: run.workspaceId, targetSystemId: run.systemId, actionId: `action_${Math.random().toString(36).slice(2, 10)}`, actionType: payload.actionType, actor: { actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId }, payload, rationale, riskClass, applyMode, sequence, validationStatus, status, proposedAt: now() } as never));
  }

  async applyProposal(ctx: AppContext, proposalId: string, publish?: (event: Omit<RunEvent, "id" | "sequence">) => Promise<RunEvent>) {
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

    await this.applyPayloadThroughTrustedPath(ctx, proposal.payload, proposal.targetSystemId);
    const bundle = await this.repos.systems.getBundle(proposal.targetSystemId);
    const report = validateSystem(bundle.system as never, bundle.nodes as never, buildPorts(bundle) as never, bundle.pipes as never);
    await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "applied", appliedAt: now() });
    await this.repos.agentBuilder.addAppliedAction({ proposalId: proposal.id, runId: proposal.runId, sessionId: proposal.sessionId, workspaceId: proposal.workspaceId, targetSystemId: proposal.targetSystemId, actionType: proposal.actionType, appliedAt: now(), validationIssueCount: report.issues.length, versionCheckpointId });
    return { ...proposal, status: "applied" as const, appliedAt: now() };
  }

  async reviewApproval(ctx: AppContext, input: { requestId: string; decision: "approved" | "rejected"; note?: string }) {
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
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: request.systemId as never, action: "agent_run_resumed", targetType: "agent_run", targetId: request.runId, outcome: "success" });
    return { resumed: true };
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

  private async appendEvent(event: Omit<RunEvent, "id">) { return this.repos.agentBuilder.addEvent(RunEventSchema.omit({ id: true }).parse(event)); }
}

export function normalizeRunStatus(events: Array<{ type: string; status?: RunStatus }>): RunStatus {
  const terminal = [...events].reverse().find((event) => event.status);
  return terminal?.status ?? "created";
}
