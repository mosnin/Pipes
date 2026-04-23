import type { GraphActionPayload, GraphActionProposal } from "@/domain/agent_builder/actions";
import type { BatchPreviewItem, ProposalDiffItem } from "@/domain/agent_builder/diff";
import { BatchPreviewItemSchema, ProposalDiffItemSchema } from "@/domain/agent_builder/diff";
import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { AgentRunService } from "@/domain/services/agent_builder";

const now = () => new Date().toISOString();

function mapChangeType(payload: GraphActionPayload): ProposalDiffItem["changeType"] {
  if (payload.actionType === "add_node" || payload.actionType === "add_pipe" || payload.actionType === "add_annotation") return "add_entity";
  if (payload.actionType === "update_node" || payload.actionType === "update_group" || payload.actionType === "update_annotation") return "update_entity";
  if (payload.actionType === "delete_node" || payload.actionType === "delete_pipe") return "remove_entity";
  if (payload.actionType === "move_node") return "move_entity";
  if (payload.actionType === "request_review" || payload.actionType === "no_op_explanation" || payload.actionType === "create_version_checkpoint") return "metadata_change";
  if (payload.actionType === "create_group") return "structural_regrouping";
  return "metadata_change";
}

function mapEntity(payload: GraphActionPayload): { entityType: ProposalDiffItem["entityType"]; entityId: string } {
  if (payload.actionType === "add_pipe") return { entityType: "pipe", entityId: `pipe:${payload.fromNodeId}->${payload.toNodeId}` };
  if (payload.actionType === "delete_pipe") return { entityType: "pipe", entityId: payload.pipeId };
  if (payload.actionType === "add_annotation" || payload.actionType === "update_annotation") return { entityType: "annotation", entityId: payload.actionType === "update_annotation" ? payload.annotationId : `note:${payload.nodeId ?? "system"}` };
  if (payload.actionType === "create_group" || payload.actionType === "update_group") return { entityType: "group", entityId: payload.actionType === "update_group" ? payload.groupId : `group:${payload.title}` };
  if (payload.actionType === "request_review" || payload.actionType === "no_op_explanation" || payload.actionType === "create_version_checkpoint") return { entityType: "system_metadata", entityId: "system" };
  if (payload.actionType === "add_node") return { entityType: "node", entityId: `new:${payload.title}` };
  return { entityType: "node", entityId: "nodeId" in payload ? payload.nodeId : "unknown" };
}

function affectedNodeIds(payload: GraphActionPayload): string[] {
  if (payload.actionType === "add_pipe") return [payload.fromNodeId, payload.toNodeId];
  if (payload.actionType === "add_annotation" && payload.nodeId) return [payload.nodeId];
  if (payload.actionType === "create_group") return payload.nodeIds;
  if (payload.actionType === "update_group" && payload.nodeIds) return payload.nodeIds;
  if (payload.actionType === "delete_node" || payload.actionType === "update_node" || payload.actionType === "move_node") return [payload.nodeId];
  return [];
}

function previewKind(payload: GraphActionPayload): BatchPreviewItem["previewKind"] {
  if (payload.actionType === "add_pipe") return "connection";
  if (payload.actionType === "add_node" || payload.actionType === "add_annotation") return "addition";
  if (payload.actionType === "delete_node" || payload.actionType === "delete_pipe") return "deletion";
  if (payload.actionType === "move_node") return "movement";
  if (payload.actionType === "update_annotation") return "annotation";
  return "metadata";
}

function toRiskLevel(proposal: GraphActionProposal): ProposalDiffItem["riskLevel"] {
  if (proposal.riskClass === "safe_auto_apply") return "low";
  if (proposal.riskClass === "review_required") return "medium";
  return "high";
}

export class ProposalDiffService {
  constructor(private readonly repos: RepositorySet) {}

