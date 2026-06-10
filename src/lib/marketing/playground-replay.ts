/**
 * playground-replay
 *
 * Shared SSE-style replay engine used by the floating "Try it" widget and the
 * embedded mini-canvases. The /play page has its own bespoke loop because it
 * drives an xyflow canvas. The marketing surface drives `<AnimatedCanvas>`,
 * which only needs a single `progress` value, so this engine is intentionally
 * smaller: it walks an array of frames (real fixture or synthesized from the
 * starter catalog), respects per-frame delays, and emits a normalized progress
 * number plus the node/pipe ids that have arrived so far.
 *
 * No DOM. No React. Just an async runner the components drive.
 */
import type { StarterTemplate } from "@/domain/templates/catalog";

// ---------------------------------------------------------------------------
// Frame and event types — small mirror of the fixture format
// ---------------------------------------------------------------------------

export type ReplayFrameEvent =
  | "status"
  | "message"
  | "tool_call"
  | "tool_result"
  | "meta"
  | "done";

export interface ReplayFrame {
  event: ReplayFrameEvent;
  delay_ms?: number;
  data: Record<string, unknown>;
}

export interface ReplayTickState {
  /** 0..1 progress through the replay timeline. */
  progress: number;
  /** Ordered ids of nodes that have arrived so far. */
  nodeIds: string[];
  /** Ordered "fromId->toId" keys for pipes that have drawn so far. */
  pipeKeys: string[];
  /** Last status string ("thinking", tool name, etc). */
  status?: string;
  /** True after a `done` event fires or the frame list is exhausted. */
  done: boolean;
  /** Elapsed milliseconds since start (real wall clock when running). */
  elapsedMs: number;
}

export interface ReplayController {
  cancel: () => void;
}

// ---------------------------------------------------------------------------
// Fixture path lookup
// ---------------------------------------------------------------------------

export type FixtureKey = "customer-support" | "code-review" | "lead-qualifier";

const TEMPLATE_TO_FIXTURE: Record<string, FixtureKey> = {
  "customer-support-triage": "customer-support",
  "support-ops-system": "customer-support",
  "code-review-assistant": "code-review",
  "sales-lead-qualifier": "lead-qualifier",
};

/** Maps a starter id to a fixture key, or null when no fixture exists. */
export function fixtureKeyForTemplate(templateId: string): FixtureKey | null {
  return TEMPLATE_TO_FIXTURE[templateId] ?? null;
}

// ---------------------------------------------------------------------------
// Synthetic frame builder — used when no JSON fixture exists
// ---------------------------------------------------------------------------

/**
 * Build a synthetic frame list from a starter catalog entry. Each node lands
 * with a small delay; each pipe draws after both endpoints have landed.
 * This lets the embedded canvas animate any starter, not just the three with
 * hand-authored fixtures.
 */
export function buildSyntheticFrames(template: StarterTemplate): ReplayFrame[] {
  const frames: ReplayFrame[] = [];
  frames.push({ event: "status", delay_ms: 60, data: { state: "thinking" } });
  for (const node of template.nodes) {
    frames.push({
      event: "tool_call",
      delay_ms: 140,
      data: { tool_name: "add_node", arguments: { title: node.title } },
    });
    frames.push({
      event: "tool_result",
      delay_ms: 40,
      data: {
        action: {
          action: "addNode",
          systemId: "embed",
          type: node.type,
          title: node.title,
          description: node.description,
          x: node.x,
          y: node.y,
          clientNodeId: node.id,
        },
      },
    });
  }
  for (const pipe of template.pipes) {
    frames.push({
      event: "tool_call",
      delay_ms: 100,
      data: {
        tool_name: "add_pipe",
        arguments: { fromNodeId: pipe.fromNodeId, toNodeId: pipe.toNodeId },
      },
    });
    frames.push({
      event: "tool_result",
      delay_ms: 30,
      data: {
        action: {
          action: "addPipe",
          systemId: "embed",
          fromNodeId: pipe.fromNodeId,
          toNodeId: pipe.toNodeId,
          clientPipeId: `pipe_${pipe.fromNodeId}_${pipe.toNodeId}`,
        },
      },
    });
  }
  frames.push({ event: "done", delay_ms: 40, data: {} });
  return frames;
}

// ---------------------------------------------------------------------------
// Frame -> progress reducer
// ---------------------------------------------------------------------------

/**
 * Total work units in the replay. Each node arrival and each pipe arrival
 * counts as one unit; the leading "thinking" status counts as half so the
 * progress bar moves a bit before the first node lands.
 */
export function totalProgressUnits(frames: ReadonlyArray<ReplayFrame>): number {
  let nodes = 0;
  let pipes = 0;
  for (const f of frames) {
    if (f.event !== "tool_result") continue;
    const action = (f.data as { action?: { action?: string } }).action;
    if (action?.action === "addNode") nodes += 1;
    if (action?.action === "addPipe") pipes += 1;
  }
  return Math.max(1, nodes + pipes);
}

export interface ApplyFrameResult {
  state: ReplayTickState;
  /** True if the caller should keep walking frames after this one. */
  shouldContinue: boolean;
}

