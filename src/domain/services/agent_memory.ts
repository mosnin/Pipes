import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import { BuilderStrategySchema, DecisionRecordSchema, MemoryEntrySchema, PatternArtifactSchema, ReusableSubsystemPatternSchema, SessionContinuationRefSchema, type BuilderStrategy, type MemoryEntry } from "@/domain/agent_builder/memory";

const now = () => new Date().toISOString();

function isStale(entry: { staleAfter?: string }) {
  return Boolean(entry.staleAfter && new Date(entry.staleAfter).getTime() < Date.now());
}

export class BuilderStrategyService {
  constructor(private readonly repos: RepositorySet) {}

  async selectActiveStrategy(ctx: AppContext, input: { systemId?: string; runMessage: string }): Promise<BuilderStrategy> {
    const available = await this.repos.agentMemory.listBuilderStrategies({ workspaceId: ctx.workspaceId, systemId: input.systemId, status: "active" });
    const performance = await this.repos.agentBuilder.listStrategyPerformanceRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId });
    const scoreByStrategy = new Map<string, number>();
    for (const row of performance) {
      scoreByStrategy.set(row.strategyId, Math.max(scoreByStrategy.get(row.strategyId) ?? 0, row.overallScore));
    }
    const preferred = [...available].sort((a, b) => (scoreByStrategy.get(b.id) ?? 0) - (scoreByStrategy.get(a.id) ?? 0))[0];
    if (preferred) return preferred;
    const inferredName: BuilderStrategy["name"] = input.runMessage.toLowerCase().includes("template") ? "template_first" : input.runMessage.toLowerCase().includes("validate") ? "validation_heavy" : "subsystem_first";
    return this.repos.agentMemory.addBuilderStrategy(BuilderStrategySchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, scope: input.systemId ? "system" : "workspace", name: inferredName, summary: `Auto strategy for ${input.systemId ?? "workspace"}`, planningDirectives: ["prioritize prior accepted decisions", "keep bounded plan steps"], batchingDirectives: ["group risky edits", "auto-apply only safe changes"], reviewPosture: inferredName === "template_first" ? "review_mid" : "review_early", confidence: "medium", status: "active", createdAt: now(), updatedAt: now() }));
  }

  async setPreferredStrategy(ctx: AppContext, input: { systemId?: string; name: BuilderStrategy["name"]; summary?: string }) {
    return this.repos.agentMemory.addBuilderStrategy(BuilderStrategySchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, scope: input.systemId ? "system" : "workspace", name: input.name, summary: input.summary ?? `Preferred ${input.name}`, planningDirectives: ["use explicit memory retrieval", "carry unresolved questions"], batchingDirectives: ["respect approval boundaries"], reviewPosture: "review_early", confidence: "high", status: "active", createdAt: now(), updatedAt: now() }));
  }
}

export class DecisionMemoryService {
  constructor(private readonly repos: RepositorySet) {}

  async record(ctx: AppContext, input: { systemId?: string; runId?: string; category: "decomposition" | "naming" | "review_policy" | "guardrail" | "template_preference" | "architecture_direction"; title: string; decision: string; rationale: string; state: "accepted" | "rejected" | "tentative"; staleAfter?: string }) {
    return this.repos.agentMemory.addDecisionRecord(DecisionRecordSchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, runId: input.runId, category: input.category, title: input.title, decision: input.decision, rationale: input.rationale, state: input.state, confidence: input.state === "tentative" ? "low" : "high", staleAfter: input.staleAfter, createdAt: now(), updatedAt: now() }));
  }
}

export class PatternArtifactService {
  constructor(private readonly repos: RepositorySet) {}

