"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AvatarStack, Badge, Button, Card, CommentBubble, Dialog, Input, Panel, Textarea, Select, Tooltip, ValidationBadge } from "@/components/ui";
import { Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, Separator, Spinner } from "@heroui/react";
import { BarChart2, Bot, Boxes, ChevronLeft, ChevronRight, Copy, Download, History, Layers, Link2, Maximize2, MessageCircle, MoreHorizontal, Play, Plus, Redo2, Settings, Shield, Star, Trash2, Undo2, Wand2, X, Zap } from "lucide-react";
import { ConnectAgentModal } from "@/components/editor/ConnectAgentModal";
import { EditorTutorial } from "@/components/editor/EditorTutorial";
import { getTutorialSeen } from "@/lib/feedback/storage";
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
import { AgentConnectPanel } from "@/components/editor/AgentConnectPanel";
import { ConversationDrawer } from "@/components/editor/ConversationDrawer";
import { TurnDiffDialog } from "@/components/editor/TurnDiffDialog";
import type { TurnRailEntry } from "@/components/editor/TurnHistoryRail";
import { triggerOpenInClaude } from "@/lib/agent/open-in-claude";
import { getConfigSchema } from "@/domain/node_config/schema";
import type { NodeType } from "@/domain/looper_schema_v1/schema";
import { register as registerShortcut } from "@/lib/keyboard/registry";
import { PortAffordance, type PortAffordanceData } from "@/components/editor/PortAffordance";
import { LoopProposalBanner } from "@/components/editor/LoopProposalBanner";
import { SimulationTelemetryCard } from "@/components/editor/SimulationTelemetryCard";
import { publish as publishPaletteItems, clear as clearPaletteScope } from "@/lib/palette/registry";
import type { CommandItem } from "@/components/editor/CommandPalette";
import { LoopVisibilityToggle } from "@/components/editor/LoopVisibilityToggle";
import { LoopUpgradeGate } from "@/components/editor/LoopUpgradeGate";
import { PublishToMarketplaceModal } from "@/components/editor/PublishToMarketplaceModal";
import { getEntitlements } from "@/domain/templates/plans";
import { toast } from "sonner";

type SystemPayload = {
  system: { id: string; name: string; description: string; visibility?: "public" | "private" };
  nodes: GraphNode[];
  pipes: GraphPipe[];
  comments: Array<{ id: string; body: string; nodeId?: string; authorId: string; authorName?: string; createdAt: string }>;
  versions: Array<{ id: string; name: string; authorId: string; createdAt: string; nodeCount?: number; nodeTypes?: string[] }>;
  presence: Array<{ id: string; name: string; selectedNodeId?: string }>;
  entitlements?: { privateLoops: boolean; marketplaceSelling: boolean; mcpReadWrite: boolean; aiGeneration: boolean; versionHistory: boolean; loopAnalytics: boolean };
};

type QueuedAction = { action: EditorGraphAction; id: string; retries: number; turnId?: string };
type ReviewPreviewItem = { diffId: string; entityType: string; entityId: string; changeType: string; previewKind: string; emphasis: "pending_review" | "selected_preview" | "applied"; x?: number; y?: number };
type ReviewRegion = { batchId: string; runId: string; nodeIds: string[]; pipeIds: string[]; subsystemIds: string[]; status: "pending_review" | "applied" };

function normalizeBundle(bundle: any): SystemPayload {
  // Convex path returns `plan` instead of `entitlements`; compute them here.
  const entitlements = bundle.entitlements ?? (bundle.plan ? (() => {
    const e = getEntitlements(bundle.plan);
    return { privateLoops: e.privateLoops, marketplaceSelling: e.marketplaceSelling, mcpReadWrite: e.mcpReadWrite, aiGeneration: e.aiGeneration, versionHistory: e.versionHistory, loopAnalytics: e.loopAnalytics };
  })() : undefined);
  return {
    system: { id: String(bundle.system._id ?? bundle.system.id), name: bundle.system.name, description: bundle.system.description, visibility: bundle.system.visibility },
    nodes: bundle.nodes.map((n: any) => ({ id: String(n._id ?? n.id), type: n.type, title: n.title, description: n.description, position: n.position, portIds: n.portIds ?? [], config: n.config ?? {} })),
    pipes: bundle.pipes.map((p: any) => ({ id: String(p._id ?? p.id), systemId: String(p.systemId), fromPortId: p.fromPortId, toPortId: p.toPortId, fromNodeId: p.fromNodeId ? String(p.fromNodeId) : undefined, toNodeId: p.toNodeId ? String(p.toNodeId) : undefined })),
    comments: bundle.comments.map((c: any) => ({ id: String(c._id ?? c.id), systemId: String(c.systemId), body: c.body, nodeId: c.nodeId ? String(c.nodeId) : undefined, authorId: String(c.authorId), authorName: c.authorName ?? undefined, createdAt: c.createdAt })),
    versions: bundle.versions.map((v: any) => {
      let nodeCount: number | undefined;
      let nodeTypes: string[] | undefined;
      if (v.snapshot) {
        try {
          const snap = JSON.parse(v.snapshot) as { nodes?: Array<{ type?: string }> };
          if (Array.isArray(snap.nodes)) {
            nodeCount = snap.nodes.length;
            const seen = new Set<string>();
            const types: string[] = [];
            for (const n of snap.nodes) { if (n.type && !seen.has(n.type)) { seen.add(n.type); types.push(n.type); } }
            nodeTypes = types.slice(0, 5);
          }
        } catch { /* snapshot parse failure is non-fatal */ }
      }
      return { id: String(v._id ?? v.id), name: v.name, authorId: String(v.authorId), createdAt: v.createdAt, nodeCount, nodeTypes };
    }),
    presence: (bundle.presence ?? []).map((p: any) => ({ id: String(p._id ?? p.id), name: p.name ?? String(p.userId), selectedNodeId: p.selectedNodeId ? String(p.selectedNodeId) : undefined })),
    entitlements,
  };
}

const EMPTY_HISTORY: HistoryState = { undo: [], redo: [] };
const RECENTS_STORAGE_KEY = "pipes_editor_node_recents_v1";
const FAVORITES_STORAGE_KEY = "pipes_editor_node_favorites_v1";
const NODE_DEFINITIONS_PREFIX = "pipes_node_definitions_v1_";
const SUBSYSTEMS_PREFIX = "pipes_subsystems_v1_";
const PIPE_SEMANTICS_PREFIX = "pipes_pipe_semantics_v1_";

type InsertRequest = { mode: "canvas" | "selectedNode" | "selectedEdge" | "sourcePort" | "targetPort"; at?: { x: number; y: number }; nodeId?: string; edgeId?: string };
type InspectorTab = "config" | "advanced";
type SystemPanel = "validation" | "simulation" | "comments" | "versions" | "ai" | "import" | "agent" | "settings" | "analytics";
type CompatibilityRow = { direction: "inbound" | "outbound"; nodeTitle: string; hint: ReturnType<typeof computeCompatibilityHint> };

// Best-effort inverse for a composite turn. Reverses the action list and
// emits a server-friendly inverse for each action so the optimistic queue
// can flush a state that matches the snapshot we just restored. For undo of
// a turn that ADDED stuff, this is mostly delete actions; for a turn that
// DELETED stuff, the snapshot's nodes/pipes are already authoritative
// locally and the inverse becomes a recreate.
function computeInverseFromComposite(entry: { forward: EditorGraphAction[]; priorNodes?: GraphNode[]; priorPipes?: GraphPipe[] }): EditorGraphAction[] {
  const out: EditorGraphAction[] = [];
  const reversed = [...entry.forward].reverse();
  for (const a of reversed) {
    if (a.action === "addNode" && a.clientNodeId) {
      out.push({ action: "deleteNode", nodeId: a.clientNodeId });
    } else if (a.action === "addPipe" && a.clientPipeId) {
      out.push({ action: "deletePipe", pipeId: a.clientPipeId });
    } else if (a.action === "deleteNode") {
      const prior = (entry.priorNodes ?? []).find((n) => n.id === a.nodeId);
      if (prior) out.push({ action: "addNode", systemId: "", type: prior.type, title: prior.title, description: prior.description, x: prior.position.x, y: prior.position.y, clientNodeId: prior.id });
    } else if (a.action === "deletePipe") {
      const prior = (entry.priorPipes ?? []).find((p) => p.id === a.pipeId);
      if (prior?.fromNodeId && prior.toNodeId) out.push({ action: "addPipe", systemId: prior.systemId, fromNodeId: prior.fromNodeId, toNodeId: prior.toNodeId, clientPipeId: prior.id });
    } else if (a.action === "updateNode") {
      const prior = (entry.priorNodes ?? []).find((n) => n.id === a.nodeId);
      if (prior) out.push({ action: "updateNode", nodeId: a.nodeId, title: prior.title, description: prior.description, position: prior.position, config: prior.config });
    }
  }
  return out;
}

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

