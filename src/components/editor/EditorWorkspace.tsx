"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field, SearchInput } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { Tabs } from "@/components/ui/tabs";
import { Kbd } from "@/components/ui/kbd";
import { Tooltip } from "@/components/ui/tooltip";
import { Banner } from "@/components/ui/banner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Boxes, ChevronDown, Copy, Download, LayoutGrid, Plus, ScanSearch, Target, Trash2, Undo2, Waypoints } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { Chord, CheckRow, Fact, ObjectRow, Quiet, SectionLabel, StatusPill, ToolButton, ToolbarRule, severityTone, type Tone } from "@/components/editor/editor-ui";
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
import { AgentStepPanel, type ConnectionsState } from "@/components/editor/AgentStepPanel";
import { useSystemDesign } from "@/components/editor/design_sync";

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
    nodes: bundle.nodes.map((n: any) => ({ id: String(n._id ?? n.id), type: n.type, title: n.title, description: n.description, position: n.position, portIds: n.portIds ?? [] })),
    pipes: bundle.pipes.map((p: any) => ({ id: String(p._id ?? p.id), systemId: String(p.systemId), fromPortId: p.fromPortId, toPortId: p.toPortId, fromNodeId: p.fromNodeId ? String(p.fromNodeId) : undefined, toNodeId: p.toNodeId ? String(p.toNodeId) : undefined })),
    comments: bundle.comments.map((c: any) => ({ id: String(c._id ?? c.id), systemId: String(c.systemId), body: c.body, nodeId: c.nodeId ? String(c.nodeId) : undefined, authorId: String(c.authorId), createdAt: c.createdAt })),
    versions: bundle.versions.map((v: any) => ({ id: String(v._id ?? v.id), name: v.name, authorId: String(v.authorId), createdAt: v.createdAt })),
    presence: (bundle.presence ?? []).map((p: any) => ({ id: String(p._id ?? p.id), name: p.name ?? String(p.userId), selectedNodeId: p.selectedNodeId ? String(p.selectedNodeId) : undefined }))
  };
}

const EMPTY_HISTORY: HistoryState = { undo: [], redo: [] };
const RECENTS_STORAGE_KEY = "pipes_editor_node_recents_v1";
const FAVORITES_STORAGE_KEY = "pipes_editor_node_favorites_v1";

type InsertRequest = { mode: "canvas" | "selectedNode" | "selectedEdge" | "sourcePort" | "targetPort"; at?: { x: number; y: number }; nodeId?: string; edgeId?: string };
type InspectorTab = "overview" | "agent" | "inputs" | "outputs" | "config" | "notes" | "validation" | "docs";
type EditorMode = "design" | "validation" | "simulation" | "versions" | "agent";

const CONTRACT_TYPES: ContractType[] = ["string", "number", "boolean", "json", "event", "file", "any"];
const CONTRACT_OPTIONS = CONTRACT_TYPES.map((type) => ({ value: type, label: type }));
const ROUTE_OPTIONS: Array<{ value: PipeRouteKind; label: string }> = [
  { value: "default", label: "Default" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
  { value: "conditional", label: "Conditional" },
  { value: "loop", label: "Loop" }
];
const INSPECTOR_TABS: Array<{ value: InspectorTab; label: string }> = [
  { value: "overview", label: "Overview" },
  { value: "agent", label: "Agent" },
  { value: "inputs", label: "Inputs" },
  { value: "outputs", label: "Outputs" },
  { value: "config", label: "Config" },
  { value: "notes", label: "Notes" },
  { value: "validation", label: "Checks" },
  { value: "docs", label: "Docs" }
];

/** Keys typed into a field belong to the field, not to the canvas. */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}
type CompatibilityRow = { direction: "inbound" | "outbound"; nodeTitle: string; hint: ReturnType<typeof computeCompatibilityHint> };

