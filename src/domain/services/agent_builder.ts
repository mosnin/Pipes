import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { RunEventSchema, type RunEvent, type RunStatus } from "@/domain/agent_builder/model";
import { classifyRisk, GraphActionPayloadSchema, GraphActionProposalSchema, riskToApplyMode, type GraphActionPayload, type GraphActionProposal } from "@/domain/agent_builder/actions";
import { getAgentStreamingProvider } from "@/lib/ai/agent_stream";
import { AccessService, EntitlementService, GraphService, SchemaExportService, VersionService } from "@/domain/services/bounded";
import { validateSystem } from "@/domain/validation";

const now = () => new Date().toISOString();

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

  constructor(private readonly repos: RepositorySet) {
    this.access = new AccessService();
    this.graph = new GraphService(this.repos, this.access);
    this.schemaExport = new SchemaExportService(this.repos, this.access);
    this.versions = new VersionService(this.repos, this.access, this.schemaExport, new EntitlementService(this.repos));
  }

  async createSession(ctx: AppContext, input: { systemId?: string; title?: string }) {
    const session = await this.repos.agentBuilder.createSession({ workspaceId: ctx.workspaceId, systemId: input.systemId, title: input.title ?? "System Builder Session", createdBy: ctx.userId });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "agent_session_created", targetType: "agent_session", targetId: session.id, outcome: "success" });
    return session;
  }

  async listSessions(ctx: AppContext, systemId?: string) {
    return this.repos.agentBuilder.listSessions({ workspaceId: ctx.workspaceId, systemId });
  }

  async createRun(ctx: AppContext, input: { sessionId: string; systemId?: string; message: string }) {
    const userMessage = await this.repos.agentBuilder.addMessage({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, role: "user", body: input.message });
    const run = await this.repos.agentBuilder.createRun({ sessionId: input.sessionId, workspaceId: ctx.workspaceId, systemId: input.systemId, userMessageId: userMessage.id });
    await this.appendEvent({ sessionId: input.sessionId, runId: run.id, workspaceId: ctx.workspaceId, systemId: input.systemId, type: "run_created", at: now(), sequence: 1, status: "created" });
    return { run, userMessage };
  }

  async streamRun(ctx: AppContext, input: { runId: string; message: string; systemName?: string; systemDescription?: string; onEvent?: (event: RunEvent) => Promise<void> }) {
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

    await this.repos.agentBuilder.updateRun({ runId: run.id, status: "running", startedAt: now() });
    await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_started", at: now(), status: "running" });

    let fullText = "";
    const provider = getAgentStreamingProvider();

    try {
      for await (const chunk of provider.streamBuilderResponse({ systemId: run.systemId, systemName: input.systemName, systemDescription: input.systemDescription, message: input.message, nodeIds: bundle.nodes.map((n) => n.id), pipeIds: bundle.pipes.map((p) => p.id) })) {
        if (chunk.type === "text_delta") {
          fullText += chunk.text;
          await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_delta", at: now(), text: chunk.text });
          continue;
        }

        const proposal = await this.createProposal(ctx, run, ++seq, chunk.action, chunk.rationale);
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_proposed", at: now(), graphActionProposal: proposal });

        if (proposal.status === "pending_review") {
          await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_review_required", at: now(), text: proposal.rationale, graphActionProposal: proposal });
          continue;
        }

        if (proposal.status === "forbidden") {
          await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "graph_action_apply_failed", at: now(), text: "forbidden_action", graphActionProposal: proposal });
          continue;
        }

        const applied = await this.applyProposal(ctx, proposal.id);
        await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: applied.status === "applied" ? "graph_action_auto_applied" : "graph_action_apply_failed", at: now(), text: applied.error, graphActionProposal: applied });
      }

      await this.repos.agentBuilder.addMessage({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, role: "assistant", body: fullText });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "assistant_text_completed", at: now(), text: fullText });
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "completed", endedAt: now() });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_completed", at: now(), status: "completed" });
    } catch (error) {
      const message = (error as Error).message;
      await this.repos.agentBuilder.updateRun({ runId: run.id, status: "failed", endedAt: now(), error: message });
      await publish({ sessionId: run.sessionId, runId: run.id, workspaceId: run.workspaceId, systemId: run.systemId, type: "run_failed", at: now(), status: "failed", text: message });
    }
  }

  private async createProposal(ctx: AppContext, run: { id: string; sessionId: string; workspaceId: string; systemId?: string }, sequence: number, payloadInput: unknown, rationale: string) {
    const payload = GraphActionPayloadSchema.parse(payloadInput);
    const riskClass = classifyRisk(payload);
    const applyMode = riskToApplyMode(riskClass);
    const validationStatus = payload.actionType === "update_annotation" || payload.actionType === "create_group" || payload.actionType === "update_group" ? "unsupported" : "valid";
    const status = riskClass === "safe_auto_apply" && validationStatus === "valid" ? "proposed" : riskClass === "review_required" ? "pending_review" : "forbidden";
    const draft = GraphActionProposalSchema.omit({ id: true }).parse({
      runId: run.id,
      sessionId: run.sessionId,
      workspaceId: run.workspaceId,
      targetSystemId: run.systemId,
      actionId: `action_${Math.random().toString(36).slice(2, 10)}`,
      actionType: payload.actionType,
      actor: { actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId },
      payload,
      rationale,
      riskClass,
      applyMode,
      sequence,
      validationStatus,
      status,
      proposedAt: now()
    } as never);
    const stored = await this.repos.agentBuilder.addProposal(draft);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: run.systemId as never, action: status === "pending_review" ? "agent_graph_action_review_required" : "agent_graph_action_proposed", targetType: "graph_action_proposal", targetId: stored.id, outcome: "success" });
    return stored;
  }

  async applyProposal(ctx: AppContext, proposalId: string) {
    const proposal = await this.repos.agentBuilder.getProposal(proposalId);
    if (!proposal) throw new Error("proposal_not_found");
    if (proposal.status === "rejected") return proposal;

    let versionCheckpointId: string | undefined;
    try {
      if (proposal.riskClass === "review_required") {
        await this.versions.create(ctx, proposal.targetSystemId, `Agent checkpoint ${new Date().toISOString()}`);
        const versions = await this.repos.versions.list(proposal.targetSystemId);
        versionCheckpointId = versions[0]?.id;
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_graph_version_checkpoint_created", targetType: "version", targetId: versionCheckpointId, outcome: "success" });
      }
      await this.applyPayloadThroughTrustedPath(ctx, proposal.payload, proposal.targetSystemId);
      const bundle = await this.repos.systems.getBundle(proposal.targetSystemId);
      const report = validateSystem(bundle.system as never, bundle.nodes as never, buildPorts(bundle) as never, bundle.pipes as never);
      await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "applied", appliedAt: now() });
      await this.repos.agentBuilder.addAppliedAction({ proposalId: proposal.id, runId: proposal.runId, sessionId: proposal.sessionId, workspaceId: proposal.workspaceId, targetSystemId: proposal.targetSystemId, actionType: proposal.actionType, appliedAt: now(), validationIssueCount: report.issues.length, versionCheckpointId });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_graph_action_auto_applied", targetType: "graph_action_proposal", targetId: proposal.id, outcome: "success", metadata: JSON.stringify({ validationIssueCount: report.issues.length }) });
      return { ...proposal, status: "applied" as const, appliedAt: now() };
    } catch (error) {
      const message = (error as Error).message;
      await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "apply_failed", error: message });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_graph_action_apply_failed", targetType: "graph_action_proposal", targetId: proposal.id, outcome: "failure", metadata: JSON.stringify({ error: message }) });
      return { ...proposal, status: "apply_failed" as const, error: message };
    }
  }

  async reviewProposal(ctx: AppContext, input: { proposalId: string; decision: "approved" | "rejected"; note?: string }) {
    const proposal = await this.repos.agentBuilder.getProposal(input.proposalId);
    if (!proposal) throw new Error("proposal_not_found");
    if (input.decision === "rejected") {
      await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "rejected", reviewDecision: { decision: "rejected", by: ctx.actorId, at: now(), note: input.note } });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_graph_action_rejected", targetType: "graph_action_proposal", targetId: proposal.id, outcome: "success" });
      return this.repos.agentBuilder.getProposal(proposal.id);
    }

    await this.repos.agentBuilder.updateProposal({ proposalId: proposal.id, status: "approved", reviewDecision: { decision: "approved", by: ctx.actorId, at: now(), note: input.note } });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: proposal.targetSystemId as never, action: "agent_graph_action_approved", targetType: "graph_action_proposal", targetId: proposal.id, outcome: "success" });
    return this.applyProposal(ctx, proposal.id);
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

  async listRunEvents(ctx: AppContext, input: { runId?: string; sessionId?: string }) {
    return this.repos.agentBuilder.listRunEvents(input);
  }

  async listMessages(ctx: AppContext, sessionId: string) {
    return this.repos.agentBuilder.listMessages({ sessionId });
  }

  async listProposals(ctx: AppContext, input: { runId?: string; systemId?: string; status?: GraphActionProposal["status"] }) {
    return this.repos.agentBuilder.listProposals(input);
  }

  async listAppliedActions(ctx: AppContext, input: { runId?: string; systemId?: string }) {
    return this.repos.agentBuilder.listAppliedActions(input);
  }

  private async appendEvent(event: Omit<RunEvent, "id">) {
    return this.repos.agentBuilder.addEvent(RunEventSchema.omit({ id: true }).parse(event));
  }
}

export function normalizeRunStatus(events: Array<{ type: string; status?: RunStatus }>): RunStatus {
  const terminal = [...events].reverse().find((event) => event.status);
  return terminal?.status ?? "created";
}