/**
 * Pure reducer. Applies a single frame against the running state. Has no
 * timer of its own — the runner orchestrates delays.
 */
export function applyFrame(
  prev: ReplayTickState,
  frame: ReplayFrame,
  totalUnits: number,
  elapsedMs: number,
): ApplyFrameResult {
  const next: ReplayTickState = {
    progress: prev.progress,
    nodeIds: prev.nodeIds.slice(),
    pipeKeys: prev.pipeKeys.slice(),
    status: prev.status,
    done: prev.done,
    elapsedMs,
  };

  if (frame.event === "status") {
    const stateName = (frame.data as { state?: string }).state;
    if (stateName) next.status = stateName;
    // Half a unit so the progress bar nudges before the first node arrives.
    next.progress = Math.min(1, Math.max(next.progress, 0.5 / (totalUnits + 1)));
    return { state: next, shouldContinue: true };
  }

  if (frame.event === "tool_call") {
    const tool = (frame.data as { tool_name?: string }).tool_name;
    if (tool) next.status = tool;
    return { state: next, shouldContinue: true };
  }

  if (frame.event === "tool_result") {
    const action = (frame.data as { action?: Record<string, unknown> }).action;
    if (action && (action as { action?: string }).action === "addNode") {
      const id =
        ((action as { clientNodeId?: string }).clientNodeId ?? "") ||
        `node_${next.nodeIds.length}`;
      if (!next.nodeIds.includes(id)) next.nodeIds.push(id);
    }
    if (action && (action as { action?: string }).action === "addPipe") {
      const from = (action as { fromNodeId?: string }).fromNodeId ?? "?";
      const to = (action as { toNodeId?: string }).toNodeId ?? "?";
      const key = `${from}->${to}`;
      if (!next.pipeKeys.includes(key)) next.pipeKeys.push(key);
    }
    const completed = next.nodeIds.length + next.pipeKeys.length;
    next.progress = Math.min(1, completed / totalUnits);
    return { state: next, shouldContinue: true };
  }

  if (frame.event === "done") {
    next.progress = 1;
    next.done = true;
    next.status = undefined;
    return { state: next, shouldContinue: false };
  }

  // "meta" and unknown events are advisory only.
  return { state: next, shouldContinue: true };
}

// ---------------------------------------------------------------------------
// Reduced-motion helper
// ---------------------------------------------------------------------------

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
}

// ---------------------------------------------------------------------------
// Fixture loader
// ---------------------------------------------------------------------------

/**
 * Loads a JSON fixture from /public/playground-fixtures. Returns null on
 * any failure so the caller can fall back to synthetic frames.
 */
export async function loadFixture(
  key: FixtureKey,
  signal?: AbortSignal,
): Promise<ReplayFrame[] | null> {
  try {
    const res = await fetch(`/playground-fixtures/${key}.json`, {
      cache: "force-cache",
      signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ReplayFrame[];
    if (!Array.isArray(data)) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// The runner — drives a list of frames against a tick callback
// ---------------------------------------------------------------------------

export interface RunReplayOptions {
  frames: ReadonlyArray<ReplayFrame>;
  onTick: (state: ReplayTickState) => void;
  /** Multiplier on every frame's delay_ms. Default 1. */
  speed?: number;
  /** Force reduced-motion mode: skip straight to the end with no delay. */
  reduceMotion?: boolean;
}

export function emptyTickState(): ReplayTickState {
  return {
    progress: 0,
    nodeIds: [],
    pipeKeys: [],
    status: undefined,
    done: false,
    elapsedMs: 0,
  };
}

/**
 * Runs a list of frames and calls `onTick` after each. Returns a controller
 * the caller can use to cancel early. The runner does not throw on cancel —
 * it simply stops emitting ticks.
 */
export function runReplay(opts: RunReplayOptions): ReplayController {
  const speed = Math.max(0.05, opts.speed ?? 1);
  const reduce = opts.reduceMotion ?? prefersReducedMotion();
  const totalUnits = totalProgressUnits(opts.frames);
  let cancelled = false;
  let state = emptyTickState();
  const startedAt =
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const sleep = (ms: number): Promise<void> => {
    if (ms <= 0) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const t = setTimeout(resolve, ms);
      // Best-effort cancel: clear the timer if we abort during sleep.
      cancelTimerRefs.push(() => clearTimeout(t));
    });
  };

  const cancelTimerRefs: Array<() => void> = [];

  const run = async () => {
    for (const frame of opts.frames) {
      if (cancelled) return;
      const delay = reduce ? 0 : Math.round((frame.delay_ms ?? 0) / speed);
      if (delay > 0) await sleep(delay);
      if (cancelled) return;
      const now =
        typeof performance !== "undefined" ? performance.now() : Date.now();
      const result = applyFrame(state, frame, totalUnits, now - startedAt);
      state = result.state;
      opts.onTick(state);
      if (!result.shouldContinue) return;
    }
    if (!cancelled && !state.done) {
      // Frame list ended without a `done` — mark done so progress hits 1.
      state = { ...state, progress: 1, done: true, status: undefined };
      opts.onTick(state);
    }
  };

  void run();

  return {
    cancel: () => {
      cancelled = true;
      for (const c of cancelTimerRefs) c();
    },
  };
}
