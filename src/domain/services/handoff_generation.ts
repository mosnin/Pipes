import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { HandoffAcceptanceCriteria, HandoffArtifact, HandoffGenerationRecord, HandoffPackage, HandoffTarget, HandoffVersion } from "@/domain/handoff/model";
import { SandboxArtifactService } from "@/domain/services/sandbox_artifact";

const now = () => new Date().toISOString();
const id = (p: string) => `${p}_${Math.random().toString(36).slice(2, 10)}`;

export class HandoffGenerationService {
  private readonly sandboxArtifacts: SandboxArtifactService;
  constructor(private readonly repos: RepositorySet) {
    this.sandboxArtifacts = new SandboxArtifactService(repos);
  }

  async generate(ctx: AppContext, input: { systemId: string; target: HandoffTarget; sourceRunId?: string }) {
    const bundle = await this.repos.systems.getBundle(input.systemId);
    const accepted = await this.repos.agentBuilder.listProposals({ systemId: input.systemId, status: "applied" });
    const evaluations = await this.repos.agentBuilder.listEvaluationRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId });
    const patterns = await this.repos.agentMemory.listPatternArtifacts({ workspaceId: ctx.workspaceId, systemId: input.systemId, status: "active" });
    const decisions = await this.repos.agentMemory.listDecisionRecords({ workspaceId: ctx.workspaceId, systemId: input.systemId });

    const version = (await this.listPackages(ctx, input.systemId)).length + 1;
    const pkg: HandoffPackage = {
      id: id("hpkg"),
      workspaceId: ctx.workspaceId,
      systemId: input.systemId,
      sourceRunId: input.sourceRunId,
      status: "in_review",
      target: input.target,
      version,
      title: `${bundle.system.name} implementation handoff v${version}`,
      generatedAt: now(),
      generatedBy: ctx.userId,
      lineage: { systemVersionCount: bundle.versions.length, acceptedProposalCount: accepted.length }
    };

    const assumptions = [
      "Use persisted accepted system graph as source of truth.",
      "Policy constraints remain higher authority than implementation speed."
    ];
    const unresolved = decisions.filter((d) => d.state === "tentative").map((d) => d.title).slice(0, 6);

    const artifacts: HandoffArtifact[] = this.buildArtifacts(pkg, input.target, {
      systemName: bundle.system.name,
      systemDescription: bundle.system.description,
      nodeCount: bundle.nodes.length,
      pipeCount: bundle.pipes.length,
      components: bundle.nodes.map((n) => `${n.title} (${n.type})`),
      interfaces: bundle.pipes.map((p) => `${p.fromNodeId} -> ${p.toNodeId}`),
      risks: evaluations.filter((e) => e.outcome === "poor" || e.outcome === "mixed").map((e) => `${e.type}: ${e.rationale}`),
      promotedPatterns: patterns.slice(0, 5).map((p) => p.title),
      decisions: decisions.slice(0, 8).map((d) => `${d.title}: ${d.decision}`),
      assumptions,
      unresolved
    });

    const criteria: HandoffAcceptanceCriteria[] = [
      { id: id("hac"), packageId: pkg.id, title: "Components mapped", description: "All major components map to implementation milestones.", status: "satisfied" },
      { id: id("hac"), packageId: pkg.id, title: "Risks explicit", description: "Known risks and ambiguities are listed, not hidden.", status: unresolved.length > 0 ? "pending" : "satisfied" },
      { id: id("hac"), packageId: pkg.id, title: "Bounded scope", description: "Handoff does not imply direct execution in Pipes.", status: "satisfied" }
    ];

    const generation: HandoffGenerationRecord = { id: id("hgen"), packageId: pkg.id, systemId: pkg.systemId, target: input.target, assumptions, unresolvedAmbiguities: unresolved, createdAt: now() };
    const versionRecord: HandoffVersion = { id: id("hver"), packageId: pkg.id, version: pkg.version, summary: `Generated for ${input.target}`, createdAt: now(), createdBy: ctx.userId };

    await this.persistPackage(ctx, pkg, artifacts, generation, versionRecord, criteria);
    if (input.target === "codex" || input.target === "claude_code") {
      const assembled = await this.sandboxArtifacts.createFromRaw(ctx, { runId: input.sourceRunId ?? `handoff_${pkg.id}`, taskId: `handoff_assembly_${pkg.id}`, sessionId: `handoff_session_${pkg.id}`, type: "handoff_bundle", title: `${pkg.title} sandbox assembly`, rawContent: JSON.stringify({ package: pkg, artifactCount: artifacts.length, target: input.target }, null, 2) });
      await this.sandboxArtifacts.normalize(ctx, assembled.id, (raw) => raw);
    }
    await this.repos.audits.add({ actorType: ctx.actorType, actorId: ctx.actorId, workspaceId: ctx.workspaceId, systemId: input.systemId as never, action: "handoff_generated", targetType: "handoff_package", targetId: pkg.id, outcome: "success", metadata: JSON.stringify({ target: input.target, version }) });
    return { package: pkg, artifacts, generation, version: versionRecord, acceptanceCriteria: criteria };
  }

  async listPackages(ctx: AppContext, systemId: string): Promise<HandoffPackage[]> {
    const rows = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, systemId, type: "plan_memory" });
    const grouped = new Map<string, { updatedAt: string; pkg: HandoffPackage }>();
    for (const row of rows.filter((item) => item.tags.includes("handoff_package"))) {
      const pkg = JSON.parse(row.detail ?? "{}") as HandoffPackage;
      const prior = grouped.get(pkg.id);
      if (!prior || row.updatedAt > prior.updatedAt) grouped.set(pkg.id, { updatedAt: row.updatedAt, pkg });
    }
    return Array.from(grouped.values()).map((v) => v.pkg).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  }

  async getPackage(ctx: AppContext, packageId: string) {
    const entries = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "plan_memory" });
    const packageEntry = entries.filter((row) => row.tags.includes("handoff_package") && row.title === packageId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!packageEntry) throw new Error("handoff_package_not_found");
    const artifactEntries = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "validation_lesson" });
    const artifacts = artifactEntries.filter((row) => row.tags.includes(`package:${packageId}`)).map((row) => JSON.parse(row.detail ?? "{}") as HandoffArtifact);
    const decisionEntries = await this.repos.agentMemory.listDecisionRecords({ workspaceId: ctx.workspaceId });
    const reviews = decisionEntries.filter((d) => d.title === `handoff_review:${packageId}`);
    const criteriaEntries = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "review_preference" });
    const acceptanceCriteria = criteriaEntries.filter((row) => row.tags.includes(`package:${packageId}`)).map((row) => JSON.parse(row.detail ?? "{}") as HandoffAcceptanceCriteria);
    return { package: JSON.parse(packageEntry.detail ?? "{}") as HandoffPackage, artifacts, reviews, acceptanceCriteria };
  }

  private buildArtifacts(pkg: HandoffPackage, target: HandoffTarget, input: {
    systemName: string; systemDescription: string; nodeCount: number; pipeCount: number; components: string[]; interfaces: string[]; risks: string[]; promotedPatterns: string[]; decisions: string[]; assumptions: string[]; unresolved: string[];
  }): HandoffArtifact[] {
    const buildOrder = input.components.slice(0, 8).map((component, i) => `${i + 1}. ${component}`).join("\n");
    const codexTone = target === "codex" ? "Use patch-first, typed edits, and run tests after each milestone." : "Use incremental commits with explicit verification checkpoints.";
    return [
      { id: id("hart"), packageId: pkg.id, type: "implementation_plan", target, title: "Implementation plan", content: `Objective: ${input.systemDescription}\nComponents:\n- ${input.components.join("\n- ")}\nInterfaces:\n- ${input.interfaces.join("\n- ")}\nRisks:\n- ${(input.risks[0] ?? "No high-severity evaluation risk recorded")}`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "task_breakdown", target, title: "Task breakdown", content: `Recommended build order:\n${buildOrder}\nDependencies: ${input.pipeCount} pipe relationships\nAcceptance criteria: aligned with package criteria.`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "coding_agent_prompt", target, title: `${target} execution prompt`, content: `Context: ${input.systemName} with ${input.nodeCount} components.\nObjective: deliver build-ready implementation with preserved policy and review safety.\nConstraints: no provider internals, no second mutation authority, preserve typed contracts.\nBoundaries: Pipes is design/handoff, not runtime execution engine.\nTarget outputs: implementation plan, milestones, test updates, rollout notes.\nAcceptance criteria: all package criteria plus unresolved ambiguities listed.\nStyle: ${codexTone}`,
        sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "architecture_spec", target, title: "Architecture spec", content: `Domain summary: ${input.systemDescription}\nState/control flow: ${input.pipeCount} system links, explicit review gates preserved.\nImportant interfaces: ${input.interfaces.slice(0, 8).join("; ")}\nFailure modes: ${(input.risks[0] ?? "policy conflict")}; ${(input.risks[1] ?? "missing contract detail")}`,
        sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "qa_checklist", target, title: "QA checklist", content: `- Validate schema and contract compatibility\n- Verify critical paths for ${input.systemName}\n- Ensure unresolved ambiguities are tracked\n- Confirm policy and approval safeguards still hold`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "risk_register", target, title: "Risk register", content: `Assumptions:\n- ${input.assumptions.join("\n- ")}\nUnresolved:\n- ${(input.unresolved[0] ?? "none captured")}`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "system_summary", target, title: "System summary", content: `${input.systemName} is a ${input.nodeCount}-component agentic system designed to ${input.systemDescription}. Primary data flow: ${input.interfaces.slice(0, 3).join(" → ")}. Key patterns: ${input.promotedPatterns.slice(0, 3).join(", ") || "standard agent loop"}. The system exposes ${input.pipeCount} pipe interface(s) across its component graph.`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "dependency_manifest", target, title: "Dependency manifest", content: `Pipe interfaces (node→node connections):\n- ${input.interfaces.join("\n- ") || "none"}\n\nNode component dependencies:\n- ${input.components.join("\n- ") || "none"}`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "api_contract_summary", target, title: "API contract summary", content: `System entry/exit contracts derived from interfaces and components.\n\nInterfaces:\n- ${input.interfaces.slice(0, 8).join("\n- ") || "none"}\n\nComponents (with types):\n- ${input.components.slice(0, 8).join("\n- ") || "none"}\n\nInput contract: data enters via the first pipe interface and is processed by upstream components.\nOutput contract: results exit via terminal components with no further downstream pipe.`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "data_model_summary", target, title: "Data model summary", content: `Data models inferred from component types:\n${input.components.map((c) => {
        const lower = c.toLowerCase();
        if (lower.includes("memory")) return `- ${c} → Stateful context store`;
        if (lower.includes("datastore")) return `- ${c} → Persistent structured records`;
        if (lower.includes("model")) return `- ${c} → LLM inference payloads`;
        if (lower.includes("tool")) return `- ${c} → External API request/response`;
        if (lower.includes("humanapproval") || lower.includes("human_approval")) return `- ${c} → Human review decision record`;
        return `- ${c} → Typed data payload`;
      }).join("\n") || "- No components available to infer data models."}`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "environment_manifest", target, title: "Environment manifest", content: `Infrastructure/service dependencies inferred from components:\n${input.components.map((c) => {
        const lower = c.toLowerCase();
        if (lower.includes("tool")) return `- ${c} → External API endpoints`;
        if (lower.includes("model")) return `- ${c} → LLM inference provider`;
        if (lower.includes("memory")) return `- ${c} → Vector/key-value store`;
        if (lower.includes("humanapproval") || lower.includes("human_approval")) return `- ${c} → Human-in-the-loop review queue`;
        if (lower.includes("datastore")) return `- ${c} → Persistent database / object store`;
        return `- ${c} → Internal compute`;
      }).join("\n") || "- No components available to infer environment dependencies."}`, sourceRefs: [pkg.systemId], createdAt: now() },
      { id: id("hart"), packageId: pkg.id, type: "rollout_checklist", target, title: "Rollout checklist", content: `Step-by-step deployment checklist for ${input.systemName}:\n1. Validate all pipe interface contracts against schema.\n2. Run integration tests for each pipe interface:\n${input.interfaces.slice(0, 6).map((iface, i) => `   ${i + 1}. Test: ${iface}`).join("\n") || "   (no interfaces defined)"}\n3. Review policy and approval gates (HumanApproval nodes, risk flags).\n4. Set up monitoring and alerting for all component endpoints.\n5. Confirm rollback plan: restore previous system version from version history.\n6. Obtain sign-off on unresolved ambiguities:\n${input.unresolved.slice(0, 4).map((u) => `   - ${u}`).join("\n") || "   (none pending)"}`, sourceRefs: [pkg.systemId], createdAt: now() }
    ];
  }

  private async persistPackage(ctx: AppContext, pkg: HandoffPackage, artifacts: HandoffArtifact[], generation: HandoffGenerationRecord, version: HandoffVersion, criteria: HandoffAcceptanceCriteria[]) {
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "plan_memory", source: "run_artifact", confidence: "high", status: "active", title: pkg.id, summary: pkg.title, detail: JSON.stringify(pkg), tags: ["handoff_package", `target:${pkg.target}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    for (const artifact of artifacts) {
      await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "validation_lesson", source: "run_artifact", confidence: "high", status: "active", title: artifact.title, summary: artifact.type, detail: JSON.stringify(artifact), tags: ["handoff_artifact", `package:${pkg.id}`, `artifact_type:${artifact.type}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    }
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "review_preference", source: "run_artifact", confidence: "medium", status: "active", title: `generation:${pkg.id}`, summary: generation.target, detail: JSON.stringify(generation), tags: ["handoff_generation", `package:${pkg.id}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "review_preference", source: "run_artifact", confidence: "medium", status: "active", title: `version:${pkg.id}`, summary: String(version.version), detail: JSON.stringify(version), tags: ["handoff_version", `package:${pkg.id}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    for (const criterion of criteria) {
      await this.repos.agentMemory.addMemoryEntry({ workspaceId: ctx.workspaceId, systemId: pkg.systemId, scope: "system", type: "review_preference", source: "run_artifact", confidence: "medium", status: "active", title: criterion.title, summary: criterion.status, detail: JSON.stringify(criterion), tags: ["handoff_acceptance", `package:${pkg.id}`], provenance: { createdBy: ctx.userId }, createdAt: now(), updatedAt: now() });
    }
  }
}
