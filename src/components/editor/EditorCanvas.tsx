"use client";

import { memo, useEffect, useMemo, useState } from "react";
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
import { NodeTypeBadge } from "@/components/ui";

type EditorNodeData = { title: string; type: string; subtitle?: string; compact?: boolean };

const ALIGN_THRESHOLD = 8;

const PipesNode = memo(function PipesNode({ data }: { data: EditorNodeData }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: 8, background: "var(--surface-2)", padding: 10, minWidth: 180, boxShadow: "0 2px 10px rgba(12, 18, 28, 0.15)" }}>
      <Handle type="target" position={Position.Left} style={{ background: "#8aa8ff", width: 10, height: 10, border: "2px solid #f4f7ff" }} />
      <strong>{data.title}</strong>
      {!data.compact && data.subtitle ? <div className="badge">{data.subtitle}</div> : null}
      <div style={{ marginTop: 6 }}>
        <NodeTypeBadge type={data.type} />
      </div>
      <Handle type="source" position={Position.Right} style={{ background: "#4a85ff", width: 10, height: 10, border: "2px solid #f4f7ff" }} />
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

  const handleSelection = (params: OnSelectionChangeParams) => {
    const nodeIds = (params.nodes ?? []).map((n) => n.id);
    const edgeIds = (params.edges ?? []).map((e) => e.id);
    setSelection({ nodeIds, edgeIds });
    onSelectionChange(nodeIds, edgeIds);
    onSelectNode(nodeIds[0]);
  };

  return (
    <div className="editor-canvas" style={{ position: "relative" }}>
      {guide.x !== undefined ? <div style={{ position: "absolute", top: 0, bottom: 0, left: guide.x, width: 1, background: "rgba(74,133,255,0.45)", pointerEvents: "none", zIndex: 4 }} /> : null}
      {guide.y !== undefined ? <div style={{ position: "absolute", left: 0, right: 0, top: guide.y, height: 1, background: "rgba(74,133,255,0.45)", pointerEvents: "none", zIndex: 4 }} /> : null}
      <ReactFlow
        nodes={nodes}
        edges={edges.map((edge) => ({ ...edge, style: { stroke: selection.edgeIds.includes(edge.id) ? "#2f67f5" : "#4a85ff", strokeWidth: selection.edgeIds.includes(edge.id) ? 3 : 2 }, animated: selection.edgeIds.includes(edge.id) || edge.animated }))}
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
        connectionLineStyle={{ stroke: connectingValid === false ? "#db4b4b" : "#4a85ff", strokeWidth: 3 }}
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
        <CanvasCommands fitRequest={fitRequest} frameRequest={frameRequest} selectedNodeIds={selection.nodeIds} onEscapeClear={() => { setSelection({ nodeIds: [], edgeIds: [] }); onSelectionChange([], []); onSelectNode(undefined); }} />
        <Background gap={16} size={1} color="rgba(143, 160, 192, 0.28)" />
        <MiniMap pannable zoomable nodeColor={(node) => node.data?.type === "Subsystem" ? "#2f67f5" : "#8aa8ff"} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
