import type { Edge } from "@xyflow/react";
import type { GraphPipe } from "@/components/editor/editor_state";
import type { NodeDefinition } from "@/components/editor/node_definition";

export type PipeRouteKind = "default" | "success" | "failure" | "conditional" | "loop";
export type PipeContractState = "unknown" | "compatible" | "warning" | "invalid";

export type PipeSemantics = {
  pipeId: string;
  label?: string;
  conditionLabel?: string;
  routeKind: PipeRouteKind;
  notes?: string;
};

export type PipePresentationInput = {
  baseEdges: Edge[];
  pipes: GraphPipe[];
  selectedEdgeIds: string[];
  tracedEdgeIds: string[];
  invalidEdgeIds: string[];
  focusNodeId?: string;
  semantics: Record<string, PipeSemantics>;
  nodeDefinitions: Record<string, NodeDefinition>;
};

function contractState(pipe: GraphPipe, nodeDefinitions: Record<string, NodeDefinition>, invalidEdgeIds: string[]): PipeContractState {
  if (invalidEdgeIds.includes(pipe.id)) return "invalid";
  const from = pipe.fromNodeId ? nodeDefinitions[pipe.fromNodeId] : undefined;
  const to = pipe.toNodeId ? nodeDefinitions[pipe.toNodeId] : undefined;
  if (!from || !to) return "unknown";
  if (from.output.portType === "any" || to.input.portType === "any" || from.output.portType === to.input.portType) return "compatible";
  return "warning";
}

function edgeColor(input: { selected: boolean; traced: boolean; contract: PipeContractState; focused: boolean; routeKind: PipeRouteKind }): string {
  if (input.selected) return "#1b5cff";
  if (input.contract === "invalid") return "#d14646";
  if (input.routeKind === "failure") return "#c75a1e";
  if (input.routeKind === "success") return "#2c8f56";
  if (input.routeKind === "loop") return "#6a4fc9";
  if (input.traced) return "#2f67f5";
  if (!input.focused) return "rgba(95, 113, 141, 0.28)";
  return "#5f718d";
}

export function presentPipes(input: PipePresentationInput): Edge[] {
  const pipeMap = new Map(input.pipes.map((pipe) => [pipe.id, pipe]));
  return input.baseEdges.map((edge) => {
    const pipe = pipeMap.get(edge.id);
    const semantics = pipe ? input.semantics[pipe.id] : undefined;
    const routeKind = semantics?.routeKind ?? "default";
    const selected = input.selectedEdgeIds.includes(edge.id);
    const traced = input.tracedEdgeIds.includes(edge.id);
    const focused = !input.focusNodeId || pipe?.fromNodeId === input.focusNodeId || pipe?.toNodeId === input.focusNodeId;
    const contract = pipe ? contractState(pipe, input.nodeDefinitions, input.invalidEdgeIds) : "unknown";
    const color = edgeColor({ selected, traced, contract, focused, routeKind });
    const labelBits = [semantics?.label, semantics?.conditionLabel ? `if ${semantics.conditionLabel}` : undefined, routeKind !== "default" ? routeKind : undefined].filter(Boolean);
    return {
      ...edge,
      label: labelBits.join(" · "),
      labelStyle: { fontSize: 11, fontWeight: selected || traced ? 700 : 500, fill: selected ? "#1b5cff" : "#5f718d" },
      interactionWidth: 36,
      style: { stroke: color, strokeWidth: selected ? 3.4 : traced ? 3 : 2, opacity: focused ? 1 : 0.35, strokeDasharray: routeKind === "conditional" ? "6 5" : routeKind === "loop" ? "3 4" : undefined },
      animated: traced || routeKind === "loop"
    };
  });
}

export function traceEdgesFromSteps(steps: Array<{ nodeId: string }>, pipes: GraphPipe[]): string[] {
  const ids: string[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const from = steps[i]?.nodeId;
    const to = steps[i + 1]?.nodeId;
    const pipe = pipes.find((item) => item.fromNodeId === from && item.toNodeId === to);
    if (pipe) ids.push(pipe.id);
  }
  return ids;
}

export function summarizeTrace(steps: Array<{ nodeId: string; summary: string }>, pipes: GraphPipe[], semantics: Record<string, PipeSemantics>): { branchDecisions: string[]; loopSummaries: string[]; blocked: string[] } {
  const branchDecisions: string[] = [];
  const loopSummaries: string[] = [];
  const blocked: string[] = [];
  const visits = new Map<string, number>();
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    visits.set(step.nodeId, (visits.get(step.nodeId) ?? 0) + 1);
    if ((visits.get(step.nodeId) ?? 0) > 1) loopSummaries.push(`Looped through node ${step.nodeId} (${visits.get(step.nodeId)} visits)`);
    const next = steps[i + 1];
    if (!next) continue;
    const pipe = pipes.find((item) => item.fromNodeId === step.nodeId && item.toNodeId === next.nodeId);
    if (!pipe) {
      blocked.push(`No pipe found between ${step.nodeId} and ${next.nodeId}`);
      continue;
    }
    const semantic = semantics[pipe.id];
    if (semantic?.routeKind === "conditional" || semantic?.conditionLabel) branchDecisions.push(`${step.nodeId} -> ${next.nodeId}: ${semantic.conditionLabel ?? semantic.label ?? "conditional route"}`);
  }
  return { branchDecisions, loopSummaries, blocked };
}
