"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeTypeBadge } from "@/components/ui";

type EditorNodeData = {
  title: string;
  type: string;
  subtitle?: string;
  compact?: boolean;
  // Animation flags. Driven by the parent canvas via the node `data` channel
  // so the inner PipesNode component can apply CSS-only animations without
  // any cross-cutting state.
  arrived?: boolean;
  pulsing?: boolean;
};

// How long an "arrived" flag stays on a node id before we drop it. Slightly
// longer than the 300 ms keyframe so the animation fully completes before the
// class is removed.
const ARRIVAL_LIFETIME_MS = 350;
// How long an "arrived" flag stays on an edge id. Matches the 180 ms keyframe
// plus a small buffer.
const EDGE_STREAM_LIFETIME_MS = 220;

const ALIGN_THRESHOLD = 8;
const TOKEN_INK_LINE = "rgba(0,0,0,0.14)";
const TOKEN_INK_LINE_LIGHT = "rgba(0,0,0,0.08)";
const TOKEN_INDIGO_500 = "#6366F1";
const TOKEN_INDIGO_600 = "#4F46E5";
const TOKEN_DANGER = "#DC2626";
const TOKEN_INK_3 = "#8E8E93";
const TOKEN_INK_2 = "#3C3C43";

// Visual accent for loop-native step types.
type LoopNodeAccent = {
  bg: string;
  border: string;
  radius: number;
  label: string;
  labelColor: string;
};

function getLoopAccent(type: string): LoopNodeAccent | null {
  switch (type) {
    case "LoopControl":
      return { bg: "#EEF2FF", border: "1.5px dashed #6366F1", radius: 12, label: "loop", labelColor: "#6366F1" };
    case "Evaluator":
      return { bg: "#FFFBEB", border: "1.5px solid #D97706", radius: 8, label: "eval", labelColor: "#D97706" };
    case "HumanReview":
      return { bg: "#F0F9FF", border: "1.5px dashed #0EA5E9", radius: 8, label: "review", labelColor: "#0EA5E9" };
    case "Checkpoint":
      return { bg: "#F0FDF4", border: "1.5px solid #16A34A", radius: 8, label: "save", labelColor: "#16A34A" };
    case "SubLoop":
      return { bg: "#EEF2FF", border: "2px solid #4F46E5", radius: 10, label: "sub-loop", labelColor: "#4F46E5" };
    default:
      return null;
  }
}

const PipesNode = memo(function PipesNode({ data }: { data: EditorNodeData }) {
  const classes: string[] = [];
  if (data.arrived) classes.push("looper-node-arrival");
  if (data.pulsing) classes.push("looper-node-pulsing");
  const className = classes.length > 0 ? classes.join(" ") : undefined;
  const accent = getLoopAccent(data.type);
  return (
    <div
      className={className}
      style={{
        border: accent ? accent.border : `1px solid ${TOKEN_INK_LINE_LIGHT}`,
        borderRadius: accent ? accent.radius : 8,
        background: accent ? accent.bg : "#FFFFFF",
        padding: 10,
        minWidth: 184,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: TOKEN_INDIGO_500, width: 10, height: 10, border: "2px solid #FFFFFF" }}
      />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4 }}>
        <strong style={{ color: "#111", fontSize: 13, lineHeight: 1.2 }}>{data.title}</strong>
        {accent && (
          <span style={{ fontSize: 9, fontWeight: 600, color: accent.labelColor, letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>
            {accent.label}
          </span>
        )}
      </div>
      {!data.compact && data.subtitle ? (
        <div style={{ color: TOKEN_INK_3, fontSize: 11, marginTop: 2 }}>{data.subtitle}</div>
      ) : null}
      <div style={{ marginTop: 6 }}>
        <NodeTypeBadge type={data.type} />
      </div>
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: TOKEN_INDIGO_600, width: 10, height: 10, border: "2px solid #FFFFFF" }}
      />
    </div>
  );
});