  async savePatternFromRun(ctx: AppContext, input: { systemId: string; runId?: string; title: string; summary: string; intendedUse: string; inputContractSummary: string; outputContractSummary: string; riskNotes: string; tags?: string[]; subsystemId?: string; proposalId?: string; batchId?: string }) {
    const artifact = await this.repos.agentMemory.addPatternArtifact(PatternArtifactSchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, runId: input.runId, scope: "system", title: input.title, summary: input.summary, intendedUse: input.intendedUse, inputContractSummary: input.inputContractSummary, outputContractSummary: input.outputContractSummary, riskNotes: input.riskNotes, tags: input.tags ?? [], provenance: { proposalId: input.proposalId, batchId: input.batchId, subsystemId: input.subsystemId, createdBy: ctx.userId }, status: "active", createdAt: now(), updatedAt: now() }));
    if (input.subsystemId) {
      await this.repos.agentMemory.addReusableSubsystemPattern(ReusableSubsystemPatternSchema.omit({ id: true }).parse({ patternArtifactId: artifact.id, workspaceId: ctx.workspaceId, systemId: input.systemId, subsystemId: input.subsystemId, subsystemSummary: input.summary, tags: input.tags ?? [], createdAt: now() }));
    }
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "pattern_saved", targetType: "pattern_artifact", targetId: artifact.id, outcome: "success" });
    return artifact;
  }
}

export class MemoryRetrievalService {
  constructor(private readonly repos: RepositorySet) {}

  async retrieveForRun(ctx: AppContext, input: { systemId: string; sessionId?: string; runId: string; message: string; limit?: number }) {
    const limit = input.limit ?? 10;
    const [entries, decisions, patterns, continuations, promotions, demotions, learning] = await Promise.all([
      this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentMemory.listDecisionRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentMemory.listPatternArtifacts({ workspaceId: ctx.workspaceId, systemId: input.systemId, status: "active" }),
      this.repos.agentMemory.listSessionContinuationRefs({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentBuilder.listPatternPromotionRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentBuilder.listPatternDemotionRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId }),
      this.repos.agentBuilder.listLearningArtifacts({ workspaceId: ctx.workspaceId, systemId: input.systemId })
    ]);

    const freshEntries = entries.filter((entry) => entry.status !== "archived" && !isStale(entry));
    const staleEntries = entries.filter((entry) => isStale(entry));
    for (const stale of staleEntries) {
      await this.repos.agentMemory.updateMemoryEntry({ memoryEntryId: stale.id, status: "stale", updatedAt: now() });
      await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "stale_memory_ignored", targetType: "memory_entry", targetId: stale.id, outcome: "success" });
    }

    const keywords = input.message.toLowerCase().split(/\W+/).filter(Boolean);
    const rankedEntries = freshEntries
      .map((entry) => ({ entry, score: keywords.some((k) => `${entry.title} ${entry.summary} ${entry.tags.join(" ")}`.toLowerCase().includes(k)) ? 2 : 1 }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((item) => item.entry);
    const promotedIds = new Set(promotions.map((row) => row.patternArtifactId));
    const demotedIds = new Set(demotions.map((row) => row.patternArtifactId));
    const rankedPatterns = patterns
      .map((pattern) => {
        const keywordBoost = keywords.some((k) => `${pattern.title} ${pattern.summary} ${pattern.tags.join(" ")}`.toLowerCase().includes(k)) ? 2 : 0;
        const promotionBoost = promotedIds.has(pattern.id) ? 2 : 0;
        const demotionPenalty = demotedIds.has(pattern.id) ? -2 : 0;
        return { pattern, score: keywordBoost + promotionBoost + demotionPenalty };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 6)
      .map((row) => row.pattern);
    const activeDecisions = decisions.filter((decision) => decision.state !== "rejected" && !isStale(decision)).slice(0, 5);
    const rejectedDecisions = decisions.filter((decision) => decision.state === "rejected").slice(0, 3);
    const recentContinuations = continuations.slice(-3);

    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "memory_retrieved_for_run", targetType: "agent_run", targetId: input.runId, outcome: "success", metadata: JSON.stringify({ entryCount: rankedEntries.length, patternCount: rankedPatterns.length, decisionCount: activeDecisions.length }) });

    return {
      memoryEntries: rankedEntries,
      patternArtifacts: rankedPatterns,
      decisionRecords: activeDecisions,
      rejectedDecisionRecords: rejectedDecisions,
      sessionContinuations: recentContinuations,
      summary: [
        ...rankedEntries.map((entry) => `memory:${entry.title}`),
        ...rankedPatterns.map((pattern) => `pattern:${pattern.title}`),
        ...activeDecisions.map((decision) => `decision:${decision.title}`),
        ...learning.slice(0, 3).map((artifact) => `learning:${artifact.title}`),
        ...Array.from(demotedIds).slice(0, 2).map((id) => `avoid_pattern:${id}`)
      ].slice(0, limit)
    };
  }
}

