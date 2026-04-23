import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { RunPolicySnapshot } from "@/domain/agent_builder/policy";
import type { SubAgentTask } from "@/domain/agent_builder/sub_agents";
import type { SubAgentExecutionRequest, SubAgentProviderOutput } from "@/lib/ai/sub_agents";
import { RuntimeRoutingService } from "@/domain/services/runtime_routing";
import { ModalExecutionService } from "@/lib/runtime/modal_execution";
import { OpenAIAgentHarnessService } from "@/lib/ai/openai_agents_harness";
import { SandboxSessionService } from "@/domain/services/sandbox_session";
import { SandboxArtifactService } from "@/domain/services/sandbox_artifact";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export type RuntimeExecutionResult = { output: SubAgentProviderOutput; metadata: { target: "inline_host" | "modal_worker" | "modal_sandbox"; provider: "mock" | "openai"; harness: "agents_sdk" | "chat_completions" | "mock" | "modal"; routingReason: string } };

export class AgentRuntimeService {
  private readonly routing: RuntimeRoutingService;
  private readonly modal: ModalExecutionService;
  private readonly harness: OpenAIAgentHarnessService;
  private readonly sandboxSessions: SandboxSessionService;
  private readonly sandboxArtifacts: SandboxArtifactService;

  constructor(private readonly repos: RepositorySet) {
    this.routing = new RuntimeRoutingService(repos);
    this.modal = new ModalExecutionService();
    this.harness = new OpenAIAgentHarnessService();
    this.sandboxSessions = new SandboxSessionService(repos);
    this.sandboxArtifacts = new SandboxArtifactService(repos);
  }

  async executeSubAgent(ctx: AppContext, input: { task: Pick<SubAgentTask, "id" | "runId" | "workspaceId" | "skillId" | "role" | "contextPack">; request: SubAgentExecutionRequest; policy: RunPolicySnapshot }): Promise<RuntimeExecutionResult> {
    const decision = this.routing.resolve(ctx, { task: input.task, policy: input.policy });
    await this.routing.persistDecision(ctx, decision);
    await this.recordLifecycle(ctx, input.task, decision.target, "queued", `reason:${decision.reason}`);

    if (decision.sandboxRequirement === "required" && decision.target !== "modal_sandbox") {
      await this.recordLifecycle(ctx, input.task, "inline_host", "failed", "sandbox_required_but_blocked_by_policy");
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "sandbox_task_blocked_by_policy", targetType: "sub_agent_task", targetId: input.task.id, outcome: "failure" });
      throw new Error("sandbox_required_but_blocked_by_policy");
    }

    if (decision.target === "modal_worker" || decision.target === "modal_sandbox") {
      const mode = decision.target === "modal_sandbox" ? "sandbox" : "worker";
      const mount = mode === "sandbox" ? await this.sandboxSessions.requestWorkspaceMount(ctx, { mountType: "handoff_context", pathHint: `/workspace/${ctx.workspaceId}` }) : undefined;
      const bundle = await this.sandboxSessions.prepareInputBundle(ctx, { runId: input.task.runId, taskId: input.task.id, bundleType: mode === "sandbox" ? "handoff_context" : "schema_summary", content: JSON.stringify(input.request.contextPack) });
      const session = await this.sandboxSessions.createSession(ctx, { runId: input.task.runId, taskId: input.task.id, executionTarget: decision.target, mountRefs: mount ? [mount] : [], fileBundleRef: bundle });
      await this.sandboxSessions.updateStatus(ctx, { sessionId: session.id, status: "active" });
      await this.recordLifecycle(ctx, input.task, decision.target, "dispatched", `mode:${mode}`);
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: decision.target === "modal_sandbox" ? "sandbox_task_started" : "modal_task_dispatched", targetType: "sub_agent_task", targetId: input.task.id, outcome: "success" });
      try {
        await this.recordLifecycle(ctx, input.task, decision.target, "running");
        const modal = await this.modal.execute({ request: input.request, mode });
        const artifact = await this.sandboxArtifacts.createFromRaw(ctx, { runId: input.task.runId, taskId: input.task.id, sessionId: session.id, type: mode === "sandbox" ? "handoff_bundle" : "analysis_report", title: `${input.task.skillId} output`, rawContent: JSON.stringify(modal.output, null, 2) });
        await this.sandboxArtifacts.normalize(ctx, artifact.id, (raw) => raw);
        await this.sandboxSessions.updateStatus(ctx, { sessionId: session.id, status: "completed" });
        await this.recordLifecycle(ctx, input.task, decision.target, "completed", modal.jobId ? `job:${modal.jobId}` : undefined);
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: decision.target === "modal_sandbox" ? "sandbox_task_completed" : "worker_result_normalized", targetType: "sub_agent_task", targetId: input.task.id, outcome: "success" });
        return { output: modal.output, metadata: { target: decision.target, provider: "openai", harness: "modal", routingReason: decision.reason } };
      } catch (error) {
        await this.sandboxSessions.updateStatus(ctx, { sessionId: session.id, status: "failed" });
        await this.recordLifecycle(ctx, input.task, decision.target, "failed", (error as Error).message);
        await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "modal_task_failed", targetType: "sub_agent_task", targetId: input.task.id, outcome: "failure", metadata: (error as Error).message });
        throw error;
      }
    }

    await this.recordLifecycle(ctx, input.task, "inline_host", "running");
    const harness = await this.harness.execute(input.request);
    await this.recordLifecycle(ctx, input.task, "inline_host", "completed", harness.metadata.harness);
    return { output: harness.output, metadata: { target: "inline_host", provider: harness.metadata.harness === "mock" ? "mock" : "openai", harness: harness.metadata.harness, routingReason: decision.reason } };
  }


  async listSandboxSessions(ctx: AppContext, runId: string) {
    return this.sandboxSessions.listSessions(ctx, runId);
  }

  async getSandboxSession(ctx: AppContext, sessionId: string) {
    return this.sandboxSessions.getSession(ctx, sessionId);
  }

  async listSandboxArtifacts(ctx: AppContext, runId: string) {
    return this.sandboxArtifacts.listByRun(ctx, runId);
  }

  async getArtifactPreview(ctx: AppContext, artifactId: string) {
    return this.sandboxArtifacts.getPreview(ctx, artifactId);
  }

  async listNormalization(ctx: AppContext, runId: string) {
    return this.sandboxArtifacts.listNormalizationRecords(ctx, runId);
  }

  async listTaskExecution(ctx: AppContext, runId: string) {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, runId, type: "decision_memory" });
    return rows.filter((row) => row.tags.includes("runtime_execution_record")).map((row) => JSON.parse(row.detail ?? "{}"));
  }

  private async recordLifecycle(ctx: AppContext, task: Pick<SubAgentTask, "id" | "runId">, target: "inline_host" | "modal_worker" | "modal_sandbox", lifecycle: "queued" | "dispatched" | "running" | "completed" | "failed" | "canceled", note?: string) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId: task.runId, scope: "run", type: "decision_memory", source: "run_artifact", confidence: "medium", status: "active", title: `runtime_execution:${task.id}:${lifecycle}`, summary: `${target}:${lifecycle}`, detail: JSON.stringify({ id: id("ter"), runId: task.runId, taskId: task.id, workspaceId: ctx.workspaceId, target, lifecycle, note, createdAt: now() }), tags: ["runtime_execution_record", `run:${task.runId}`, `task:${task.id}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
  }
}
