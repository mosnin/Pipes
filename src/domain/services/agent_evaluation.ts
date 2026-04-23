import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { BuilderStrategy } from "@/domain/agent_builder/memory";

const now = () => new Date().toISOString();
const clamp = (n: number) => Math.max(0, Math.min(1, n));

export class AgentEvaluationService {
  constructor(private readonly repos: RepositorySet) {}

  async evaluateRun(ctx: AppContext, input: { runId: string; systemId: string; strategy?: BuilderStrategy; reusedPatternIds?: string[] }) {
    const [run, proposals, applied, revisions, batches, skills, tasks, strategies, patterns] = await Promise.all([
      this.repos.agentBuilder.getRun(input.runId),
      this.repos.agentBuilder.listProposals({ runId: input.runId }),
      this.repos.agentBuilder.listAppliedActions({ runId: input.runId }),
      this.repos.agentBuilder.listPlanRevisions({ runId: input.runId }),
      this.repos.agentBuilder.listProposalBatches({ runId: input.runId }),
      this.repos.agentBuilder.listSkillInvocations({ runId: input.runId }),
      this.repos.agentBuilder.listSubAgentTasks({ runId: input.runId }),
      this.repos.agentMemory.listBuilderStrategies({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentMemory.listPatternArtifacts({ workspaceId: ctx.workspaceId, systemId: input.systemId })
    ]);
    if (!run) throw new Error("run_not_found");

    const approvedCount = proposals.filter((p) => p.status === "approved" || p.status === "applied").length;
    const rejectedCount = proposals.filter((p) => p.status === "rejected").length;
    const total = Math.max(1, proposals.length);
    const approvalRate = approvedCount / total;
    const rejectionRate = rejectedCount / total;
    const unresolvedOpenQuestions = revisions.flatMap((r) => r.openQuestions).length;
    const validationIssuesIntroduced = applied.reduce((sum, item) => sum + Math.max(0, item.validationIssueCount), 0);
    const applyFailures = proposals.filter((p) => p.status === "apply_failed" || p.status === "forbidden").length;
    const acceptedPatternReuse = (input.reusedPatternIds ?? []).length > 0 && approvalRate >= 0.6 ? 1 : 0;
    const reviewFriction = clamp((rejectedCount + unresolvedOpenQuestions) / (total + 4));

    const rawScore =
      approvalRate * 0.35 +
      (1 - rejectionRate) * 0.2 +
      (1 - clamp(validationIssuesIntroduced / Math.max(1, applied.length * 3))) * 0.15 +
      (1 - clamp(applyFailures / Math.max(1, proposals.length))) * 0.1 +
      (1 - clamp(unresolvedOpenQuestions / 6)) * 0.1 +
      acceptedPatternReuse * 0.05 +
      (1 - reviewFriction) * 0.05;
    const score = clamp(rawScore);
    const outcome = score >= 0.85 ? "excellent" : score >= 0.7 ? "good" : score >= 0.5 ? "mixed" : "poor";

    const runEval = await this.repos.agentBuilder.addEvaluationRecord({
      workspaceId: ctx.workspaceId,
      systemId: input.systemId,
      runId: input.runId,
      scope: "run",
      type: "run_outcome_quality",
      status: "computed",
      score: { value: score, label: outcome },
      outcome,
      rationale: `approval=${approvedCount}/${proposals.length}, rejected=${rejectedCount}, applyFailures=${applyFailures}, unresolvedOpenQuestions=${unresolvedOpenQuestions}, acceptedPatternReuse=${acceptedPatternReuse}`,
      signals: [
        { key: "approval_rate", value: approvalRate, explanation: "approved or applied proposals / total proposals" },
        { key: "rejection_rate", value: rejectionRate, explanation: "rejected proposals / total proposals" },
        { key: "validation_issues_introduced", value: validationIssuesIntroduced, explanation: "sum of validation issues after applied actions" },
        { key: "apply_failures", value: applyFailures, explanation: "failed or forbidden apply attempts" },
        { key: "unresolved_open_questions", value: unresolvedOpenQuestions, explanation: "open questions from latest plan revisions" },
        { key: "accepted_pattern_reuse", value: acceptedPatternReuse, explanation: "whether reused patterns correlated with accepted outcomes" },
        { key: "review_friction", value: reviewFriction, explanation: "rejections + unresolved questions normalized by scope" }
      ],
      subjectRef: input.runId,
      createdAt: now(),
      updatedAt: now()
    });

    for (const batch of batches) {
      const batchProposals = proposals.filter((proposal) => batch.proposalIds.includes(proposal.id));
      const approvedInBatch = batchProposals.filter((proposal) => proposal.status === "applied" || proposal.status === "approved").length;
      const rejectedInBatch = batchProposals.filter((proposal) => proposal.status === "rejected").length;
      const corrected = batchProposals.some((proposal) => proposal.status === "applied" && proposal.error);
      const outcomeLabel = approvedInBatch === batchProposals.length ? "fully_approved" : approvedInBatch > 0 ? "partially_approved" : rejectedInBatch > 0 ? "rejected" : corrected ? "auto_applied_later_corrected" : "auto_applied_accepted";
      await this.repos.agentBuilder.addEvaluationRecord({
        workspaceId: ctx.workspaceId,
        systemId: input.systemId,
        runId: input.runId,
        scope: "proposal_batch",
        type: "approval_quality",
        status: "computed",
        score: { value: clamp(approvedInBatch / Math.max(1, batchProposals.length)), label: outcomeLabel },
        outcome: approvedInBatch > rejectedInBatch ? "good" : rejectedInBatch > 0 ? "mixed" : "poor",
        rationale: `batch=${batch.id} status=${batch.status} outcome=${outcomeLabel}`,
        signals: [
          { key: "approved_in_batch", value: approvedInBatch, explanation: "approved/applied proposals in batch" },
          { key: "rejected_in_batch", value: rejectedInBatch, explanation: "rejected proposals in batch" },
          { key: "risk_lineage", value: batchProposals.some((p) => p.riskClass === "review_required") ? 1 : 0, explanation: "whether review_required risk class present" },
          { key: "stage_lineage", value: batch.stage === "propose_actions" ? 1 : 0.5, explanation: `batch stage=${batch.stage}` },
          { key: "role_skill_lineage", value: tasks.some((task) => task.stage === batch.stage) ? 1 : 0, explanation: "matched sub-agent role/skill provenance for this stage" }
        ],
        subjectRef: batch.id,
        createdAt: now(),
        updatedAt: now()
      });
    }

    const chosenStrategy = input.strategy ?? strategies.find((s) => s.status === "active");
    if (chosenStrategy) {
      const strategyScore = clamp(approvalRate * 0.4 + (1 - reviewFriction) * 0.25 + (1 - clamp(applyFailures / Math.max(1, proposals.length))) * 0.2 + acceptedPatternReuse * 0.15);
      await this.repos.agentBuilder.addStrategyPerformanceRecord({
        workspaceId: ctx.workspaceId,
        systemId: input.systemId,
        strategyId: chosenStrategy.id,
        strategyName: chosenStrategy.name,
        runId: input.runId,
        acceptanceRate: approvalRate,
        validationScore: 1 - clamp(validationIssuesIntroduced / Math.max(1, applied.length * 3)),
        reviewFriction,
        overallScore: strategyScore,
        notes: `blockedRun=${run.status === "blocked" ? 1 : 0}; reuseSuccess=${acceptedPatternReuse}`,
        createdAt: now()
      });
    }

    const skillGroups = new Map<string, Array<(typeof skills)[number]>>();
    for (const skill of skills) {
      const rows = skillGroups.get(skill.skillId) ?? [];
      rows.push(skill);
      skillGroups.set(skill.skillId, rows);
    }
    for (const [skillId, rows] of skillGroups.entries()) {
      const completed = rows.filter((row) => row.status === "completed").length;
      const failed = rows.filter((row) => row.status === "failed").length;
      const successRate = completed / Math.max(1, rows.length);
      const acceptedBatchRate = approvalRate;
      const validationImpact = 1 - clamp(validationIssuesIntroduced / Math.max(1, applied.length * 3));
      const overallScore = clamp(successRate * 0.5 + acceptedBatchRate * 0.25 + validationImpact * 0.25 - failed * 0.05);
      await this.repos.agentBuilder.addSkillPerformanceRecord({
        workspaceId: ctx.workspaceId,
        systemId: input.systemId,
        runId: input.runId,
        skillId,
        role: tasks.find((task) => task.skillId === skillId)?.role ?? "unknown",
        successRate,
        acceptedBatchRate,
        validationImpact,
        overallScore,
        notes: failed > 0 ? "Noisy skill: produced failures requiring review." : "Skill stable in this run.",
        createdAt: now()
      });
    }

    for (const patternId of input.reusedPatternIds ?? []) {
      const pattern = patterns.find((item) => item.id === patternId);
      if (!pattern) continue;
      if (approvalRate >= 0.7 && rejectedCount === 0) {
        await this.repos.agentBuilder.addPatternPromotionRecord({ workspaceId: ctx.workspaceId, systemId: input.systemId, patternArtifactId: patternId, reason: "Repeated accepted reuse in run outcome.", evidenceScore: approvalRate, createdAt: now() });
      } else if (rejectionRate >= 0.5 || run.status === "blocked") {
        await this.repos.agentBuilder.addPatternDemotionRecord({ workspaceId: ctx.workspaceId, systemId: input.systemId, patternArtifactId: patternId, reason: "Weak reuse signal with rejection/blocked evidence.", evidenceScore: rejectionRate, createdAt: now() });
      }
    }

    await this.repos.agentBuilder.addLearningArtifact({
      workspaceId: ctx.workspaceId,
      systemId: input.systemId,
      runId: input.runId,
      type: "run_lesson",
      title: `Run ${input.runId} quality ${outcome}`,
      summary: `Strategy=${chosenStrategy?.name ?? "n/a"}, approvalRate=${approvalRate.toFixed(2)}, reviewFriction=${reviewFriction.toFixed(2)}.`,
      confidence: score >= 0.7 ? "high" : score >= 0.5 ? "medium" : "low",
      sourceEvaluationIds: [runEval.id],
      createdAt: now()
    });

    return runEval;
  }
}