function CanvasCommands({
  fitRequest,
  frameRequest,
  selectedNodeIds,
  onEscapeClear,
}: {
  fitRequest: number;
  frameRequest: number;
  selectedNodeIds: string[];
  onEscapeClear: () => void;
}) {
  const flow = useReactFlow();
  useEffect(() => {
    if (fitRequest > 0) flow.fitView({ duration: 260, padding: 0.2 });
  }, [fitRequest, flow]);
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
  pulsingNodeId,
  onSelectNode,
  onSelectionChange,
  onConnect,
  onMove,
  onDeleteEdge,
  onDeleteNodes,
  onRequestInsert,
  onZoomChange,
  onViewportSettled,
  onPortClick,
}: {
  initialNodes: Node[];
  initialEdges: Edge[];
  fitRequest: number;
  frameRequest: number;
  previewItems?: Array<{ diffId: string; entityType: string; entityId: string; previewKind: string; emphasis: "pending_review" | "selected_preview" | "applied"; x?: number; y?: number }>;
  highlightedNodeIds?: string[];
  highlightedEdgeIds?: string[];
  regionStatus?: "pending_review" | "applied";
  // The id of the node the agent's most recent tool_call references. Renders
  // a pulsing 1 px indigo ring while non-null. Null means no pulse.
  pulsingNodeId?: string | null;
  onSelectNode: (id?: string) => void;
  onSelectionChange: (nodeIds: string[], edgeIds: string[]) => void;
  onConnect: (source: string, target: string) => void;
  onMove: (nodeId: string, x: number, y: number) => void;
  onDeleteEdge: (edgeId: string) => void;
  onDeleteNodes: (nodeIds: string[]) => void;
  onRequestInsert: (context: { mode: "canvas" | "selectedNode" | "selectedEdge"; at: { x: number; y: number }; nodeId?: string; edgeId?: string }) => void;
  onZoomChange?: (zoom: number) => void;
  onViewportSettled?: (nodeCount: number, edgeCount: number) => void;
  onPortClick?: (info: { nodeId: string; direction: "input" | "output"; anchor: { x: number; y: number } }) => void;
}) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const nodeTypes = useMemo(() => ({ pipesNode: PipesNode }), []);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selection, setSelection] = useState<{ nodeIds: string[]; edgeIds: string[] }>({ nodeIds: [], edgeIds: [] });
  const [guide, setGuide] = useState<{ x?: number; y?: number }>({});
  const [connectingValid, setConnectingValid] = useState<boolean | null>(null);

  // Track which node + edge ids have just appeared so we can apply the
  // arrival / stream class for one animation cycle. The Sets store ids; the
  // ref below remembers which ids we have already seen across renders.
  const [freshNodeIds, setFreshNodeIds] = useState<Set<string>>(() => new Set());
  const [freshEdgeIds, setFreshEdgeIds] = useState<Set<string>>(() => new Set());
  const seenNodeIdsRef = useRef<Set<string>>(new Set(initialNodes.map((n) => n.id)));
  const seenEdgeIdsRef = useRef<Set<string>>(new Set(initialEdges.map((e) => e.id)));

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

  // Detect newly-arrived node ids on every initialNodes update. Each new id
  // joins the fresh set and is removed after ARRIVAL_LIFETIME_MS, which is
  // long enough for the keyframe animation to play in full.
  useEffect(() => {
    const arrivals: string[] = [];
    for (const node of initialNodes) {
      if (!seenNodeIdsRef.current.has(node.id)) {
        seenNodeIdsRef.current.add(node.id);
        arrivals.push(node.id);
      }
    }
    if (arrivals.length === 0) return;
    setFreshNodeIds((prev) => {
      const next = new Set(prev);
      for (const id of arrivals) next.add(id);
      return next;
    });
    const timer = window.setTimeout(() => {
      setFreshNodeIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of arrivals) next.delete(id);
        return next.size === prev.size ? prev : next;
      });
    }, ARRIVAL_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [initialNodes]);

  // Same as above for edges.
  useEffect(() => {
    const arrivals: string[] = [];
    for (const edge of initialEdges) {
      if (!seenEdgeIdsRef.current.has(edge.id)) {
        seenEdgeIdsRef.current.add(edge.id);
        arrivals.push(edge.id);
      }
    }
    if (arrivals.length === 0) return;
    setFreshEdgeIds((prev) => {
      const next = new Set(prev);
      for (const id of arrivals) next.add(id);
      return next;
    });
    const timer = window.setTimeout(() => {
      setFreshEdgeIds((prev) => {
        if (prev.size === 0) return prev;
        const next = new Set(prev);
        for (const id of arrivals) next.delete(id);
        return next.size === prev.size ? prev : next;
      });
    }, EDGE_STREAM_LIFETIME_MS);
    return () => window.clearTimeout(timer);
  }, [initialEdges]);

  const onNodesChange = (changes: NodeChange<Node>[]) => {
    onNodesChangeBase(changes);
    const active = changes.find((c) => c.type === "position" && c.dragging && c.id === draggingId) as
      | { id: string; position?: { x: number; y: number } }
      | undefined;
    if (!active || !active.position) return;
    const peer = nodes.find(
      (n) =>
        n.id !== draggingId &&
        (Math.abs((n.position.x ?? 0) - (active.position?.x ?? 0)) <= ALIGN_THRESHOLD ||
          Math.abs((n.position.y ?? 0) - (active.position?.y ?? 0)) <= ALIGN_THRESHOLD),
    );
    if (!peer) {
      setGuide({});
    } else {
      setGuide({
        x: Math.abs(peer.position.x - (active.position?.x ?? 0)) <= ALIGN_THRESHOLD ? peer.position.x : undefined,
        y: Math.abs(peer.position.y - (active.position?.y ?? 0)) <= ALIGN_THRESHOLD ? peer.position.y : undefined,
      });
    }
  };

  const validConnection = (connection: Connection | Edge) => {
    if (!connection.source || !connection.target) return false;
    const valid = String(connection.source) !== String(connection.target);
    setConnectingValid(valid);
    return valid;
  };

  const handleSelection = (params: OnSelectionChangeParams) => {
    const nodeIds = (params.nodes ?? []).map((n) => n.id);
    const edgeIds = (params.edges ?? []).map((e) => e.id);
    setSelection({ nodeIds, edgeIds });
    onSelectionChange(nodeIds, edgeIds);
    onSelectNode(nodeIds[0]);
  };

  const previewLookup = useMemo(() => new Map((previewItems ?? []).map((item) => [item.entityId, item])), [previewItems]);
  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeIds ?? []), [highlightedNodeIds]);
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeIds ?? []), [highlightedEdgeIds]);

  // Delegated handler for port clicks. xyflow renders <div class="react-flow__handle">
  // children of <div class="react-flow__node" data-id="...">. We listen on the
  // canvas wrapper, not the document, so the listener tears down with the
  // canvas. xyflow uses a plain pointerdown on a handle to start a drag-to-
  // connect; we listen for SHIFT-click to open the affordance instead so the
  // two gestures don't fight.
  const wrapRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!onPortClick) return;
    const node = wrapRef.current;
    if (!node) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!e.shiftKey) return;
      const handle = target.closest?.(".react-flow__handle") as HTMLElement | null;
      if (!handle) return;
      const nodeEl = handle.closest?.(".react-flow__node") as HTMLElement | null;
      const nodeId = nodeEl?.getAttribute("data-id");
      if (!nodeId) return;
      const direction: "input" | "output" = handle.classList.contains("source")
        ? "output"
        : "input";
      const rect = handle.getBoundingClientRect();
      e.preventDefault();
      e.stopPropagation();
      onPortClick({
        nodeId,
        direction,
        anchor: { x: rect.right + 6, y: rect.top },
      });
    };
    node.addEventListener("pointerdown", onPointerDown, true);
    return () => node.removeEventListener("pointerdown", onPointerDown, true);
  }, [onPortClick]);

  return (
    <div ref={wrapRef} className="editor-canvas relative w-full h-full" style={{ position: "relative" }}>
      {previewItems
        ?.filter((item) => item.previewKind === "addition" && item.x !== undefined && item.y !== undefined)
        .map((item) => (
          <div
            key={item.diffId}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              border: `1px dashed ${TOKEN_INDIGO_500}`,
              color: TOKEN_INDIGO_600,
              background: "rgba(99,102,241,0.08)",
              borderRadius: 6,
              padding: "4px 6px",
              pointerEvents: "none",
              zIndex: 6,
            }}
          >
            preview add
          </div>
        ))}
      {guide.x !== undefined ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: guide.x,
            width: 1,
            background: TOKEN_INDIGO_500,
            opacity: 0.45,
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      ) : null}
      {guide.y !== undefined ? (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: guide.y,
            height: 1,
            background: TOKEN_INDIGO_500,
            opacity: 0.45,
            pointerEvents: "none",
            zIndex: 4,
          }}
        />
      ) : null}
      <ReactFlow
        nodes={nodes.map((node) => {
          const preview = previewLookup.get(node.id);
          const highlighted = highlightedNodeSet.has(node.id);
          const isSelected = selection.nodeIds.includes(node.id);
          const isArrived = freshNodeIds.has(node.id);
          const isPulsing = pulsingNodeId === node.id;
          const previewBorder =
            preview?.previewKind === "deletion"
              ? `2px dashed ${TOKEN_DANGER}`
              : preview?.previewKind === "movement"
                ? "2px dashed #D97706"
                : preview?.previewKind === "connection"
                  ? `2px solid ${TOKEN_INDIGO_600}`
                  : undefined;
          // The arrival glow is owned by the keyframe; while it is playing we
          // skip the static selection box-shadow so the two do not fight. The
          // pulsing ring also drives box-shadow on its own.
          const animatingShadow = isArrived || isPulsing;
          return {
            ...node,
            data: {
              ...(node.data as EditorNodeData),
              arrived: isArrived,
              pulsing: isPulsing,
            },
            style: {
              ...(node.style ?? {}),
              border:
                previewBorder ??
                (highlighted
                  ? `2px solid ${regionStatus === "applied" ? "#059669" : TOKEN_INDIGO_600}`
                  : isSelected
                    ? `2px solid ${TOKEN_INDIGO_600}`
                    : undefined),
              boxShadow: animatingShadow
                ? undefined
                : isSelected
                  ? `0 0 0 4px rgba(99,102,241,0.18), 0 4px 14px rgba(0,0,0,0.10)`
                  : highlighted
                    ? "0 0 0 4px rgba(99,102,241,0.15)"
                    : undefined,
              opacity: preview?.previewKind === "deletion" ? 0.68 : 1,
            },
          };
        })}
        edges={edges.map((edge) => {
          const highlighted = highlightedEdgeSet.has(edge.id);
          const isSelected = selection.edgeIds.includes(edge.id);
          const isError = edge.style?.stroke === TOKEN_DANGER;
          const isFresh = freshEdgeIds.has(edge.id);
          return {
            ...edge,
            className: [edge.className, isFresh ? "looper-edge-stream" : null].filter(Boolean).join(" ") || undefined,
            style: {
              stroke: highlighted
                ? regionStatus === "applied"
                  ? "#059669"
                  : TOKEN_INDIGO_600
                : isSelected
                  ? TOKEN_INDIGO_600
                  : isError
                    ? TOKEN_DANGER
                    : TOKEN_INK_3,
              strokeWidth: highlighted ? 3.5 : isSelected ? 2.5 : 1.5,
              strokeDasharray: highlighted && regionStatus !== "applied" ? "6 4" : undefined,
            },
            animated: isSelected || edge.animated || highlighted,
          };
        })}
        nodeTypes={nodeTypes}
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
        connectionLineStyle={{ stroke: connectingValid === false ? TOKEN_DANGER : TOKEN_INDIGO_500, strokeWidth: 2 }}
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
        onEdgeClick={(_, edge) => onDeleteEdge(edge.id)}
        onEdgeDoubleClick={(event, edge) =>
          onRequestInsert({ mode: "selectedEdge", edgeId: edge.id, at: { x: event.clientX, y: event.clientY } })
        }
        onNodeDoubleClick={(event, node) =>
          onRequestInsert({ mode: "selectedNode", nodeId: node.id, at: { x: event.clientX, y: event.clientY } })
        }
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
        <CanvasCommands
          fitRequest={fitRequest}
          frameRequest={frameRequest}
          selectedNodeIds={selection.nodeIds}
          onEscapeClear={() => {
            setSelection({ nodeIds: [], edgeIds: [] });
            onSelectionChange([], []);
            onSelectNode(undefined);
          }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1.2}
          color={TOKEN_INK_LINE}
          style={{ background: "#FAFAFA" }}
        />
        <MiniMap
          pannable
          zoomable
          style={{
            background: "#FFFFFF",
            border: `1px solid ${TOKEN_INK_LINE_LIGHT}`,
            borderRadius: 8,
          }}
          nodeColor={(node) => {
            const t = node.data?.type as string | undefined;
            if (t === "LoopControl" || t === "SubLoop") return TOKEN_INDIGO_600;
            if (t === "Evaluator" || t === "HumanReview" || t === "Checkpoint") return "#D97706";
            return TOKEN_INDIGO_500;
          }}
          maskColor="rgba(255,255,255,0.55)"
        />
        <Controls
          showInteractive={false}
          style={{
            background: "#FFFFFF",
            border: `1px solid ${TOKEN_INK_LINE_LIGHT}`,
            borderRadius: 8,
            color: TOKEN_INK_2,
          }}
        />
      </ReactFlow>
    </div>
  );
}
