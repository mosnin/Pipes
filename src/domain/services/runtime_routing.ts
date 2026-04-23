import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { RunPolicySnapshot } from "@/domain/agent_builder/policy";
import type { RuntimeRoutingDecision, RuntimeExecutionTarget, SandboxRequirement, WorkerCapability } from "@/domain/runtime/model";
import type { SubAgentTask } from "@/domain/agent_builder/sub_agents";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class RuntimeRoutingService {
  constructor(private readonly repos: RepositorySet) {}

  resolve(ctx: AppContext, input: { task: Pick<SubAgentTask, "id" | "runId" | "workspaceId" | "skillId" | "role" | "contextPack">; policy: RunPolicySnapshot }): RuntimeRoutingDecision {
    const caps: WorkerCapability[] = [];
    const skill = input.task.skillId.toLowerCase();
    const sandboxRequirement: SandboxRequirement = skill.includes("artifact") || skill.includes("contract") ? "required" : skill.includes("validate") ? "preferred" : "none";
    if (sandboxRequirement !== "none") caps.push("sandboxed_io");
    if (input.task.contextPack.relevantValidationIssues.length > 3) caps.push("tool_heavy");
    if (input.task.contextPack.selectedNodeIds.length > 6) caps.push("long_running");

    const allowModal = input.policy.runtime.maxConcurrentSubAgentTasks > 1;
    const allowSandbox = input.policy.tool.allowedTools.includes("get_validation_report") && !input.policy.tool.forbiddenTools.includes("sandbox_exec");

    let target: RuntimeExecutionTarget = "inline_host";
    let reason = "default_inline";
    if (sandboxRequirement === "required" && allowSandbox) {
      target = "modal_sandbox";
      reason = "sandbox_required_for_skill";
    } else if (allowModal && (caps.includes("long_running") || caps.includes("tool_heavy"))) {
      target = "modal_worker";
      reason = "policy_allows_modal_for_heavy_task";
    } else if (sandboxRequirement === "required" && !allowSandbox) {
      reason = "sandbox_required_but_blocked_by_policy";
    }

    const decision: RuntimeRoutingDecision = { id: id("rrd"), runId: input.task.runId, taskId: input.task.id, workspaceId: ctx.workspaceId, target, reason, sandboxRequirement, requiredCapabilities: caps, createdAt: now() };
    return decision;
  }

  async persistDecision(ctx: AppContext, decision: RuntimeRoutingDecision) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, runId: decision.runId, scope: "run", type: "decision_memory", source: "system_inferred", confidence: "medium", status: "active", title: `runtime_routing:${decision.taskId}`, summary: `${decision.target}:${decision.reason}`, detail: JSON.stringify(decision), tags: ["runtime_routing", `run:${decision.runId}`, `task:${decision.taskId}`], provenance: { createdBy: ctx.actorId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, action: "runtime_target_resolved", targetType: "sub_agent_task", targetId: decision.taskId, outcome: "success", metadata: JSON.stringify({ target: decision.target, reason: decision.reason }) });
  }
}
