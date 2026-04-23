import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { HandoffPackageStatus, HandoffReviewDecision } from "@/domain/handoff/model";
import { HandoffGenerationService } from "@/domain/services/handoff_generation";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class HandoffReviewService {
  private readonly generation: HandoffGenerationService;
  constructor(private readonly repos: RepositorySet) {
    this.generation = new HandoffGenerationService(repos);
  }

  async review(ctx: AppContext, input: { packageId: string; decision: "approved" | "rejected" | "revision_requested"; note?: string }) {
    const pkgBundle = await this.generation.getPackage(ctx, input.packageId);
    const pkg = pkgBundle.package;
    const statusMap: Record<typeof input.decision, HandoffPackageStatus> = { approved: "approved", rejected: "rejected", revision_requested: "revision_requested" };
    const decision: HandoffReviewDecision = { id: id("hrev"), packageId: input.packageId, decision: input.decision, note: input.note, decidedBy: ctx.userId, decidedAt: now() };
    await this.repos.agentMemory.addDecisionRecord({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, category: "review_policy", title: `handoff_review:${pkg.id}`, decision: input.decision, rationale: input.note ?? "handoff review", state: input.decision === "approved" ? "accepted" : "rejected", confidence: "high", createdAt: now(), updatedAt: now() });
    const updated = { ...pkg, status: statusMap[input.decision], lineage: { ...pkg.lineage, approvedBy: input.decision === "approved" ? ctx.userId : pkg.lineage.approvedBy } };
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "plan_memory", source: "run_artifact", confidence: "high", status: "active", title: pkg.id, summary: updated.title, detail: JSON.stringify(updated), tags: ["handoff_package", `target:${updated.target}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: pkg.systemId as never, action: input.decision === "approved" ? "handoff_approved" : input.decision === "rejected" ? "handoff_rejected" : "handoff_revision_requested", targetType: "handoff_package", targetId: pkg.id, outcome: "success", metadata: input.note });
    return { package: updated, decision };
  }
}
