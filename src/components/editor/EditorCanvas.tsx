"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeTypeBadge } from "@/components/ui";

// Module-level stable references prevent @xyflow/react v12 StoreUpdater from
// detecting "changes" for props that never actually change.
const STABLE_FIT_VIEW_OPTIONS = { padding: 0.2, duration: 300 };
const STABLE_SNAP_GRID: [number, number] = [16, 16];
const STABLE_PAN_ON_DRAG: number[] = [1, 2];

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
// How long an "arrived" flag stays on an edge id. Must exceed the 380 ms
// draw-on animation so the dasharray resets cleanly once the class is removed.
const EDGE_STREAM_LIFETIME_MS = 450;

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
        borderRadius: accent ? accent.radius : 12,
        background: accent ? accent.bg : "#FFFFFF",
        padding: 12,
        minWidth: 192,
        boxShadow: "0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
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

function EmptyCanvasHint() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 5,
      }}
    >
      <svg width="196" height="68" viewBox="0 0 196 68" fill="none" aria-hidden="true">
        <line x1="62" y1="34" x2="90" y2="34" stroke="rgba(79,70,229,0.22)" strokeWidth="1.5" strokeDasharray="3 2.5" />
        <line x1="106" y1="34" x2="134" y2="34" stroke="rgba(79,70,229,0.22)" strokeWidth="1.5" strokeDasharray="3 2.5" />
        <rect x="6" y="18" width="56" height="32" rx="10" fill="white" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <rect x="72" y="18" width="52" height="32" rx="10" fill="white" stroke="rgba(0,0,0,0.09)" strokeWidth="1" />
        <rect x="134" y="18" width="56" height="32" rx="10" fill="#EEF2FF" stroke="rgba(79,70,229,0.35)" strokeWidth="1.5" />
        <circle cx="12" cy="34" r="2" fill="rgba(79,70,229,0.45)" />
        <circle cx="184" cy="34" r="2" fill="rgba(79,70,229,0.45)" />
      </svg>
      <p
        style={{
          marginTop: 14,
          fontSize: 13,
          color: "rgba(0,0,0,0.26)",
          letterSpacing: "-0.01em",
          fontWeight: 500,
        }}
      >
        Describe your system in the chat to get started
      </p>
    </div>
  );
}

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
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
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

  // Sync external node/edge arrays into ReactFlow's internal state, but ONLY
  // when the content actually changes. The mock-mode poll returns a new array
  // reference every 1.5 s even when nothing changed; a naive useEffect dep on
  // the reference triggers setNodes → displayNodes recomputes → StoreUpdater
  // fires → Zustand setNodes → forceStoreRerender → re-render → repeat.
  const prevInitialNodesRef = useRef(initialNodes);
  const prevInitialEdgesRef = useRef(initialEdges);
  useEffect(() => {
    const prev = prevInitialNodesRef.current;
    const curr = initialNodes;
    if (prev === curr) return;
    const changed =
      prev.length !== curr.length ||
      curr.some((n, i) => {
        const p = prev[i];
        return (
          n.id !== p?.id ||
          n.data?.title !== p?.data?.title ||
          n.data?.type !== p?.data?.type ||
          n.position.x !== p?.position.x ||
          n.position.y !== p?.position.y
        );
      });
    if (changed) {
      prevInitialNodesRef.current = curr;
      setNodes(curr);
    }
  }, [initialNodes, setNodes]);
  useEffect(() => {
    const prev = prevInitialEdgesRef.current;
    const curr = initialEdges;
    if (prev === curr) return;
    const changed =
      prev.length !== curr.length ||
      curr.some((e, i) => e.id !== prev[i]?.id || e.source !== prev[i]?.source || e.target !== prev[i]?.target);
    if (changed) {
      prevInitialEdgesRef.current = curr;
      setEdges(curr);
    }
  }, [initialEdges, setEdges]);

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

  // All callbacks passed to <ReactFlow> must be stable (useCallback) because
  // @xyflow/react v12's StoreUpdater tracks them by reference. A new function
  // on every render → store.setState({ onNodesChange: fn }) → Zustand update
  // → forceStoreRerender → re-render → new function → infinite loop.
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  // Only handle alignment guide logic here — do NOT call setNodes inside
  // onNodesChange. Propagating dimension/select/position changes to React state
  // would cause displayNodes to recompute, which re-triggers StoreUpdater in
  // @xyflow/react v12, which calls Zustand setNodes again, ad infinitum.
  const onNodesChange = useCallback((changes: NodeChange<Node>[]) => {
    const active = changes.find((c) => c.type === "position" && c.dragging && c.id === draggingId) as
      | { id: string; position?: { x: number; y: number } }
      | undefined;
    if (!active || !active.position) return;
    const peer = nodesRef.current.find(
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
  }, [draggingId]);

  const validConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target) return false;
    const valid = String(connection.source) !== String(connection.target);
    setConnectingValid(valid);
    return valid;
  }, []);

  const handleSelection = useCallback((params: OnSelectionChangeParams) => {
    const nodeIds = (params.nodes ?? []).map((n) => n.id);
    const edgeIds = (params.edges ?? []).map((e) => e.id);
    setSelection({ nodeIds, edgeIds });
    onSelectionChange(nodeIds, edgeIds);
    onSelectNode(nodeIds[0]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectionChange, onSelectNode]);

  const previewLookup = useMemo(() => new Map((previewItems ?? []).map((item) => [item.entityId, item])), [previewItems]);
  const highlightedNodeSet = useMemo(() => new Set(highlightedNodeIds ?? []), [highlightedNodeIds]);
  const highlightedEdgeSet = useMemo(() => new Set(highlightedEdgeIds ?? []), [highlightedEdgeIds]);

  // Memoize the transformed node/edge arrays so ReactFlow receives a stable
  // reference when nothing visual has actually changed. Without this, the
  // inline .map() creates a new array on every render, which triggers
  // @xyflow/react v12's StoreUpdater → onNodesChange → setNodes → re-render
  // → new .map() reference → infinite "Maximum update depth exceeded" loop.
  const selectionNodeIds = selection.nodeIds;
  const selectionEdgeIds = selection.edgeIds;
  const displayNodes = useMemo(
    () =>
      nodes.map((node) => {
        const preview = previewLookup.get(node.id);
        const highlighted = highlightedNodeSet.has(node.id);
        const isSelected = selectionNodeIds.includes(node.id);
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nodes, previewLookup, highlightedNodeSet, regionStatus, selectionNodeIds, freshNodeIds, pulsingNodeId],
  );
  const displayEdges = useMemo(
    () =>
      edges.map((edge) => {
        const highlighted = highlightedEdgeSet.has(edge.id);
        const isSelected = selectionEdgeIds.includes(edge.id);
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
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [edges, highlightedEdgeSet, regionStatus, selectionEdgeIds, freshEdgeIds],
  );

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

  // Stable callbacks for ReactFlow props — all must be useCallback to prevent
  // @xyflow/react v12 StoreUpdater from detecting spurious "changes" that
  // trigger Zustand updates → forceStoreRerender → infinite render loop.
  const nodesLengthRef = useRef(nodes.length);
  nodesLengthRef.current = nodes.length;
  const edgesLengthRef = useRef(edges.length);
  edgesLengthRef.current = edges.length;

  const connectingLineStyle = useMemo(
    () => ({ stroke: connectingValid === false ? TOKEN_DANGER : TOKEN_INDIGO_500, strokeWidth: 2 }),
    [connectingValid],
  );

  const handleInit = useCallback(() => {
    onViewportSettled?.(nodesLengthRef.current, edgesLengthRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onViewportSettled]);

  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onSelectNode(node.id);
  }, [onSelectNode]);

  const handlePaneClick = useCallback((event: React.MouseEvent) => {
    if (event.detail >= 2) {
      onRequestInsert({ mode: "canvas", at: { x: event.clientX, y: event.clientY } });
      return;
    }
    onSelectNode(undefined);
    onSelectionChange([], []);
    setSelection({ nodeIds: [], edgeIds: [] });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectNode, onSelectionChange, onRequestInsert]);

  const handleConnectStart = useCallback(() => setConnectingValid(null), []);
  const handleConnectEnd = useCallback(() => setConnectingValid(null), []);

  const handleConnect = useCallback((connection: Connection) => {
    if (connection.source && connection.target && connection.source !== connection.target) {
      setEdges((eds) => addEdge({ ...connection, type: "smoothstep" }, eds));
      onConnect(connection.source, connection.target);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onConnect, setEdges]);

  const handleEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    onDeleteEdge(edge.id);
  }, [onDeleteEdge]);

  const handleEdgeDoubleClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    onRequestInsert({ mode: "selectedEdge", edgeId: edge.id, at: { x: event.clientX, y: event.clientY } });
  }, [onRequestInsert]);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    onRequestInsert({ mode: "selectedNode", nodeId: node.id, at: { x: event.clientX, y: event.clientY } });
  }, [onRequestInsert]);

  const handleNodesDelete = useCallback((deleted: Node[]) => {
    onDeleteNodes(deleted.map((n) => n.id));
  }, [onDeleteNodes]);

  const handleNodeDragStart = useCallback((_: React.MouseEvent, node: Node) => {
    setDraggingId(node.id);
  }, []);

  const draggingIdRef = useRef(draggingId);
  draggingIdRef.current = draggingId;
  const handleNodeDragStop = useCallback((_: React.MouseEvent, node: Node) => {
    if (draggingIdRef.current === node.id) onMove(node.id, node.position.x, node.position.y);
    setDraggingId(null);
    setGuide({});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMove]);

  const handleMove = useCallback((_: unknown, viewport: { zoom: number }) => {
    onZoomChange?.(viewport.zoom);
  }, [onZoomChange]);

  const handleEscapeClear = useCallback(() => {
    setSelection({ nodeIds: [], edgeIds: [] });
    onSelectionChange([], []);
    onSelectNode(undefined);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSelectionChange, onSelectNode]);

  return (
    <div ref={wrapRef} className="editor-canvas relative w-full h-full" style={{ position: "relative" }}>
      {nodes.length === 0 && <EmptyCanvasHint />}
      {previewItems
        ?.filter((item) => item.previewKind === "addition" && item.x !== undefined && item.y !== undefined)
        .map((item) => (
          <div
            key={item.diffId}
            style={{
              position: "absolute",
              left: item.x,
              top: item.y,
              border: `1.5px dashed ${TOKEN_INDIGO_500}`,
              background: "rgba(99,102,241,0.06)",
              borderRadius: 8,
              padding: "8px 10px",
              minWidth: 140,
              pointerEvents: "none",
              zIndex: 6,
              boxShadow: "0 2px 8px rgba(99,102,241,0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: TOKEN_INDIGO_500, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 600, color: TOKEN_INDIGO_600, letterSpacing: "0.04em" }}>
                {item.entityType || "Step"}
              </span>
            </div>
            <p style={{ fontSize: 10, color: TOKEN_INDIGO_600, marginTop: 2, opacity: 0.7 }}>proposed</p>
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
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={STABLE_FIT_VIEW_OPTIONS}
        minZoom={0.18}
        maxZoom={2.6}
        snapToGrid
        snapGrid={STABLE_SNAP_GRID}
        selectionOnDrag
        panOnDrag={STABLE_PAN_ON_DRAG}
        panOnScroll
        zoomOnPinch
        zoomOnScroll
        zoomOnDoubleClick={false}
        multiSelectionKeyCode={"Shift"}
        deleteKeyCode={null}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={connectingLineStyle}
        isValidConnection={validConnection}
        onInit={handleInit}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        onSelectionChange={handleSelection}
        onConnectStart={handleConnectStart}
        onConnectEnd={handleConnectEnd}
        onConnect={handleConnect}
        onEdgeClick={handleEdgeClick}
        onEdgeDoubleClick={handleEdgeDoubleClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesDelete={handleNodesDelete}
        onNodeDragStart={handleNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        onNodesChange={onNodesChange}
        onMove={handleMove}
        proOptions={{ hideAttribution: true }}
      >
        <CanvasCommands
          fitRequest={fitRequest}
          frameRequest={frameRequest}
          selectedNodeIds={selection.nodeIds}
          onEscapeClear={handleEscapeClear}
        />
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color="rgba(0,0,0,0.09)"
          style={{ background: "#F8F7FC" }}
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
