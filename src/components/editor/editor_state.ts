export type GraphNode = { id: string; type: string; title: string; description?: string; position: { x: number; y: number }; portIds: string[]; config?: Record<string, unknown> };
export type GraphPipe = { id: string; fromPortId: string; toPortId: string; systemId: string; fromNodeId?: string; toNodeId?: string };

export type EditorGraphAction =
  | { action: "addNode"; systemId: string; type: string; title: string; description?: string; x?: number; y?: number; clientNodeId?: string }
  | { action: "updateNode"; nodeId: string; title?: string; description?: string; position?: { x: number; y: number }; config?: Record<string, unknown> }
  | { action: "deleteNode"; nodeId: string }
  | { action: "addPipe"; systemId: string; fromNodeId: string; toNodeId: string; clientPipeId?: string }
  | { action: "deletePipe"; pipeId: string };

// Two history entry shapes:
//
// - "simple" (default, preserves existing API): forward + inverse action lists.
//   Manual edits push these. Undo replays the inverse list.
// - "composite": one entry that bundles a whole agent turn. Contains a snapshot
//   of nodes and pipes from BEFORE the turn started, plus the ordered list of
//   applied actions. Undo restores the snapshot in one shot — no per-action
//   replay — so a single Cmd-Z rewinds an entire agent turn.
//
// `kind` is optional on a simple entry so callers that build literal
// `{ forward, inverse, at }` objects keep working without changes.
export type HistoryEntry = {
  kind?: "simple" | "composite";
  forward: EditorGraphAction[];
  inverse: EditorGraphAction[];
  coalesceKey?: string;
  at: number;
  // Composite-only fields. Populated when kind === "composite".
  turnId?: string;
  priorNodes?: GraphNode[];
  priorPipes?: GraphPipe[];
  postNodes?: GraphNode[];
  postPipes?: GraphPipe[];
};

export type HistoryState = { undo: HistoryEntry[]; redo: HistoryEntry[] };

export function pushHistory(state: HistoryState, entry: HistoryEntry, coalesceWindowMs = 700): HistoryState {
  // Composite entries never coalesce — each agent turn is its own atomic unit.
  if (entry.kind === "composite") {
    return { undo: [...state.undo, entry], redo: [] };
  }
  const last = state.undo[state.undo.length - 1];
  // Don't coalesce a simple entry into a composite entry either.
  if (last && last.kind !== "composite" && last.coalesceKey && last.coalesceKey === entry.coalesceKey && entry.at - last.at <= coalesceWindowMs) {
    const merged: HistoryEntry = { ...entry, inverse: last.inverse };
    return { undo: [...state.undo.slice(0, -1), merged], redo: [] };
  }
  return { undo: [...state.undo, entry], redo: [] };
}

export function popUndo(state: HistoryState): { state: HistoryState; entry?: HistoryEntry } {
  const entry = state.undo[state.undo.length - 1];
  if (!entry) return { state };
  return { entry, state: { undo: state.undo.slice(0, -1), redo: [...state.redo, entry] } };
}

export function popRedo(state: HistoryState): { state: HistoryState; entry?: HistoryEntry } {
  const entry = state.redo[state.redo.length - 1];
  if (!entry) return { state };
  return { entry, state: { undo: [...state.undo, entry], redo: state.redo.slice(0, -1) } };
}

export type SaveState = "saved" | "saving" | "unsaved" | "sync_delayed" | "error";
export function deriveSaveState(input: { queueLength: number; inFlight: boolean; failed: number }): SaveState {
  if (input.failed > 0) return "error";
  if (input.inFlight && input.queueLength > 3) return "sync_delayed";
  if (input.inFlight) return "saving";
  if (input.queueLength > 0) return "unsaved";
  return "saved";
}