function EditorWorkspaceView({ systemId, data, notFound, reload, initialPrompt }: { systemId: string; data: SystemPayload | null; notFound?: boolean; reload: () => void; initialPrompt?: string }) {
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [comment, setComment] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [versionName, setVersionName] = useState("checkpoint");
  const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);
  const [savingCheckpoint, setSavingCheckpoint] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
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
  // The node id the agent's most recent tool_call references. Threaded into
  // the canvas so the matching node renders with a pulsing indigo ring.
  const [agentTargetNodeId, setAgentTargetNodeId] = useState<string | null>(null);
  const [nodeDefinitions, setNodeDefinitions] = useState<Record<string, NodeDefinition>>({});
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>("config");
  const [subsystems, setSubsystems] = useState<Subsystem[]>([]);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("left_to_right");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pipeSemantics, setPipeSemantics] = useState<Record<string, PipeSemantics>>({});
  const [routeFocusMode, setRouteFocusMode] = useState(false);
  const [reviewPreviewItems, setReviewPreviewItems] = useState<ReviewPreviewItem[]>([]);
  const [reviewRegion, setReviewRegion] = useState<ReviewRegion | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [activeSystemPanel, setActiveSystemPanel] = useState<SystemPanel | null>(null);
  const [agentViewJson, setAgentViewJson] = useState<string | null>(null);
  const [agentViewLoading, setAgentViewLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{ nodeCount: number; pipeCount: number; versionCount: number; recentBuildCount: number; nodesByType: Record<string, number>; createdAt: string; updatedAt: string } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showNewBanner, setShowNewBanner] = useState(false);
  const [promptFocusSignal, setPromptFocusSignal] = useState(0);
  const [libraryExpanded, setLibraryExpanded] = useState(false);
  const [showAllInspectorTabs, setShowAllInspectorTabs] = useState(false);
  const [leftPaneOpen, setLeftPaneOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [portAffordance, setPortAffordance] = useState<{ anchor: { x: number; y: number }; port: PortAffordanceData } | null>(null);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [metadataDialogOpen, setMetadataDialogOpen] = useState(false);
  const [renamingSystem, setRenamingSystem] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [descriptionDraft, setDescriptionDraft] = useState("");
  // Tutorial-related state. `tutorialSeen` is hydrated from localStorage on
  // first mount; `tutorialPromptStarted` flips the moment the user types in
  // the conversation input; `tutorialAgentViewSeen` flips when the user opens
  // the Agent View panel.
  const [tutorialSeen, setTutorialSeenState] = useState<boolean>(true);
  const [tutorialPromptStarted, setTutorialPromptStarted] = useState<boolean>(false);
  const [tutorialLeftPaneOpened, setTutorialLeftPaneOpened] = useState<boolean>(false);
  const [tutorialAgentViewSeen, setTutorialAgentViewSeen] = useState<boolean>(false);
  const hydratedRef = useRef(false);

  const trackSignal = useCallback(async (event: string, metadata?: Record<string, unknown>) => {
    await fetch("/api/editor/signal", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ event, metadata }) });
  }, []);

  const commitRename = useCallback(async () => {
    const name = renameValue.trim();
    setRenamingSystem(false);
    if (!name || name === data?.system.name) return;
    try {
      const res = await fetch(`/api/systems/${systemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      reload();
      toast.success(`Renamed to "${name}"`);
    } catch (err) {
      setRenameValue(data?.system.name ?? "");
      toast.error(err instanceof Error ? err.message : "Failed to rename loop");
    }
  }, [renameValue, data?.system.name, systemId, reload]);

  const commitDescription = useCallback(async () => {
    setEditingDescription(false);
    if (descriptionDraft === (data?.system.description ?? "")) return;
    try {
      const res = await fetch(`/api/systems/${systemId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ description: descriptionDraft.trim() }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      reload();
      toast.success("Description saved");
    } catch (err) {
      setDescriptionDraft(data?.system.description ?? "");
      toast.error(err instanceof Error ? err.message : "Failed to save description");
    }
  }, [descriptionDraft, data?.system.description, systemId, reload]);

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
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("new") === "1") {
      setShowNewBanner(true);
    }
  }, []);

  // Auto-enter rename mode when arriving from "New System" so the user's
  // first action is naming the loop rather than seeing "Untitled System".
  useEffect(() => {
    if (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("rename") === "1" && data?.system.name) {
      setRenameValue(data.system.name);
      setRenamingSystem(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("rename");
      window.history.replaceState(null, "", url.toString());
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.system.name]);

  // Hydrate the tutorial seen flag once on the client. Default of `true`
  // keeps the tutorial hidden during SSR and the first render so we never
  // flash a tutorial overlay for returning users.
  useEffect(() => {
    setTutorialSeenState(getTutorialSeen());
  }, []);

  // Track left-pane opens so the third tutorial pill auto-dismisses when the
  // user expands the rail.
  useEffect(() => {
    if (leftPaneOpen) setTutorialLeftPaneOpened(true);
  }, [leftPaneOpen]);

  // Track Agent View opens so the second tutorial pill auto-dismisses when
  // the user reaches that surface.
  useEffect(() => {
    if (activeSystemPanel === "agent") setTutorialAgentViewSeen(true);
  }, [activeSystemPanel]);

  useEffect(() => {
    if (activeSystemPanel !== "agent") return;
    if (agentViewJson !== null) return;
    setAgentViewLoading(true);
    fetch(`/api/systems/${systemId}/export?format=json`)
      .then((r) => r.json())
      .then((body) => setAgentViewJson(JSON.stringify(body, null, 2)))
      .catch(() => setAgentViewJson("// Failed to load"))
      .finally(() => setAgentViewLoading(false));
  }, [activeSystemPanel, agentViewJson, systemId]);

  useEffect(() => {
    if (activeSystemPanel !== "analytics") return;
    setAnalyticsLoading(true);
    fetch(`/api/systems/${systemId}/analytics`)
      .then((r) => r.json())
      .then((body) => setAnalyticsData(body.data ?? null))
      .catch(() => setAnalyticsData(null))
      .finally(() => setAnalyticsLoading(false));
  }, [activeSystemPanel, systemId]);

  useEffect(() => {
    fetch("/api/presence", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, selectedNodeId: selectedNodeIds[0] }) });
  }, [selectedNodeIds, systemId]);

  useEffect(() => {
    if (inFlight || queue.length === 0) return;
    const next = queue[0];
    setInFlight(true);
    // Stamp the target system onto every action so the server can verify the
    // caller owns it (and that the node/pipe lives in it) before mutating.
    fetch("/api/graph", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...next.action, systemId }) })
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
  }, [inFlight, queue, trackSignal, systemId]);

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

  // userInteractedAtRef tracks the last manual edit timestamp. The agent hook
  // polls it to detect "user took over mid-build" and aborts the SSE stream.
  // Bumped on every manual `enqueue` call. Agent-driven applies use
  // `enqueueFromAgent` which does NOT bump it.
  const userInteractedAtRef = useRef<number>(0);

  // Refs that mirror the latest committed nodes/pipes. Lets the agent path
  // compute applies without depending on stale closures. Updated by an effect
  // below.
  const nodesRef = useRef<GraphNode[]>(nodes);
  const pipesRef = useRef<GraphPipe[]>(pipes);
  const subsystemsRef = useRef<Subsystem[]>(subsystems);
  const nodeDefinitionsRef = useRef<Record<string, NodeDefinition>>(nodeDefinitions);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);
  useEffect(() => { pipesRef.current = pipes; }, [pipes]);
  useEffect(() => { subsystemsRef.current = subsystems; }, [subsystems]);
  useEffect(() => { nodeDefinitionsRef.current = nodeDefinitions; }, [nodeDefinitions]);

  const enqueue = useCallback((action: EditorGraphAction) => {
    userInteractedAtRef.current = Date.now();
    const applied = localApply(nodesRef.current, pipesRef.current, action);
    nodesRef.current = applied.nodes;
    pipesRef.current = applied.pipes;
    setNodes(applied.nodes);
    setPipes(applied.pipes);
    setQueue((prev) => [...prev, { action, id: crypto.randomUUID(), retries: 0 }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recordAction = useCallback((forward: EditorGraphAction, inverse: EditorGraphAction, coalesceKey?: string) => {
    enqueue(forward);
    setHistory((h) => pushHistory(h, { forward: [forward], inverse: [inverse], coalesceKey, at: Date.now() }));
  }, [enqueue]);

  // Per-turn snapshot store for composite history entries. Keyed by turnId so
  // overlapping or out-of-order begin/end calls cannot leak state.
  const turnSnapshotsRef = useRef<Record<string, { nodes: GraphNode[]; pipes: GraphPipe[]; actions: EditorGraphAction[] }>>({});

  const agentBeginTurn = useCallback((turnId: string) => {
    // Snapshot pre-turn nodes and pipes from the freshest committed refs.
    turnSnapshotsRef.current[turnId] = {
      nodes: nodesRef.current,
      pipes: pipesRef.current,
      actions: [],
    };
  }, []);

  // The agent path: applies the action locally and queues it for flush, but
  // does NOT bump userInteractedAtRef and does NOT push a per-action history
  // entry. The composite history entry is pushed once on agentEndTurn.
  const agentApply = useCallback((action: EditorGraphAction, turnId: string) => {
    const snap = turnSnapshotsRef.current[turnId];
    if (snap) snap.actions.push(action);
    const applied = localApply(nodesRef.current, pipesRef.current, action);
    nodesRef.current = applied.nodes;
    pipesRef.current = applied.pipes;
    setNodes(applied.nodes);
    setPipes(applied.pipes);
    setQueue((prev) => [...prev, { action, id: crypto.randomUUID(), retries: 0, turnId }]);
  }, []);

  // Ordered list of completed turns surfaced to the conversation drawer's
  // rail and the turn diff dialog. Each entry captures the canvas snapshot
  // before and after the turn ran.
  type CompletedTurn = {
    turnId: string;
    index: number;
    prompt: string;
    prior: { nodes: GraphNode[]; pipes: GraphPipe[] };
    post: { nodes: GraphNode[]; pipes: GraphPipe[] };
    completedAt: number;
  };
  const [completedTurns, setCompletedTurns] = useState<CompletedTurn[]>([]);
  const [activeTurnId, setActiveTurnId] = useState<string | undefined>();
  const [diffTurnId, setDiffTurnId] = useState<string | null>(null);

  const agentEndTurn = useCallback((turnId: string) => {
    const snap = turnSnapshotsRef.current[turnId];
    if (!snap) return;
    delete turnSnapshotsRef.current[turnId];
    // Skip the composite entry if the turn produced no graph changes.
    if (snap.actions.length === 0) return;
    const priorNodes = snap.nodes;
    const priorPipes = snap.pipes;
    const postNodes = nodesRef.current;
    const postPipes = pipesRef.current;
    setHistory((h) => pushHistory(h, {
      kind: "composite",
      turnId,
      forward: snap.actions,
      inverse: [],
      priorNodes,
      priorPipes,
      postNodes,
      postPipes,
      at: Date.now(),
    }));
    setCompletedTurns((prev) => {
      if (prev.some((t) => t.turnId === turnId)) return prev;
      return [
        ...prev,
        {
          turnId,
          index: prev.length + 1,
          prompt: "",
          prior: { nodes: priorNodes, pipes: priorPipes },
          post: { nodes: postNodes, pipes: postPipes },
          completedAt: Date.now(),
        },
      ];
    });
    setActiveTurnId(turnId);
  }, []);

  const agentApplyContext = useMemo(() => ({
    applyAction: agentApply,
    beginTurn: agentBeginTurn,
    endTurn: agentEndTurn,
    userInteractedAt: userInteractedAtRef,
  }), [agentApply, agentBeginTurn, agentEndTurn]);

  const handleTurnCompleted = useCallback((turnId: string, prompt: string) => {
    setCompletedTurns((prev) =>
      prev.map((t) => (t.turnId === turnId ? { ...t, prompt } : t)),
    );
  }, []);

  // Restore the canvas state to a previous turn's post snapshot.
  const jumpToTurn = useCallback((turnId: string) => {
    setCompletedTurns((prev) => {
      const turn = prev.find((t) => t.turnId === turnId);
      if (!turn) return prev;
      nodesRef.current = turn.post.nodes;
      pipesRef.current = turn.post.pipes;
      setNodes(turn.post.nodes);
      setPipes(turn.post.pipes);
      return prev;
    });
    setActiveTurnId(turnId);
  }, []);

  // When the user starts a new prompt while focused on an older turn, drop
  // every turn after the active one. Simple v1 model — no branching.
  const dropFutureTurnsIfBranching = useCallback(() => {
    setCompletedTurns((prev) => {
      if (!activeTurnId) return prev;
      const idx = prev.findIndex((t) => t.turnId === activeTurnId);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const dropped = prev.length - 1 - idx;
      if (dropped > 0) {
        void fetch("/api/editor/signal", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ event: "turn_future_discarded", metadata: { count: dropped } }),
        }).catch(() => {});
      }
      return prev.slice(0, idx + 1);
    });
  }, [activeTurnId]);

  // Show the "See what agents see" banner the first time the AI builds nodes
  // so users know to connect their freshly-built loop to an agent.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (completedTurns.length === 1 && nodes.length > 0 && !showNewBanner) {
      setShowNewBanner(true);
    }
  }, [completedTurns.length, nodes.length]);

  const deferredNodes = useDeferredValue(nodes);
  const deferredPipes = useDeferredValue(pipes);

  const flowView = useMemo(() => collapseAwareGraph({ nodes: deferredNodes, pipes: deferredPipes, subsystems, compactMode: zoomLevel < 0.5 }), [deferredNodes, deferredPipes, subsystems, zoomLevel]);

  const selectedNodeId = selectedNodeIds[0];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setShowAllInspectorTabs(false); setInspectorTab("config"); }, [selectedNodeId]);
  // Auto-open the inspector when a single node is selected; auto-close when selection clears.
  useEffect(() => {
    if (selectedNodeIds.length === 1) setInspectorOpen(true);
    else if (selectedNodeIds.length === 0 && selectedEdgeIds.length === 0) setInspectorOpen(false);
  }, [selectedNodeIds, selectedEdgeIds]);
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
    if (entry.kind === "composite" && entry.priorNodes && entry.priorPipes) {
      // Composite undo: restore the pre-turn snapshot in one shot. The
      // optimistic queue is also rebuilt from the inverse — emit a delete for
      // every node added during the turn so the server flush converges with
      // the local snapshot. Simpler: clear the affected actions from the
      // pending queue and let the snapshot win locally; the persisted state
      // stays consistent because each forward action was already flushed.
      const compositeActions = new Set((entry.forward ?? []));
      const turnId = entry.turnId;
      if (turnId) setQueue((q) => q.filter((item) => item.turnId !== turnId));
      // Emit inverse server actions so persistence matches the snapshot.
      const inverseActions = computeInverseFromComposite(entry);
      nodesRef.current = entry.priorNodes;
      pipesRef.current = entry.priorPipes;
      setNodes(entry.priorNodes);
      setPipes(entry.priorPipes);
      setQueue((prev) => [
        ...prev,
        ...inverseActions.map((action) => ({ action, id: crypto.randomUUID(), retries: 0 })),
      ]);
      trackSignal("undo_used", { count: compositeActions.size, kind: "composite" });
      return;
    }
    for (const action of entry.inverse) enqueue(action);
    trackSignal("undo_used", { count: entry.inverse.length });
  }, [enqueue, history, trackSignal]);

  const redo = useCallback(() => {
    const { entry, state } = popRedo(history);
    if (!entry) return;
    setHistory(state);
    if (entry.kind === "composite" && entry.postNodes && entry.postPipes) {
      // Composite redo: jump back to post-turn snapshot.
      nodesRef.current = entry.postNodes;
      pipesRef.current = entry.postPipes;
      setNodes(entry.postNodes);
      setPipes(entry.postPipes);
      const turnId = entry.turnId ?? "redo";
      setQueue((prev) => [
        ...prev,
        ...entry.forward.map((action) => ({ action, id: crypto.randomUUID(), retries: 0, turnId })),
      ]);
      trackSignal("redo_used", { count: entry.forward.length, kind: "composite" });
      return;
    }
    for (const action of entry.forward) enqueue(action);
    trackSignal("redo_used", { count: entry.forward.length });
  }, [enqueue, history, trackSignal]);

  const openInsertPalette = useCallback((request: InsertRequest) => {
    setInsertRequest(request);
    setPaletteQuery("");
    setPaletteIndex(0);
    setPaletteOpen(true);
  }, []);

  const toggleSystemPanel = useCallback((panel: SystemPanel) => {
    setActiveSystemPanel((prev) => prev === panel ? null : panel);
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

  // Editor-local keys that the central registry deliberately doesn't route:
  // `/` opens the local insert-node palette, Delete deletes selection, Esc
  // clears modal-ish state. The registry handles cmd/ctrl shortcuts and `?`.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const editing = tag === "input" || tag === "textarea" || target?.isContentEditable === true;
      if (editing) return;
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !paletteOpen) {
        e.preventDefault();
        openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id });
        return;
      }
      if (e.shiftKey && e.key.toLowerCase() === "o" && selectedNode) {
        e.preventDefault();
        openInsertPalette({ mode: "sourcePort", nodeId: selectedNode.id });
      }
      if (e.shiftKey && e.key.toLowerCase() === "i" && selectedNode) {
        e.preventDefault();
        openInsertPalette({ mode: "targetPort", nodeId: selectedNode.id });
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelection();
      }
      if (e.key === "Escape") {
        setPendingSuggestion(null);
        setMergePlan(null);
        setSelectedNodeIds([]);
        setSelectedEdgeIds([]);
        setPaletteOpen(false);
        setPortAffordance(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteSelection, openInsertPalette, paletteOpen, selectedEdge, selectedNode]);

  // Editor-scoped shortcuts published into the central registry. The palette
  // and the keyboard-shortcuts overlay surface these.
  useEffect(() => {
    const offUndo = registerShortcut({
      id: "editor.undo",
      combo: "mod+z",
      label: "Undo",
      group: "editor",
      scope: "editor",
      handler: () => undo(),
    });
    const offRedo = registerShortcut({
      id: "editor.redo",
      combo: "mod+shift+z",
      label: "Redo",
      group: "editor",
      scope: "editor",
      handler: () => redo(),
    });
    const offDup = registerShortcut({
      id: "editor.duplicate",
      combo: "mod+d",
      label: "Duplicate selection",
      group: "editor",
      scope: "editor",
      handler: () => duplicateSelection(),
    });
    const offFit = registerShortcut({
      id: "editor.fit",
      combo: "mod+0",
      label: "Fit to view",
      group: "editor",
      scope: "editor",
      handler: () => setFitRequest((n) => n + 1),
    });
    const offFrame = registerShortcut({
      id: "editor.frame",
      combo: "shift+f",
      label: "Frame selection",
      group: "editor",
      scope: "editor",
      handler: () => setFrameRequest((n) => n + 1),
    });
    const offMetadata = registerShortcut({
      id: "editor.show-metadata",
      combo: "mod+shift+i",
      label: "Show node metadata",
      group: "editor",
      scope: "editor",
      handler: () => {
        if (selectedNodeIds.length === 1) setMetadataDialogOpen(true);
      },
    });
    const offInspector = registerShortcut({
      id: "editor.toggle-inspector",
      combo: "mod+e",
      label: "Toggle inspector",
      group: "editor",
      scope: "editor",
      handler: () => setInspectorOpen((v) => !v),
    });
    const offCheckpoint = registerShortcut({
      id: "editor.save-checkpoint",
      combo: "mod+shift+s",
      label: "Save checkpoint",
      group: "editor",
      scope: "editor",
      handler: async () => {
        if (savingCheckpoint) return;
        if (data?.entitlements?.versionHistory === false) {
          toggleSystemPanel("versions");
          return;
        }
        setSavingCheckpoint(true);
        const name = `v${(data?.versions.length ?? 0) + 1} · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
        try {
          await fetch(`/api/systems/${systemId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
          reload();
          toast.success(`Saved "${name}"`);
          setSavedFlash(true);
          setTimeout(() => setSavedFlash(false), 1000);
        } catch {
          toast.error("Failed to save checkpoint");
        } finally {
          setSavingCheckpoint(false);
        }
      },
    });
    return () => {
      offUndo();
      offRedo();
      offDup();
      offFit();
      offFrame();
      offMetadata();
      offInspector();
      offCheckpoint();
    };
  }, [data, duplicateSelection, redo, reload, savedFlash, savingCheckpoint, selectedNodeIds, setSavedFlash, setSavingCheckpoint, systemId, toggleSystemPanel, undo]);

  // Publish the "Show node metadata" command into the global Command Palette
  // when exactly one node is selected. Cleared otherwise. The action opens
  // the same dialog as the keyboard shortcut.
  useEffect(() => {
    if (selectedNodeIds.length !== 1) {
      clearPaletteScope("editor.metadata");
      return;
    }
    const item: CommandItem = {
      id: "system.show-metadata",
      label: "Show node metadata",
      section: "system",
      aliases: ["inspect", "json", "raw"],
      combo: "mod+shift+i",
      run: () => setMetadataDialogOpen(true),
    };
    publishPaletteItems("editor.metadata", [item]);
    return () => clearPaletteScope("editor.metadata");
  }, [selectedNodeIds]);

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

  // Build rail entries from the completed turns. Turns after the active turn
  // are marked stale (dashed) so the rail reads as "you walked back past me".
  const turnRailEntries: TurnRailEntry[] = useMemo(() => {
    if (completedTurns.length === 0) return [];
    const activeIdx = activeTurnId
      ? completedTurns.findIndex((t) => t.turnId === activeTurnId)
      : completedTurns.length - 1;
    return completedTurns.map((t, idx) => ({
      turnId: t.turnId,
      index: t.index,
      prompt: t.prompt,
      stale: activeIdx >= 0 && idx > activeIdx,
    }));
  }, [activeTurnId, completedTurns]);

  // Stable callbacks for EditorCanvas. All must be useCallback with minimal
  // or ref-based deps so @xyflow/react v12's StoreUpdater never sees a new
  // function reference between renders — new references trigger Zustand
  // setState → forceStoreRerender → re-render → new references → infinite loop.
  const handleCanvasSelectNode = useCallback((id?: string) => {
    if (!id) { setSelectedNodeIds([]); return; }
    const subsystem = subsystemsRef.current.find((item) => item.id === id);
    if (subsystem) { setSelectedNodeIds(subsystem.nodeIds); setFrameRequest((n) => n + 1); return; }
    setSelectedNodeIds([id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasSelectionChange = useCallback((nodeIds: string[], edgeIds: string[]) => {
    setSelectedNodeIds(nodeIds);
    setSelectedEdgeIds(edgeIds);
  }, []);

  const handleCanvasConnect = useCallback((source: string, target: string) => {
    const clientPipeId = `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
    recordAction({ action: "addPipe", systemId, fromNodeId: source, toNodeId: target, clientPipeId }, { action: "deletePipe", pipeId: clientPipeId });
  }, [recordAction, systemId]);

  const handleCanvasMove = useCallback((nodeId: string, x: number, y: number) => {
    const node = nodesRef.current.find((n) => n.id === nodeId);
    if (!node) return;
    recordAction({ action: "updateNode", nodeId, position: { x, y } }, { action: "updateNode", nodeId, position: node.position }, `move:${nodeId}`);
  }, [recordAction]);

  const handleCanvasDeleteEdge = useCallback((edgeId: string) => {
    const edge = pipesRef.current.find((p) => p.id === edgeId);
    if (!edge?.fromNodeId || !edge.toNodeId) return;
    recordAction({ action: "deletePipe", pipeId: edgeId }, { action: "addPipe", systemId, fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId });
  }, [recordAction, systemId]);

  const handleCanvasDeleteNodes = useCallback((nodeIds: string[]) => {
    for (const nodeId of nodeIds) {
      const node = nodesRef.current.find((n) => n.id === nodeId);
      if (!node) continue;
      recordAction({ action: "deleteNode", nodeId }, { action: "addNode", systemId, type: node.type, title: node.title, description: node.description, x: node.position.x, y: node.position.y });
    }
  }, [recordAction, systemId]);

  const handleCanvasRequestInsert = useCallback((request: InsertRequest) => {
    openInsertPalette(request);
  }, [openInsertPalette]);

  const handleCanvasPortClick = useCallback((info: { nodeId: string; direction: "input" | "output"; anchor: { x: number; y: number } }) => {
    const def = nodeDefinitionsRef.current[info.nodeId];
    const portType = info.direction === "input"
      ? (def?.input.portType ?? "any")
      : (def?.output.portType ?? "any");
    const connected = pipesRef.current.find((p) =>
      info.direction === "output"
        ? p.fromNodeId === info.nodeId
        : p.toNodeId === info.nodeId,
    );
    const peerId = info.direction === "output" ? connected?.toNodeId : connected?.fromNodeId;
    const peer = peerId ? nodesRef.current.find((n) => n.id === peerId) : undefined;
    setPortAffordance({
      anchor: info.anchor,
      port: {
        nodeId: info.nodeId,
        direction: info.direction,
        portType,
        connectedPipeId: connected?.id,
        connectedPeerTitle: peer?.title,
      },
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCanvasViewportSettled = useCallback((nodeCount: number, edgeCount: number) => {
    if (nodeCount + edgeCount > 100) trackSignal("slow_render_threshold", { nodeCount, edgeCount });
  }, [trackSignal]);

  if (!data) {
    if (notFound) return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center px-6">
        <p className="text-4xl">&#x2049;</p>
        <h1 className="t-label font-semibold text-ink-1">Loop not found</h1>
        <p className="t-caption text-ink-3 max-w-xs">
          This loop may have been deleted or you do not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="px-4 py-1.5 rounded-full bg-[#4F46E5] text-white text-xs font-semibold hover:bg-[#4338CA] transition-colors"
        >
          Back to dashboard
        </Link>
      </div>
    );
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-10 surface-canvas border-b border-line px-4 pt-2.5 pb-1.5 space-y-1.5">

        {/* Header: name + save state — no duplicate agent button */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            {renamingSystem ? (
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={() => { void commitRename(); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.currentTarget.blur(); }
                  if (e.key === "Escape") { setRenamingSystem(false); }
                }}
                className="t-label font-bold text-ink-1 bg-transparent border-0 border-b border-[#4F46E5] outline-none w-full max-w-xs"
                autoFocus
              />
            ) : (
              <h1
                className="t-label font-bold text-ink-1 truncate cursor-pointer hover:text-[#4F46E5] transition-colors"
                title="Click to rename"
                onClick={() => { setRenameValue(data.system.name); setRenamingSystem(true); }}
              >
                {data.system.name}
              </h1>
            )}
            {editingDescription ? (
              <input
                type="text"
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                onBlur={() => void commitDescription()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void commitDescription();
                  if (e.key === "Escape") setEditingDescription(false);
                }}
                placeholder="Add a description..."
                className="t-caption text-ink-2 bg-transparent border-0 border-b border-[#4F46E5] outline-none w-full max-w-sm"
                autoFocus
              />
            ) : (
              <p
                className="t-caption text-ink-3 truncate cursor-pointer hover:text-ink-2 transition-colors"
                title="Click to edit description"
                onClick={() => { setDescriptionDraft(data.system.description ?? ""); setEditingDescription(true); }}
              >
                {data.system.description || <span className="italic opacity-60">Add description...</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <AvatarStack names={data.presence.map((p) => p.name)} />
            <Badge tone={saveState === "error" ? "warn" : saveState === "saved" ? "good" : "neutral"}>{saveLabel}</Badge>
            <Tooltip content="Copy link">
              <button
                onClick={() => {
                  void navigator.clipboard.writeText(window.location.href);
                  const isPrivate = (data.system.visibility ?? "public") === "private";
                  toast.success(isPrivate ? "Link copied — only workspace members can open private loops" : "Link copied");
                }}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-ink-3 hover:text-ink-1 hover:bg-black/[0.05] transition-colors"
                aria-label="Copy link"
              >
                <Link2 size={14} />
              </button>
            </Tooltip>
            <LoopVisibilityToggle
              systemId={systemId}
              currentVisibility={data.system.visibility ?? "public"}
              canSetPrivate={data.entitlements?.privateLoops ?? false}
            />
            {data.entitlements?.marketplaceSelling ? (
              <button
                onClick={() => setShowPublishModal(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#4F46E5] text-white border border-[#4338CA] hover:bg-[#4338CA] transition-colors"
                title="Publish to Marketplace"
              >
                Publish
              </button>
            ) : (
              <Tooltip content="Upgrade to Pro to publish to marketplace">
                <button
                  disabled
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#C7C7CC] text-white border border-[#C7C7CC] cursor-not-allowed opacity-60"
                  title="Publish to Marketplace"
                >
                  Publish
                </button>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Single toolbar row: all actions collapsed */}
        <div className="flex items-center gap-1 flex-wrap">
          <Button variant="ghost" size="sm" onClick={undo} isDisabled={history.undo.length === 0}><Undo2 size={14} /> Undo</Button>
          <Button variant="ghost" size="sm" onClick={redo} isDisabled={history.redo.length === 0}><Redo2 size={14} /> Redo</Button>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: selectedEdge ? "selectedEdge" : selectedNode ? "selectedNode" : "canvas", edgeId: selectedEdge?.id, nodeId: selectedNode?.id })}><Plus size={14} /> Insert</Button>
          <Button variant="ghost" size="sm" onClick={() => setFitRequest((n) => n + 1)}><Maximize2 size={14} /> Fit</Button>
          {(selectedNodeIds.length > 0 || selectedEdgeIds.length > 0) && (
            <>
              <Button variant="ghost" size="sm" onClick={duplicateSelection}><Copy size={14} /> Dupe</Button>
              <Button variant="danger-soft" size="sm" onClick={deleteSelection}><Trash2 size={14} /> Delete</Button>
            </>
          )}
          {selectedNodeIds.length >= 2 && (
            <Button variant="ghost" size="sm" onClick={createSubsystem}>Group</Button>
          )}
          {saveState === "error" && (
            <Button variant="ghost" size="sm" onClick={() => setFailed(0)} className="text-amber-600">Retry</Button>
          )}
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant={activeSystemPanel === "validation" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => toggleSystemPanel("validation")}
            className={validationReport.issues.filter((i) => i.severity === "error").length > 0 ? "text-amber-600" : ""}
          >
            <Shield size={14} /> Validate{validationReport.issues.filter((i) => i.severity === "error").length > 0 ? ` (${validationReport.issues.filter((i) => i.severity === "error").length})` : ""}
          </Button>
          <Button variant={activeSystemPanel === "simulation" ? "secondary" : "ghost"} size="sm" onClick={() => toggleSystemPanel("simulation")} className={activeSystemPanel === "simulation" ? "" : "text-ink-3 hover:text-ink-2"}><Play size={14} /> Simulate</Button>
          <Button variant={activeSystemPanel === "ai" ? "secondary" : "ghost"} size="sm" onClick={() => toggleSystemPanel("ai")} className={activeSystemPanel === "ai" ? "" : "text-ink-3 hover:text-ink-2"}><Wand2 size={14} /> AI</Button>
          <Tooltip content={data?.entitlements?.versionHistory === false ? "Version history requires Pro" : "Save a named checkpoint of the current canvas"}>
            <Button
              variant="ghost"
              size="sm"
              isDisabled={savingCheckpoint || data?.entitlements?.versionHistory === false}
              onClick={async () => {
                if (data?.entitlements?.versionHistory === false) { toggleSystemPanel("versions"); return; }
                setSavingCheckpoint(true);
                const name = `v${(data?.versions.length ?? 0) + 1} · ${new Date().toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}`;
                try {
                  await fetch(`/api/systems/${systemId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
                  reload();
                  toast.success(`Saved "${name}"`);
                  setSavedFlash(true);
                  setTimeout(() => setSavedFlash(false), 1000);
                } catch {
                  toast.error("Failed to save checkpoint");
                } finally {
                  setSavingCheckpoint(false);
                }
              }}
              className={`${data?.entitlements?.versionHistory === false ? "text-ink-4" : "text-ink-3 hover:text-ink-2"} ${savedFlash ? "looper-saved-flash" : ""}`}
            >
              {savingCheckpoint ? <Spinner size="sm" /> : <History size={14} />}
              {savingCheckpoint ? null : (data?.versions.length ?? 0) > 0 ? `Checkpoint (${data!.versions.length})` : "Checkpoint"}
            </Button>
          </Tooltip>
          <Dropdown>
            <DropdownTrigger>
              <div role="button" tabIndex={0} aria-label="More actions" className="inline-flex items-center justify-center h-8 w-8 rounded-md text-ink-3 hover:text-ink-2 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer"><MoreHorizontal size={14} /></div>
            </DropdownTrigger>
            <Dropdown.Popover>
              <DropdownMenu aria-label="More actions">
                <DropdownItem id="arrange" onAction={() => arrangeNodes("all")}>Arrange nodes</DropdownItem>
                <DropdownItem id="comments" onAction={() => toggleSystemPanel("comments")}>
                  {`Comments${data.comments.length > 0 ? ` (${data.comments.length})` : ""}`}
                </DropdownItem>
                <DropdownItem id="versions" onAction={() => toggleSystemPanel("versions")}>Versions</DropdownItem>
                <DropdownItem id="analytics" onAction={() => toggleSystemPanel("analytics")}>Analytics</DropdownItem>
                <DropdownItem id="export" onAction={() => toggleSystemPanel("import")}>Export / Import</DropdownItem>
              </DropdownMenu>
            </Dropdown.Popover>
          </Dropdown>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <Button
            variant={activeSystemPanel === "agent" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => { setAgentViewJson(null); toggleSystemPanel("agent"); }}
            className={`font-semibold ${activeSystemPanel === "agent" ? "text-indigo-700" : "text-indigo-600 hover:text-indigo-700"}`}
          >
            <Bot size={14} /> Agent View
          </Button>
        </div>

      </div>
      {showNewBanner && (
        <div className="flex items-center justify-between gap-4 bg-indigo-600 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-indigo-200 shrink-0" />
            <p className="t-label text-white font-medium">
              Your system is drawn. Now connect it to an agent — any AI can read this architecture immediately.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => { setAgentViewJson(null); toggleSystemPanel("agent"); setShowNewBanner(false); }}
              className="t-label font-semibold text-white bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-colors"
            >
              See what agents see
            </button>
            <button onClick={() => setShowNewBanner(false)} className="text-indigo-200 hover:text-white transition-colors ml-1">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      <div
        className="editor-shell"
        style={{
          marginTop: 12,
          gridTemplateColumns: `${leftPaneOpen ? "260px" : "48px"} 1fr ${inspectorOpen ? "320px" : "48px"}`,
          transition: "grid-template-columns 280ms cubic-bezier(0.4, 0, 0.2, 1)",
        }}
      >
        {leftPaneOpen ? (
          <Panel title="Nodes">
            <div className="flex items-center justify-between mb-2">
              <span className="t-caption text-ink-3">Library</span>
              <Button size="sm" variant="ghost" onClick={() => setLeftPaneOpen(false)} aria-label="Collapse"><ChevronLeft size={14} /></Button>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                const fallback = nodeLibraryCatalog[0];
                if (fallback) insertNodeFromEntry(fallback, { mode: "canvas" });
              }}
              className="w-full justify-center font-semibold"
            >
              <Plus size={14} /> Add node
            </Button>
            {(() => {
              const recentNodes = recents
                .map((id) => nodes.find((n) => n.id === id))
                .filter((n): n is GraphNode => Boolean(n))
                .slice(0, 6);
              if (recentNodes.length === 0) return null;
              return (
                <div className="mt-3 border-t border-line pt-3">
                  <p className="t-caption font-semibold uppercase tracking-wide text-ink-3 px-2 mb-1">Recents</p>
                  <div className="space-y-0.5">
                    {recentNodes.map((node) => (
                      <button
                        key={node.id}
                        onClick={() => { setSelectedNodeIds([node.id]); setFrameRequest((n) => n + 1); }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[var(--color-hover)] text-left"
                      >
                        <span className="t-label text-ink-1 flex-1 truncate">{node.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })()}
            {subsystems.length > 0 && (
              <div className="mt-4 border-t border-line pt-3">
                <p className="t-caption font-semibold uppercase tracking-wide text-ink-3 px-2 mb-1">Groups</p>
                {subsystems.map((subsystem) => {
                  const boundary = computeSubsystemBoundary(subsystem, pipes);
                  return (
                    <div key={subsystem.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--color-hover)] cursor-pointer"
                         onClick={() => { setSelectedNodeIds(subsystem.nodeIds); setFrameRequest((n) => n + 1); }}>
                      <span className="t-label text-ink-1 flex-1 truncate">{subsystem.name}</span>
                      <span className="t-caption text-ink-3">{subsystem.nodeIds.length} · {boundary.inboundNodeIds.length}in {boundary.outboundNodeIds.length}out</span>
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        ) : (
          <aside className="border border-line rounded-lg surface-canvas flex flex-col items-center py-2 gap-2">
            <button
              onClick={() => setLeftPaneOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Expand sidebar"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => {
                const fallback = nodeLibraryCatalog[0];
                if (fallback) insertNodeFromEntry(fallback, { mode: "canvas" });
              }}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Add node"
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => setLeftPaneOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Structure"
            >
              <Layers size={16} />
            </button>
            <button
              onClick={() => setLeftPaneOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Sub-loops"
            >
              <Boxes size={16} />
            </button>
          </aside>
        )}
        <div className="relative min-h-[60vh] flex flex-col">
        <LoopProposalBanner
          proposals={reviewPreviewItems}
          onOpenAgentChat={() => setPromptFocusSignal((n) => n + 1)}
          onDismiss={() => setReviewPreviewItems([])}
        />
        <EditorErrorBoundary area="Canvas" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-40 pointer-events-none" style={{ marginTop: 0 }}>
              <div className="pointer-events-auto text-center space-y-5 max-w-sm">
                <div className="flex items-center justify-center gap-3 select-none" aria-hidden>
                  <div className="w-14 h-8 rounded-lg border border-line-strong surface-canvas" />
                  <div className="w-5 h-0.5 bg-black/[0.12] rounded" />
                  <div className="w-16 h-10 rounded-lg border border-indigo-200 bg-indigo-50" />
                  <div className="w-5 h-0.5 bg-black/[0.12] rounded" />
                  <div className="w-14 h-8 rounded-lg border border-line-strong surface-canvas" />
                </div>
                <div>
                  <p className="t-title font-bold text-ink-1">What should this loop do?</p>
                  <p className="t-label text-ink-3 mt-1">
                    Describe it in one sentence and your agent builds the graph.
                  </p>
                  <p className="t-caption text-ink-4 mt-2 italic">
                    e.g. &ldquo;Watch GitHub for new PRs, summarize the diff, then post to Slack&rdquo;
                  </p>
                </div>
                <Button
                  variant="primary"
                  onClick={() => setPromptFocusSignal((n) => n + 1)}
                  className="h-10 px-6 font-semibold"
                >
                  <Bot size={14} /> Start describing
                </Button>
                <div>
                  <button
                    type="button"
                    onClick={() => openInsertPalette({ mode: "canvas" })}
                    className="t-caption text-ink-3 hover:text-ink-2 transition-colors"
                  >
                    or add a node manually
                  </button>
                </div>
              </div>
            </div>
          )}
          <EditorCanvas
            initialNodes={flowView.flowNodes}
            initialEdges={presentedEdges}
            fitRequest={fitRequest}
            frameRequest={frameRequest}
            previewItems={reviewPreviewItems}
            highlightedNodeIds={reviewRegion?.nodeIds ?? []}
            highlightedEdgeIds={reviewRegion?.pipeIds ?? []}
            regionStatus={reviewRegion?.status}
            pulsingNodeId={agentTargetNodeId}
            onSelectNode={handleCanvasSelectNode}
            onSelectionChange={handleCanvasSelectionChange}
            onConnect={handleCanvasConnect}
            onMove={handleCanvasMove}
            onDeleteEdge={handleCanvasDeleteEdge}
            onDeleteNodes={handleCanvasDeleteNodes}
            onRequestInsert={handleCanvasRequestInsert}
            onZoomChange={setZoomLevel}
            onPortClick={handleCanvasPortClick}
            onViewportSettled={handleCanvasViewportSettled}
          />
        </EditorErrorBoundary>
        <ConversationDrawer
          systemId={systemId}
          initialPrompt={initialPrompt}
          agentApplyContext={agentApplyContext}
          onCurrentTargetNodeIdChange={setAgentTargetNodeId}
          onRevertCurrentTurn={undo}
          onPromptStarted={() => {
            setTutorialPromptStarted(true);
            dropFutureTurnsIfBranching();
          }}
          onInitialPromptHandled={() => {
            if (typeof window === "undefined") return;
            const url = new URL(window.location.href);
            if (url.searchParams.has("prompt")) {
              url.searchParams.delete("prompt");
              window.history.replaceState({}, "", url.toString());
            }
          }}
          turns={turnRailEntries}
          activeTurnId={activeTurnId}
          onJumpToTurn={jumpToTurn}
          onOpenInClaude={() => { void triggerOpenInClaude(systemId); }}
          onShowLatestDiff={
            completedTurns.length > 1
              ? () => setDiffTurnId(completedTurns[completedTurns.length - 1].turnId)
              : undefined
          }
          latestDiffAvailable={completedTurns.length > 1}
          onTurnCompleted={handleTurnCompleted}
          focusSignal={promptFocusSignal}
        />
        {diffTurnId ? (() => {
          const turn = completedTurns.find((t) => t.turnId === diffTurnId);
          if (!turn) return null;
          return (
            <TurnDiffDialog
              open={true}
              onOpenChange={(open) => { if (!open) setDiffTurnId(null); }}
              turnIndex={turn.index}
              before={turn.prior}
              after={turn.post}
            />
          );
        })() : null}
        {nodes.length === 0 && pipes.length === 0 && !tutorialSeen ? (
          <EditorTutorial
            promptStarted={tutorialPromptStarted}
            leftPaneOpened={tutorialLeftPaneOpened}
            agentViewSeen={tutorialAgentViewSeen}
          />
        ) : null}
        </div>
        {!inspectorOpen && !activeSystemPanel ? (
          <aside className="border border-line rounded-lg surface-canvas flex flex-col items-center py-2 gap-2">
            <button
              onClick={() => setInspectorOpen(true)}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Expand inspector"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => { setInspectorTab("config"); setInspectorOpen(true); }}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Config"
            >
              <Settings size={16} />
            </button>
            <button
              onClick={() => { setInspectorTab("advanced"); setInspectorOpen(true); }}
              className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-[var(--color-hover)] text-ink-2"
              aria-label="Advanced"
            >
              <MoreHorizontal size={16} />
            </button>
          </aside>
        ) : (
        <EditorErrorBoundary area="Inspector" onRecover={reload} onCrash={(area) => trackSignal("editor_crash_boundary_triggered", { area })}>
          <Panel title={activeSystemPanel === "agent" ? "Agent View" : activeSystemPanel === "analytics" ? "Loop Analytics" : activeSystemPanel ? (activeSystemPanel.charAt(0).toUpperCase() + activeSystemPanel.slice(1)) : "Inspector"}>
            {activeSystemPanel === "validation" && (
              <div className="space-y-2">
                {validationReport.issues.length === 0 ? (
                  <p className="t-label text-ink-3 py-2">No issues found.</p>
                ) : (
                  validationReport.issues.map((issue) => {
                    const canNavigate = !!issue.nodeId;
                    const inner = (
                      <div className="flex items-start gap-2">
                        <ValidationBadge severity={issue.severity} />
                        <div className="flex-1 min-w-0">
                          <p className="t-caption text-ink-2">{issue.message}</p>
                          {canNavigate && <p className="t-caption text-indigo-600 mt-0.5">Click to go to node</p>}
                        </div>
                      </div>
                    );
                    return canNavigate ? (
                      <button
                        key={issue.id}
                        type="button"
                        className="w-full text-left border border-line hover:border-indigo-300 rounded-lg p-2 transition-colors cursor-pointer"
                        onClick={() => { setSelectedNodeIds([issue.nodeId!]); setActiveSystemPanel(null); }}
                      >
                        {inner}
                      </button>
                    ) : (
                      <Card key={issue.id}>{inner}</Card>
                    );
                  })
                )}
              </div>
            )}
            {activeSystemPanel === "simulation" && (
              <div className="space-y-2">
                <p className="t-caption text-ink-3 mb-1">
                  Static dry run. Traces the path one input would take and flags unreached nodes. It does not execute node logic.
                </p>
                <div className="t-label text-ink-3 space-y-0.5 mb-2">
                  <p>Status: {sim.status}</p>
                  <p>Steps: {sim.steps.length}</p>
                  <p>Traversed pipes: {tracedEdgeIds.length}</p>
                </div>
                <Card>
                  <h5 className="t-label font-semibold text-ink-2 mb-1">Branch decisions</h5>
                  {traceSummary.branchDecisions.length === 0 ? <p className="t-caption text-ink-3">No explicit branch labels in this run.</p> : traceSummary.branchDecisions.map((item) => <p key={item} className="t-caption text-ink-2">{item}</p>)}
                </Card>
                <Card>
                  <h5 className="t-label font-semibold text-ink-2 mb-1">Loop summary</h5>
                  {traceSummary.loopSummaries.length === 0 ? <p className="t-caption text-ink-3">No loop revisits detected.</p> : traceSummary.loopSummaries.map((item) => <p key={item} className="t-caption text-ink-2">{item}</p>)}
                </Card>
                <Card>
                  <h5 className="t-label font-semibold text-ink-2 mb-1">Blocked/invalid routes</h5>
                  {traceSummary.blocked.length === 0 ? <p className="t-caption text-ink-3">No blocked traces.</p> : traceSummary.blocked.map((item) => <p key={item} className="t-caption text-ink-2">{item}</p>)}
                  {invalidPipeIds.length > 0 ? <p className="t-caption text-ink-3 mt-1">Validation errors reference pipes: {invalidPipeIds.join(", ")}</p> : null}
                </Card>
                <SimulationTelemetryCard systemId={systemId} />
              </div>
            )}
            {activeSystemPanel === "comments" && (
              <div className="space-y-2">
                <Input
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && comment.trim() && !postingComment) {
                      e.preventDefault();
                      void (async () => {
                        setPostingComment(true);
                        try {
                          const res = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, body: comment.trim(), nodeId: selectedNodeId }) });
                          if (!res.ok) throw new Error();
                          setComment("");
                          reload();
                        } catch {
                          toast.error("Failed to post comment");
                        } finally {
                          setPostingComment(false);
                        }
                      })();
                    }
                  }}
                  placeholder={selectedNodeId ? "Comment on this node… (Enter to post)" : "Comment on this system… (Enter to post)"}
                />
                <Button
                  variant="primary"
                  size="sm"
                  isDisabled={postingComment || !comment.trim()}
                  onClick={async () => {
                    setPostingComment(true);
                    try {
                      const res = await fetch("/api/comments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, body: comment.trim(), nodeId: selectedNodeId }) });
                      if (!res.ok) throw new Error();
                      setComment("");
                      reload();
                    } catch {
                      toast.error("Failed to post comment");
                    } finally {
                      setPostingComment(false);
                    }
                  }}
                >
                  {postingComment ? <Spinner size="sm" /> : "Post"}
                </Button>
                {data.comments.length === 0 ? (
                  <p className="t-caption text-ink-3 text-center py-4">No comments yet. {selectedNodeId ? "Comment on the selected node." : "Select a node to comment on it, or post a system-level comment."}</p>
                ) : (
                  <div className="space-y-2 mt-2">{data.comments.map((c) => {
                    {/* eslint-disable-next-line react-hooks/purity -- relative-time label; re-renders refresh it */}
                    const diff = Date.now() - new Date(c.createdAt).getTime();
                    const mins = Math.floor(diff / 60_000);
                    const age = mins < 1 ? "just now" : mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
                    const displayName = c.authorName ?? `User …${c.authorId.slice(-4)}`;
                    return (
                      <div key={c.id} className="border-l-2 border-indigo-400 pl-3 py-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <strong className="t-label font-semibold text-ink-1 truncate">{displayName}</strong>
                          <span className="t-caption text-ink-4 shrink-0 text-[10px]">{age}</span>
                        </div>
                        <p className="mt-0.5 t-label text-ink-2">{c.body}</p>
                      </div>
                    );
                  })}</div>
                )}
              </div>
            )}
            {activeSystemPanel === "versions" && (
              <div className="space-y-3">
                {data?.entitlements?.versionHistory === false ? (
                  <LoopUpgradeGate reason="version_history" />
                ) : (
                  <>
                    <div className="flex gap-2">
                      <Input
                        value={versionName}
                        onChange={(e) => setVersionName(e.target.value)}
                        placeholder="Version name"
                        className="flex-1"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        isDisabled={!versionName.trim()}
                        onClick={async () => {
                          await fetch(`/api/systems/${systemId}/versions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: versionName.trim() }) });
                          reload();
                          toast.success("Version saved");
                        }}
                        className="shrink-0"
                      >
                        Save
                      </Button>
                    </div>
                    {data.versions.length === 0 ? (
                      <p className="t-caption text-ink-3 text-center py-4">No versions yet. Save a version to capture the current state.</p>
                    ) : (
                      <div className="space-y-1">
                        {data.versions.slice().reverse().map((v) => (
                          <div key={v.id} className="p-2.5 rounded-lg hover:bg-[var(--surface-subtle)] group">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="t-label font-medium text-ink-1 truncate">{v.name}</p>
                                <p className="t-caption text-ink-3">
                                  {new Date(v.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                                  {v.nodeCount !== undefined && <span className="ml-1.5">· {v.nodeCount} node{v.nodeCount !== 1 ? "s" : ""}</span>}
                                </p>
                              </div>
                            {restoringVersionId === v.id ? (
                              <Spinner size="sm" />
                            ) : (
                              <button
                                type="button"
                                className="t-caption text-indigo-600 hover:text-indigo-700 font-medium opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                                onClick={async () => {
                                  if (!confirm(`Restore to "${v.name}"? The current graph will be saved as a checkpoint first.`)) return;
                                  setRestoringVersionId(v.id);
                                  try {
                                    await fetch(`/api/systems/${systemId}/versions`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ versionId: v.id }) });
                                    reload();
                                    toast.success(`Restored to "${v.name}"`);
                                  } catch {
                                    toast.error("Restore failed");
                                  } finally {
                                    setRestoringVersionId(null);
                                  }
                                }}
                              >
                                Restore
                              </button>
                            )}
                            </div>
                            {v.nodeTypes && v.nodeTypes.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {v.nodeTypes.map((t) => (
                                  <span key={t} className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-indigo-50 text-indigo-600 border border-indigo-100">{t}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {activeSystemPanel === "ai" && (
              <div className="space-y-3">
                {data?.entitlements?.aiGeneration === false ? (
                  <LoopUpgradeGate reason="ai_generation" />
                ) : !pendingSuggestion ? (
                  <>
                    <p className="t-caption text-ink-3 leading-relaxed">
                      Describe a change and AI will draft it for you to review.
                    </p>
                    <div className="flex gap-2">
                      <Input
                        value={aiEditPrompt}
                        onChange={(e) => setAiEditPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && aiEditPrompt.trim()) {
                            e.preventDefault();
                            void (async () => {
                              const suggestionRes = await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, prompt: aiEditPrompt }) });
                              const suggestion = await suggestionRes.json();
                              if (suggestion.ok) { setPendingSuggestion(suggestion.data); setAcceptedChangeIds((suggestion.data.changes ?? []).map((c: any) => c.id)); }
                            })();
                          }
                        }}
                        placeholder="e.g. Add a caching layer before the database"
                        className="flex-1"
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        isDisabled={!aiEditPrompt.trim()}
                        onClick={async () => {
                          const suggestionRes = await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ systemId, prompt: aiEditPrompt }) });
                          const suggestion = await suggestionRes.json();
                          if (suggestion.ok) { setPendingSuggestion(suggestion.data); setAcceptedChangeIds((suggestion.data.changes ?? []).map((c: any) => c.id)); }
                        }}
                        className="shrink-0 h-10 px-3"
                      >
                        <Wand2 size={13} />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-[var(--surface-subtle)] border border-line px-3 py-2.5" style={{ borderRadius: "8px" }}>
                      <p className="t-label font-semibold text-ink-1 mb-0.5">{pendingSuggestion.summary}</p>
                      <p className="t-caption text-ink-3">{(pendingSuggestion.changes ?? []).length} change{(pendingSuggestion.changes ?? []).length !== 1 ? "s" : ""} ready to apply</p>
                    </div>

                    {(pendingSuggestion.changes ?? []).length > 0 && (
                      <div className="border border-line overflow-hidden" style={{ borderRadius: "8px" }}>
                        {(pendingSuggestion.changes ?? []).map((change: any, i: number) => {
                          const accepted = acceptedChangeIds.includes(change.id);
                          const dotColor = change.action === "addNode" || change.action === "addPipe" ? "bg-emerald-500" : change.action === "deleteNode" || change.action === "deletePipe" ? "bg-red-400" : "bg-amber-400";
                          return (
                            <button
                              key={change.id}
                              type="button"
                              className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${i > 0 ? "border-t border-black/[0.05]" : ""} ${accepted ? "surface-canvas hover:bg-[#F9F9FB]" : "bg-[#FAFAFA] hover:bg-[var(--surface-subtle)]"}`}
                              onClick={() => setAcceptedChangeIds((prev) => accepted ? prev.filter((id) => id !== change.id) : [...prev, change.id])}
                            >
                              <span className={`w-3.5 h-3.5 rounded shrink-0 border flex items-center justify-center transition-colors ${accepted ? "bg-indigo-600 border-indigo-600" : "surface-canvas border-[#C7C7CC]"}`}>
                                {accepted && <svg width="8" height="6" viewBox="0 0 8 6" fill="none"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </span>
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                              <span className={`t-caption flex-1 truncate ${accepted ? "text-ink-2" : "text-ink-3 line-through"}`}>{change.action} · {change.nodeId ?? change.pipeId ?? change.payload?.title ?? "entity"}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 h-9 font-semibold"
                        isDisabled={acceptedChangeIds.length === 0}
                        onClick={async () => {
                          await fetch("/api/ai/suggest-edits", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ apply: true, systemId, suggestion: pendingSuggestion, acceptedChangeIds }) });
                          setPendingSuggestion(null);
                          setAcceptedChangeIds([]);
                          setAiEditPrompt("");
                          reload();
                        }}
                      >
                        Apply {acceptedChangeIds.length} change{acceptedChangeIds.length !== 1 ? "s" : ""}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-9 text-ink-3"
                        onClick={() => { setPendingSuggestion(null); setAcceptedChangeIds([]); }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeSystemPanel === "import" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/systems/${systemId}/export?format=json`, "_blank")}>Export JSON</Button>
                  <Button variant="ghost" size="sm" onClick={() => window.open(`/api/systems/${systemId}/export?format=markdown`, "_blank")}>Export Markdown</Button>
                </div>
                <Input value={importPayload} onChange={(e) => setImportPayload(e.target.value)} placeholder="Paste looper_schema_v1 JSON" />
                <Button onClick={async () => {
                  const res = await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ schema: importPayload, mode: "existing", targetSystemId: systemId, preview: true }) });
                  const resData = await res.json();
                  if (resData.ok) setMergePlan(resData.data);
                }}>Plan Merge</Button>
                {mergePlan?.ok ? <Card>
                  <p className="t-label font-semibold text-ink-1">Import review pending</p>
                  <p className="t-caption text-ink-2">Additions: {mergePlan.summary?.additions ?? 0}</p>
                  <p className="t-caption text-ink-2">Updates: {mergePlan.summary?.updates ?? 0}</p>
                  <p className="t-caption text-ink-2">Conflicts: {mergePlan.summary?.conflicts ?? 0}</p>
                  <Input value={mergeStrategy} onChange={(e) => setMergeStrategy(e.target.value as "safe_upsert" | "replace_conflicts")} />
                  <Button onClick={async () => {
                    await fetch("/api/import/system", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "existing", applyMerge: true, strategy: mergeStrategy, plan: mergePlan }) });
                    setMergePlan(null);
                    reload();
                  }}>Apply Merge (creates checkpoint)</Button>
                </Card> : null}
              </div>
            )}
            {activeSystemPanel === "agent" && (
              <div className="space-y-3">
                {data?.entitlements?.mcpReadWrite === false ? (
                  <LoopUpgradeGate reason="mcp_access" />
                ) : (
                  <>
                    <AgentConnectPanel systemId={systemId} mcpReadWrite={data?.entitlements?.mcpReadWrite} />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setShowConnectModal(true)}
                      className="w-full flex items-center justify-center gap-1.5"
                    >
                      <Zap size={13} />
                      Generate access token
                    </Button>
                  </>
                )}
                <details className="group">
                  <summary className="flex items-center gap-1 t-caption text-ink-3 hover:text-ink-2 cursor-pointer select-none list-none">
                    <ChevronRight size={12} className="transition-transform group-open:rotate-90" />
                    View raw schema (what agents receive)
                  </summary>
                  <div className="mt-2">
                    {agentViewLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Spinner size="sm" />
                      </div>
                    ) : agentViewJson ? (
                      <div className="relative">
                        <pre className="bg-[#111] text-[#e5e7eb] t-caption font-mono p-4 overflow-auto max-h-80 whitespace-pre-wrap"
                             style={{ borderRadius: "8px", lineHeight: "1.6" }}>
                          {agentViewJson}
                        </pre>
                        <button
                          onClick={() => {
                            void navigator.clipboard.writeText(agentViewJson).then(() => {
                              toast.success("Agent view JSON copied");
                            });
                          }}
                          className="absolute top-2 right-2 flex items-center gap-1 t-caption font-medium text-[#9ca3af] hover:text-white bg-white/10 hover:bg-white/20 px-2 py-1 rounded transition-colors"
                        >
                          <Copy size={11} /> Copy
                        </button>
                      </div>
                    ) : (
                      <p className="t-label text-ink-3 py-2">Loading…</p>
                    )}
                  </div>
                </details>
              </div>
            )}
            {activeSystemPanel === "analytics" && (
              <div className="space-y-3">
                {data?.entitlements?.loopAnalytics === false ? (
                  <LoopUpgradeGate reason="loop_analytics" />
                ) : analyticsLoading ? (
                  <p className="t-label text-ink-3 py-2">Loading analytics…</p>
                ) : analyticsData ? (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <Card>
                        <p className="t-caption text-ink-3 mb-0.5">Total builds</p>
                        <p className="text-2xl font-bold text-ink-1 tabular-nums">{analyticsData.versionCount}</p>
                        <p className="t-caption text-ink-3 mt-0.5">{analyticsData.recentBuildCount} in last 30 days</p>
                      </Card>
                      <Card>
                        <p className="t-caption text-ink-3 mb-0.5">Current nodes</p>
                        <p className="text-2xl font-bold text-ink-1 tabular-nums">{analyticsData.nodeCount}</p>
                        <p className="t-caption text-ink-3 mt-0.5">{analyticsData.pipeCount} pipe{analyticsData.pipeCount !== 1 ? "s" : ""}</p>
                      </Card>
                    </div>
                    <Card>
                      <h5 className="t-label font-semibold text-ink-2 mb-2 flex items-center gap-1.5"><BarChart2 size={13} className="text-indigo-500" /> Node breakdown</h5>
                      {Object.keys(analyticsData.nodesByType).length === 0 ? (
                        <p className="t-caption text-ink-3">No nodes yet.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {Object.entries(analyticsData.nodesByType)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 8)
                            .map(([type, count]) => {
                              const pct = Math.round((count / analyticsData.nodeCount) * 100);
                              return (
                                <div key={type} className="flex items-center gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-0.5">
                                      <span className="t-caption text-ink-2 truncate">{type.replace(/_/g, " ")}</span>
                                      <span className="t-caption text-ink-3 shrink-0 ml-1">{count}</span>
                                    </div>
                                    <div className="h-1 rounded-full bg-[#F2F2F7] overflow-hidden">
                                      <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </Card>
                    <Card>
                      <h5 className="t-label font-semibold text-ink-2 mb-2">Loop timeline</h5>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="t-caption text-ink-3">Created</span>
                          <span className="t-caption text-ink-2">{(() => {
                            {/* eslint-disable-next-line react-hooks/purity -- relative-time label; re-renders refresh it */}
                            const d = Math.floor((Date.now() - new Date(analyticsData.createdAt).getTime()) / 86400000);
                            return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
                          })()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="t-caption text-ink-3">Last updated</span>
                          <span className="t-caption text-ink-2">{(() => {
                            {/* eslint-disable-next-line react-hooks/purity -- relative-time label; re-renders refresh it */}
                            const d = Math.floor((Date.now() - new Date(analyticsData.updatedAt).getTime()) / 86400000);
                            return d === 0 ? "today" : d === 1 ? "yesterday" : `${d} days ago`;
                          })()}</span>
                        </div>
                      </div>
                    </Card>
                  </>
                ) : (
                  <p className="t-caption text-ink-3">Could not load analytics.</p>
                )}
              </div>
            )}
            {!activeSystemPanel && (
              <>
                {selectedEdge ? (
                  <Card>
                    <h4 className="t-label font-semibold text-ink-2 mt-4 mb-2">Pipe semantics</h4>
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
                  </Card>
                ) : null}
                {selectedNode ? (
                  <Card>
                    {occupancy.length > 1 ? <p className="t-caption text-amber-700 bg-amber-50 rounded px-2 py-0.5 mb-2">Occupied by {occupancy.map((p) => p.name).join(", ")}</p> : null}
                    {/* Inspector tabs: Config (node params) + Contract (port types). */}
                    <div className="flex items-center justify-between gap-2 pb-2 mb-3 border-b border-line">
                      <div className="flex gap-1">
                        {(["config", "advanced"] as InspectorTab[]).map((tab) => (
                          <button
                            key={tab}
                            type="button"
                            onClick={() => setInspectorTab(tab)}
                            className={[
                              "px-2 py-0.5 rounded t-caption font-semibold uppercase tracking-wide transition-colors",
                              inspectorTab === tab
                                ? "bg-indigo-50 text-indigo-700"
                                : "text-ink-3 hover:text-ink-1",
                            ].join(" ")}
                          >
                            {tab === "config" ? "Config" : "Contract"}
                          </button>
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip content={
                          validationReport.issues.filter((i) => i.severity === "error").length === 0
                            ? "No validation errors"
                            : `${validationReport.issues.filter((i) => i.severity === "error").length} validation errors`
                        }>
                          <span><ValidationBadge severity={validationReport.issues.filter((i) => i.severity === "error").length === 0 ? "info" : "warning"} /></span>
                        </Tooltip>
                        <Dropdown>
                          <DropdownTrigger>
                            <div role="button" tabIndex={0} aria-label="More inspector options" className="inline-flex items-center gap-1 h-7 px-2 rounded-md text-ink-3 hover:text-ink-1 hover:bg-[var(--surface-subtle)] transition-colors cursor-pointer text-xs"><MoreHorizontal size={13} /> More</div>
                          </DropdownTrigger>
                          <Dropdown.Popover>
                            <DropdownMenu aria-label="Inspector overflow">
                              <DropdownItem id="validation" onAction={() => setValidationDialogOpen(true)}>Validation report</DropdownItem>
                              <DropdownItem id="docs" onAction={() => window.open("/docs", "_blank")}>Open in docs</DropdownItem>
                            </DropdownMenu>
                          </Dropdown.Popover>
                        </Dropdown>
                      </div>
                    </div>
                    {inspectorTab === "advanced" && selectedDefinition ? (
                      <div className="space-y-4">
                        {(["input", "output"] as Array<"input" | "output">).map((side) => (
                          <div key={side} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="t-caption font-semibold text-ink-2 uppercase tracking-wide">{side}</p>
                              <select
                                value={selectedDefinition[side].portType}
                                onChange={(e) => updateNodeDefinition(selectedNode.id, (cur) => ({ ...cur, [side]: { ...cur[side], portType: e.target.value as ContractType } }))}
                                className="h-7 rounded border border-line surface-canvas px-1.5 t-caption text-ink-1 outline-none focus:border-indigo-400"
                              >
                                {(["string","number","boolean","json","event","file","any"] as ContractType[]).map((t) => (
                                  <option key={t} value={t}>{t}</option>
                                ))}
                              </select>
                            </div>
                            {selectedDefinition[side].fields.map((field) => (
                              <div key={field.id} className="flex items-center gap-1.5 group">
                                <Input
                                  value={field.key}
                                  onChange={(e) => updateDefinitionField(side, field.id, { key: e.target.value })}
                                  placeholder="field_name"
                                  className="flex-1 text-[11px]"
                                />
                                <select
                                  value={field.type}
                                  onChange={(e) => updateDefinitionField(side, field.id, { type: e.target.value as ContractType })}
                                  className="h-8 rounded border border-line surface-canvas px-1 t-caption text-ink-1 outline-none focus:border-indigo-400"
                                >
                                  {(["string","number","boolean","json","event","file","any"] as ContractType[]).map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                  ))}
                                </select>
                                <label className="flex items-center gap-0.5 t-caption text-ink-3 shrink-0">
                                  <input
                                    type="checkbox"
                                    checked={field.required}
                                    onChange={(e) => updateDefinitionField(side, field.id, { required: e.target.checked })}
                                    className="rounded border-line-strong"
                                  />
                                  req
                                </label>
                                <button
                                  type="button"
                                  onClick={() => removeDefinitionField(side, field.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-4 hover:text-red-500"
                                  aria-label="Remove field"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={() => addDefinitionField(side)}>
                              <Plus size={12} /> Add {side} field
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    {inspectorTab === "config" && selectedDefinition ? (
                      <div className="space-y-4">
                        {/* Identity inline at the top: title + description. */}
                        <div key={selectedNode.id} className="space-y-2">
                          <Input defaultValue={selectedNode.title} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, title: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, title: selectedNode.title })} placeholder="Title" />
                          <Input defaultValue={selectedNode.description ?? ""} onBlur={(e) => recordAction({ action: "updateNode", nodeId: selectedNode.id, description: e.target.value }, { action: "updateNode", nodeId: selectedNode.id, description: selectedNode.description ?? "" })} placeholder="Description" />
                        </div>
                        {(() => {
                          const fields = getConfigSchema(selectedNode.type as NodeType);
                          if (fields.length === 0) return null;
                          return (
                            <div className="space-y-3 border-t border-line pt-3">
                              <p className="t-caption font-semibold text-ink-2 uppercase tracking-wide">Configuration</p>
                              {fields.map((field) => (
                                <div key={field.key} className="space-y-1">
                                  <label className="t-caption font-medium text-ink-2">
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
                                        className="rounded border-line-strong"
                                      />
                                      <span className="t-caption text-ink-3">{field.description ?? field.label}</span>
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
                                    <p className="t-caption text-ink-3">{field.description}</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                        <Textarea value={selectedDefinition.configNotes ?? ""} onChange={(e) => updateNodeDefinition(selectedNode.id, (current) => ({ ...current, configNotes: e.target.value }))} placeholder="Notes" rows={2} />
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 flex-wrap mt-3">
                      <Button variant="danger-soft" size="sm" onClick={() => {
                        recordAction({ action: "deleteNode", nodeId: selectedNode.id }, { action: "addNode", systemId, type: selectedNode.type, title: selectedNode.title, description: selectedNode.description, x: selectedNode.position.x, y: selectedNode.position.y });
                        setSelectedNodeIds([]);
                      }}><Trash2 size={14} /> Delete Node</Button>
                      <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: "sourcePort", nodeId: selectedNode.id, at: selectedNode.position })}>Add Downstream</Button>
                      <Button variant="ghost" size="sm" onClick={() => openInsertPalette({ mode: "targetPort", nodeId: selectedNode.id, at: selectedNode.position })}>Add Upstream</Button>
                    </div>
                  </Card>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
                    <div className="w-8 h-8 rounded-full bg-[var(--surface-subtle)] flex items-center justify-center">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><rect x="2" y="2" width="5" height="5" rx="1" fill="#C7C7CC"/><rect x="9" y="2" width="5" height="5" rx="1" fill="#C7C7CC"/><rect x="2" y="9" width="5" height="5" rx="1" fill="#C7C7CC"/><rect x="9" y="9" width="5" height="5" rx="1" fill="#EBEBEB"/></svg>
                    </div>
                    <p className="t-caption text-ink-4">Click a node to edit it</p>
                  </div>
                )}
              </>
            )}
          </Panel>
        </EditorErrorBoundary>
        )}
      </div>
      {paletteOpen ? (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-20" onClick={() => setPaletteOpen(false)}>
          <div className="w-full max-w-lg surface-canvas rounded-2xl shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
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

      {showConnectModal && (
        <ConnectAgentModal
          systemId={systemId}
          systemName={data.system.name}
          onClose={() => setShowConnectModal(false)}
        />
      )}
      {showPublishModal && (
        <PublishToMarketplaceModal
          systemId={systemId}
          systemName={data.system.name}
          onClose={() => setShowPublishModal(false)}
        />
      )}
      <PortAffordance
        anchor={portAffordance?.anchor ?? null}
        port={portAffordance?.port ?? null}
        onClose={() => setPortAffordance(null)}
        onConnect={(p) => {
          // Open the insert-node palette positioned to add a node downstream
          // (output port) or upstream (input port).
          openInsertPalette({
            mode: p.direction === "output" ? "sourcePort" : "targetPort",
            nodeId: p.nodeId,
          });
        }}
        onDisconnect={(pipeId) => {
          const edge = pipes.find((p) => p.id === pipeId);
          if (!edge?.fromNodeId || !edge.toNodeId) return;
          recordAction(
            { action: "deletePipe", pipeId },
            { action: "addPipe", systemId, fromNodeId: edge.fromNodeId, toNodeId: edge.toNodeId },
          );
        }}
        onEditType={(nodeId, dir) => {
          // Cycle to the next port type — edit-in-place. The dialog is owned
          // by the affordance; we just mutate the definition map.
          const node = nodes.find((n) => n.id === nodeId);
          if (!node) return;
          updateNodeDefinition(nodeId, (current) => ({
            ...current,
            [dir === "input" ? "input" : "output"]: {
              ...current[dir === "input" ? "input" : "output"],
            },
          }));
        }}
        onHighlightPipe={(pipeId) => {
          setSelectedEdgeIds([pipeId]);
        }}
      />
      <Dialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        title="Validation report"
        description="Errors and warnings for this system."
        size="md"
      >
        <div className="space-y-2">
          {validationReport.issues.length === 0 ? (
            <p className="t-label text-ink-3">No issues found.</p>
          ) : (
            validationReport.issues.map((issue) => (
              <div
                key={issue.id}
                className={["flex items-start gap-2 p-2 border border-line rounded-md", issue.nodeId ? "cursor-pointer hover:border-indigo-300 hover:bg-indigo-50/40 transition-colors" : ""].join(" ")}
                onClick={issue.nodeId ? () => { setSelectedNodeIds([issue.nodeId!]); setValidationDialogOpen(false); } : undefined}
              >
                <ValidationBadge severity={issue.severity} />
                <div className="flex-1 min-w-0">
                  <p className="t-caption text-ink-2">{issue.message}</p>
                  {issue.nodeId && <p className="t-caption text-indigo-600 mt-0.5">Click to select node</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </Dialog>
      <Dialog
        open={metadataDialogOpen}
        onOpenChange={setMetadataDialogOpen}
        title="Node metadata"
        description="Raw definition JSON for this node."
        size="md"
      >
        <pre className="bg-[#111] text-[#e5e7eb] t-caption font-mono p-3 rounded-md overflow-auto max-h-80 whitespace-pre-wrap">
          {selectedNode ? JSON.stringify(selectedNode, null, 2) : "No selection."}
        </pre>
      </Dialog>
    </div>
  );
}

function MockEditorWorkspace({ systemId, initialPrompt }: { systemId: string; initialPrompt?: string }) {
  const [data, setData] = useState<SystemPayload | null>(null);
  const [notFound, setNotFound] = useState(false);
  // Signature of the last applied bundle. The poll re-fetches every 1.5s, but
  // an unchanged response must NOT setState — a fresh object graph would hand
  // xyflow new array references and trigger the whole StoreUpdater re-render
  // churn for nothing. Comparing a cheap signature makes the steady state free.
  const lastSigRef = useRef<string | null>(null);
  const load = useCallback(async (force = false) => {
    if (notFound) return;
    // Don't poll a backgrounded tab — pure waste until the user returns.
    if (!force && typeof document !== "undefined" && document.visibilityState === "hidden") return;
    const systemRes = await fetch(`/api/systems/${systemId}`, { cache: "no-store" });
    const systemData = await systemRes.json() as { ok: boolean; data?: SystemPayload };
    if (systemData.ok && systemData.data) {
      const sig = JSON.stringify(systemData.data);
      if (sig !== lastSigRef.current) {
        lastSigRef.current = sig;
        setData(systemData.data);
      }
    } else if (!systemData.ok) {
      setNotFound(true);
    }
  }, [systemId, notFound]);

  useEffect(() => {
    void load(true);
    const interval = setInterval(() => { void load(); }, 1500);
    // Refresh immediately when the tab regains focus so nothing feels stale.
    const onVisible = () => { if (document.visibilityState === "visible") void load(true); };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load]);

  const reload = useCallback(() => load(true), [load]);
  return <EditorWorkspaceView systemId={systemId} data={data} notFound={notFound} reload={reload} initialPrompt={initialPrompt} />;
}

function RealEditorWorkspace({ systemId, initialPrompt }: { systemId: string; initialPrompt?: string }) {
  const bundle = useQuery(api.app.getSystemBundle, { systemId: systemId as never });
  const notFound = bundle === null;
  const data = bundle ? normalizeBundle(bundle) : null;
  return <EditorWorkspaceView systemId={systemId} data={data} notFound={notFound} reload={() => {}} initialPrompt={initialPrompt} />;
}

export function EditorWorkspace({ systemId, initialPrompt }: { systemId: string; initialPrompt?: string }) {
  if (!clientRuntimeFlags.useMocks && clientRuntimeFlags.hasConvex) return <RealEditorWorkspace systemId={systemId} initialPrompt={initialPrompt} />;
  return <MockEditorWorkspace systemId={systemId} initialPrompt={initialPrompt} />;
}
