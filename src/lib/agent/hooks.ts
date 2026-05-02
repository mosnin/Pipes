"use client";

// useAgentBuild — subscribes to /api/agent/build for one system, holds the
// conversation surface state, and exposes send / stop. Implements the timing
// escalations from docs/agent-contract.md (100 ms placeholder, 5 s upgrade,
// 30 s retry) by tracking firstEventReceivedAt and a derived placeholder hint.
//
// Phase 5 wires the optimistic apply contract: every tool_result with an action
// mutates the local canvas IMMEDIATELY through the editor's existing
// localApply + queue, and the entire turn collapses to ONE composite undo
// entry. Manual edits during a turn cancel the build (one rule, predictable).

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { startAgentBuild } from "@/lib/agent/client";
import type {
  AgentBuildState,
  AgentChatMessage,
  AgentToolCallRecord,
  PlaceholderHint,
  UseAgentBuildResult,
} from "@/lib/agent/hook_types";
import type {
  AgentEvent,
  ErrorEvent,
  StatusEvent,
} from "@/lib/agent/types";
import type {
  EditorGraphAction,
  GraphNode,
  GraphPipe,
} from "@/components/editor/editor_state";

const SPINNING_UP_AFTER_MS = 5_000;
const CONNECTION_FAILED_AFTER_MS = 30_000;

// Each tool_result lands on the canvas at most once every APPLY_THROTTLE_MS.
// The Convex queue still flushes actions as fast as they come; only the React
// state setter is paced. This is the "80 to 120 ms per beat" of the contract.
const APPLY_THROTTLE_MS = 100;

type Timers = { spinningUp: number | null; failed: number | null };

const NO_TIMERS: Timers = { spinningUp: null, failed: null };

function clearTimers(timers: Timers): void {
  if (timers.spinningUp !== null) window.clearTimeout(timers.spinningUp);
  if (timers.failed !== null) window.clearTimeout(timers.failed);
}

// The bridge the editor passes in so the hook can drive the canvas. The editor
// owns nodes/pipes/queue/history; the hook owns the SSE stream and the turn
// lifecycle. They meet through this interface.
export type AgentApplyContext = {
  // Apply one EditorGraphAction to the local canvas + optimistic queue. Does
  // NOT push history — the composite entry is pushed once on endTurn.
  applyAction: (action: EditorGraphAction, turnId: string) => void;
  // Snapshot the pre-turn state. Called once at the first reliable signal of
  // a new turn (the first tool_call).
  beginTurn: (turnId: string) => void;
  // Push the composite history entry that bundles the turn. Called on `done`
  // or terminal `error`. Idempotent — calling it twice for the same turn id
  // is a no-op on the second call.
  endTurn: (turnId: string) => void;
  // Bumped by the editor on every manual canvas edit. The hook reads it to
  // detect "user took over mid-build" and aborts the SSE stream.
  userInteractedAt: { current: number };
};

