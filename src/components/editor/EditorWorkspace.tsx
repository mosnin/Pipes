"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AvatarStack, Badge, Button, Card, CommentBubble, Input, Panel, Textarea, Select, ValidationBadge } from "@/components/ui";
import { Separator, Spinner } from "@heroui/react";
import { Copy, Maximize2, Plus, Redo2, Star, Trash2, Undo2 } from "lucide-react";
import { validateSystem } from "@/domain/validation";
import { simulateSystem } from "@/domain/simulation";
import { EditorCanvas } from "@/components/editor/EditorCanvas";
import { clientRuntimeFlags } from "@/lib/env/client";
import { deriveSaveState, type EditorGraphAction, type GraphNode, type GraphPipe, popRedo, popUndo, pushHistory, type HistoryState } from "@/components/editor/editor_state";
import { EditorErrorBoundary } from "@/components/editor/EditorErrorBoundary";
import { type InsertContext, groupByCategory, nodeLibraryCatalog, rankLibraryEntries } from "@/domain/templates/node_library";
import { computeCompatibilityHint, createDefaultNodeDefinition, summarizeContract, type ContractType, type FieldContract, type NodeDefinition, validateNodeDefinition } from "@/components/editor/node_definition";
import { autoArrange, collapseAwareGraph, computeSubsystemBoundary, createSubsystemFromSelection, type LayoutPreset, type Subsystem } from "@/components/editor/structure_model";
import { presentPipes, summarizeTrace, traceEdgesFromSteps, type PipeRouteKind, type PipeSemantics } from "@/components/editor/pipe_semantics";
import { AgentChatPanel } from "@/components/editor/AgentChatPanel";
import { getConfigSchema } from "@/domain/node_config/schema";
import type { NodeType } from "@/domain/pipes_schema_v1/schema";

type SystemPayload = {
  system: { id: string; name: string; description: string };
  nodes: GraphNode[];
  pipes: GraphPipe[];
  comments: Array<{ id: string; body: string; nodeId?: string; authorId: string; createdAt: string }>;
  versions: Array<{ id: string; name: string; authorId: string; createdAt: string }>;
  presence: Array<{ id: string; name: string; selectedNodeId?: string }>;
};

type QueuedAction = { action: EditorGraphAction; id: string; retries: number };
type ReviewPreviewItem = { diffId: string; entityType: string; entityId: string; changeType: string; previewKind: string; emphasis: "pending_review" | "selected_preview" | "applied"; x?: number; y?: number };
type ReviewRegion = { batchId: string; runId: string; nodeIds: string[]; pipeIds: string[]; subsystemIds: string[]; status: "pending_review" | "applied" };

function normalizeBundle(bundle: any): SystemPayload {
  return {
    system: { id: String(bundle.system._id ?? bundle.system.id), name: bundle.system.name, description: bundle.system.description },
    nodes: bundle.nodes.map((n: any) => ({ id: String(n._id ?? n.id), type: n.type, title: n.title, description: n.description, position: n.position, portIds: n.portIds ?? [], config: n.config ?? {} })),
    pipes: bundle.pipes.map((p: any) => ({ id: String(p._id ?? p.id), systemId: String(p.systemId), fromPortId: p.fromPortId, toPortId: p.toPortId, fromNodeId: p.fromNodeId ? String(p.fromNodeId) : undefined, toNodeId: p.toNodeId ? String(p.toNodeId) : undefined })),
    comments: bundle.comments.map((c: any) => ({ id: String(c._id ?? c.id), systemId: String(c.systemId), body: c.body, nodeId: c.nodeId ? String(c.nodeId) : undefined, authorId: String(c.authorId), createdAt: c.createdAt })),
    versions: bundle.versions.map((v: any) => ({ id: String(v._id ?? v.id), name: v.name, authorId: String(v.authorId), createdAt: v.createdAt })),
    presence: (bundle.presence ?? []).map((p: any) => ({ id: String(p._id ?? p.id), name: p.name ?? String(p.userId), selectedNodeId: p.selectedNodeId ? String(p.selectedNodeId) : undefined }))
  };
}

const EMPTY_HISTORY: HistoryState = { undo: [], redo: [] };
const RECENTS_STORAGE_KEY = "pipes_editor_node_recents_v1";
const FAVORITES_STORAGE_KEY = "pipes_editor_node_favorites_v1";
const NODE_DEFINITIONS_PREFIX = "pipes_node_definitions_v1_";
const SUBSYSTEMS_PREFIX = "pipes_subsystems_v1_";
const PIPE_SEMANTICS_PREFIX = "pipes_pipe_semantics_v1_";

type InsertRequest = { mode: "canvas" | "selectedNode" | "selectedEdge" | "sourcePort" | "targetPort"; at?: { x: number; y: number }; nodeId?: string; edgeId?: string };
type InspectorTab = "overview" | "inputs" | "outputs" | "config" | "notes" | "validation" | "docs";
type CompatibilityRow = { direction: "inbound" | "outbound"; nodeTitle: string; hint: ReturnType<typeof computeCompatibilityHint> };