  async listBatchDiffItems(runId: string, batchId: string): Promise<ProposalDiffItem[]> {
    const [batch] = (await this.repos.agentBuilder.listProposalBatches({ runId })).filter((item) => item.id === batchId);
    if (!batch) throw new Error("batch_not_found");
    const proposals = (await this.repos.agentBuilder.listProposals({ runId })).filter((proposal) => batch.proposalIds.includes(proposal.id));
    const tasks = await this.repos.agentBuilder.listSubAgentTasks({ runId });
    const dependentLookup = new Map<string, string[]>();

    for (const proposal of proposals) {
      const deps: string[] = [];
      const payload = proposal.payload;
      if (payload.actionType === "add_pipe") {
        const dependent = proposals.filter((candidate) => {
          const candidatePayload = candidate.payload;
          if (candidatePayload.actionType !== "add_node") return false;
          return [payload.fromNodeId, payload.toNodeId].some((nodeId) => candidatePayload.title.toLowerCase().includes(nodeId.toLowerCase()));
        });
        deps.push(...dependent.map((row) => row.id));
      }
      if (payload.actionType === "delete_node") {
        const dependent = proposals.filter((candidate) => candidate.payload.actionType === "delete_pipe" && candidate.rationale.toLowerCase().includes(payload.nodeId.toLowerCase()));
        deps.push(...dependent.map((row) => row.id));
      }
      dependentLookup.set(proposal.id, deps);
    }

    return proposals.map((proposal) => {
      const entity = mapEntity(proposal.payload);
      const relatedTask = tasks.find((task) => proposal.rationale.includes(task.contextPack.subsystemId));
      return ProposalDiffItemSchema.parse({
        id: `diff_${proposal.id}`,
        proposalId: proposal.id,
        batchId,
        entityType: entity.entityType,
        entityId: entity.entityId,
        changeType: mapChangeType(proposal.payload),
        summary: `${proposal.actionType} on ${entity.entityId}`,
        rationale: proposal.rationale,
        riskLevel: toRiskLevel(proposal),
        affectedRegion: affectedNodeIds(proposal.payload).join(",") || "system",
        affectedSubsystem: relatedTask?.contextPack.subsystemId ?? batch.stage,
        canSelectIndividually: dependentLookup.get(proposal.id)?.length === 0,
        dependencies: dependentLookup.get(proposal.id) ?? [],
        provenance: relatedTask ? { role: relatedTask.role, skillId: relatedTask.skillId, taskId: relatedTask.id } : undefined
      });
    });
  }
}

export class ReviewSelectionService {
  constructor(private readonly diffService: ProposalDiffService) {}

  async validateSelection(runId: string, batchId: string, selectedDiffIds: string[]) {
    const diffs = await this.diffService.listBatchDiffItems(runId, batchId);
    const byId = new Map(diffs.map((item) => [item.id, item]));
    const selected = selectedDiffIds.map((id) => byId.get(id)).filter(Boolean) as ProposalDiffItem[];
    const blocked: string[] = [];
    for (const item of selected) {
      const missingDeps = item.dependencies.filter((proposalId) => !selected.some((entry) => entry.proposalId === proposalId));
      if (missingDeps.length > 0) blocked.push(`${item.id} requires ${missingDeps.join(", ")}`);
    }
    return {
      valid: blocked.length === 0,
      blockedReason: blocked.length ? `Selection blocked: ${blocked.join("; ")}` : undefined,
      selectedProposalIds: selected.map((item) => item.proposalId),
      lockedGroups: diffs.filter((item) => !item.canSelectIndividually).map((item) => ({ diffId: item.id, proposalId: item.proposalId, dependencies: item.dependencies }))
    };
  }
}

export class ProposalPreviewService {
  constructor(private readonly diffService: ProposalDiffService, private readonly repos: RepositorySet) {}

  async listBatchPreview(runId: string, batchId: string, selectedDiffIds: string[] = [], previewEnabled = true): Promise<BatchPreviewItem[]> {
    const diffs = await this.diffService.listBatchDiffItems(runId, batchId);
    if (!previewEnabled) return [];
    const proposals = await this.repos.agentBuilder.listProposals({ runId });
    const byProposalId = new Map(proposals.map((proposal) => [proposal.id, proposal]));
    return diffs.map((diff) => {
      const proposal = byProposalId.get(diff.proposalId);
      const payload = proposal?.payload;
      return BatchPreviewItemSchema.parse({
        diffId: diff.id,
        entityType: diff.entityType,
        entityId: diff.entityId,
        changeType: diff.changeType,
        previewKind: payload ? previewKind(payload) : "metadata",
        emphasis: proposal?.status === "applied" ? "applied" : selectedDiffIds.includes(diff.id) ? "selected_preview" : "pending_review",
        x: payload?.actionType === "add_node" ? payload.position.x : payload?.actionType === "move_node" ? payload.position.x : undefined,
        y: payload?.actionType === "add_node" ? payload.position.y : payload?.actionType === "move_node" ? payload.position.y : undefined
      });
    });
  }
}

