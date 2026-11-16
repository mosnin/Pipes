"use client";

import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  addEdge,
  Background,
  ConnectionLineType,
  Controls,
  Handle,
  MiniMap,
  type NodeChange,
  Position,
  ReactFlow,
  type Connection,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { cn } from "@/lib/utils";

type EditorNodeData = { title: string; type: string; subtitle?: string; compact?: boolean };

const ALIGN_THRESHOLD = 8;
const EMPTY_IDS: string[] = [];

// React Flow draws in SVG and inline styles, so every colour here is a token
// reference rather than a literal: both themes resolve through globals.css.
const HANDLE_STYLE = { width: 10, height: 10, background: "var(--surface-raised)", border: "1.5px solid var(--line-strong)" } as const;
const FLOW_THEME = {
  "--xy-background-color": "var(--surface-inset)",
  "--xy-edge-stroke": "var(--line-strong)",
  "--xy-edge-stroke-selected": "var(--text-primary)",
  "--xy-edge-label-background-color": "var(--surface-raised)",
  "--xy-edge-label-color": "var(--text-secondary)",
  "--xy-connectionline-stroke": "var(--text-secondary)",
  "--xy-handle-background-color": "var(--surface-raised)",
  "--xy-handle-border-color": "var(--line-strong)",
  "--xy-selection-background-color": "var(--state-selected)",
  "--xy-selection-border": "1px dashed var(--line-strong)",
  "--xy-node-boxshadow-selected": "none",
  "--xy-controls-button-background-color": "var(--surface-raised)",
  "--xy-controls-button-background-color-hover": "var(--surface-selected)",
  "--xy-controls-button-color": "var(--text-secondary)",
  "--xy-controls-button-color-hover": "var(--text-primary)",
  "--xy-controls-button-border-color": "var(--line-hairline)",
  "--xy-controls-box-shadow": "0 0 0 1px var(--line-border)",
  "--xy-minimap-background-color": "var(--surface-raised)",
  "--xy-minimap-mask-background-color": "var(--state-active)",
  "--xy-minimap-mask-stroke-color": "var(--line-strong)",
  "--xy-attribution-background-color": "transparent"
} as CSSProperties;

type EdgeTone = "critical" | "positive" | "traced" | "default";

function edgeStroke(tone: EdgeTone | undefined): { stroke: string; strokeWidth: number } {
  if (tone === "critical") return { stroke: "var(--critical-mark)", strokeWidth: 2 };
  if (tone === "positive") return { stroke: "var(--positive-mark)", strokeWidth: 2 };
  if (tone === "traced") return { stroke: "var(--text-secondary)", strokeWidth: 2 };
  return { stroke: "var(--line-strong)", strokeWidth: 1.5 };
}

function sameIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

const PipesNode = memo(function PipesNode({ data, selected }: { data: EditorNodeData; selected?: boolean }) {
  const subsystem = data.type === "Subsystem";
  return (
    <div
      className={cn(
        "flex min-w-[184px] max-w-[248px] flex-col gap-1 rounded-10 border bg-raised px-5 py-4 text-left",
        "transition-[border-color,box-shadow] duration-[var(--dur-1)] ease-[var(--ease-out)]",
        subsystem && "border-dashed",
        selected ? "border-ink shadow-[0_0_0_1px_var(--text-primary)]" : "border-border hover:border-strong"
      )}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <span className="truncate t-body-medium text-ink">{data.title}</span>
      {!data.compact && data.subtitle ? <span className="line-clamp-2 t-caption text-ink-3">{data.subtitle}</span> : null}
      <span className="truncate t-mono-micro text-ink-3">{data.type}</span>
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
});

function CanvasCommands({
  fitRequest,
  frameRequest,
  selectedNodeIds,
  onEscapeClear
}: {
  fitRequest: number;
  frameRequest: number;
  selectedNodeIds: string[];
  onEscapeClear: () => void;
}) {
  const flow = useReactFlow();
  useEffect(() => { if (fitRequest > 0) flow.fitView({ duration: 260, padding: 0.2 }); }, [fitRequest, flow]);
  useEffect(() => {
    if (frameRequest === 0 || selectedNodeIds.length === 0) return;
    const selected = flow.getNodes().filter((n) => selectedNodeIds.includes(n.id));
    if (selected.length === 0) return;
    flow.fitView({ nodes: selected, duration: 220, padding: 0.24 });
  }, [frameRequest, flow, selectedNodeIds]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscapeClear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onEscapeClear]);
  return null;
}