function localApply(nodes: GraphNode[], pipes: GraphPipe[], action: EditorGraphAction): { nodes: GraphNode[]; pipes: GraphPipe[] } {
  if (action.action === "addNode") {
    const id = action.clientNodeId ?? `tmp_${Math.random().toString(36).slice(2, 9)}`;
    return { nodes: [...nodes, { id, type: action.type, title: action.title, description: action.description, position: { x: action.x ?? 240, y: action.y ?? 180 }, portIds: [`${id}_in`, `${id}_out`], config: {} }], pipes };
  }
  if (action.action === "updateNode") return { nodes: nodes.map((n) => n.id === action.nodeId ? { ...n, title: action.title ?? n.title, description: action.description ?? n.description, position: action.position ?? n.position, config: action.config !== undefined ? action.config : n.config } : n), pipes };
  if (action.action === "deleteNode") return { nodes: nodes.filter((n) => n.id !== action.nodeId), pipes: pipes.filter((p) => p.fromNodeId !== action.nodeId && p.toNodeId !== action.nodeId) };
  if (action.action === "addPipe") {
    const id = action.clientPipeId ?? `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
    return { nodes, pipes: [...pipes, { id, systemId: action.systemId, fromPortId: `${action.fromNodeId}_out`, toPortId: `${action.toNodeId}_in`, fromNodeId: action.fromNodeId, toNodeId: action.toNodeId }] };
  }
  if (action.action === "deletePipe") return { nodes, pipes: pipes.filter((p) => p.id !== action.pipeId) };
  return { nodes, pipes };
}

function EditorWorkspaceView({ systemId, data, reload }: { systemId: string; data: SystemPayload | null; reload: () => void }) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [versionName, setVersionName] = useState("checkpoint");
  const [aiEditPrompt, setAiEditPrompt] = useState("Improve reliability and add guardrails.");
  const [pendingSuggestion, setPendingSuggestion] = useState<any | null>(null);
  const [acceptedChangeIds, setAcceptedChangeIds] = useState<string[]>([]);
  const [importPayload, setImportPayload] = useState("");
  const [mergePlan, setMergePlan] = useState<any | null>(null);
  const [mergeStrategy, setMergeStrategy] = useState<"safe_upsert" | "replace_conflicts">("safe_upsert");
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [pipes, setPipes] = useState<GraphPipe[]>([]);
  const [history, setHistory] = useState<HistoryState>(EMPTY_HISTORY);
  const [queue, setQueue] = useState<QueuedAction[]>([]);
  const [inFlight, setInFlight] = useState(false);
  const [failed, setFailed] = useState(0);
  const [fitRequest, setFitRequest] = useState(0);
  const [frameRequest, setFrameRequest] = useState(0);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState("");
  const [paletteIndex, setPaletteIndex] = useState(0);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [insertRequest, setInsertRequest] = useState<InsertRequest>({ mode: "canvas" });
  const [nodeDefinitions, setNodeDefinitions] = useState<Record<string, NodeDefinition>>({});
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("overview");
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("left_to_right");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pipeSemantics, setPipeSemantics] = useState<Record<string, PipeSemantics>>({});
  const [routeFocusMode, setRouteFocusMode] = useState(false);
  const [reviewPreviewItems, setReviewPreviewItems] = useState<ReviewPreviewItem[]>([]);
  const [reviewRegion, setReviewRegion] = useState<ReviewRegion | null>(null);
  const hydratedRef = useRef(false);

  const trackSignal = useCallback(async (event: string, metadata?: Record<string, unknown>) => {
    await fetch("/api/editor/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, metadata }) });
  }, []);

  useEffect(() => {
    if (!data) return;
    if (!hydratedRef.current || (queue.length === 0 && !inFlight)) {
      setNodes(data.nodes);
      setPipes(data.pipes);
      hydratedRef.current = true;
    }
  }, [data, inFlight, queue.length]);

  useEffect(() => {
    trackSignal("editor_opened", { systemId, nodeCount: nodes.length, pipeCount: pipes.length });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  useEffect(() => {
    fetch("/api/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, selectedNodeId: selectedNodeIds[0] }) });
  }, [selectedNodeIds, systemId]);

  useEffect(() => {
    if (inFlight || queue.length === 0) return;
    const next = queue[0];
    setInFlight(true);
    fetch("/api/graph", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(next.action) })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.error ?? "save failed");
        setQueue((prev) => prev.slice(1));
        setFailed(0);
        trackSignal("autosave_success", { action: next.action.action });
      })
      .catch(async () => {
        setFailed((f) => f + 1);
        if (next.retries >= 2) {
          await trackSignal("autosave_failure", { action: next.action.action });
        } else {
          setQueue((prev) => [{ ...prev[0], retries: prev[0].retries + 1 }, ...prev.slice(1)]);
        }
      })
      .finally(() => setInFlight(false));
  }, [inFlight, queue, trackSignal]);

  useEffect(() => {
    const key = `pipes_recovery_${systemId}`;
    localStorage.setItem(key, JSON.stringify(queue.map((q) => q.action)));
  }, [queue, systemId]);

  useEffect(() => {
    const key = `pipes_recovery_${systemId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const restored = JSON.parse(raw) as EditorGraphAction[];
    if (restored.length > 0) {
      setQueue(restored.map((action, i) => ({ action, id: `recover_${i}`, retries: 0 })));
      trackSignal("recovery_offered", { count: restored.length });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemId]);

  useEffect(() => {
    const savedRecents = localStorage.getItem(RECENTS_STORAGE_KEY);
    const savedFavorites = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (savedRecents) setRecents(JSON.parse(savedRecents));
    if (savedFavorites) setFavorites(JSON.parse(savedFavorites));
  }, []);

  useEffect(() => localStorage.setItem(RECENTS_STORAGE_KEY, JSON.stringify(recents.slice(0, 12))), [recents]);
  useEffect(() => localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites)), [favorites]);
  useEffect(() => {
    const raw = localStorage.getItem(`${NODE_DEFINITIONS_PREFIX}${systemId}`);
    if (!raw) return;
    setNodeDefinitions(JSON.parse(raw));
  }, [systemId]);
  useEffect(() => {
    localStorage.setItem(`${NODE_DEFINITIONS_PREFIX}${systemId}`, JSON.stringify(nodeDefinitions));
  }, [nodeDefinitions, systemId]);
  useEffect(() => {
    const raw = localStorage.getItem(`${SUBSYSTEMS_PREFIX}${systemId}`);
    if (!raw) return;
    setSubsystems(JSON.parse(raw));
  }, [systemId]);
  useEffect(() => {
    localStorage.setItem(`${SUBSYSTEMS_PREFIX}${systemId}`, JSON.stringify(subsystems));
  }, [subsystems, systemId]);
  useEffect(() => {
    const raw = localStorage.getItem(`${PIPE_SEMANTICS_PREFIX}${systemId}`);
    if (!raw) return;
    setPipeSemantics(JSON.parse(raw));
  }, [systemId]);
  useEffect(() => {
    localStorage.setItem(`${PIPE_SEMANTICS_PREFIX}${systemId}`, JSON.stringify(pipeSemantics));
  }, [pipeSemantics, systemId]);

  const enqueue = useCallback((action: EditorGraphAction) => {
    const applied = localApply(nodes, pipes, action);
    setNodes(applied.nodes);
    setPipes(applied.pipes);
    setQueue((prev) => [...prev, { action, id: crypto.randomUUID(), retries: 0 }]);
  }, [nodes, pipes]);

  const recordAction = useCallback((forward: EditorGraphAction, inverse: EditorGraphAction, coalesceKey?: string) => {
    enqueue(forward);
    setHistory((h) => pushHistory(h, { forward: [forward], inverse: [inverse], coalesceKey, at: Date.now() }));
  }, [enqueue]);

  const deferredNodes = useDeferredValue(nodes);
  const deferredPipes = useDeferredValue(pipes);

  const flowView = useMemo(() => collapseAwareGraph({ nodes: deferredNodes, pipes: deferredPipes, subsystems, compactMode: zoomLevel < 0.5 }), [deferredNodes, deferredPipes, subsystems, zoomLevel]);

  const selectedNodeId = selectedNodeIds[0];
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);
  const selectedEdge = useMemo(() => pipes.find((pipe) => pipe.id === selectedEdgeIds[0]), [pipes, selectedEdgeIds]);
  const occupancy = useMemo(() => selectedNodeId && data ? data.presence.filter((p) => p.selectedNodeId === selectedNodeId) : [], [data, selectedNodeId]);
  const selectedDefinition = useMemo(() => {
    if (!selectedNode) return undefined;
    return nodeDefinitions[selectedNode.id] ?? createDefaultNodeDefinition({ nodeId: selectedNode.id, nodeType: selectedNode.type, title: selectedNode.title, description: selectedNode.description });
  }, [nodeDefinitions, selectedNode]);
  const compatibilityHints = useMemo<CompatibilityRow[]>(() => {
    if (!selectedNode || !selectedDefinition) return [];
    const rows: CompatibilityRow[] = [];
    for (const pipe of pipes) {
      if (pipe.fromNodeId === selectedNode.id && pipe.toNodeId) {
        const target = nodes.find((item) => item.id === pipe.toNodeId);
        if (!target) continue;
        const targetDef = nodeDefinitions[target.id] ?? createDefaultNodeDefinition({ nodeId: target.id, nodeType: target.type, title: target.title, description: target.description });
        rows.push({ direction: "outbound", nodeTitle: target.title, hint: computeCompatibilityHint(selectedDefinition, targetDef) });
      }
      if (pipe.toNodeId === selectedNode.id && pipe.fromNodeId) {
        const source = nodes.find((item) => item.id === pipe.fromNodeId);
        if (!source) continue;
        const sourceDef = nodeDefinitions[source.id] ?? createDefaultNodeDefinition({ nodeId: source.id, nodeType: source.type, title: source.title, description: source.description });
        rows.push({ direction: "inbound", nodeTitle: source.title, hint: computeCompatibilityHint(sourceDef, selectedDefinition) });
      }
    }
    return rows;
  }, [nodeDefinitions, nodes, pipes, selectedDefinition, selectedNode]);
  const definitionIssues = useMemo(() => selectedDefinition ? validateNodeDefinition(selectedDefinition) : [], [selectedDefinition]);

  const insertContext = useMemo<InsertContext | undefined>(() => {
    if (insertRequest.mode === "selectedEdge" && insertRequest.edgeId) {
      const edge = pipes.find((item) => item.id === insertRequest.edgeId);
      const sourceNode = nodes.find((item) => item.id === edge?.fromNodeId);
      const targetNode = nodes.find((item) => item.id === edge?.toNodeId);
      return { mode: "selectedEdge", sourceNodeType: sourceNode?.type as any, targetNodeType: targetNode?.type as any };
    }
    if ((insertRequest.mode === "selectedNode" || insertRequest.mode === "sourcePort") && insertRequest.nodeId) {
      const sourceNode = nodes.find((item) => item.id === insertRequest.nodeId);
      return { mode: insertRequest.mode, sourceNodeType: sourceNode?.type as any };
    }
    if (insertRequest.mode === "targetPort" && insertRequest.nodeId) {
      const targetNode = nodes.find((item) => item.id === insertRequest.nodeId);
      return { mode: "targetPort", targetNodeType: targetNode?.type as any };
    }
    if (insertRequest.mode === "canvas") return { mode: "canvas" };
    return undefined;
  }, [insertRequest, nodes, pipes]);

  const rankedLibrary = useMemo(() => rankLibraryEntries({ query: libraryQuery, favorites, recents, context: insertContext }), [favorites, insertContext, libraryQuery, recents]);
  const groupedLibrary = useMemo(() => groupByCategory(rankedLibrary), [rankedLibrary]);
  const paletteResults = useMemo(() => rankLibraryEntries({ query: paletteQuery, favorites, recents, context: insertContext }).slice(0, 12), [favorites, insertContext, paletteQuery, recents]);

  const validationReport = useMemo(() => validateSystem({ id: systemId, workspaceId: "wks", name: data?.system.name ?? "", description: data?.system.description ?? "", createdBy: "usr", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodeIds: nodes.map((n) => n.id), portIds: nodes.flatMap((n) => n.portIds), pipeIds: pipes.map((p) => p.id), groupIds: [], annotationIds: [], commentIds: data?.comments.map((c) => c.id) ?? [], assetIds: [], snippetIds: [], subsystemNodeIds: [] }, nodes as never, nodes.flatMap((n) => [{ id: n.portIds[0], nodeId: n.id, key: "in", label: "in", direction: "input", dataType: "any", required: false }, { id: n.portIds[1], nodeId: n.id, key: "out", label: "out", direction: "output", dataType: "any", required: false }]), pipes as never), [data?.comments, data?.system.description, data?.system.name, nodes, pipes, systemId]);
  useEffect(() => {
    if (nodes.length > 60 || pipes.length > 120) trackSignal("validation_slow", { nodeCount: nodes.length, pipeCount: pipes.length });
  }, [nodes.length, pipes.length, trackSignal]);

  const sim = useMemo(() => simulateSystem({ id: systemId, workspaceId: "wks", name: data?.system.name ?? "", description: data?.system.description ?? "", createdBy: "usr", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), nodeIds: nodes.map((n) => n.id), portIds: nodes.flatMap((n) => n.portIds), pipeIds: pipes.map((p) => p.id), groupIds: [], annotationIds: [], commentIds: [], assetIds: [], snippetIds: [], subsystemNodeIds: [] }, nodes as never, nodes.flatMap((n) => [{ id: n.portIds[0], nodeId: n.id, key: "in", label: "in", direction: "input", dataType: "any", required: false }, { id: n.portIds[1], nodeId: n.id, key: "out", label: "out", direction: "output", dataType: "any", required: false }]), pipes as never, { decision: "primary" }), [data?.system.description, data?.system.name, nodes, pipes, systemId]);
  const tracedEdgeIds = useMemo(() => traceEdgesFromSteps(sim.steps, pipes), [pipes, sim.steps]);
  const invalidPipeIds = useMemo(() => validationReport.issues.filter((issue) => issue.pipeId && issue.severity === "error").map((issue) => issue.pipeId as string), [validationReport.issues]);
  const traceSummary = useMemo(() => summarizeTrace(sim.steps, pipes, pipeSemantics), [pipeSemantics, pipes, sim.steps]);
  const presentedEdges = useMemo(
    () => presentPipes({ baseEdges: flowView.flowEdges, pipes, selectedEdgeIds, tracedEdgeIds, invalidEdgeIds: invalidPipeIds, focusNodeId: routeFocusMode ? selectedNodeId : undefined, semantics: pipeSemantics, nodeDefinitions }),
    [flowView.flowEdges, invalidPipeIds, nodeDefinitions, pipeSemantics, pipes, routeFocusMode, selectedEdgeIds, selectedNodeId, tracedEdgeIds]
  );

  const saveState = deriveSaveState({ queueLength: queue.length, inFlight, failed });
  const saveLabel = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved local changes", sync_delayed: "Sync delayed", error: "Error saving — retrying" }[saveState];

  const undo = useCallback(() => {
    const { entry, state } = popUndo(history);
    if (!entry) return;
    setHistory(state);
    for (const action of entry.inverse) enqueue(action);
    trackSignal("undo_used", { count: entry.inverse.length });
  }, [enqueue, history, trackSignal]);

  const redo = useCallback(() => {
    const { entry, state } = popRedo(history);
    if (!entry) return;
    setHistory(state);
    for (const action of entry.forward) enqueue(action);
    trackSignal("redo_used", { count: entry.forward.length });
  }, [enqueue, history, trackSignal]);

  const openInsertPalette = useCallback((request: InsertRequest) => {
    setInsertRequest(request);
    setPaletteQuery("");
    setPaletteIndex(0);
    setPaletteOpen(true);
  }, []);

  const toggleFavorite = useCallback((nodeType: string) => {
    setFavorites((prev) => prev.includes(nodeType) ? prev.filter((item) => item !== nodeType) : [nodeType, ...prev]);
  }, []);

  const insertNodeFromEntry = useCallback((entry: (typeof nodeLibraryCatalog)[number], request?: InsertRequest) => {
    const activeRequest = request ?? insertRequest;
    const sourceNode = activeRequest.nodeId ? nodes.find((n) => n.id === activeRequest.nodeId) : undefined;
    const targetEdge = activeRequest.edgeId ? pipes.find((p) => p.id === activeRequest.edgeId) : undefined;
    const targetNode = activeRequest.mode === "targetPort" ? sourceNode : undefined;
    const baseX = activeRequest.at?.x ?? sourceNode?.position.x ?? 340;
    const baseY = activeRequest.at?.y ?? sourceNode?.position.y ?? 220;
    const nodeX = activeRequest.mode === "targetPort" ? baseX - 220 : baseX + (activeRequest.mode === "selectedNode" || activeRequest.mode === "sourcePort" ? 220 : 0);
    const nodeY = baseY;
    const clientNodeId = `tmp_${Math.random().toString(36).slice(2, 9)}`;
    recordAction({ action: "addNode", systemId, type: entry.nodeType, title: entry.name, description: entry.description, x: nodeX, y: nodeY, clientNodeId }, { action: "deleteNode", nodeId: clientNodeId });
    if ((activeRequest.mode === "selectedNode" || activeRequest.mode === "sourcePort") && sourceNode) {
      const pipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
      recordAction({ action: "addPipe", systemId, fromNodeId: sourceNode.id, toNodeId: clientNodeId, clientPipeId: pipeId }, { action: "deletePipe", pipeId });
    } else if (activeRequest.mode === "targetPort" && targetNode) {
      const pipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
      recordAction({ action: "addPipe", systemId, fromNodeId: clientNodeId, toNodeId: targetNode.id, clientPipeId: pipeId }, { action: "deletePipe", pipeId });
    } else if (activeRequest.mode === "selectedEdge" && targetEdge?.fromNodeId && targetEdge.toNodeId) {
      const firstPipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
      const secondPipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
      recordAction({ action: "deletePipe", pipeId: targetEdge.id }, { action: "addPipe", systemId, fromNodeId: targetEdge.fromNodeId, toNodeId: targetEdge.toNodeId });
      recordAction({ action: "addPipe", systemId, fromNodeId: targetEdge.fromNodeId, toNodeId: clientNodeId, clientPipeId: firstPipeId }, { action: "deletePipe", pipeId: firstPipeId });
      recordAction({ action: "addPipe", systemId, fromNodeId: clientNodeId, toNodeId: targetEdge.toNodeId, clientPipeId: secondPipeId }, { action: "deletePipe", pipeId: secondPipeId });
    }
    setRecents((prev) => [entry.nodeType, ...prev.filter((item) => item !== entry.nodeType)].slice(0, 12));
    setPaletteOpen(false);
  }, [insertRequest, nodes, pipes, recordAction, systemId]);

  const updateNodeDefinition = useCallback((nodeId: string, mutate: (current: NodeDefinition) => NodeDefinition) => {
    setNodeDefinitions((prev) => {
      const node = nodes.find((item) => item.id === nodeId);
      if (!node) return prev;
      const current = prev[nodeId] ?? createDefaultNodeDefinition({ nodeId: node.id, nodeType: node.type, title: node.title, description: node.description });
      const next = { ...mutate(current), updatedAt: Date.now() };
      return { ...prev, [nodeId]: next };
    });
  }, [nodes]);

  const updateDefinitionField = useCallback((contract: "input" | "output", fieldId: string, patch: Partial<FieldContract>) => {
    if (!selectedNode) return;
    updateNodeDefinition(selectedNode.id, (current) => ({
      ...current,
      [contract]: {
        ...current[contract],
        fields: current[contract].fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field)
      }
    }));
  }, [selectedNode, updateNodeDefinition]);

  const addDefinitionField = useCallback((contract: "input" | "output") => {
    if (!selectedNode) return;
    updateNodeDefinition(selectedNode.id, (current) => ({
      ...current,
      [contract]: {
        ...current[contract],
        fields: [
          ...current[contract].fields,
          { id: crypto.randomUUID(), key: `${contract}_field_${current[contract].fields.length + 1}`, type: "string", required: false, description: "", example: "" }
        ]
      }
    }));
  }, [selectedNode, updateNodeDefinition]);

  const removeDefinitionField = useCallback((contract: "input" | "output", fieldId: string) => {
    if (!selectedNode) return;
    updateNodeDefinition(selectedNode.id, (current) => ({
      ...current,
      [contract]: { ...current[contract], fields: current[contract].fields.filter((field) => field.id !== fieldId) }
    }));
  }, [selectedNode, updateNodeDefinition]);

  const updateNodeConfig = useCallback((nodeId: string, key: string, value: unknown) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    const newConfig = { ...(node.config ?? {}), [key]: value };
    recordAction(
      { action: "updateNode", nodeId, config: newConfig },
      { action: "updateNode", nodeId, config: node.config ?? {} }
    );
  }, [nodes, recordAction]);

  const createSubsystem = useCallback(() => {
    if (selectedNodeIds.length < 2) return;
    const id = `sub_${Math.random().toString(36).slice(2, 9)}`;
    const name = `Subsystem ${subsystems.length + 1}`;
    setSubsystems((prev) => [...prev, createSubsystemFromSelection({ id, name, nodeIds: selectedNodeIds })]);
  }, [selectedNodeIds, subsystems.length]);

  const toggleSubsystemCollapse = useCallback((subsystemId: string, collapsed?: boolean) => {
    setSubsystems((prev) => prev.map((item) => item.id === subsystemId ? { ...item, collapsed: collapsed ?? !item.collapsed } : item));
  }, []);

  const detachSubsystemCopy = useCallback((subsystemId: string) => {
    setSubsystems((prev) => prev.map((item) => item.id === subsystemId ? { ...item, reusableSourceId: undefined } : item));
  }, []);

  const arrangeNodes = useCallback((mode: "selected" | "all") => {
    const targetIds = mode === "selected" && selectedNodeIds.length > 0 ? selectedNodeIds : nodes.map((node) => node.id);
    const arranged = autoArrange(nodes, targetIds, layoutPreset);
    for (const item of arranged) {
      const node = nodes.find((n) => n.id === item.id);
      if (!node) continue;
      recordAction({ action: "updateNode", nodeId: item.id, position: item.position }, { action: "updateNode", nodeId: item.id, position: node.position }, `layout:${mode}`);
    }
  }, [layoutPreset, nodes, recordAction, selectedNodeIds]);

  const deleteSelection = useCallback(() => {
    const nodeSet = new Set(selectedNodeIds);
    const edgesFromSelected = pipes.filter((pipe) => selectedEdgeIds.includes(pipe.id) || (pipe.fromNodeId && nodeSet.has(pipe.fromNodeId)) || (pipe.toNodeId && nodeSet.has(pipe.toNodeId)));
    for (const pipe of edgesFromSelected) {
      if (!pipe.fromNodeId || !pipe.toNodeId) continue;
      recordAction({ action: "deletePipe", pipeId: pipe.id }, { action: "addPipe", systemId, fromNodeId: pipe.fromNodeId, toNodeId: pipe.toNodeId });
    }
    for (const nodeId of selectedNodeIds) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      recordAction({ action: "deleteNode", nodeId }, { action: "addNode", systemId, type: node.type, title: node.title, description: node.description, x: node.position.x, y: node.position.y });
    }
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [nodes, pipes, recordAction, selectedEdgeIds, selectedNodeIds, systemId]);

  const duplicateSelection = useCallback(() => {
    for (const nodeId of selectedNodeIds) {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;
      const clientNodeId = `tmp_${Math.random().toString(36).slice(2, 9)}`;
      recordAction({ action: "addNode", systemId, type: node.type, title: `${node.title} copy`, description: node.description, x: node.position.x + 40, y: node.position.y + 40, clientNodeId }, { action: "deleteNode", nodeId: clientNodeId });
    }
  }, [nodes, recordAction, selectedNodeIds, systemId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.key.toLowerCase() === "k") { e.preventDefault(); openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id }); return; }
      if (e.key === "/" && !cmd && !paletteOpen) { e.preventDefault(); openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id }); return; }
      if (cmd && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      if (cmd && ((e.key.toLowerCase() === "y") || (e.key.toLowerCase() === "z" && e.shiftKey))) { e.preventDefault(); redo(); }
      if (cmd && e.key.toLowerCase() === "d") { e.preventDefault(); duplicateSelection(); }
      if (cmd && e.key === "0") { e.preventDefault(); setFitRequest((n) => n + 1); }
      if (e.shiftKey && e.key.toLowerCase() === "f") { e.preventDefault(); setFrameRequest((n) => n + 1); }
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); deleteSelection(); }
      if (e.shiftKey && e.key.toLowerCase() === "o" && selectedNode) { e.preventDefault(); openInsertPalette({ mode: "sourcePort", nodeId: selectedNode.id }); }
      if (e.shiftKey && e.key.toLowerCase() === "i" && selectedNode) { e.preventDefault(); openInsertPalette({ mode: "targetPort", nodeId: selectedNode.id }); }
      if (e.key === "Escape") { setPendingSuggestion(null); setMergePlan(null); setSelectedNodeIds([]); setSelectedEdgeIds([]); setPaletteOpen(false); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection, duplicateSelection, openInsertPalette, paletteOpen, redo, selectedEdge, selectedNode, undo]);

  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (!paletteResults.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setPaletteIndex((idx) => (idx + 1) % paletteResults.length); }
      if (e.key === "ArrowUp") { e.preventDefault(); setPaletteIndex((idx) => (idx - 1 + paletteResults.length) % paletteResults.length); }
      if (e.key === "Enter") { e.preventDefault(); insertNodeFromEntry(paletteResults[Math.min(paletteIndex, paletteResults.length - 1)]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [insertNodeFromEntry, paletteIndex, paletteOpen, paletteResults]);

  if (!data) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  );

  return (
    <div>
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-2 space-y-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-slate-900">{data.system.name}</h1>
            {data.system.description && <p className="text-xs text-slate-500 mt-0.5">{data.system.description}</p>}
          </div>
          <div className="flex items-center gap-2">
            <AvatarStack names={data.presence.map((p) => p.name)} />
            <Badge tone={saveState === "error" ? "warn" : saveState === "saved" ? "good" : "neutral"}>{saveLabel}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="sm" onClick={undo} isDisabled={history.undo.length === 0}><Undo2 size={14} /> Undo</Button>
          <Button variant="ghost" size="sm" onClick={redo} isDisabled={history.redo.length === 0}><Redo2 size={14} /> Redo</Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id })}><Plus size={14} /> Insert</Button>
          <Button variant="ghost" size="sm" onClick={createSubsystem} isDisabled={selectedNodeIds.length < 2}>Create Subsystem</Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Select value={layoutPreset} onChange={(e) => setLayoutPreset(e.target.value as LayoutPreset)} className="w-48 text-xs py-1">
            <option value="left_to_right">Layout: Left → Right</option>
            <option value="top_to_bottom">Layout: Top ↓ Bottom</option>
          </Select>
          <Button variant="ghost" size="sm" onClick={() => arrangeNodes("selected")} isDisabled={selectedNodeIds.length === 0}>Arrange Selection</Button>
          <Button variant="ghost" size="sm" onClick={() => arrangeNodes("all")}>Arrange All</Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="sm" onClick={() => setFitRequest((n) => n + 1)}><Maximize2 size={14} /> Fit</Button>
          <Button variant="ghost" size="sm" onClick={() => setFrameRequest((n) => n + 1)} isDisabled={selectedNodeIds.length === 0}>Frame</Button>
          <Button variant="ghost" size="sm" onClick={duplicateSelection} isDisabled={selectedNodeIds.length === 0}><Copy size={14} /> Dupe</Button>
          <Button variant="danger-soft" size="sm" onClick={deleteSelection} isDisabled={selectedNodeIds.length === 0 && selectedEdgeIds.length === 0}><Trash2 size={14} /> Delete</Button>
          <Button variant={routeFocusMode ? "secondary" : "ghost"} size="sm" onClick={() => setRouteFocusMode((v) => !v)}>Route Focus</Button>
          {saveState === "error" && <Button variant="ghost" size="sm" onClick={() => setFailed(0)}>Retry</Button>}
        </div>
      </div>
      <div className="editor-shell" style={{ marginTop: 12 }}>
        <Panel title="Node Library">
          <Input value={libraryQuery} onChange={(e) => setLibraryQuery(e.target.value)} placeholder="Search nodes, tags, category..." />
          <div className="flex items-center gap-2 flex-wrap mt-2">
            <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">Favorites: {favorites.length}</span>
            <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">Recents: {recents.length}</span>
            <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id })}><Plus size={14} /> Command Palette</Button>
          </div>
          {groupedLibrary.map((group) => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mt-4 mb-2">{group.category}</h4>
              <div className="space-y-2">
                {group.entries.slice(0, 8).map((entry) => (
                  <Card key={entry.nodeType} className="p-0">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-slate-800">{entry.name}</strong>
                      <Button variant="ghost" size="sm" isIconOnly onClick={() => toggleFavorite(entry.nodeType)}>
                        {favorites.includes(entry.nodeType) ? <Star className="fill-amber-400 text-amber-400" size={14} /> : <Star size={14} />}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                    <p className="text-xs text-slate-400 mt-1">{entry.tags.join(" · ")}</p>
                    <p className="text-xs text-slate-500">Use: {entry.typicalUse}</p>
                    <p className="text-xs text-slate-500">In: {entry.inputTypes.join(", ")} → Out: {entry.outputTypes.join(", ")}</p>
                    <Button variant="ghost" size="sm" onClick={() => insertNodeFromEntry(entry, { mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id })}>Add Node</Button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-4">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Subsystems</h4>
            {subsystems.length === 0 ? (
              <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">No subsystems yet. Select 2+ nodes and use "Create Subsystem".</p>
            ) : subsystems.map((subsystem) => {
              const boundary = computeSubsystemBoundary(subsystem, pipes);
              return (
                <Card key={subsystem.id}>
                  <p className="text-sm font-medium text-slate-800"><strong>{subsystem.name}</strong> · {subsystem.collapsed ? "Collapsed" : "Expanded"}</p>
                  <p className="text-xs text-slate-500">{subsystem.nodeIds.length} internal nodes · {boundary.inboundNodeIds.length} inbound · {boundary.outboundNodeIds.length} outbound</p>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleSubsystemCollapse(subsystem.id)}>{subsystem.collapsed ? "Expand" : "Collapse"}</Button>
                    <Button variant="ghost" size="sm" onClick={() => { setSelectedNodeIds(subsystem.nodeIds); setFrameRequest((n) => n + 1); }}>Open In Context</Button>
                    <Button variant="ghost" size="sm" onClick={() => detachSubsystemCopy(subsystem.id)} isDisabled={!subsystem.reusableSourceId}>Detach Local Copy</Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </Panel>
        <EditorErrorBoundary area="Canvas" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
          <EditorCanvas
            initialNodes={flowView.flowNodes}
            initialEdges={presentedEdges}
            fitRequest={fitRequest}
            frameRequest={frameRequest}
            previewItems={reviewPreviewItems}
            highlightedNodeIds={reviewRegion?.nodeIds ?? []}
            highlightedEdgeIds={reviewRegion?.pipeIds ?? []}
            regionStatus={reviewRegion?.status}
            onSelectNode={(id) => {
              if (!id) { setSelectedNodeIds([]); return; }
              const subsystem = subsystems.find((item) => item.id === id);
              if (subsystem) { setSelectedNodeIds(subsystem.nodeIds); setFrameRequest((n) => n + 1); return; }
              setSelectedNodeIds([id]);
            }}
            onSelectionChange={(nodeIds, edgeIds) => { setSelectedNodeIds(nodeIds); setSelectedEdgeIds(edgeIds); }}
            onConnect={(source, target) => { const clientPipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`; recordAction({ action: "addPipe", systemId, fromNodeId: source, toNodeId: target, clientPipeId }, { action: "deletePipe", pipeId: clientPipeId }); }}
            onMove={(nodeId, x, y) => {
              const node = nodes.find((n) => n.id === nodeId);
              if (!node) return;
              recordAction({ action: "updateNode", nodeId, position: { x, y } }, { action: "updateNode", nodeId, position: node.position }, `move:${nodeId}`);
            }}
            onDeleteEdge={(edgeId) => {
              const edge = pipes.find((p) => p.id === edgeId);
              if (!edge?.fromNodeId || !edge.toNodeId) return;
              recordAction({ action: "deletePipe", pipeId: edgeId }, { action: "addPipe", systemId, fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId });
            }}
            onDeleteNodes={(nodeIds) => {
              for (const nodeId of nodeIds) {
                const node = nodes.find((n) => n.id === nodeId);
                if (!node) continue;
                recordAction({ action: "deleteNode", nodeId }, { action: "addNode", systemId, type: node.type, title: node.title, description: node.description, x: node.position.x, y: node.position.y });
              }
            }}
            onRequestInsert={(request) => openInsertPalette(request)}
            onZoomChange={setZoomLevel}
            onViewportSettled={(nodeCount, edgeCount) => {
              if (nodeCount + edgeCount > 100) trackSignal("slow_render_threshold", { nodeCount, edgeCount });
            }}
          />
        </EditorErrorBoundary>
        <EditorErrorBoundary area="Inspector" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
          <Panel title="Inspector">
            {selectedEdge ? (
              <Card>
                <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Pipe semantics</h4>
                <Input
                  value={pipeSemantics[selectedEdge.id]?.label ?? ""}
                  onChange={(e) => setPipeSemantics((prev) => ({ ...prev, [selectedEdge.id]: { ...prev[selectedEdge.id], pipeId: selectedEdge.id, routeKind: prev[selectedEdge.id]?.routeKind ?? "default", label: e.target.value } }))}
                  placeholder="Pipe label"
                />
                <Input
                  value={pipeSemantics[selectedEdge.id]?.conditionLabel ?? ""}
                  onChange={(e) => setPipeSemantics((prev) => ({ ...prev, [selectedEdge.id]: { ...prev[selectedEdge.id], pipeId: selectedEdge.id, routeKind: prev[selectedEdge.id]?.routeKind ?? "default", conditionLabel: e.target.value } }))}
                  placeholder="Condition label (e.g. score > 0.8)"
                />
                <Select
                  value={pipeSemantics[selectedEdge.id]?.routeKind ?? "default"}
                  onChange={(e) => setPipeSemantics((prev) => ({ ...prev, [selectedEdge.id]: { ...prev[selectedEdge.id], pipeId: selectedEdge.id, routeKind: e.target.value as PipeRouteKind } }))}
                >
                  <option value="default">default</option>
                  <option value="success">success</option>
                  <option value="failure">failure</option>
                  <option value="conditional">conditional</option>
                  <option value="loop">loop</option>
                </Select>
                <Textarea
                  value={pipeSemantics[selectedEdge.id]?.notes ?? ""}
                  onChange={(e) => setPipeSemantics((prev) => ({ ...prev, [selectedEdge.id]: { ...prev[selectedEdge.id], pipeId: selectedEdge.id, routeKind: prev[selectedEdge.id]?.routeKind ?? "default", notes: e.target.value } }))}
                  placeholder="Route notes / rationale"
                />
                <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5 mt-1">Hit target: expanded for easier selection and relabeling.</p>
              </Card>
            ) : null}
            {selectedNode ? (
              <Card>
                {occupancy.length > 1 ? <p className="text-xs text-amber-700 bg-amber-50 rounded px-2 py-0.5 mb-2">⚠ Occupied by {occupancy.map((p) => p.name).join(", ")}</p> : null}
                <div className="flex gap-1 flex-wrap border-b border-slate-100 pb-2 mb-3">
                  {(["overview", "inputs", "outputs", "config", "notes", "validation", "docs"] as InspectorTab[]).map((tab) => (
                    <button key={tab} onClick={() => setInspectorTab(tab)}
                      className={`px-2 py-1 text-xs rounded font-medium transition-colors ${inspectorTab === tab ? "bg-indigo-50 text-indigo-700" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}`}>
                      {tab}
                    </button>
                  ))}
                </div>
                {inspectorTab === "overview" ? (
                  <div className="space-y-2">
                    <Input defaultValue={selectedNode.title} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, title: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, title: selectedNode.title })} />
                    <Input defaultValue={selectedNode.description ?? ""} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, description: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, description: selectedNode.description ?? "" })} />
                    <Input value={selectedDefinition?.overview.summary ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, summary: e.target.value } }))} placeholder="Summary" />
                    <Input value={selectedDefinition?.overview.purpose ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, purpose: e.target.value } }))} placeholder="Purpose" />
                    <Input value={selectedDefinition?.overview.owner ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, owner: e.target.value } }))} placeholder="Owner" />
                    <Input value={selectedDefinition?.overview.reviewer ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, reviewer: e.target.value } }))} placeholder="Reviewer" />
                  </div>
                ) : null}
                {inspectorTab === "inputs" && selectedDefinition ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5 mb-2">Schema summary: {summarizeContract(selectedDefinition.input)}</p>
                    <Select value={selectedDefinition.input.portType} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, input: { ...current.input, portType: e.target.value as ContractType } }))}>
                      {["string", "number", "boolean", "json", "event", "file", "any"].map((type) => <option key={type} value={type}>{type}</option>)}
                    </Select>
                    <Textarea value={selectedDefinition.input.summary ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, input: { ...current.input, summary: e.target.value } }))} placeholder="Input contract summary" />
                    <Textarea value={selectedDefinition.input.samplePayload ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, input: { ...current.input, samplePayload: e.target.value } }))} placeholder="Sample payload / shape" />
                    <Button onClick={() => addDefinitionField("input")}>Add Input Field</Button>
                    {selectedDefinition.input.fields.map((field) => (
                      <Card key={field.id}>
                        <Input value={field.key} onChange={(e) => updateDefinitionField("input", field.id, { key: e.target.value })} placeholder="Field key" />
                        <Select value={field.type} onChange={(e) => updateDefinitionField("input", field.id, { type: e.target.value as ContractType })}>
                          {["string", "number", "boolean", "json", "event", "file", "any"].map((type) => <option key={type} value={type}>{type}</option>)}
                        </Select>
                        <label><input type="checkbox" checked={field.required} onChange={(e) => updateDefinitionField("input", field.id, { required: e.target.checked })} /> Required</label>
                        <Input value={field.sourceRef ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { sourceRef: e.target.value })} placeholder="Expected source reference" />
                        <Input value={field.mappingExpr ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { mappingExpr: e.target.value })} placeholder="Mapping / expression placeholder" />
                        <Textarea value={field.transformNotes ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { transformNotes: e.target.value })} placeholder="Transformation notes" />
                        <Button onClick={() => removeDefinitionField("input", field.id)}>Remove Field</Button>
                      </Card>
                    ))}
                  </div>
                ) : null}
                {inspectorTab === "outputs" && selectedDefinition ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5 mb-2">Schema summary: {summarizeContract(selectedDefinition.output)}</p>
                    <Select value={selectedDefinition.output.portType} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, output: { ...current.output, portType: e.target.value as ContractType } }))}>
                      {["string", "number", "boolean", "json", "event", "file", "any"].map((type) => <option key={type} value={type}>{type}</option>)}
                    </Select>
                    <Textarea value={selectedDefinition.output.summary ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, output: { ...current.output, summary: e.target.value } }))} placeholder="Output contract summary" />
                    <Textarea value={selectedDefinition.output.samplePayload ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, output: { ...current.output, samplePayload: e.target.value } }))} placeholder="Sample output payload" />
                    <Button onClick={() => addDefinitionField("output")}>Add Output Field</Button>
                    {selectedDefinition.output.fields.map((field) => (
                      <Card key={field.id}>
                        <Input value={field.key} onChange={(e) => updateDefinitionField("output", field.id, { key: e.target.value })} placeholder="Field key" />
                        <Select value={field.type} onChange={(e) => updateDefinitionField("output", field.id, { type: e.target.value as ContractType })}>
                          {["string", "number", "boolean", "json", "event", "file", "any"].map((type) => <option key={type} value={type}>{type}</option>)}
                        </Select>
                        <label><input type="checkbox" checked={field.required} onChange={(e) => updateDefinitionField("output", field.id, { required: e.target.checked })} /> Required</label>
                        <Input value={field.example ?? ""} onChange={(e) => updateDefinitionField("output", field.id, { example: e.target.value })} placeholder="Example" />
                        <Textarea value={field.description ?? ""} onChange={(e) => updateDefinitionField("output", field.id, { description: e.target.value })} placeholder="Output field description" />
                        <Button onClick={() => removeDefinitionField("output", field.id)}>Remove Field</Button>
                      </Card>
                    ))}
                  </div>
                ) : null}
                {inspectorTab === "config" && selectedDefinition ? (
                  <div className="space-y-4">
                    {(() => {
                      const fields = getConfigSchema(selectedNode.type as NodeType);
                      if (fields.length === 0) return null;
                      return (
                        <div className="space-y-3">
                          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Configuration</p>
                          {fields.map((field) => (
                            <div key={field.key} className="space-y-1">
                              <label className="text-xs font-medium text-slate-600">
                                {field.label}
                                {field.required && <span className="text-red-500 ml-0.5">*</span>}
                              </label>
                              {field.type === "select" ? (
                                <Select
                                  value={String((selectedNode.config?.[field.key] ?? field.defaultValue) ?? "")}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                                >
                                  {field.options?.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </Select>
                              ) : field.type === "boolean" ? (
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(selectedNode.config?.[field.key] ?? field.defaultValue)}
                                    onChange={(e) => updateNodeConfig(selectedNode.id, field.key, e.target.checked)}
                                    className="rounded border-slate-300"
                                  />
                                  <span className="text-xs text-slate-500">{field.description ?? field.label}</span>
                                </div>
                              ) : field.type === "textarea" ? (
                                <Textarea
                                  value={String(selectedNode.config?.[field.key] ?? "")}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, field.key, e.target.value)}
                                  placeholder={field.placeholder}
                                  rows={3}
                                />
                              ) : (
                                <Input
                                  type={field.type === "number" ? "number" : field.type === "url" ? "url" : "text"}
                                  value={String(selectedNode.config?.[field.key] ?? "")}
                                  onChange={(e) => updateNodeConfig(selectedNode.id, field.key, field.type === "number" ? Number(e.target.value) : e.target.value)}
                                  placeholder={field.placeholder}
                                />
                              )}
                              {field.description && field.type !== "boolean" && (
                                <p className="text-[10px] text-slate-400">{field.description}</p>
                              )}
                            </div>
                          ))}
                          <div className="border-t border-slate-100 pt-3" />
                        </div>
                      );
                    })()}
                    <Textarea value={selectedDefinition.configNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, configNotes: e.target.value }))} placeholder="Configuration notes" />
                    <Textarea value={selectedDefinition.mappingNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, mappingNotes: e.target.value }))} placeholder="Field mapping design" />
                    <Textarea value={selectedDefinition.expressionPlaceholders ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, expressionPlaceholders: e.target.value }))} placeholder="Expression placeholders / variables" />
                    <Textarea value={selectedDefinition.expectedSources ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, expectedSources: e.target.value }))} placeholder="Expected input source references" />
                    <Textarea value={selectedDefinition.outputContractNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, outputContractNotes: e.target.value }))} placeholder="Output contract documentation" />
                  </div>
                ) : null}
                {inspectorTab === "notes" && selectedDefinition ? (
                  <div className="space-y-2">
                    <Textarea value={selectedDefinition.overview.assumptions ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, assumptions: e.target.value } }))} placeholder="Assumptions" />
                    <Textarea value={selectedDefinition.overview.failureNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, failureNotes: e.target.value } }))} placeholder="Failure notes" />
                    <Textarea value={selectedDefinition.overview.implementationNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, implementationNotes: e.target.value } }))} placeholder="Implementation notes" />
                    <Textarea value={selectedDefinition.notes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, notes: e.target.value }))} placeholder="General notes" />
                  </div>
                ) : null}
                {inspectorTab === "validation" && selectedDefinition ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Contract validation</h4>
                    {definitionIssues.length === 0 ? <Badge tone="good">No definition issues</Badge> : definitionIssues.map((issue) => <Card key={issue}><ValidationBadge severity="warning" /><p>{issue}</p></Card>)}
                    <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Compatibility hints</h4>
                    {compatibilityHints.length === 0 ? <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">No connected nodes to compare.</p> : compatibilityHints.map((hint, index) => <Card key={`${hint.nodeTitle}_${index}`}><ValidationBadge severity={hint.hint.compatible ? "info" : "warning"} /><p>{hint.direction} · {hint.nodeTitle}: {hint.hint.reason}</p></Card>)}
                  </div>
                ) : null}
                {inspectorTab === "docs" && selectedDefinition ? (
                  <div className="space-y-2">
                    <Input value={selectedDefinition.overview.linkedAsset ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, linkedAsset: e.target.value } }))} placeholder="Linked asset id/url" />
                    <Input value={selectedDefinition.overview.linkedSnippet ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, linkedSnippet: e.target.value } }))} placeholder="Linked snippet id/url" />
                    <Input value={selectedDefinition.overview.docsRef ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, docsRef: e.target.value } }))} placeholder="Docs or reference URL" />
                  </div>
                ) : null}
                <div className="flex items-center gap-2 flex-wrap mt-3">
                  <Button variant="danger-soft" size="sm" onClick={() => {
                    recordAction({ action: "deleteNode", nodeId: selectedNode.id }, { action: "addNode", systemId, type: selectedNode.type, title: selectedNode.title, description: selectedNode.description, x: selectedNode.position.x, y: selectedNode.position.y });
                    setSelectedNodeIds([]);
                  }}><Trash2 size={14} /> Delete Node</Button>
                  <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: "sourcePort", nodeId: selectedNode.id, at: selectedNode.position })}>Add Downstream ⇧O</Button>
                  <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: "targetPort", nodeId: selectedNode.id, at: selectedNode.position })}>Add Upstream ⇧I</Button>
                </div>
              </Card>
            ) : <p className="text-sm text-slate-400 py-2">Select a node to inspect details.</p>}
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Validation</h4>
            <div className="space-y-2">{validationReport.issues.map((issue) => <Card key={issue.id}><ValidationBadge severity={issue.severity} /><p>{issue.message}</p></Card>)}</div>
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Simulation</h4>
            <div className="text-xs text-slate-600 space-y-0.5 mb-2">
              <p>Status: {sim.status}</p>
              <p>Steps: {sim.steps.length}</p>
              <p>Traversed pipes: {tracedEdgeIds.length}</p>
            </div>
            <div className="space-y-2">
              <Card>
                <h5 className="text-xs font-semibold text-slate-600 mb-1">Branch decisions</h5>
                {traceSummary.branchDecisions.length === 0 ? <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">No explicit branch labels in this run.</p> : traceSummary.branchDecisions.map((item) => <p key={item} className="text-xs text-slate-600">{item}</p>)}
              </Card>
              <Card>
                <h5 className="text-xs font-semibold text-slate-600 mb-1">Loop summary</h5>
                {traceSummary.loopSummaries.length === 0 ? <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">No loop revisits detected.</p> : traceSummary.loopSummaries.map((item) => <p key={item} className="text-xs text-slate-600">{item}</p>)}
              </Card>
              <Card>
                <h5 className="text-xs font-semibold text-slate-600 mb-1">Blocked/invalid routes</h5>
                {traceSummary.blocked.length === 0 ? <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">No blocked traces.</p> : traceSummary.blocked.map((item) => <p key={item} className="text-xs text-slate-600">{item}</p>)}
                {invalidPipeIds.length > 0 ? <p className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">Validation errors reference pipes: {invalidPipeIds.join(", ")}</p> : null}
              </Card>
            </div>
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Comments</h4>
            <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add comment" />
            <Button onClick={async () => { await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, body: comment, nodeId: selectedNodeId }) }); setComment(""); reload(); }}>Post Comment</Button>
            <div className="space-y-2 mt-2">{data.comments.map((c) => <CommentBubble key={c.id} author={c.authorId} text={c.body} />)}</div>
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Versions</h4>
            <Input value={versionName} onChange={(e) => setVersionName(e.target.value)} />
            <Button onClick={async () => { await fetch(`/api/systems/${systemId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: versionName }) }); reload(); }}>Save Version</Button>
            <div className="space-y-1 mt-2">{data.versions.map((v) => <div key={v.id} className="flex items-center gap-2"><span className="text-sm text-slate-700">{v.name}</span></div>)}</div>
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">AI Refactor</h4>
            <Input value={aiEditPrompt} onChange={(e) => setAiEditPrompt(e.target.value)} />
            <Button onClick={async () => {
              const suggestionRes = await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, prompt: aiEditPrompt }) });
              const suggestion = await suggestionRes.json();
              if (suggestion.ok) { setPendingSuggestion(suggestion.data); setAcceptedChangeIds((suggestion.data.changes ?? []).map((c: any) => c.id)); }
            }}>Suggest Edits</Button>
            {pendingSuggestion ? <Card>
              <p className="text-sm font-semibold text-slate-800">AI edit set under review</p>
              <p className="text-sm text-slate-600">{pendingSuggestion.summary}</p>
              <p className="text-xs text-slate-500">Assumptions: {(pendingSuggestion.assumptions ?? []).join(" · ")}</p>
              <p className="text-xs text-slate-500">Warnings: {(pendingSuggestion.warnings ?? []).join(" · ")}</p>
              <p className="text-xs text-slate-500">Change count: {(pendingSuggestion.changes ?? []).length}</p>
              <div className="space-y-2 mt-2">
                {(pendingSuggestion.changes ?? []).map((change: any) => (
                  <Card key={change.id}>
                    <label><input type="checkbox" checked={acceptedChangeIds.includes(change.id)} onChange={(e) => setAcceptedChangeIds((prev) => e.target.checked ? [...prev, change.id] : prev.filter((id) => id !== change.id))} /> {change.action} · {change.nodeId ?? change.pipeId ?? change.payload?.title ?? "entity"}</label>
                    <p className="text-xs text-slate-500 mt-1">{change.rationale ?? "No rationale"}</p>
                  </Card>
                ))}
              </div>
              <div className="flex items-center gap-2 flex-wrap mt-3">
                <Button variant="ghost" size="sm" onClick={() => setAcceptedChangeIds((pendingSuggestion.changes ?? []).map((c: any) => c.id))}>Accept all</Button>
                <Button variant="ghost" size="sm" onClick={() => setAcceptedChangeIds([])}>Reject all</Button>
                <Button variant="secondary" size="sm" onClick={async () => {
                  await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apply: true, systemId, suggestion: pendingSuggestion, acceptedChangeIds }) });
                  setPendingSuggestion(null);
                  setAcceptedChangeIds([]);
                  reload();
                }}>Apply Selected Changes</Button>
                <Button variant="ghost" size="sm" onClick={() => { setPendingSuggestion(null); setAcceptedChangeIds([]); }}>Close Review</Button>
              </div>
            </Card> : null}
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Import Merge Review</h4>
            <Input value={importPayload} onChange={(e) => setImportPayload(e.target.value)} placeholder="Paste pipes_schema_v1 JSON" />
            <Button onClick={async () => {
              const res = await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schema: importPayload, mode: "existing", targetSystemId: systemId, preview: true }) });
              const resData = await res.json();
              if (resData.ok) setMergePlan(resData.data);
            }}>Plan Merge</Button>
            {mergePlan?.ok ? <Card>
              <p className="text-sm font-semibold text-slate-800">Import review pending</p>
              <p className="text-xs text-slate-600">Additions: {mergePlan.summary?.additions ?? 0}</p>
              <p className="text-xs text-slate-600">Updates: {mergePlan.summary?.updates ?? 0}</p>
              <p className="text-xs text-slate-600">Conflicts: {mergePlan.summary?.conflicts ?? 0}</p>
              <Input value={mergeStrategy} onChange={(e) => setMergeStrategy(e.target.value as "safe_upsert" | "replace_conflicts")} />
              <Button onClick={async () => {
                await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "existing", applyMerge: true, strategy: mergeStrategy, plan: mergePlan }) });
                setMergePlan(null);
                reload();
              }}>Apply Merge (creates checkpoint)</Button>
            </Card> : null}
            <h4 className="text-sm font-semibold text-slate-700 mt-4 mb-2">Export</h4>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="ghost" size="sm" onClick={() => window.open(`/api/systems/${systemId}/export?format=json`, "_blank")}>Export JSON</Button>
              <Button variant="ghost" size="sm" onClick={() => window.open(`/api/systems/${systemId}/export?format=markdown`, "_blank")}>Export Markdown</Button>
            </div>
          </Panel>
        </EditorErrorBoundary>
        <EditorErrorBoundary area="Agent Chat" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
          <AgentChatPanel
            systemId={systemId}
            systemName={data.system.name}
            systemDescription={data.system.description}
            onPreviewChange={(preview) => setReviewPreviewItems(preview as ReviewPreviewItem[])}
            onRegionFocus={(region) => {
              setReviewRegion(region as ReviewRegion | null);
              if (region?.nodeIds?.length) {
                setSelectedNodeIds(region.nodeIds);
                setFrameRequest((count) => count + 1);
              }
            }}
          />
        </EditorErrorBoundary>
      </div>
      {paletteOpen ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20" onClick={() => setPaletteOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-base font-semibold text-slate-800">Insert Node</h3>
                <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">Context: {insertRequest.mode}</span>
              </div>
              <Input autoFocus value={paletteQuery} onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }} placeholder="Search nodes, tags, or use..." className="w-full" />
            </div>
            <div className="overflow-y-auto max-h-96 divide-y divide-slate-100">
              {paletteResults.map((entry, idx) => (
                <div key={`${entry.nodeType}_${idx}`} className={`p-3 ${idx === paletteIndex ? "bg-indigo-50" : "hover:bg-slate-50"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <strong className="text-sm text-slate-800">{entry.name}</strong>
                    <span className="text-xs text-slate-500 bg-slate-100 rounded px-2 py-0.5">{entry.category}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{entry.description}</p>
                  <p className="text-xs text-slate-400">In: {entry.inputTypes.join(", ")} · Out: {entry.outputTypes.join(", ")}</p>
                  <Button variant="ghost" size="sm" onClick={() => insertNodeFromEntry(entry)} className="mt-1">{idx === paletteIndex ? "Insert ↵" : "Insert"}</Button>
                </div>
              ))}
              {paletteResults.length === 0 ? <p className="p-4 text-sm text-slate-400">No node matches this query.</p> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MockEditorWorkspace({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemPayload | null>(null);
  const load = useCallback(async () => {
    const systemRes = await fetch(`/api/systems/${systemId}`, { cache: "no-store" });
    const systemData = await systemRes.json();
    if (systemData.ok) setData(systemData.data);
  }, [systemId]);

  useEffect(() => {
    void load();
    const interval = setInterval(load, 1500);
    return () => clearInterval(interval);
  }, [load]);

  return <EditorWorkspaceView systemId={systemId} data={data} reload={load} />;
}

function RealEditorWorkspace({ systemId }: { systemId: string }) {
  const bundle = useQuery(api.app.getSystemBundle, { systemId: systemId as never });
  const data = bundle ? normalizeBundle(bundle) : null;
  return <EditorWorkspaceView systemId={systemId} data={data} reload={() => {}} />;
}

export function EditorWorkspace({ systemId }: { systemId: string }) {
  if (!clientRuntimeFlags.useMocks && clientRuntimeFlags.hasConvex) return <RealEditorWorkspace systemId={systemId} />;
  return <MockEditorWorkspace systemId={systemId} />;
}
