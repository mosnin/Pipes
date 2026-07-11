// Pure diff between two canvas snapshots. Deterministic. Used by the post-turn
// "see what changed" dialog and by the turn rail's hover summary. No React, no
// side effects — testable in isolation.

import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";

export type TurnDiff = {
  nodesAdded: GraphNode[];
  nodesRemoved: GraphNode[];
  nodesUpdated: Array<{ id: string; before: GraphNode; after: GraphNode }>;
  pipesAdded: GraphPipe[];
  pipesRemoved: GraphPipe[];
};

export type TurnSnapshot = {
  nodes: GraphNode[];
  pipes: GraphPipe[];
};

function indexById<T extends { id: string }>(items: T[]): Map<string, T> {
  const out = new Map<string, T>();
  for (const item of items) out.set(item.id, item);
  return out;
}

export function computeTurnDiff(before: TurnSnapshot, after: TurnSnapshot): TurnDiff {
  const beforeNodes = indexById(before.nodes);
  const afterNodes = indexById(after.nodes);
  const beforePipes = indexById(before.pipes);
  const afterPipes = indexById(after.pipes);

  const nodesAdded: GraphNode[] = [];
  const nodesRemoved: GraphNode[] = [];
  const nodesUpdated: Array<{ id: string; before: GraphNode; after: GraphNode }> = [];

  for (const [id, node] of afterNodes) {
    const prior = beforeNodes.get(id);
    if (!prior) {
      nodesAdded.push(node);
      continue;
    }
    if (prior.title !== node.title || (prior.description ?? "") !== (node.description ?? "")) {
      nodesUpdated.push({ id, before: prior, after: node });
    }
  }
  for (const [id, node] of beforeNodes) {
    if (!afterNodes.has(id)) nodesRemoved.push(node);
  }

  const pipesAdded: GraphPipe[] = [];
  const pipesRemoved: GraphPipe[] = [];
  for (const [id, pipe] of afterPipes) {
    if (!beforePipes.has(id)) pipesAdded.push(pipe);
  }
  for (const [id, pipe] of beforePipes) {
    if (!afterPipes.has(id)) pipesRemoved.push(pipe);
  }

  return { nodesAdded, nodesRemoved, nodesUpdated, pipesAdded, pipesRemoved };
}