function localApply(nodes: GraphNode[], pipes: GraphPipe[], action: EditorGraphAction): { nodes: GraphNode[]; pipes: GraphPipe[] } {
  if (action.action === "addNode") {
    const id = action.clientNodeId ?? `tmp_${Math.random().toString(36).slice(2, 9)}`;
    return { nodes: [...nodes, { id, type: action.type, title: action.title, description: action.description, position: { x: action.x ?? 240, y: action.y ?? 180 }, portIds: [`${id}_in`, `${id}_out`] }], pipes };
  }
  if (action.action === "updateNode") return { nodes: nodes.map((n) => n.id === action.nodeId ? { ...n, title: action.title ?? n.title, description: action.description ?? n.description, position: action.position ?? n.position } : n), pipes };
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
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("overview");
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("left_to_right");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [routeFocusMode, setRouteFocusMode] = useState(false);
  const [reviewPreviewItems, setReviewPreviewItems] = useState<ReviewPreviewItem[]>([]);
  const [reviewRegion, setReviewRegion] = useState<ReviewRegion | null>(null);
  const [mode, setMode] = useState<EditorMode>("design");
  const hydratedRef = useRef(false);
  const router = useRouter();
  // Node definitions, route specs, subsystems and step specs are the system's design document, saved on the server.
  const design = useSystemDesign(systemId);
  const { nodeDefinitions, setNodeDefinitions, pipeSemantics, setPipeSemantics, subsystems, setSubsystems, steps, updateStep } = design;
  const [connections, setConnections] = useState<ConnectionsState | null>(null);
  const [starting, setStarting] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);

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
  // Connections load the first time the Agent tab opens.
  useEffect(() => {
    if (inspectorTab !== "agent" || connections) return;
    setConnections({ status: "loading", items: [] });
    fetch("/api/connections", { cache: "no-store" })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok || !body.ok) throw new Error(body.message ?? "failed");
        setConnections({ status: "ready", items: (body.data ?? []).map((c: any) => ({ id: String(c.id), name: String(c.name ?? c.id), type: String(c.type ?? ""), url: String(c.url ?? "") })) });
      })
      .catch(() => setConnections({ status: "error", items: [] }));
  }, [connections, inspectorTab]);

  const startRun = useCallback(async () => {
    setStarting(true);
    setRunError(null);
    try {
      const res = await fetch(`/api/systems/${systemId}/runs`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({}) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok || !body.data?.runId) throw new Error(body.message ?? body.error ?? "The run could not start.");
      router.push(`/runs/${body.data.runId}`);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "The run could not start.");
      setStarting(false);
    }
  }, [router, systemId]);

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
    () => presentPipes({ baseEdges: flowView.flowEdges, pipes, selectedEdgeIds, tracedEdgeIds, invalidEdgeIds: invalidPipeIds, focusNodeId: routeFocusMode ? selectedNodeId : undefined, semantics: pipeSemantics, nodeDefinitions }).map((edge) => {
      // The canvas paints edges from tokens; it reads the signal from `data.tone`.
      const routeKind = pipeSemantics[edge.id]?.routeKind ?? "default";
      const tone = invalidPipeIds.includes(edge.id) || routeKind === "failure" ? "critical" : routeKind === "success" ? "positive" : tracedEdgeIds.includes(edge.id) ? "traced" : "default";
      return { ...edge, data: { ...(edge.data ?? {}), tone } };
    }),
    [flowView.flowEdges, invalidPipeIds, nodeDefinitions, pipeSemantics, pipes, routeFocusMode, selectedEdgeIds, selectedNodeId, tracedEdgeIds]
  );

  const graphSaveState = deriveSaveState({ queueLength: queue.length, inFlight, failed });
  // The pill covers both the graph queue and the design document.
  const saveState = graphSaveState === "error" || design.status === "error" ? "error"
    : graphSaveState !== "saved" ? graphSaveState
    : design.status === "saving" ? "saving"
    : design.status === "pending" ? "unsaved"
    : "saved";
  const saveLabel = { saved: "Saved", saving: "Saving…", unsaved: "Unsaved changes", sync_delayed: "Sync delayed", error: "Couldn’t save, retrying" }[saveState];

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
  }, [nodes, setNodeDefinitions]);

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

  const createSubsystem = useCallback(() => {
    if (selectedNodeIds.length < 2) return;
    const id = `sub_${Math.random().toString(36).slice(2, 9)}`;
    const name = `Subsystem ${subsystems.length + 1}`;
    setSubsystems((prev) => [...prev, createSubsystemFromSelection({ id, name, nodeIds: selectedNodeIds })]);
  }, [selectedNodeIds, setSubsystems, subsystems.length]);

  const toggleSubsystemCollapse = useCallback((subsystemId: string, collapsed?: boolean) => {
    setSubsystems((prev) => prev.map((item) => item.id === subsystemId ? { ...item, collapsed: collapsed ?? !item.collapsed } : item));
  }, [setSubsystems]);

  const detachSubsystemCopy = useCallback((subsystemId: string) => {
    setSubsystems((prev) => prev.map((item) => item.id === subsystemId ? { ...item, reusableSourceId: undefined } : item));
  }, [setSubsystems]);

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
      const typing = isTypingTarget(e.target);
      if (typing && e.key !== "Escape") return;
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

  // ⌘K inside the editor means "insert a node", not the chassis search. The
  // shell listens on window too, so claim the chord in the capture phase.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id });
    };
    window.addEventListener("keydown", onKey, { capture: true });
    return () => window.removeEventListener("keydown", onKey, { capture: true });
  }, [openInsertPalette, selectedEdge, selectedNode]);

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


  if (!data) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Quiet>Loading system…</Quiet>
      </div>
    );
  }

  const contextualInsert = (): InsertRequest => ({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id });
  const patchSemantics = (pipeId: string, patch: Partial<PipeSemantics>) =>
    setPipeSemantics((prev) => ({ ...prev, [pipeId]: { ...prev[pipeId], pipeId, routeKind: prev[pipeId]?.routeKind ?? "default", ...patch } }));
  const nodeTitle = (id?: string) => nodes.find((n) => n.id === id)?.title ?? id ?? "";
  const saveTone: Tone = saveState === "saved" ? "neutral" : saveState === "error" ? "critical" : "caution";
  const errorCount = validationReport.issues.filter((issue) => issue.severity === "error").length;
  const warningCount = validationReport.issues.filter((issue) => issue.severity === "warning").length;
  const insertContextLabel = (() => {
    if (insertRequest.mode === "selectedEdge") return "Splits the selected pipe and places the node between its ends.";
    if (insertRequest.mode === "selectedNode" || insertRequest.mode === "sourcePort") return `Connects downstream of ${nodeTitle(insertRequest.nodeId)}.`;
    if (insertRequest.mode === "targetPort") return `Connects upstream of ${nodeTitle(insertRequest.nodeId)}.`;
    return "Places the node on the canvas.";
  })();
  const pendingChanges = (pendingSuggestion?.changes ?? []) as any[];

  const modeLabel: Record<EditorMode, string> = { design: "Inspector", validation: "Validation", simulation: "Simulation", versions: "Versions", agent: "Builder agent" };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5 px-6 pb-6 pt-4 md:px-7 lg:px-8 [--editor-h:max(480px,calc(100dvh-228px))]">
      <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="truncate t-title-3 text-ink">{data.system.name}</h1>
          {data.system.description ? <p className="line-clamp-1 t-caption text-ink-3">{data.system.description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {data.presence.length > 0 ? (
            <ul aria-label="People in this system" className="flex items-center">
              {data.presence.map((p) => (
                <li key={p.id} className="-ml-2 first:ml-0">
                  <Tooltip content={p.selectedNodeId ? `${p.name} is on ${nodeTitle(p.selectedNodeId)}` : p.name}>
                    <span className="inline-flex size-[24px] items-center justify-center rounded-full border border-raised bg-selected t-micro text-ink-2 uppercase">
                      {p.name.slice(0, 1)}
                    </span>
                  </Tooltip>
                </li>
              ))}
            </ul>
          ) : null}
          <span aria-live="polite"><StatusPill tone={saveTone}>{saveLabel}</StatusPill></span>
          {saveState === "error" ? <Button size="xs" variant="ghost" onClick={() => { setFailed(0); design.retry(); }}>Retry save</Button> : null}
          <nav aria-label="System" className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost"><Link href={`/systems/${systemId}/runs`}>Runs</Link></Button>
            <Button asChild size="sm" variant="ghost"><Link href={`/systems/${systemId}/triggers`}>Triggers</Link></Button>
            <Button size="sm" variant="primary" loading={starting} onClick={startRun}>Run</Button>
          </nav>
        </div>
      </header>
      {runError ? (
        <Banner role="critical" title="The run did not start" action={<Button size="xs" variant="ghost" onClick={() => setRunError(null)}>Dismiss</Button>}>{runError}</Banner>
      ) : null}

      <div role="toolbar" aria-label="Editor actions" className="flex flex-wrap items-center gap-2 rounded-12 border border-border bg-raised px-3 py-2">
        <ToolButton label="Undo" shortcut={["⌘", "Z"]} onClick={undo} disabled={history.undo.length === 0}><Undo2 aria-hidden="true" /></ToolButton>
        <ToolButton label="Redo" shortcut={["⇧", "⌘", "Z"]} onClick={redo} disabled={history.redo.length === 0}><Undo2 aria-hidden="true" className="-scale-x-100" /></ToolButton>
        <ToolbarRule />
        <Button size="sm" variant="secondary" onClick={() => openInsertPalette(contextualInsert())}>
          <Plus aria-hidden="true" />
          Insert node
          <span className="ml-1 hidden sm:inline-flex"><Chord keys={["⌘", "K"]} /></span>
        </Button>
        <ToolButton label="Duplicate selection" shortcut={["⌘", "D"]} onClick={duplicateSelection} disabled={selectedNodeIds.length === 0}><Copy aria-hidden="true" /></ToolButton>
        <ToolButton label="Delete selection" shortcut={["⌫"]} onClick={deleteSelection} disabled={selectedNodeIds.length === 0 && selectedEdgeIds.length === 0}><Trash2 aria-hidden="true" /></ToolButton>
        <ToolbarRule />
        <ToolButton label="Group into subsystem (select two or more nodes)" onClick={createSubsystem} disabled={selectedNodeIds.length < 2}><Boxes aria-hidden="true" /></ToolButton>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <LayoutGrid aria-hidden="true" />
              Arrange
              <ChevronDown aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[220px]">
            <DropdownMenuLabel>Direction</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={layoutPreset} onValueChange={(value) => setLayoutPreset(value as LayoutPreset)}>
              <DropdownMenuRadioItem value="left_to_right" onSelect={(event) => event.preventDefault()}>Left to right</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="top_to_bottom" onSelect={(event) => event.preventDefault()}>Top to bottom</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={selectedNodeIds.length === 0} onSelect={() => arrangeNodes("selected")}>Arrange selection</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => arrangeNodes("all")}>Arrange whole graph</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ToolbarRule />
        <ToolButton label={routeFocusMode ? "Route focus on" : "Route focus off"} pressed={routeFocusMode} onClick={() => setRouteFocusMode((value) => !value)}><Waypoints aria-hidden="true" /></ToolButton>
        <ToolButton label="Fit content" shortcut={["⌘", "0"]} onClick={() => setFitRequest((n) => n + 1)}><ScanSearch aria-hidden="true" /></ToolButton>
        <ToolButton label="Frame selection" shortcut={["⇧", "F"]} onClick={() => setFrameRequest((n) => n + 1)} disabled={selectedNodeIds.length === 0}><Target aria-hidden="true" /></ToolButton>
        <span className="ml-auto hidden items-center gap-2 t-micro text-ink-3 lg:inline-flex">
          {nodes.length} nodes · {pipes.length} pipes
        </span>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-[256px_minmax(0,1fr)_400px] 2xl:grid-cols-[288px_minmax(0,1fr)_420px]">
        <section aria-label="Node library" className="order-3 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-12 border border-border bg-raised md:h-[520px] xl:order-1 xl:h-[var(--editor-h)]">
          <div className="flex flex-col gap-3 border-b border-hairline px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <h2 className="t-label-caps text-ink">Node library</h2>
              <span className="t-micro tabular-nums text-ink-3">{favorites.length} pinned · {recents.length} recent</span>
            </div>
            <SearchInput value={libraryQuery} onChange={(e) => setLibraryQuery(e.target.value)} onClear={() => setLibraryQuery("")} placeholder="Search nodes, tags, category" aria-label="Search the node library" />
            <button
              type="button"
              onClick={() => openInsertPalette(contextualInsert())}
              className="flex items-center justify-between gap-4 rounded-8 px-2 py-1 text-left t-caption text-ink-3 transition-colors duration-[var(--dur-1)] hover:bg-state-hover hover:text-ink focus-ring outline-none"
            >
              Insert at the selection
              <Kbd>/</Kbd>
            </button>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto px-3 py-4">
            {groupedLibrary.length === 0 ? <Quiet className="px-2">No node matches “{libraryQuery}”.</Quiet> : null}
            {groupedLibrary.map((group) => (
              <div key={group.category} className="flex flex-col gap-1">
                <SectionLabel className="px-2" action={<span className="t-micro tabular-nums text-ink-3">{group.entries.length}</span>}>{group.category}</SectionLabel>
                <ul className="flex flex-col">
                  {group.entries.slice(0, 8).map((entry) => {
                    const pinned = favorites.includes(entry.nodeType);
                    return (
                      <li key={entry.nodeType} className="group relative flex items-start gap-1 rounded-8 hover:bg-state-hover">
                        <button
                          type="button"
                          onClick={() => insertNodeFromEntry(entry, contextualInsert())}
                          className="flex min-w-0 flex-1 flex-col gap-1 rounded-8 px-2 py-3 text-left focus-ring outline-none"
                          aria-label={`Add ${entry.name}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="truncate t-body-medium text-ink">{entry.name}</span>
                            <Plus aria-hidden="true" size={14} className="ml-auto shrink-0 text-ink-3 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100" />
                          </span>
                          <span className="line-clamp-2 t-caption text-ink-3">{entry.description}</span>
                          <span className="truncate t-mono-micro text-ink-3">{entry.inputTypes.join(", ")} → {entry.outputTypes.join(", ")}</span>
                        </button>
                        <Button
                          size="xs"
                          variant="ghost"
                          aria-pressed={pinned}
                          aria-label={pinned ? `Unpin ${entry.name}` : `Pin ${entry.name}`}
                          onClick={() => toggleFavorite(entry.nodeType)}
                          className={cn("mt-2 mr-1", !pinned && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100")}
                        >
                          {pinned ? "Pinned" : "Pin"}
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="flex flex-col gap-3 px-2">
              <SectionLabel>Subsystems</SectionLabel>
              {subsystems.length === 0 ? <Quiet>Select two or more nodes, then group them into a subsystem.</Quiet> : subsystems.map((subsystem) => {
                const boundary = computeSubsystemBoundary(subsystem, pipes);
                return (
                  <ObjectRow key={subsystem.id}>
                    <div className="flex items-center justify-between gap-4">
                      <span className="truncate t-body-medium text-ink">{subsystem.name}</span>
                      <StatusPill tone="neutral">{subsystem.collapsed ? "Collapsed" : "Expanded"}</StatusPill>
                    </div>
                    <span className="t-caption tabular-nums text-ink-3">{subsystem.nodeIds.length} nodes · {boundary.inboundNodeIds.length} in · {boundary.outboundNodeIds.length} out</span>
                    <div className="flex flex-wrap gap-2">
                      <Button size="xs" variant="secondary" onClick={() => toggleSubsystemCollapse(subsystem.id)}>{subsystem.collapsed ? "Expand" : "Collapse"}</Button>
                      <Button size="xs" variant="ghost" onClick={() => { setSelectedNodeIds(subsystem.nodeIds); setFrameRequest((n) => n + 1); }}>Open in context</Button>
                      <Button size="xs" variant="ghost" onClick={() => detachSubsystemCopy(subsystem.id)} disabled={!subsystem.reusableSourceId}>Detach local copy</Button>
                    </div>
                  </ObjectRow>
                );
              })}
            </div>
          </div>
        </section>

        <section aria-label="Canvas" className="order-1 h-[62dvh] min-h-[360px] min-w-0 overflow-hidden rounded-12 border border-border bg-raised md:col-span-2 md:h-[var(--editor-h)] xl:order-2 xl:col-span-1">
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
        </section>

        <section aria-label={modeLabel[mode]} className="order-2 flex min-h-0 min-w-0 flex-col overflow-hidden rounded-12 border border-border bg-raised md:h-[520px] xl:order-3 xl:h-[var(--editor-h)]">
          <Tabs
            value={mode}
            onValueChange={(value) => setMode(value as EditorMode)}
            label="Editor mode"
            className="shrink-0 border-hairline px-4"
            items={[
              { value: "design", label: "Design" },
              { value: "validation", label: "Validation", count: errorCount + warningCount },
              { value: "simulation", label: "Simulation" },
              { value: "versions", label: "Versions" },
              { value: "agent", label: "Agent" }
            ]}
          />
          <div className={cn("flex min-h-0 flex-1 flex-col gap-8 overflow-y-auto px-5 py-5", mode === "agent" && "hidden")}>
            {mode === "design" ? (
              <EditorErrorBoundary area="Inspector" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
                <div className="flex flex-col gap-6">
                  <SectionLabel>Inspector</SectionLabel>
                  {selectedEdge ? (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="t-body-medium text-ink">{nodeTitle(selectedEdge.fromNodeId)} → {nodeTitle(selectedEdge.toNodeId)}</span>
                        <span className="t-mono-micro text-ink-3">{selectedEdge.id}</span>
                      </div>
                      <Field label="Label" htmlFor="pipe-label" hint="Agents choose a route by its label, so name the outcome it stands for.">
                        <Input id="pipe-label" value={pipeSemantics[selectedEdge.id]?.label ?? ""} onChange={(e) => patchSemantics(selectedEdge.id, { label: e.target.value })} placeholder="Approved" />
                      </Field>
                      <Field label="Condition" htmlFor="pipe-condition">
                        <Input id="pipe-condition" value={pipeSemantics[selectedEdge.id]?.conditionLabel ?? ""} onChange={(e) => patchSemantics(selectedEdge.id, { conditionLabel: e.target.value })} placeholder="score > 0.8" className="font-mono" />
                      </Field>
                      <Field label="Route" htmlFor="pipe-route">
                        <Select id="pipe-route" size="sm" value={pipeSemantics[selectedEdge.id]?.routeKind ?? "default"} onValueChange={(value) => patchSemantics(selectedEdge.id, { routeKind: value as PipeRouteKind })} options={ROUTE_OPTIONS} />
                      </Field>
                      <Field label="Notes" htmlFor="pipe-notes">
                        <Textarea id="pipe-notes" value={pipeSemantics[selectedEdge.id]?.notes ?? ""} onChange={(e) => patchSemantics(selectedEdge.id, { notes: e.target.value })} placeholder="Why this route exists" />
                      </Field>
                    </div>
                  ) : null}
                  {selectedNode ? (
                    <div key={selectedNode.id} className="flex flex-col gap-5">
                      <div className="flex flex-col gap-1">
                        <span className="t-title-compact text-ink">{selectedNode.title}</span>
                        <span className="t-mono-micro text-ink-3">{selectedNode.type} · {selectedNode.id}</span>
                      </div>
                      {occupancy.length > 1 ? <Banner role="caution" title="Someone else is here">Also open for {occupancy.map((p) => p.name).join(", ")}. Edits may overlap.</Banner> : null}
                      <div role="group" aria-label="Node section" className="flex flex-wrap gap-1">
                        {INSPECTOR_TABS.map((tab) => (
                          <Button key={tab.value} size="xs" variant="ghost" aria-pressed={inspectorTab === tab.value} onClick={() => setInspectorTab(tab.value)}>{tab.label}</Button>
                        ))}
                      </div>
                      {inspectorTab === "overview" ? (
                        <div className="flex flex-col gap-5">
                          <Field label="Title" htmlFor="node-title">
                            <Input id="node-title" defaultValue={selectedNode.title} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, title: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, title: selectedNode.title })} />
                          </Field>
                          <Field label="Description" htmlFor="node-description">
                            <Input id="node-description" defaultValue={selectedNode.description ?? ""} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, description: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, description: selectedNode.description ?? "" })} />
                          </Field>
                          <Field label="Summary" htmlFor="node-summary">
                            <Input id="node-summary" value={selectedDefinition?.overview.summary ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, summary: e.target.value } }))} />
                          </Field>
                          <Field label="Purpose" htmlFor="node-purpose">
                            <Input id="node-purpose" value={selectedDefinition?.overview.purpose ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, purpose: e.target.value } }))} />
                          </Field>
                          <div className="grid grid-cols-2 gap-4">
                            <Field label="Owner" htmlFor="node-owner">
                              <Input id="node-owner" value={selectedDefinition?.overview.owner ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, owner: e.target.value } }))} />
                            </Field>
                            <Field label="Reviewer" htmlFor="node-reviewer">
                              <Input id="node-reviewer" value={selectedDefinition?.overview.reviewer ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, reviewer: e.target.value } }))} />
                            </Field>
                          </div>
                        </div>
                      ) : null}
                      {inspectorTab === "agent" ? (
                        <AgentStepPanel
                          nodeId={selectedNode.id}
                          nodeType={selectedNode.type}
                          spec={steps[selectedNode.id]}
                          hasLoopRoute={pipes.some((pipe) => pipe.fromNodeId === selectedNode.id && pipeSemantics[pipe.id]?.routeKind === "loop")}
                          connections={connections ?? { status: "loading", items: [] }}
                          onChange={(patch) => updateStep(selectedNode.id, patch)}
                        />
                      ) : null}
                      {(inspectorTab === "inputs" || inspectorTab === "outputs") && selectedDefinition ? (() => {
                        const contract = inspectorTab === "inputs" ? "input" : "output";
                        const def = selectedDefinition[contract];
                        return (
                          <div className="flex flex-col gap-5">
                            <p className="t-mono-micro text-ink-3">{summarizeContract(def)}</p>
                            <Field label="Port type" htmlFor={`${contract}-port`}>
                              <Select id={`${contract}-port`} size="sm" value={def.portType} onValueChange={(value) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, [contract]: { ...current[contract], portType: value as ContractType } }))} options={CONTRACT_OPTIONS} />
                            </Field>
                            <Field label={contract === "input" ? "Input contract" : "Output contract"} htmlFor={`${contract}-summary`}>
                              <Textarea id={`${contract}-summary`} value={def.summary ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, [contract]: { ...current[contract], summary: e.target.value } }))} />
                            </Field>
                            <Field label={contract === "input" ? "Sample payload" : "Sample output"} htmlFor={`${contract}-sample`}>
                              <Textarea id={`${contract}-sample`} className="font-mono" value={def.samplePayload ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, [contract]: { ...current[contract], samplePayload: e.target.value } }))} />
                            </Field>
                            <SectionLabel action={<Button size="xs" variant="secondary" onClick={() => addDefinitionField(contract)}><Plus aria-hidden="true" />Add field</Button>}>Fields</SectionLabel>
                            {def.fields.length === 0 ? <Quiet>No fields yet.</Quiet> : null}
                            {def.fields.map((field) => (
                              <ObjectRow key={field.id} className="gap-4">
                                <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-3">
                                  <Input aria-label="Field key" className="font-mono" value={field.key} onChange={(e) => updateDefinitionField(contract, field.id, { key: e.target.value })} placeholder="field_key" />
                                  <Select aria-label="Field type" size="sm" value={field.type} onValueChange={(value) => updateDefinitionField(contract, field.id, { type: value as ContractType })} options={CONTRACT_OPTIONS} />
                                </div>
                                <CheckRow checked={field.required} onChange={(e) => updateDefinitionField(contract, field.id, { required: e.target.checked })}>Required</CheckRow>
                                {contract === "input" ? (
                                  <>
                                    <Input aria-label="Expected source" value={field.sourceRef ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { sourceRef: e.target.value })} placeholder="Expected source" />
                                    <Input aria-label="Mapping expression" className="font-mono" value={field.mappingExpr ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { mappingExpr: e.target.value })} placeholder="Mapping expression" />
                                    <Textarea aria-label="Transformation notes" value={field.transformNotes ?? ""} onChange={(e) => updateDefinitionField("input", field.id, { transformNotes: e.target.value })} placeholder="Transformation notes" />
                                  </>
                                ) : (
                                  <>
                                    <Input aria-label="Example" className="font-mono" value={field.example ?? ""} onChange={(e) => updateDefinitionField("output", field.id, { example: e.target.value })} placeholder="Example" />
                                    <Textarea aria-label="Field description" value={field.description ?? ""} onChange={(e) => updateDefinitionField("output", field.id, { description: e.target.value })} placeholder="What this field holds" />
                                  </>
                                )}
                                <div><Button size="xs" variant="destructive" onClick={() => removeDefinitionField(contract, field.id)}>Remove field</Button></div>
                              </ObjectRow>
                            ))}
                          </div>
                        );
                      })() : null}
                      {inspectorTab === "config" && selectedDefinition ? (
                        <div className="flex flex-col gap-5">
                          <Field label="Configuration" htmlFor="cfg-notes"><Textarea id="cfg-notes" value={selectedDefinition.configNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, configNotes: e.target.value }))} /></Field>
                          <Field label="Field mapping" htmlFor="cfg-mapping"><Textarea id="cfg-mapping" value={selectedDefinition.mappingNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, mappingNotes: e.target.value }))} /></Field>
                          <Field label="Expression placeholders" htmlFor="cfg-expr"><Textarea id="cfg-expr" className="font-mono" value={selectedDefinition.expressionPlaceholders ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, expressionPlaceholders: e.target.value }))} /></Field>
                          <Field label="Expected input sources" htmlFor="cfg-sources"><Textarea id="cfg-sources" value={selectedDefinition.expectedSources ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, expectedSources: e.target.value }))} /></Field>
                          <Field label="Output contract notes" htmlFor="cfg-output"><Textarea id="cfg-output" value={selectedDefinition.outputContractNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, outputContractNotes: e.target.value }))} /></Field>
                        </div>
                      ) : null}
                      {inspectorTab === "notes" && selectedDefinition ? (
                        <div className="flex flex-col gap-5">
                          <Field label="Assumptions" htmlFor="notes-assumptions"><Textarea id="notes-assumptions" value={selectedDefinition.overview.assumptions ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, assumptions: e.target.value } }))} /></Field>
                          <Field label="Failure modes" htmlFor="notes-failure"><Textarea id="notes-failure" value={selectedDefinition.overview.failureNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, failureNotes: e.target.value } }))} /></Field>
                          <Field label="Implementation" htmlFor="notes-impl"><Textarea id="notes-impl" value={selectedDefinition.overview.implementationNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, implementationNotes: e.target.value } }))} /></Field>
                          <Field label="General notes" htmlFor="notes-general"><Textarea id="notes-general" value={selectedDefinition.notes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, notes: e.target.value }))} /></Field>
                        </div>
                      ) : null}
                      {inspectorTab === "validation" && selectedDefinition ? (
                        <div className="flex flex-col gap-6">
                          <div className="flex flex-col gap-3">
                            <SectionLabel>Contract</SectionLabel>
                            {definitionIssues.length === 0 ? <StatusPill tone="positive">No definition issues</StatusPill> : definitionIssues.map((issue) => (
                              <div key={issue} className="flex items-start gap-3"><StatusPill tone="caution">Warning</StatusPill><p className="t-caption text-ink-2">{issue}</p></div>
                            ))}
                          </div>
                          <div className="flex flex-col gap-3">
                            <SectionLabel>Compatibility</SectionLabel>
                            {compatibilityHints.length === 0 ? <Quiet>No connected nodes to compare.</Quiet> : compatibilityHints.map((hint, index) => (
                              <div key={`${hint.nodeTitle}_${index}`} className="flex items-start gap-3">
                                <StatusPill tone={hint.hint.compatible ? "positive" : "caution"}>{hint.hint.compatible ? "Fits" : "Check"}</StatusPill>
                                <p className="t-caption text-ink-2"><span className="text-ink">{hint.direction === "inbound" ? "From" : "To"} {hint.nodeTitle}.</span> {hint.hint.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {inspectorTab === "docs" && selectedDefinition ? (
                        <div className="flex flex-col gap-5">
                          <Field label="Linked asset" htmlFor="docs-asset"><Input id="docs-asset" className="font-mono" value={selectedDefinition.overview.linkedAsset ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, linkedAsset: e.target.value } }))} placeholder="Asset id or URL" /></Field>
                          <Field label="Linked snippet" htmlFor="docs-snippet"><Input id="docs-snippet" className="font-mono" value={selectedDefinition.overview.linkedSnippet ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, linkedSnippet: e.target.value } }))} placeholder="Snippet id or URL" /></Field>
                          <Field label="Reference" htmlFor="docs-ref"><Input id="docs-ref" className="font-mono" value={selectedDefinition.overview.docsRef ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, overview: { ...current.overview, docsRef: e.target.value } }))} placeholder="Docs URL" /></Field>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-5">
                        <Button size="xs" variant="secondary" onClick={() => openInsertPalette({ mode: "sourcePort", nodeId: selectedNode.id, at: selectedNode.position })}>Add downstream <Chord keys={["⇧", "O"]} /></Button>
                        <Button size="xs" variant="secondary" onClick={() => openInsertPalette({ mode: "targetPort", nodeId: selectedNode.id, at: selectedNode.position })}>Add upstream <Chord keys={["⇧", "I"]} /></Button>
                        <Button size="xs" variant="destructive" className="ml-auto" onClick={() => {
                          recordAction({ action: "deleteNode", nodeId: selectedNode.id }, { action: "addNode", systemId, type: selectedNode.type, title: selectedNode.title, description: selectedNode.description, x: selectedNode.position.x, y: selectedNode.position.y });
                          setSelectedNodeIds([]);
                        }}>Delete node</Button>
                      </div>
                    </div>
                  ) : null}
                  {!selectedNode && !selectedEdge ? (
                    <Quiet>Select a node or a pipe to inspect it. Double-click empty canvas to insert a node there.</Quiet>
                  ) : null}
                </div>
                <div className="flex flex-col gap-4 border-t border-hairline pt-6">
                  <SectionLabel action={<span className="t-micro tabular-nums text-ink-3">{data.comments.length}</span>}>Comments</SectionLabel>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, body: comment, nodeId: selectedNodeId }) });
                      setComment("");
                      reload();
                    }}
                  >
                    <Input aria-label="Comment" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={selectedNode ? `Comment on ${selectedNode.title}` : "Comment on this system"} />
                    <Button size="md" variant="secondary" type="submit">Post</Button>
                  </form>
                  {data.comments.length === 0 ? <Quiet>No comments yet.</Quiet> : (
                    <ul className="flex flex-col divide-y divide-hairline">
                      {data.comments.map((c) => (
                        <li key={c.id} className="flex flex-col gap-1 py-3">
                          <span className="flex items-center gap-2 t-micro text-ink-3"><span className="t-mono-micro">{c.authorId}</span>{c.nodeId ? <span>on {nodeTitle(c.nodeId)}</span> : null}</span>
                          <p className="t-body text-ink">{c.body}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </EditorErrorBoundary>
            ) : null}

            {mode === "validation" ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-2 gap-4 rounded-10 border border-hairline bg-object px-5 py-4">
                  <Fact label="Errors"><span className={errorCount ? "text-critical-text" : undefined}>{errorCount}</span></Fact>
                  <Fact label="Warnings"><span className={warningCount ? "text-caution-text" : undefined}>{warningCount}</span></Fact>
                </div>
                {validationReport.issues.length === 0 ? <Quiet>No issues. Every node and pipe checks out.</Quiet> : (
                  <ul className="flex flex-col divide-y divide-hairline">
                    {validationReport.issues.map((issue) => (
                      <li key={issue.id} className="flex items-start gap-3 py-3">
                        <StatusPill tone={severityTone(issue.severity)} className="capitalize">{issue.severity}</StatusPill>
                        <p className="min-w-0 flex-1 t-caption text-ink-2">{issue.message}</p>
                        {issue.nodeId ? <Button size="xs" variant="ghost" onClick={() => { setSelectedNodeIds([issue.nodeId as string]); setFrameRequest((n) => n + 1); setMode("design"); }}>Show</Button> : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {mode === "simulation" ? (
              <div className="flex flex-col gap-6">
                <div className="grid grid-cols-3 gap-4 rounded-10 border border-hairline bg-object px-5 py-4">
                  <Fact label="Status"><StatusPill tone={sim.status === "success" ? "positive" : sim.status === "error" ? "critical" : "caution"} className="capitalize">{sim.status}</StatusPill></Fact>
                  <Fact label="Steps">{sim.steps.length}</Fact>
                  <Fact label="Pipes traversed">{tracedEdgeIds.length}</Fact>
                </div>
                <div className="flex flex-col gap-3">
                  <SectionLabel>Branch decisions</SectionLabel>
                  {traceSummary.branchDecisions.length === 0 ? <Quiet>No labelled branches in this run.</Quiet> : traceSummary.branchDecisions.map((item) => <p key={item} className="t-mono-micro text-ink-2">{item}</p>)}
                </div>
                <div className="flex flex-col gap-3">
                  <SectionLabel>Loops</SectionLabel>
                  {traceSummary.loopSummaries.length === 0 ? <Quiet>No loop revisits detected.</Quiet> : traceSummary.loopSummaries.map((item) => <p key={item} className="t-caption text-ink-2">{item}</p>)}
                </div>
                <div className="flex flex-col gap-3">
                  <SectionLabel>Blocked or invalid routes</SectionLabel>
                  {traceSummary.blocked.length === 0 ? <Quiet>Nothing blocked the trace.</Quiet> : traceSummary.blocked.map((item) => <p key={item} className="t-caption text-critical-text">{item}</p>)}
                  {invalidPipeIds.length > 0 ? <p className="t-caption text-ink-2">Validation errors on pipes <span className="t-mono-micro">{invalidPipeIds.join(", ")}</span></p> : null}
                </div>
              </div>
            ) : null}

            {mode === "versions" ? (
              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-4">
                  <SectionLabel>Checkpoints</SectionLabel>
                  <form
                    className="flex items-center gap-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      await fetch(`/api/systems/${systemId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: versionName }) });
                      reload();
                    }}
                  >
                    <Input aria-label="Checkpoint name" value={versionName} onChange={(e) => setVersionName(e.target.value)} />
                    <Button size="md" variant="secondary" type="submit">Save</Button>
                  </form>
                  {data.versions.length === 0 ? <Quiet>No checkpoints saved yet.</Quiet> : (
                    <ul className="flex flex-col divide-y divide-hairline">
                      {data.versions.map((v) => (
                        <li key={v.id} className="flex items-center justify-between gap-4 py-3">
                          <span className="truncate t-body-medium text-ink">{v.name}</span>
                          <span className="shrink-0 t-micro tabular-nums text-ink-3">{new Date(v.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="flex flex-col gap-4 border-t border-hairline pt-6">
                  <SectionLabel>Suggested edits</SectionLabel>
                  <Field label="What should change" htmlFor="ai-prompt">
                    <Textarea id="ai-prompt" className="min-h-[72px]" value={aiEditPrompt} onChange={(e) => setAiEditPrompt(e.target.value)} />
                  </Field>
                  <div>
                    <Button size="sm" variant="secondary" onClick={async () => {
                      const suggestionRes = await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, prompt: aiEditPrompt }) });
                      const suggestion = await suggestionRes.json();
                      if (suggestion.ok) { setPendingSuggestion(suggestion.data); setAcceptedChangeIds((suggestion.data.changes ?? []).map((c: any) => c.id)); }
                    }}>Suggest edits</Button>
                  </div>
                  {pendingSuggestion ? (
                    <ObjectRow className="gap-4">
                      <div className="flex items-center justify-between gap-4">
                        <span className="t-body-medium text-ink">Review {pendingChanges.length} changes</span>
                        <StatusPill tone="agent">Proposed</StatusPill>
                      </div>
                      {pendingSuggestion.summary ? <p className="t-caption text-ink-2">{pendingSuggestion.summary}</p> : null}
                      {(pendingSuggestion.assumptions ?? []).length ? <p className="t-caption text-ink-3"><span className="text-ink-2">Assumes</span> {(pendingSuggestion.assumptions ?? []).join(" · ")}</p> : null}
                      {(pendingSuggestion.warnings ?? []).length ? <p className="t-caption text-caution-text">{(pendingSuggestion.warnings ?? []).join(" · ")}</p> : null}
                      <ul className="flex flex-col gap-3">
                        {pendingChanges.map((change: any) => (
                          <li key={change.id}>
                            <CheckRow checked={acceptedChangeIds.includes(change.id)} onChange={(e) => setAcceptedChangeIds((prev) => e.target.checked ? [...prev, change.id] : prev.filter((id) => id !== change.id))}>
                              <span className="block text-ink"><span className="t-mono-micro">{change.action}</span> {change.nodeId ?? change.pipeId ?? change.payload?.title ?? "entity"}</span>
                              <span className="block text-ink-3">{change.rationale ?? "No rationale given."}</span>
                            </CheckRow>
                          </li>
                        ))}
                      </ul>
                      <div className="flex flex-wrap gap-2">
                        <Button size="xs" variant="primary" onClick={async () => {
                          await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apply: true, systemId, suggestion: pendingSuggestion, acceptedChangeIds }) });
                          setPendingSuggestion(null);
                          setAcceptedChangeIds([]);
                          reload();
                        }}>Apply {acceptedChangeIds.length} selected</Button>
                        <Button size="xs" variant="ghost" onClick={() => setAcceptedChangeIds(pendingChanges.map((c: any) => c.id))}>Select all</Button>
                        <Button size="xs" variant="ghost" onClick={() => setAcceptedChangeIds([])}>Clear</Button>
                        <Button size="xs" variant="ghost" onClick={() => { setPendingSuggestion(null); setAcceptedChangeIds([]); }}>Close</Button>
                      </div>
                    </ObjectRow>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 border-t border-hairline pt-6">
                  <SectionLabel>Import and merge</SectionLabel>
                  <Field label="Schema" htmlFor="import-schema" hint="Paste a pipes_schema_v1 export. You review the merge before anything changes.">
                    <Textarea id="import-schema" className="min-h-[72px] font-mono" value={importPayload} onChange={(e) => setImportPayload(e.target.value)} placeholder="{ … }" />
                  </Field>
                  <div>
                    <Button size="sm" variant="secondary" disabled={!importPayload.trim()} onClick={async () => {
                      const res = await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schema: importPayload, mode: "existing", targetSystemId: systemId, preview: true }) });
                      const resData = await res.json();
                      if (resData.ok) setMergePlan(resData.data);
                    }}>Plan merge</Button>
                  </div>
                  {mergePlan?.ok ? (
                    <ObjectRow className="gap-4">
                      <div className="grid grid-cols-3 gap-4">
                        <Fact label="Additions">{mergePlan.summary?.additions ?? 0}</Fact>
                        <Fact label="Updates">{mergePlan.summary?.updates ?? 0}</Fact>
                        <Fact label="Conflicts"><span className={(mergePlan.summary?.conflicts ?? 0) > 0 ? "text-critical-text" : undefined}>{mergePlan.summary?.conflicts ?? 0}</span></Fact>
                      </div>
                      <Segmented
                        size="sm"
                        label="Merge strategy"
                        value={mergeStrategy}
                        onValueChange={setMergeStrategy}
                        options={[{ value: "safe_upsert", label: "Keep existing" }, { value: "replace_conflicts", label: "Replace conflicts" }]}
                      />
                      <div>
                        <Button size="xs" variant="primary" onClick={async () => {
                          await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "existing", applyMerge: true, strategy: mergeStrategy, plan: mergePlan }) });
                          setMergePlan(null);
                          reload();
                        }}>Apply merge</Button>
                      </div>
                      <Quiet>A checkpoint is saved before the merge applies.</Quiet>
                    </ObjectRow>
                  ) : null}
                </div>

                <div className="flex flex-col gap-4 border-t border-hairline pt-6">
                  <SectionLabel>Export</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" onClick={() => window.open(`/api/systems/${systemId}/export?format=json`, "_blank")}><Download aria-hidden="true" />JSON</Button>
                    <Button size="sm" variant="secondary" onClick={() => window.open(`/api/systems/${systemId}/export?format=markdown`, "_blank")}><Download aria-hidden="true" />Markdown</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          {/* The agent stays mounted while hidden so a streaming run survives a mode switch. */}
          <div className={cn("flex min-h-0 flex-1 flex-col overflow-y-auto", mode !== "agent" && "hidden")}>
            <EditorErrorBoundary area="Agent chat" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
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
        </section>
      </div>

      <Dialog open={paletteOpen} onOpenChange={setPaletteOpen}>
        <DialogContent size="form" className="top-[12vh] translate-y-0">
          <DialogHeader>
            <DialogTitle>Insert node</DialogTitle>
            <DialogDescription>{insertContextLabel}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 p-6">
            <Input autoFocus aria-label="Search nodes" value={paletteQuery} onChange={(e) => { setPaletteQuery(e.target.value); setPaletteIndex(0); }} placeholder="Search nodes, tags or use" />
            <ul role="listbox" aria-label="Matching nodes" className="flex max-h-[360px] flex-col gap-1 overflow-y-auto">
              {paletteResults.map((entry, idx) => (
                <li key={`${entry.nodeType}_${idx}`} role="option" aria-selected={idx === paletteIndex}>
                  <button
                    type="button"
                    onClick={() => insertNodeFromEntry(entry)}
                    onMouseMove={() => { if (idx !== paletteIndex) setPaletteIndex(idx); }}
                    className={cn(
                      "flex w-full items-start gap-4 rounded-8 px-4 py-3 text-left outline-none focus-ring",
                      idx === paletteIndex ? "bg-state-selected" : "hover:bg-state-hover"
                    )}
                  >
                    <span className="flex min-w-0 flex-1 flex-col gap-1">
                      <span className="flex items-baseline gap-3">
                        <span className="truncate t-body-medium text-ink">{entry.name}</span>
                        <span className="shrink-0 t-micro text-ink-3">{entry.category}</span>
                      </span>
                      <span className="line-clamp-1 t-caption text-ink-3">{entry.description}</span>
                      <span className="truncate t-mono-micro text-ink-3">{entry.inputTypes.join(", ")} → {entry.outputTypes.join(", ")}</span>
                    </span>
                    {idx === paletteIndex ? <Kbd className="mt-1">↵</Kbd> : null}
                  </button>
                </li>
              ))}
              {paletteResults.length === 0 ? <li><Quiet className="px-4 py-3">No node matches this search.</Quiet></li> : null}
            </ul>
            <p className="flex flex-wrap items-center gap-4 t-micro text-ink-3">
              <span className="inline-flex items-center gap-2"><Chord keys={["↑", "↓"]} />move</span>
              <span className="inline-flex items-center gap-2"><Kbd>↵</Kbd>insert</span>
              <span className="inline-flex items-center gap-2"><Kbd>esc</Kbd>close</span>
            </p>
          </div>
        </DialogContent>
      </Dialog>
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