export function EditorCanvas({
  initialNodes,
  initialEdges,
  fitRequest,
  frameRequest,
  previewItems,
  highlightedNodeIds,
  highlightedEdgeIds,
  regionStatus,
  onSelectNode,
  onSelectionChange,
  onConnect,
  onMove,
  onDeleteEdge,
  onDeleteNodes,
  onRequestInsert,
  onZoomChange,
  onViewportSettled
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  fitRequest: number;
  frameRequest: number;
  previewItems?: Array<{ diffId: string; entityType: string; entityId: string; previewKind: string; emphasis: "pending_review" | "selected_preview" | "applied"; x?: number; y?: number }>;
  highlightedNodeIds?: string[];
  highlightedEdgeIds?: string[];
  regionStatus?: "pending_review" | "applied";
  onSelectNode: (id?: string) => void;
  onSelectionChange: (nodeIds: string[], edgeIds: string[]) => void;
  onConnect: (source: string, target: string) => void;
  onMove: (nodeId: string, x: number, y: number) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onRequestInsert: (context: { mode: "canvas" | "selectedNode" | "selectedEdge"; at: { x: number; y: number }; nodeId?: string; edgeId?: string }) => void;
  onZoomChange?: (zoom: number) => void;
  onViewportSettled?: (nodeCount: number, edgeCount: number) => void;
}) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(() => ({ pipesNode: PipesNode }), []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ nodeIds: string[]; edgeIds: string[] }>({ nodeIds: [], edgeIds: [] });
  const [guide, setGuide] = useState<{ x?: number; y?: number }>({});
  const [connectingValid, setConnectingValid] = useState<boolean | null>(null);

  // Incoming graph data replaces React Flow's local state; carry the current selection
  // across so a background refresh doesn't silently deselect what the user clicked.
  useEffect(() => setNodes((prev) => {
    const selectedIds = new Set(prev.filter((n) => n.selected).map((n) => n.id));
    return selectedIds.size === 0 ? initialNodes : initialNodes.map((n) => (selectedIds.has(n.id) ? { ...n, selected: true } : n));
  }), [initialNodes, setNodes]);
  useEffect(() => setEdges((prev) => {
    const selectedIds = new Set(prev.filter((e) => e.selected).map((e) => e.id));
    return selectedIds.size === 0 ? initialEdges : initialEdges.map((e) => (selectedIds.has(e.id) ? { ...e, selected: true } : e));
  }), [initialEdges, setEdges]);

  const onNodesChange = (changes: NodeChange<Node>[]) => {
    onNodesChangeBase(changes);
    const active = changes.find((c) => c.type === "position" && c.dragging && c.id === draggingId) as any;
    if (!active || !active.position) return;
    const peer = nodes.find((n) => n.id !== draggingId && (Math.abs((n.position.x ?? 0) - active.position.x) <= ALIGN_THRESHOLD || Math.abs((n.position.y ?? 0) - active.position.y) <= ALIGN_THRESHOLD));
    if (!peer) setGuide({});
    else {
      setGuide({ x: Math.abs(peer.position.x - active.position.x) <= ALIGN_THRESHOLD ? peer.position.x : undefined, y: Math.abs(peer.position.y - active.position.y) <= ALIGN_THRESHOLD ? peer.position.y : undefined });
    }
  };

  const validConnection = (connection: Connection | Edge) => {
    if (!connection.source || !connection.target) return false;
    const valid = String(connection.source) !== String(connection.target);
    setConnectingValid(valid);
    return valid;
  };

  // React Flow re-emits onSelectionChange whenever nodes/edges are replaced. Forwarding
  // identical selections up to the workspace re-derives the edges we receive, which
  // re-emits again: an infinite update loop. Only propagate real changes.
  const lastSelection = useRef<{ nodeIds: string[]; edgeIds: string[] }>({ nodeIds: EMPTY_IDS, edgeIds: EMPTY_IDS });
  const handleSelection = (params: OnSelectionChangeParams) => {
    const nodeIds = (params.nodes ?? []).map((n) => n.id);
    const edgeIds = (params.edges ?? []).map((e) => e.id);
    if (sameIds(nodeIds, lastSelection.current.nodeIds) && sameIds(edgeIds, lastSelection.current.edgeIds)) return;
    lastSelection.current = { nodeIds, edgeIds };
    setSelection({ nodeIds, edgeIds });
    onSelectionChange(nodeIds, edgeIds);
    onSelectNode(nodeIds[0]);
  };

  const previewLookup = useMemo(() => new Map((previewItems ?? []).map((item) => [item.entityId, item])), [previewItems]);
  const highlightedNodeKey = (highlightedNodeIds ?? EMPTY_IDS).join("|");
  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeKey ? highlightedNodeKey.split("|") : []), [highlightedNodeKey]);
  const highlightedEdgeKey = (highlightedEdgeIds ?? EMPTY_IDS).join("|");
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeKey ? highlightedEdgeKey.split("|") : []), [highlightedEdgeKey]);

  const presentedNodes = useMemo(() => nodes.map((node) => {
    const preview = previewLookup.get(node.id);
    const highlighted = highlightedNodeSet.has(node.id);
    // Hue here is diff and review signal only: a proposed deletion is critical,
    // a move is caution, an agent proposal is agent, an applied region positive.
    const previewOutline = preview?.previewKind === "deletion" ? "2px dashed var(--critical-mark)" : preview?.previewKind === "movement" ? "2px dashed var(--caution-mark)" : preview?.previewKind === "connection" ? "2px solid var(--agent-mark)" : undefined;
    const outline = previewOutline ?? (highlighted ? `2px solid ${regionStatus === "applied" ? "var(--positive-mark)" : "var(--agent-mark)"}` : undefined);
    return {
      ...node,
      style: {
        ...(node.style ?? {}),
        outline,
        outlineOffset: outline ? 3 : undefined,
        borderRadius: 10,
        opacity: preview?.previewKind === "deletion" ? 0.68 : 1
      }
    };
  }), [nodes, previewLookup, highlightedNodeSet, regionStatus]);

  const presentedEdges = useMemo(() => edges.map((edge) => {
    const highlighted = highlightedEdgeSet.has(edge.id);
    const selected = selection.edgeIds.includes(edge.id);
    const incoming = (edge.style ?? {}) as CSSProperties;
    const base = edgeStroke((edge.data as { tone?: EdgeTone } | undefined)?.tone);
    return {
      ...edge,
      style: {
        stroke: highlighted ? (regionStatus === "applied" ? "var(--positive-mark)" : "var(--agent-mark)") : selected ? "var(--text-primary)" : base.stroke,
        strokeWidth: highlighted ? 3 : selected ? 2.5 : base.strokeWidth,
        strokeDasharray: highlighted && regionStatus !== "applied" ? "6 4" : incoming.strokeDasharray,
        opacity: incoming.opacity
      },
      labelStyle: { fill: "var(--text-secondary)", fontSize: 11, fontWeight: 500 },
      labelBgStyle: { fill: "var(--surface-raised)", stroke: "var(--line-hairline)" },
      labelBgPadding: [6, 2] as [number, number],
      labelBgBorderRadius: 4,
      animated: selected || edge.animated || highlighted
    };
  }), [edges, highlightedEdgeSet, selection.edgeIds, regionStatus]);

  return (
    <div className="relative h-full w-full">
      {previewItems?.filter((item) => item.previewKind === "addition" && item.x !== undefined && item.y !== undefined).map((item) => (
        <div
          key={item.diffId}
          className="pointer-events-none absolute z-[6] rounded-6 border border-dashed border-agent-border bg-agent-wash px-3 py-1 t-micro text-agent-text"
          style={{ left: item.x, top: item.y }}
        >
          Proposed node
        </div>
      ))}
      {guide.x !== undefined ? <div className="pointer-events-none absolute inset-y-0 z-[4] w-px bg-strong" style={{ left: guide.x }} /> : null}
      {guide.y !== undefined ? <div className="pointer-events-none absolute inset-x-0 z-[4] h-px bg-strong" style={{ top: guide.y }} /> : null}
      <ReactFlow
        nodes={presentedNodes}
        edges={presentedEdges}
        nodeTypes={nodeTypes}
        style={FLOW_THEME}
        fitView
        fitViewOptions={{ padding: 0.2, duration: 300 }}
        minZoom={0.18}
        maxZoom={2.6}
        snapToGrid
        snapGrid={[16, 16]}
        selectionOnDrag
        panOnDrag={[1, 2]}
        panOnScroll
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
        multiSelectionKeyCode={"Shift"}
        deleteKeyCode={null}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{ stroke: connectingValid === false ? "var(--critical-mark)" : "var(--text-secondary)", strokeWidth: 2 }}
        isValidConnection={validConnection}
        onInit={() => onViewportSettled?.(nodes.length, edges.length)}
        onNodeClick={(_, node) => onSelectNode(node.id)}
        onPaneClick={(event) => {
          if (event.detail >= 2) {
            onRequestInsert({ mode: "canvas", at: { x: event.clientX, y: event.clientY } });
            return;
          }
          onSelectNode(undefined);
          onSelectionChange([], []);
          lastSelection.current = { nodeIds: EMPTY_IDS, edgeIds: EMPTY_IDS };
          setSelection({ nodeIds: [], edgeIds: [] });
        }}
        onSelectionChange={handleSelection}
        onConnectStart={() => setConnectingValid(null)}
        onConnectEnd={() => setConnectingValid(null)}
        onConnect={(connection: Connection) => {
          if (connection.source && connection.target && connection.source !== connection.target) {
            setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
            onConnect(connection.source, connection.target);
          }
        }}
        // A click selects the pipe so the inspector can edit its route; Delete or the toolbar removes it.
        onEdgesDelete={(deleted) => deleted.forEach((edge) => onDeleteEdge(edge.id))}
        onEdgeDoubleClick={(event, edge) => onRequestInsert({ mode: "selectedEdge", edgeId: edge.id, at: { x: event.clientX, y: event.clientY } })}
        onNodeDoubleClick={(event, node) => onRequestInsert({ mode: "selectedNode", nodeId: node.id, at: { x: event.clientX, y: event.clientY } })}
        onNodesDelete={(deleted) => onDeleteNodes(deleted.map((n) => n.id))}
        onNodeDragStart={(_, node) => setDraggingId(node.id)}
        onNodeDragStop={(_, node) => {
          if (draggingId === node.id) onMove(node.id, node.position.x, node.position.y);
          setDraggingId(null);
          setGuide({});
        }}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onMove={(_, viewport) => onZoomChange?.(viewport.zoom)}
      >
        <CanvasCommands fitRequest={fitRequest} frameRequest={frameRequest} selectedNodeIds={selection.nodeIds} onEscapeClear={() => { lastSelection.current = { nodeIds: EMPTY_IDS, edgeIds: EMPTY_IDS }; setSelection({ nodeIds: [], edgeIds: [] }); onSelectionChange([], []); onSelectNode(undefined); }} />
        <Background gap={16} size={1} color="var(--line-strong)" />
        <MiniMap className="max-md:hidden!" pannable zoomable nodeColor={(node) => node.data?.type === "Subsystem" ? "var(--text-tertiary)" : "var(--line-strong)"} nodeBorderRadius={4} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
