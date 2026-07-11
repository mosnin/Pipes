import type { AppContext, RepositorySet } from "@/lib/repositories/contracts";
import type { SubsystemBlueprint } from "./types";

const now = () => new Date().toISOString();
const genId = (prefix: string) => `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

export class SubsystemBlueprintService {
  constructor(private readonly repos: RepositorySet) {}

  async export(ctx: AppContext, input: { systemId: string; subsystemNodeId: string; name?: string }): Promise<SubsystemBlueprint> {
    const bundle = await this.repos.systems.getBundle(input.systemId);
    const subsystemNode = bundle.nodes.find((n) => n.id === input.subsystemNodeId);
    if (!subsystemNode) throw new Error("subsystem_node_not_found");

    // Collect internal nodes (children of this subsystem)
    const internalNodes = bundle.nodes.filter((n: any) => n.parentSubsystemNodeId === input.subsystemNodeId);
    const internalNodeIds = new Set(internalNodes.map((n: any) => n.id));

    // Collect internal pipes (both endpoints inside the subsystem)
    const internalPipes = bundle.pipes.filter((p: any) => {
      const fromNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.fromPortId) || n.id === (p as any).fromNodeId);
      const toNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.toPortId) || n.id === (p as any).toNodeId);
      return fromNode && toNode && internalNodeIds.has(fromNode.id) && internalNodeIds.has(toNode.id);
    });

    // Find boundary ports: pipes that cross the subsystem boundary
    const inboundPipes = bundle.pipes.filter((p: any) => {
      const fromNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.fromPortId) || n.id === (p as any).fromNodeId);
      const toNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.toPortId) || n.id === (p as any).toNodeId);
      return fromNode && toNode && !internalNodeIds.has(fromNode.id) && internalNodeIds.has(toNode.id);
    });
    const outboundPipes = bundle.pipes.filter((p: any) => {
      const fromNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.fromPortId) || n.id === (p as any).fromNodeId);
      const toNode = bundle.nodes.find((n: any) => n.portIds?.includes(p.toPortId) || n.id === (p as any).toNodeId);
      return fromNode && toNode && internalNodeIds.has(fromNode.id) && !internalNodeIds.has(toNode.id);
    });

    const blueprint: SubsystemBlueprint = {
      id: genId("sbp"),
      workspaceId: ctx.workspaceId,
      sourceSystemId: input.systemId,
      sourceNodeId: input.subsystemNodeId,
      name: input.name ?? subsystemNode.title ?? "Untitled Subsystem",
      description: (subsystemNode as any).description,
      nodeCount: internalNodes.length,
      pipeCount: internalPipes.length,
      nodes: internalNodes.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.description,
        x: n.position?.x ?? 0,
        y: n.position?.y ?? 0,
        config: n.config ?? {},
      })),
      pipes: internalPipes.map((p: any) => ({
        fromNodeId: (p as any).fromNodeId ?? bundle.nodes.find((n: any) => n.portIds?.includes(p.fromPortId))?.id ?? "",
        toNodeId: (p as any).toNodeId ?? bundle.nodes.find((n: any) => n.portIds?.includes(p.toPortId))?.id ?? "",
        label: (p as any).label,
      })).filter((p) => p.fromNodeId && p.toNodeId),
      inboundPorts: inboundPipes.map((_: any) => "inbound"),
      outboundPorts: outboundPipes.map((_: any) => "outbound"),
      createdAt: now(),
      createdBy: ctx.userId,
      tags: ["subsystem", subsystemNode.type ?? "Subsystem"],
    };

    // Persist as a memory entry (reusing the memory pattern table via agentMemory)
    await this.repos.agentMemory.addMemoryEntry({
      workspaceId: ctx.workspaceId,
      systemId: input.systemId,
      scope: "workspace",
      type: "plan_memory",
      source: "run_artifact",
      confidence: "high",
      status: "active",
      title: blueprint.id,
      summary: blueprint.name,
      detail: JSON.stringify(blueprint),
      tags: ["subsystem_blueprint", `source:${input.systemId}`],
      provenance: { createdBy: ctx.userId },
      createdAt: now(),
      updatedAt: now(),
    });

    await this.repos.audits.add({
      actorType: ctx.actorType,
      actorId: ctx.actorId,
      workspaceId: ctx.workspaceId,
      systemId: input.systemId as never,
      action: "subsystem_blueprint_exported",
      targetType: "system",
      targetId: input.systemId,
      outcome: "success",
      metadata: JSON.stringify({ subsystemNodeId: input.subsystemNodeId, nodeCount: blueprint.nodeCount }),
    });

    return blueprint;
  }

  async list(ctx: AppContext): Promise<SubsystemBlueprint[]> {
    const entries = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "plan_memory" });
    return entries
      .filter((e) => e.tags.includes("subsystem_blueprint"))
      .map((e) => JSON.parse(e.detail ?? "{}") as SubsystemBlueprint)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async instantiate(ctx: AppContext, input: { blueprintId: string; targetSystemId: string; offsetX?: number; offsetY?: number }) {
    const entries = await this.repos.agentMemory.listMemoryEntries({ workspaceId: ctx.workspaceId, type: "plan_memory" });
    const entry = entries.find((e) => e.tags.includes("subsystem_blueprint") && e.title === input.blueprintId);
    if (!entry) throw new Error("blueprint_not_found");

    const blueprint = JSON.parse(entry.detail ?? "{}") as SubsystemBlueprint;
    const idMap = new Map<string, string>();
    const ox = input.offsetX ?? 0;
    const oy = input.offsetY ?? 0;

    for (const node of blueprint.nodes) {
      const newId = await this.repos.graph.addNode({
        systemId: input.targetSystemId,
        type: node.type as never,
        title: node.title,
        description: node.description,
        x: node.x + ox,
        y: node.y + oy,
      });
      idMap.set(node.id, newId as string);
    }

    for (const pipe of blueprint.pipes) {
      const fromNodeId = idMap.get(pipe.fromNodeId);
      const toNodeId = idMap.get(pipe.toNodeId);
      if (fromNodeId && toNodeId) {
        await this.repos.graph.addPipe({ systemId: input.targetSystemId, fromNodeId, toNodeId });
      }
    }

    return { ok: true, nodeCount: blueprint.nodes.length, pipeCount: blueprint.pipes.length };
  }
}
