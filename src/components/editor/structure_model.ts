import type { Edge, Node } from "@xyflow/react";
import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";

export type LayoutPreset = "left_to_right" | "top_to_bottom";

export type Subsystem = {
  id: string;
  name: string;
  nodeIds: string[];
  collapsed: boolean;
  reusableSourceId?: string;
  summary?: string;
  createdAt: number;
};

export type SubsystemBoundary = {
  subsystemId: string;
  inboundNodeIds: string[];
  outboundNodeIds: string[];
};

export function createSubsystemFromSelection(input: { id: string; name: string; nodeIds: string[]; reusableSourceId?: string }): Subsystem {
  return { id: input.id, name: input.name, nodeIds: [...new Set(input.nodeIds)], collapsed: true, reusableSourceId: input.reusableSourceId, createdAt: Date.now() };
}

export function computeSubsystemBoundary(subsystem: Subsystem, pipes: GraphPipe[]): SubsystemBoundary {
  const selected = new Set(subsystem.nodeIds);
  const inbound = new Set<string>();
  const outbound = new Set<string>();
  for (const pipe of pipes) {
    if (pipe.fromNodeId && pipe.toNodeId) {
      if (!selected.has(pipe.fromNodeId) && selected.has(pipe.toNodeId)) inbound.add(pipe.fromNodeId);
      if (selected.has(pipe.fromNodeId) && !selected.has(pipe.toNodeId)) outbound.add(pipe.toNodeId);
    }
  }
  return { subsystemId: subsystem.id, inboundNodeIds: [...inbound], outboundNodeIds: [...outbound] };
}

export function collapseAwareGraph(params: { nodes: GraphNode[]; pipes: GraphPipe[]; subsystems: Subsystem[]; compactMode?: boolean }): { flowNodes: Node[]; flowEdges: Edge[] } {
  const collapsed = params.subsystems.filter((item) => item.collapsed);
  const hiddenIds = new Set(collapsed.flatMap((item) => item.nodeIds));
  const nodesById = new Map(params.nodes.map((node) => [node.id, node]));
  const subsystemByNode = new Map<string, Subsystem>();
  for (const subsystem of collapsed) for (const nodeId of subsystem.nodeIds) subsystemByNode.set(nodeId, subsystem);

  const flowNodes: Node[] = [
    ...params.nodes.filter((node) => !hiddenIds.has(node.id)).map((node) => ({ id: node.id, type: "pipesNode", position: node.position, data: { title: node.title, type: node.type, compact: params.compactMode } })),
    ...collapsed.map((subsystem, index) => {
      const members = subsystem.nodeIds.map((id) => nodesById.get(id)).filter(Boolean) as GraphNode[];
      const anchor = members[0] ?? { position: { x: 220 + index * 240, y: 220 }, title: subsystem.name, type: "Subsystem" };
      return {
        id: subsystem.id,
        type: "pipesNode",
        position: anchor.position,
        data: { title: subsystem.name, type: "Subsystem", compact: false, subtitle: `${members.length} nodes` }
      };
    })
  ];

  const edgeMap = new Map<string, Edge>();
  for (const pipe of params.pipes) {
    if (!pipe.fromNodeId || !pipe.toNodeId) continue;
    const fromSubsystem = subsystemByNode.get(pipe.fromNodeId);
    const toSubsystem = subsystemByNode.get(pipe.toNodeId);
    const source = fromSubsystem?.id ?? pipe.fromNodeId;
    const target = toSubsystem?.id ?? pipe.toNodeId;
    if (source === target) continue;
    const key = `${source}->${target}`;
    if (!edgeMap.has(key)) {
      edgeMap.set(key, { id: pipe.id, source, target, animated: Boolean(fromSubsystem || toSubsystem), style: { stroke: fromSubsystem || toSubsystem ? "#2f67f5" : "#4a85ff", strokeWidth: fromSubsystem || toSubsystem ? 3 : 2 } });
    }
  }

  return { flowNodes, flowEdges: [...edgeMap.values()] };
}

export function autoArrange(nodes: GraphNode[], nodeIds: string[], preset: LayoutPreset): Array<{ id: string; position: { x: number; y: number } }> {
  const selected = nodes.filter((node) => nodeIds.includes(node.id));
  return selected.map((node, index) => {
    const lane = Math.floor(index / 6);
    const step = index % 6;
    if (preset === "left_to_right") return { id: node.id, position: { x: 180 + step * 220, y: 120 + lane * 180 } };
    return { id: node.id, position: { x: 140 + lane * 260, y: 120 + step * 150 } };
  });
}