export class AgentMemoryService {
  private readonly retrieval: MemoryRetrievalService;
  private readonly strategies: BuilderStrategyService;
  private readonly patterns: PatternArtifactService;
  private readonly decisions: DecisionMemoryService;

  constructor(private readonly repos: RepositorySet) {
    this.retrieval = new MemoryRetrievalService(repos);
    this.strategies = new BuilderStrategyService(repos);
    this.patterns = new PatternArtifactService(repos);
    this.decisions = new DecisionMemoryService(repos);
  }

  async buildRunContinuation(ctx: AppContext, input: { systemId: string; runId: string; sessionId?: string; message: string }) {
    const strategy = await this.strategies.selectActiveStrategy(ctx, { systemId: input.systemId, runMessage: input.message });
    const retrieved = await this.retrieval.retrieveForRun(ctx, input);
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "builder_strategy_selected", targetType: "builder_strategy", targetId: strategy.id, outcome: "success" });
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "prior_run_context_attached", targetType: "agent_run", targetId: input.runId, outcome: "success" });
    return { strategy, retrieved };
  }

  async persistRunMemory(ctx: AppContext, input: { runId: string; systemId: string; sessionId?: string; summary: string; openQuestions: string[]; approvedCount: number; rejectedCount: number; strategyId?: string; linkedMemoryEntryIds?: string[]; linkedPatternIds?: string[]; linkedDecisionIds?: string[] }) {
    const memory = await this.repos.agentMemory.addMemoryEntry(MemoryEntrySchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, sessionId: input.sessionId, runId: input.runId, scope: "run", type: "plan_memory", source: "run_artifact", confidence: "medium", status: "active", title: `Run ${input.runId} summary`, summary: input.summary, detail: `open:${input.openQuestions.join(" | ")} approved:${input.approvedCount} rejected:${input.rejectedCount}`, tags: ["run_summary"], staleAfter: undefined, createdAt: now(), updatedAt: now() }));
    await this.repos.agentMemory.addSessionContinuationRef(SessionContinuationRefSchema.omit({ id: true }).parse({ workspaceId: ctx.workspaceId, systemId: input.systemId, fromRunId: input.runId, toRunId: input.runId, attachedMemoryEntryIds: [memory.id, ...(input.linkedMemoryEntryIds ?? [])], attachedPatternIds: input.linkedPatternIds ?? [], attachedDecisionIds: input.linkedDecisionIds ?? [], strategyId: input.strategyId, summary: input.summary, createdAt: now() }));
    return memory;
  }

  listMemory(ctx: AppContext, input: { systemId?: string; sessionId?: string }) { return this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, systemId: input.systemId, sessionId: input.sessionId }); }
  listStrategies(ctx: AppContext, input: { systemId?: string }) { return this.repos.agentMemory.listBuilderStrategies({ workspaceId: ctx.workspaceId, systemId: input.systemId }); }
  setPreferredStrategy(ctx: AppContext, input: { systemId?: string; name: BuilderStrategy["name"]; summary?: string }) { return this.strategies.setPreferredStrategy(ctx, input); }
  listPatterns(ctx: AppContext, input: { systemId?: string; tag?: string }) { return this.repos.agentMemory.listPatternArtifacts({ workspaceId: ctx.workspaceId, systemId: input.systemId, tag: input.tag }); }
  savePattern(ctx: AppContext, input: { systemId: string; runId?: string; title: string; summary: string; intendedUse: string; inputContractSummary: string; outputContractSummary: string; riskNotes: string; tags?: string[]; subsystemId?: string; proposalId?: string; batchId?: string }) { return this.patterns.savePatternFromRun(ctx, input); }
  listDecisions(ctx: AppContext, input: { systemId?: string; runId?: string }) { return this.repos.agentMemory.listDecisionRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId, runId: input.runId }); }
  recordDecision(ctx: AppContext, input: { systemId?: string; runId?: string; category: "decomposition" | "naming" | "review_policy" | "guardrail" | "template_preference" | "architecture_direction"; title: string; decision: string; rationale: string; state: "accepted" | "rejected" | "tentative"; staleAfter?: string }) { return this.decisions.record(ctx, input); }
}
