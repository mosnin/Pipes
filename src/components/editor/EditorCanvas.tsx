"use client";

import { memo, useEffect, useMemo, useState } from "react";
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

type EditorNodeData = { title: string; type: string; subtitle?: string; compact?: boolean };

const ALIGN_THRESHOLD = 8;
const TOKEN_INK_LINE = "rgba(0,0,0,0.14)";
const TOKEN_INK_LINE_LIGHT = "rgba(0,0,0,0.08)";
const TOKEN_INDIGO_500 = "#6366F1";
const TOKEN_INDIGO_600 = "#4F46E5";
const TOKEN_DANGER = "#DC2626";
const TOKEN_INK_3 = "#8E8E93";
const TOKEN_INK_2 = "#3C3C43";

const PipesNode = memo(function PipesNode({ data }: { data: EditorNodeData }) {
  return (
    <div
      style={{
        border: `1px solid ${TOKEN_INK_LINE_LIGHT}`,
        borderRadius: 8,
        background: "#FFFFFF",
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
      <strong style={{ color: "#111", fontSize: 13, lineHeight: 1.2 }}>{data.title}</strong>
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
  onSelectNode,
  onSelectionChange,
  onConnect,
  onMove,
  onDeleteEdge,
  onDeleteNodes,
  onRequestInsert,
  onZoomChange,
  onViewportSettled,
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

  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes]);
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges]);

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

  return (
    <div className="editor-canvas relative w-full h-full" style={{ position: "relative" }}>
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
          const previewBorder =
            preview?.previewKind === "deletion"
              ? `2px dashed ${TOKEN_DANGER}`
              : preview?.previewKind === "movement"
                ? "2px dashed #D97706"
                : preview?.previewKind === "connection"
                  ? `2px solid ${TOKEN_INDIGO_600}`
                  : undefined;
          return {
            ...node,
            style: {
              ...(node.style ?? {}),
              border:
                previewBorder ??
                (highlighted
                  ? `2px solid ${regionStatus === "applied" ? "#059669" : TOKEN_INDIGO_600}`
                  : isSelected
                    ? `2px solid ${TOKEN_INDIGO_600}`
                    : undefined),
              boxShadow: isSelected
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
          return {
            ...edge,
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
          nodeColor={(node) => (node.data?.type === "Subsystem" ? TOKEN_INDIGO_600 : TOKEN_INDIGO_500)}
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
