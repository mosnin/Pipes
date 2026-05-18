import type { AppContext, NodeRecord, PipeRecord, RepositorySet } from "@/lib/repositories/contracts";

const now = () => new Date().toISOString();

export class PatternLearningService {
  constructor(private readonly repos: RepositorySet) {}

  async learnFromSystem(ctx: AppContext, systemId: string): Promise<{ patternsExtracted: number }> {
    const bundle = await this.repos.systems.getBundle(systemId);
    const nodes = bundle.nodes as NodeRecord[];
    const pipes = bundle.pipes as PipeRecord[];

    const patterns: Array<{ title: string; summary: string; detail: Record<string, unknown>; tags: string[] }> = [];

    // Pattern 1: Node type frequency (which types appear most)
    const typeCounts = new Map<string, number>();
    for (const node of nodes) typeCounts.set(node.type, (typeCounts.get(node.type) ?? 0) + 1);
    const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    patterns.push({
      title: `node_type_distribution:${systemId}`,
      summary: `Top node types: ${topTypes.map(([t, c]) => `${t}(${c})`).join(", ")}`,
      detail: { systemId, nodeCount: nodes.length, topTypes: Object.fromEntries(topTypes), extractedAt: now() },
      tags: ["pattern", "node_frequency", `system:${systemId}`],
    });

    // Pattern 2: Common pipe sequences (A→B node type pairs)
    const pairCounts = new Map<string, number>();
    for (const pipe of pipes) {
      const fromNode = nodes.find((n) => n.portIds.includes(pipe.fromPortId));
      const toNode = nodes.find((n) => n.portIds.includes(pipe.toPortId));
      if (fromNode && toNode) {
        const pair = `${fromNode.type}→${toNode.type}`;
        pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
      }
    }
    if (pairCounts.size > 0) {
      const topPairs = [...pairCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
      patterns.push({
        title: `pipe_pairs:${systemId}`,
        summary: `Common connections: ${topPairs.slice(0, 3).map(([p]) => p).join(", ")}`,
        detail: { systemId, pipePairs: Object.fromEntries(topPairs), extractedAt: now() },
        tags: ["pattern", "pipe_pairs", `system:${systemId}`],
      });
    }

    // Pattern 3: Structural archetype (linear, fan-out, fan-in, looping)
    const hasLoop = nodes.some((n) => n.type === "Loop");
    const hasRouter = nodes.some((n) => n.type === "Router");
    const hasDecision = nodes.some((n) => n.type === "Decision");
    const hasApproval = nodes.some((n) => n.type === "HumanApproval");
    const archetype = hasLoop ? "iterative" : hasRouter ? "fan_out" : hasDecision ? "conditional" : hasApproval ? "human_in_loop" : "linear";
    patterns.push({
      title: `archetype:${systemId}`,
      summary: `System archetype: ${archetype} (${nodes.length} nodes, ${pipes.length} pipes)`,
      detail: { systemId, archetype, nodeCount: nodes.length, pipeCount: pipes.length, hasLoop, hasRouter, hasDecision, hasApproval, extractedAt: now() },
      tags: ["pattern", "archetype", archetype, `system:${systemId}`],
    });

    // Persist patterns as plan_memory entries (closest available type)
    for (const p of patterns) {
      await this.repos.agentMemory.addMemoryEntry({
        workspaceId: ctx.workspaceId,
        systemId,
        scope: "workspace",
        type: "plan_memory",
        source: "run_artifact",
        confidence: "medium",
        status: "active",
        title: p.title,
        summary: p.summary,
        detail: JSON.stringify(p.detail),
        tags: p.tags,
        provenance: { createdBy: ctx.userId },
        createdAt: now(),
        updatedAt: now(),
      });
    }

    return { patternsExtracted: patterns.length };
  }

  async listPatterns(ctx: AppContext, systemId?: string): Promise<Array<{ title: string; summary: string; tags: string[]; extractedAt: string }>> {
    const entries = await this.repos.agentMemory.listMemoryEntries({
      workspaceId: ctx.workspaceId,
      ...(systemId ? { systemId } : {}),
      type: "plan_memory",
    });
    return entries
      .filter((e) => e.tags.includes("pattern"))
      .map((e) => ({
        title: e.title,
        summary: e.summary,
        tags: e.tags,
        extractedAt: e.createdAt,
      }))
      .sort((a, b) => b.extractedAt.localeCompare(a.extractedAt));
  }
}
