import { describe, expect, it } from "vitest";
import { deriveSaveState, popRedo, popUndo, pushHistory, type HistoryState } from "@/components/editor/editor_state";

describe("editor history + autosave state", () => {
  it("supports push undo redo semantics", () => {
    let state: HistoryState = { undo: [], redo: [] };
    state = pushHistory(state, { forward: [{ action: "addNode", systemId: "s", type: "Agent", title: "A" }], inverse: [{ action: "deleteNode", nodeId: "n1" }], at: 1 });
    expect(state.undo).toHaveLength(1);
    const undone = popUndo(state);
    expect(undone.entry?.forward[0].action).toBe("addNode");
    const redone = popRedo(undone.state);
    expect(redone.entry?.inverse[0].action).toBe("deleteNode");
  });

  it("coalesces node move history windows", () => {
    let state: HistoryState = { undo: [], redo: [] };
    state = pushHistory(state, { forward: [{ action: "updateNode", nodeId: "n", position: { x: 1, y: 1 } }], inverse: [{ action: "updateNode", nodeId: "n", position: { x: 0, y: 0 } }], coalesceKey: "move:n", at: 1000 });
    state = pushHistory(state, { forward: [{ action: "updateNode", nodeId: "n", position: { x: 2, y: 2 } }], inverse: [{ action: "updateNode", nodeId: "n", position: { x: 1, y: 1 } }], coalesceKey: "move:n", at: 1200 });
    expect(state.undo).toHaveLength(1);
    expect(state.undo[0].inverse[0]).toEqual({ action: "updateNode", nodeId: "n", position: { x: 0, y: 0 } });
  });

  it("derives save states", () => {
    expect(deriveSaveState({ queueLength: 0, inFlight: false, failed: 0 })).toBe("saved");
    expect(deriveSaveState({ queueLength: 1, inFlight: false, failed: 0 })).toBe("unsaved");
    expect(deriveSaveState({ queueLength: 2, inFlight: true, failed: 0 })).toBe("saving");
    expect(deriveSaveState({ queueLength: 5, inFlight: true, failed: 0 })).toBe("sync_delayed");
    expect(deriveSaveState({ queueLength: 5, inFlight: true, failed: 1 })).toBe("error");
  });
});
