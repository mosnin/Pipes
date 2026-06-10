// Unit tests for the optimistic-apply wiring. Validates that a turn of
// tool_results mutates local state, collapses to ONE composite undo entry,
// and that Cmd-Z + Cmd-Shift-Z round-trip the entire turn in one shot.
//
// We exercise the editor_state primitives (localApply equivalent + history
// reducers) plus a thin mock of the EditorWorkspace's agentApply / beginTurn /
// endTurn loop. Rendering the full editor is out of scope — the test asserts
// the contract, not the React tree.

import { describe, expect, it } from "vitest";
import {
  type EditorGraphAction,
  type GraphNode,
  type GraphPipe,
  type HistoryState,
  popRedo,
  popUndo,
  pushHistory,
} from "@/components/editor/editor_state";

// Mirror of the editor's localApply. Kept here so the test does not depend
// on a non-exported helper inside EditorWorkspace.tsx.
function localApply(
  nodes: GraphNode[],
  pipes: GraphPipe[],
  action: EditorGraphAction,
): { nodes: GraphNode[]; pipes: GraphPipe[] } {
  if (action.action === "addNode") {
    const id = action.clientNodeId ?? `tmp_${Math.random().toString(36).slice(2, 9)}`;
    return {
      nodes: [
        ...nodes,
        {
          id,
          type: action.type,
          title: action.title,
          description: action.description,
          position: { x: action.x ?? 240, y: action.y ?? 180 },
          portIds: [`${id}_in`, `${id}_out`],
          config: {},
        },
      ],
      pipes,
    };
  }
  if (action.action === "addPipe") {
    const id = action.clientPipeId ?? `tmp_pipe_${Math.random().toString(36).slice(2, 9)}`;
    return {
      nodes,
      pipes: [
        ...pipes,
        {
          id,
          systemId: action.systemId,
          fromPortId: `${action.fromNodeId}_out`,
          toPortId: `${action.toNodeId}_in`,
          fromNodeId: action.fromNodeId,
          toNodeId: action.toNodeId,
        },
      ],
    };
  }
  if (action.action === "deleteNode") {
    return {
      nodes: nodes.filter((n) => n.id !== action.nodeId),
      pipes: pipes.filter((p) => p.fromNodeId !== action.nodeId && p.toNodeId !== action.nodeId),
    };
  }
  if (action.action === "deletePipe") {
    return { nodes, pipes: pipes.filter((p) => p.id !== action.pipeId) };
  }
  if (action.action === "updateNode") {
    return {
      nodes: nodes.map((n) =>
        n.id === action.nodeId
          ? {
              ...n,
              title: action.title ?? n.title,
              description: action.description ?? n.description,
              position: action.position ?? n.position,
              config: action.config !== undefined ? action.config : n.config,
            }
          : n,
      ),
      pipes,
    };
  }
  return { nodes, pipes };
}

// Thin reducer that mirrors the EditorWorkspace's agent path: snapshot on
// beginTurn, apply on every tool_result, push ONE composite history entry
// on endTurn. No throttling — that's a UI concern; the contract here is
// "one turn = one undo entry."
function makeEditor() {
  let nodes: GraphNode[] = [];
  let pipes: GraphPipe[] = [];
  let history: HistoryState = { undo: [], redo: [] };
  const turnSnapshots: Record<string, { nodes: GraphNode[]; pipes: GraphPipe[]; actions: EditorGraphAction[]; postNodes?: GraphNode[]; postPipes?: GraphPipe[] }> = {};

  return {
    get nodes() { return nodes; },
    get pipes() { return pipes; },
    get history() { return history; },
    beginTurn(turnId: string) {
      turnSnapshots[turnId] = { nodes, pipes, actions: [] };
    },
    apply(action: EditorGraphAction, turnId: string) {
      const snap = turnSnapshots[turnId];
      if (snap) snap.actions.push(action);
      const next = localApply(nodes, pipes, action);
      nodes = next.nodes;
      pipes = next.pipes;
    },
    endTurn(turnId: string) {
      const snap = turnSnapshots[turnId];
      if (!snap) return;
      delete turnSnapshots[turnId];
      if (snap.actions.length === 0) return;
      history = pushHistory(history, {
        kind: "composite",
        turnId,
        forward: snap.actions,
        inverse: [],
        priorNodes: snap.nodes,
        priorPipes: snap.pipes,
        postNodes: nodes,
        postPipes: pipes,
        at: Date.now(),
      });
    },
    undo() {
      const { entry, state } = popUndo(history);
      history = state;
      if (!entry) return;
      if (entry.kind === "composite" && entry.priorNodes && entry.priorPipes) {
        nodes = entry.priorNodes;
        pipes = entry.priorPipes;
      } else {
        // Simple entry: replay inverse actions.
        for (const action of entry.inverse) {
          const next = localApply(nodes, pipes, action);
          nodes = next.nodes;
          pipes = next.pipes;
        }
      }
    },
    redo() {
      const { entry, state } = popRedo(history);
      history = state;
      if (!entry) return;
      if (entry.kind === "composite" && entry.postNodes && entry.postPipes) {
        nodes = entry.postNodes;
        pipes = entry.postPipes;
      } else {
        for (const action of entry.forward) {
          const next = localApply(nodes, pipes, action);
          nodes = next.nodes;
          pipes = next.pipes;
        }
      }
    },
  };
}