export class AffectedRegionService {
  constructor(private readonly repos: RepositorySet) {}

  async deriveForBatch(runId: string, batchId: string, selectedProposalIds: string[] = []) {
    const [batch] = (await this.repos.agentBuilder.listProposalBatches({ runId })).filter((item) => item.id === batchId);
    if (!batch) throw new Error("batch_not_found");
    const proposals = (await this.repos.agentBuilder.listProposals({ runId })).filter((proposal) => batch.proposalIds.includes(proposal.id));
    const focus = selectedProposalIds.length ? proposals.filter((proposal) => selectedProposalIds.includes(proposal.id)) : proposals;
    const nodeIds = new Set<string>();
    const pipeIds = new Set<string>();
    const subsystems = new Set<string>();
    for (const proposal of focus) {
      affectedNodeIds(proposal.payload).forEach((nodeId) => nodeIds.add(nodeId));
      if (proposal.payload.actionType === "delete_pipe") pipeIds.add(proposal.payload.pipeId);
      if (proposal.payload.actionType === "add_pipe") pipeIds.add(`pipe:${proposal.payload.fromNodeId}->${proposal.payload.toNodeId}`);
      const region = proposal.rationale.split(":")[0]?.trim();
      if (region) subsystems.add(region);
    }
    return {
      batchId,
      runId,
      nodeIds: [...nodeIds],
      pipeIds: [...pipeIds],
      subsystemIds: [...subsystems],
      status: focus.some((proposal) => proposal.status === "applied") ? "applied" : "pending_review"
    } as const;
  }
}

export class BatchReviewService {
  constructor(
    private readonly repos: RepositorySet,
    private readonly runService: AgentRunService,
    private readonly reviewSelectionService: ReviewSelectionService
  ) {}

  async decide(ctx: AppContext, input: { runId: string; batchId: string; decision: "approve_all" | "reject_all" | "approve_selected"; selectedDiffIds?: string[]; note?: string }) {
    const [batch] = (await this.repos.agentBuilder.listProposalBatches({ runId: input.runId })).filter((item) => item.id === input.batchId);
    if (!batch) throw new Error("batch_not_found");
    const selection = await this.reviewSelectionService.validateSelection(input.runId, input.batchId, input.selectedDiffIds ?? []);
    if (input.decision === "approve_selected" && !selection.valid) return { appliedProposalIds: [], rejectedProposalIds: [], blockedReason: selection.blockedReason, status: "blocked" as const };

    const proposalIds = batch.proposalIds;
    const selectedProposalIds = input.decision === "approve_all" ? proposalIds : input.decision === "reject_all" ? [] : selection.selectedProposalIds;
    const rejectedProposalIds = proposalIds.filter((id) => !selectedProposalIds.includes(id));

    for (const proposalId of selectedProposalIds) {
      await this.repos.agentBuilder.updateProposal({ proposalId, status: "approved", reviewDecision: { by: ctx.userId, at: now(), decision: "approved", note: input.note } });
      await this.runService.applyProposal(ctx, proposalId);
    }
    for (const proposalId of rejectedProposalIds) {
      await this.repos.agentBuilder.updateProposal({ proposalId, status: "rejected", reviewDecision: { by: ctx.userId, at: now(), decision: "rejected", note: input.note } });
    }

    await this.repos.agentBuilder.updateProposalBatch({
      batchId: input.batchId,
      status: selectedProposalIds.length === 0 ? "rejected" : rejectedProposalIds.length > 0 ? "approved" : "approved",
      updatedAt: now(),
      reviewerNote: input.note
    });

    return {
      appliedProposalIds: selectedProposalIds,
      rejectedProposalIds,
      blockedReason: undefined,
      status: selectedProposalIds.length === 0 ? "rejected" : "applied"
    } as const;
  }
}