export function useAgentBuild(
  systemId: string,
  ctx?: AgentApplyContext,
): UseAgentBuildResult {
  const [state, setState] = useState<AgentBuildState>("idle");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<AgentChatMessage[]>([]);
  const [toolCalls, setToolCalls] = useState<AgentToolCallRecord[]>([]);
  const [error, setError] = useState<{ code: string; message: string; retryable: boolean } | undefined>();
  const [statusState, setStatusState] = useState<StatusEvent["state"] | undefined>();
  const [activeToolName, setActiveToolName] = useState<string | undefined>();
  const [startedAt, setStartedAt] = useState<number | undefined>();
  const [finishedAt, setFinishedAt] = useState<number | undefined>();
  const [placeholderHint, setPlaceholderHint] = useState<PlaceholderHint>("idle");

  const abortRef = useRef<AbortController | null>(null);
  const timersRef = useRef<Timers>(NO_TIMERS);
  const turnHasFirstEventRef = useRef<boolean>(false);
  const currentAssistantMessageRef = useRef<string>("");

  // Per-turn state. `currentTurnIdRef` is a client-generated id used until the
  // server returns a real turnId on `done`. `turnStartedAtRef` is the moment
  // we called send() — anything bumped on the userInteractedAt ref AFTER this
  // moment counts as a manual takeover.
  const currentTurnIdRef = useRef<string | null>(null);
  const turnStartedAtRef = useRef<number>(0);
  const turnEndedRef = useRef<boolean>(false);
  const toolCallsSeenRef = useRef<number>(0);

  // Throttle queue for applying tool_result actions. Each tool_result enqueues
  // one item; the scheduler drains it at one item per APPLY_THROTTLE_MS.
  const applyQueueRef = useRef<Array<{ action: EditorGraphAction; turnId: string }>>([]);
  const applyTimerRef = useRef<number | null>(null);
  const lastAppliedAtRef = useRef<number>(0);
  const ctxRef = useRef<AgentApplyContext | undefined>(ctx);
  // Sync the ref to the latest ctx in an effect (writing during render
  // tripped a lint rule and is also incorrect in concurrent rendering).
  useEffect(() => { ctxRef.current = ctx; }, [ctx]);

  // Forward declaration via a ref so the timer callback can reach the function
  // without depending on it before it's declared.
  const drainApplyQueueRef = useRef<() => void>(() => {});

  const drainApplyQueue = useCallback(() => {
    applyTimerRef.current = null;
    const item = applyQueueRef.current.shift();
    if (!item) return;
    const c = ctxRef.current;
    if (c) c.applyAction(item.action, item.turnId);
    lastAppliedAtRef.current = Date.now();
    if (applyQueueRef.current.length > 0) {
      applyTimerRef.current = window.setTimeout(() => drainApplyQueueRef.current(), APPLY_THROTTLE_MS);
    }
  }, []);
  useEffect(() => { drainApplyQueueRef.current = drainApplyQueue; }, [drainApplyQueue]);

  const scheduleApply = useCallback((action: EditorGraphAction, turnId: string) => {
    applyQueueRef.current.push({ action, turnId });
    if (applyTimerRef.current !== null) return;
    const elapsed = Date.now() - lastAppliedAtRef.current;
    const wait = elapsed >= APPLY_THROTTLE_MS ? 0 : APPLY_THROTTLE_MS - elapsed;
    applyTimerRef.current = window.setTimeout(() => drainApplyQueueRef.current(), wait);
  }, []);

  const flushApplyQueueImmediately = useCallback(() => {
    // Drain everything pending without waiting for the throttle. Used on done
    // so the final state is on screen by the time the chat says we are done.
    if (applyTimerRef.current !== null) {
      window.clearTimeout(applyTimerRef.current);
      applyTimerRef.current = null;
    }
    while (applyQueueRef.current.length > 0) {
      const item = applyQueueRef.current.shift();
      if (!item) break;
      const c = ctxRef.current;
      if (c) c.applyAction(item.action, item.turnId);
    }
    lastAppliedAtRef.current = Date.now();
  }, []);

  const armTimers = useCallback(() => {
    clearTimers(timersRef.current);
    timersRef.current = {
      spinningUp: window.setTimeout(() => {
        if (!turnHasFirstEventRef.current) setPlaceholderHint("spinning_up");
      }, SPINNING_UP_AFTER_MS),
      failed: window.setTimeout(() => {
        if (!turnHasFirstEventRef.current) {
          setPlaceholderHint("failed");
          setState("error");
          setError({ code: "timeout", message: "Connection failed", retryable: true });
          if (abortRef.current) abortRef.current.abort();
        }
      }, CONNECTION_FAILED_AFTER_MS),
    };
  }, []);

  const disarmTimers = useCallback(() => {
    clearTimers(timersRef.current);
    timersRef.current = NO_TIMERS;
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      disarmTimers();
      if (abortRef.current) abortRef.current.abort();
      if (applyTimerRef.current !== null) {
        window.clearTimeout(applyTimerRef.current);
        applyTimerRef.current = null;
      }
    };
  }, [disarmTimers]);

  // Manual edit during a build cancels the build. One rule. We poll the
  // userInteractedAt ref while a turn is in flight; the moment it bumps past
  // turnStartedAtRef we abort the SSE stream and surface a "Stopped" message.
  // Polling is cheap (one ref read per 80 ms) and avoids forcing the editor
  // to re-render on every interaction.
  useEffect(() => {
    if (state !== "running" && state !== "connecting") return;
    if (!ctx) return;
    const id = window.setInterval(() => {
      if (!ctx) return;
      if (ctx.userInteractedAt.current > turnStartedAtRef.current) {
        // User edited the canvas mid-build. Abort cleanly.
        const turnId = currentTurnIdRef.current;
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = null;
        disarmTimers();
        flushApplyQueueImmediately();
        if (turnId && !turnEndedRef.current) {
          turnEndedRef.current = true;
          ctx.endTurn(turnId);
        }
        setState("stopped");
        setFinishedAt(Date.now());
        setStatusState(undefined);
        setActiveToolName(undefined);
        setPlaceholderHint("idle");
        setMessages((prev) => [
          ...prev,
          {
            id: `s_${Date.now()}`,
            role: "assistant",
            text: "Stopped because you started editing.",
            ts: new Date().toISOString(),
          },
        ]);
        window.clearInterval(id);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [ctx, disarmTimers, flushApplyQueueImmediately, state]);

  const handleEvent = useCallback(
    (event: AgentEvent) => {
      // The first event of any kind ends the cold-start placeholder window.
      if (!turnHasFirstEventRef.current) {
        turnHasFirstEventRef.current = true;
        setPlaceholderHint("running");
      }

      if (event.type === "status") {
        setStatusState(event.data.state);
        setActiveToolName(event.data.tool_name);
        return;
      }

      if (event.type === "tool_call") {
        // First tool_call of a turn is the earliest reliable point to snapshot
        // pre-turn state for the composite undo entry.
        const c = ctxRef.current;
        const turnId = currentTurnIdRef.current;
        if (c && turnId && !turnEndedRef.current && toolCallsSeenRef.current === 0) {
          c.beginTurn(turnId);
        }
        toolCallsSeenRef.current += 1;
        setToolCalls((prev) => [
          ...prev,
          {
            id: event.data.id,
            toolName: event.data.tool_name,
            argsLabel: summarizeArgs(event.data.tool_name, event.data.arguments),
          },
        ]);
        return;
      }

      if (event.type === "tool_result") {
        setToolCalls((prev) =>
          prev.map((entry) =>
            entry.id === event.data.id ? { ...entry, ok: event.data.ok } : entry,
          ),
        );
        if (event.data.action) {
          const turnId = currentTurnIdRef.current;
          // If a context is wired, schedule an optimistic apply through the
          // editor. Otherwise the action is silently dropped; this is by
          // design — the chat surface still works in environments without an
          // editor (e.g. the agent test fixture page) and the server is the
          // source of truth either way.
          if (ctxRef.current && turnId) {
            scheduleApply(event.data.action, turnId);
          }
        }
        return;
      }

      if (event.type === "message") {
        currentAssistantMessageRef.current += event.data.text;
        const text = currentAssistantMessageRef.current;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            return [...prev.slice(0, -1), { ...last, text }];
          }
          return [
            ...prev,
            {
              id: `m_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              role: "assistant",
              text,
              ts: new Date().toISOString(),
              streaming: true,
            },
          ];
        });
        return;
      }

      if (event.type === "done") {
        setConversationId(event.data.conversationId);
        setState("idle");
        setFinishedAt(Date.now());
        setStatusState(undefined);
        setActiveToolName(undefined);
        setPlaceholderHint("idle");
        currentAssistantMessageRef.current = "";
        // Mark any streaming assistant message as finalized.
        setMessages((prev) =>
          prev.map((m) => (m.streaming ? { ...m, streaming: false } : m)),
        );
        // Drain any pending throttled applies so the final canvas matches the
        // turn the agent declared done.
        flushApplyQueueImmediately();
        const c = ctxRef.current;
        const turnId = currentTurnIdRef.current;
        if (c && turnId && !turnEndedRef.current) {
          turnEndedRef.current = true;
          c.endTurn(turnId);
        }
        disarmTimers();
        return;
      }

      if (event.type === "error") {
        const e: ErrorEvent = event.data;
        setError({ code: String(e.code), message: e.message, retryable: Boolean(e.retryable) });
        setState("error");
        setFinishedAt(Date.now());
        setStatusState(undefined);
        setActiveToolName(undefined);
        setPlaceholderHint("failed");
        flushApplyQueueImmediately();
        const c = ctxRef.current;
        const turnId = currentTurnIdRef.current;
        if (c && turnId && !turnEndedRef.current) {
          turnEndedRef.current = true;
          c.endTurn(turnId);
        }
        disarmTimers();
        return;
      }
    },
    [disarmTimers, flushApplyQueueImmediately, scheduleApply],
  );

  const send = useCallback(
    (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;
      if (state === "running" || state === "connecting") return;

      // Reset per-turn local state.
      setError(undefined);
      setFinishedAt(undefined);
      setStartedAt(Date.now());
      setActiveToolName(undefined);
      setStatusState(undefined);
      setToolCalls([]);
      currentAssistantMessageRef.current = "";
      turnHasFirstEventRef.current = false;
      toolCallsSeenRef.current = 0;
      turnEndedRef.current = false;
      setPlaceholderHint("building");
      setState("connecting");

      // Generate a client-side turn id so we can begin/end the composite undo
      // entry before the server returns its real turnId on `done`.
      const turnId = `turn_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      currentTurnIdRef.current = turnId;
      turnStartedAtRef.current = Date.now();

      // Append the user's prompt to the chat surface immediately.
      const userMessage: AgentChatMessage = {
        id: `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        role: "user",
        text,
        ts: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Wire the abort controller and the cold-start escalation timers.
      const controller = new AbortController();
      abortRef.current = controller;
      armTimers();

      setState("running");

      void startAgentBuild({
        request: { systemId, prompt: text, conversationId },
        onEvent: handleEvent,
        signal: controller.signal,
      })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return;
          setError({
            code: "internal",
            message: err instanceof Error ? err.message : "Connection failed",
            retryable: true,
          });
          setState("error");
          setPlaceholderHint("failed");
          setFinishedAt(Date.now());
          // Close the composite undo entry even on transport failure so any
          // tool_results that already landed are bundled into one undo step.
          flushApplyQueueImmediately();
          const c = ctxRef.current;
          const tid = currentTurnIdRef.current;
          if (c && tid && !turnEndedRef.current) {
            turnEndedRef.current = true;
            c.endTurn(tid);
          }
        })
        .finally(() => {
          disarmTimers();
          if (abortRef.current === controller) abortRef.current = null;
        });
    },
    [armTimers, conversationId, disarmTimers, flushApplyQueueImmediately, handleEvent, state, systemId],
  );

  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    disarmTimers();
    flushApplyQueueImmediately();
    const c = ctxRef.current;
    const turnId = currentTurnIdRef.current;
    if (c && turnId && !turnEndedRef.current) {
      turnEndedRef.current = true;
      c.endTurn(turnId);
    }
    setState("stopped");
    setFinishedAt(Date.now());
    setStatusState(undefined);
    setActiveToolName(undefined);
    setPlaceholderHint("idle");
    setMessages((prev) => [
      ...prev,
      {
        id: `s_${Date.now()}`,
        role: "assistant",
        text: "Stopped.",
        ts: new Date().toISOString(),
      },
    ]);
  }, [disarmTimers, flushApplyQueueImmediately]);

  const result = useMemo<UseAgentBuildResult>(
    () => ({
      state,
      conversationId,
      messages,
      toolCalls,
      send,
      stop,
      error,
      startedAt,
      finishedAt,
      statusState,
      activeToolName,
      placeholderHint,
    }),
    [
      activeToolName,
      conversationId,
      error,
      finishedAt,
      messages,
      placeholderHint,
      send,
      startedAt,
      state,
      statusState,
      stop,
      toolCalls,
    ],
  );

  return result;
}

function summarizeArgs(tool: string, args: Record<string, unknown>): string {
  if (tool === "add_node") {
    const title = typeof args.title === "string" ? args.title : "node";
    return `"${title}"`;
  }
  if (tool === "add_pipe") {
    const from = typeof args.fromNodeId === "string" ? args.fromNodeId : "?";
    const to = typeof args.toNodeId === "string" ? args.toNodeId : "?";
    return `${from} -> ${to}`;
  }
  if (tool === "update_node") {
    const id = typeof args.nodeId === "string" ? args.nodeId : "?";
    return id;
  }
  if (tool === "delete_node") {
    const id = typeof args.nodeId === "string" ? args.nodeId : "?";
    return id;
  }
  if (tool === "validate") return "system";
  return "";
}

// Re-exported types to keep editor imports tidy.
export type { GraphNode, GraphPipe };