describe("agent optimistic apply", () => {
  it("applies a turn of 3 tool_results and collapses to ONE composite undo entry", () => {
    const editor = makeEditor();
    const turnId = "turn_test_1";

    editor.beginTurn(turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Source", title: "Inbound", clientNodeId: "n1" }, turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Processor", title: "Classifier", clientNodeId: "n2" }, turnId);
    editor.apply({ action: "addPipe", systemId: "sys_1", fromNodeId: "n1", toNodeId: "n2", clientPipeId: "p1" }, turnId);
    editor.endTurn(turnId);

    // State mutated correctly.
    expect(editor.nodes).toHaveLength(2);
    expect(editor.nodes.map((n) => n.id)).toEqual(["n1", "n2"]);
    expect(editor.pipes).toHaveLength(1);
    expect(editor.pipes[0].fromNodeId).toBe("n1");
    expect(editor.pipes[0].toNodeId).toBe("n2");

    // Exactly ONE undo entry, kind = composite.
    expect(editor.history.undo).toHaveLength(1);
    expect(editor.history.undo[0].kind).toBe("composite");
    expect(editor.history.undo[0].turnId).toBe(turnId);
    expect(editor.history.undo[0].forward).toHaveLength(3);
  });

  it("Cmd-Z restores pre-turn state in one shot regardless of action count", () => {
    const editor = makeEditor();
    const turnId = "turn_test_2";

    editor.beginTurn(turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Source", title: "A", clientNodeId: "a" }, turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Processor", title: "B", clientNodeId: "b" }, turnId);
    editor.apply({ action: "addPipe", systemId: "sys_1", fromNodeId: "a", toNodeId: "b", clientPipeId: "ab" }, turnId);
    editor.endTurn(turnId);

    expect(editor.nodes).toHaveLength(2);
    expect(editor.pipes).toHaveLength(1);

    editor.undo();

    expect(editor.nodes).toEqual([]);
    expect(editor.pipes).toEqual([]);
    expect(editor.history.undo).toHaveLength(0);
    expect(editor.history.redo).toHaveLength(1);
  });

  it("Cmd-Shift-Z redoes the whole turn in one shot", () => {
    const editor = makeEditor();
    const turnId = "turn_test_3";

    editor.beginTurn(turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Source", title: "A", clientNodeId: "a" }, turnId);
    editor.apply({ action: "addNode", systemId: "sys_1", type: "Processor", title: "B", clientNodeId: "b" }, turnId);
    editor.apply({ action: "addPipe", systemId: "sys_1", fromNodeId: "a", toNodeId: "b", clientPipeId: "ab" }, turnId);
    editor.endTurn(turnId);

    editor.undo();
    expect(editor.nodes).toEqual([]);
    expect(editor.pipes).toEqual([]);

    editor.redo();
    expect(editor.nodes).toHaveLength(2);
    expect(editor.pipes).toHaveLength(1);
    expect(editor.history.undo).toHaveLength(1);
    expect(editor.history.redo).toHaveLength(0);
  });

  it("an empty turn (no tool_results) does not push a history entry", () => {
    const editor = makeEditor();
    editor.beginTurn("empty_turn");
    editor.endTurn("empty_turn");
    expect(editor.history.undo).toHaveLength(0);
  });

  it("composite entries do not coalesce with adjacent simple entries", () => {
    let h: HistoryState = { undo: [], redo: [] };
    h = pushHistory(h, {
      forward: [{ action: "updateNode", nodeId: "n", position: { x: 1, y: 1 } }],
      inverse: [{ action: "updateNode", nodeId: "n", position: { x: 0, y: 0 } }],
      coalesceKey: "move:n",
      at: 1000,
    });
    h = pushHistory(h, {
      kind: "composite",
      turnId: "t",
      forward: [{ action: "addNode", systemId: "s", type: "Source", title: "X", clientNodeId: "x" }],
      inverse: [],
      priorNodes: [],
      priorPipes: [],
      postNodes: [],
      postPipes: [],
      at: 1100,
    });
    expect(h.undo).toHaveLength(2);
    expect(h.undo[0].kind).not.toBe("composite");
    expect(h.undo[1].kind).toBe("composite");
  });
});
