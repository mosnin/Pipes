"use client";

// useAgentBuild — subscribes to /api/agent/build for one system, holds the
// conversation surface state, and exposes send / stop. Implements the timing
// escalations from docs/agent-contract.md (100 ms placeholder, 5 s upgrade,
// 30 s retry) by tracking firstEventReceivedAt and a derived placeholder hint.

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
import type { EditorGraphAction } from "@/components/editor/editor_state";

// Phase 5 will replace this with a real localApply + queue flush. For now we
// just record + console.log so the developer can see the agent's intent land.
function placeholderApplyAction(systemId: string, action: EditorGraphAction): void {
  if (typeof window === "undefined") return;
  console.log("[Pipes agent] tool_result action (placeholder, not yet applied to canvas)", {
    systemId,
    action,
  });
}

const SPINNING_UP_AFTER_MS = 5_000;
const CONNECTION_FAILED_AFTER_MS = 30_000;

type Timers = { spinningUp: number | null; failed: number | null };

const NO_TIMERS: Timers = { spinningUp: null, failed: null };

function clearTimers(timers: Timers): void {
  if (timers.spinningUp !== null) window.clearTimeout(timers.spinningUp);
  if (timers.failed !== null) window.clearTimeout(timers.failed);
}

export function useAgentBuild(systemId: string): UseAgentBuildResult {
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
    };
  }, [disarmTimers]);

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
          // Placeholder reducer: log + record only. Phase 5 wires localApply.
          placeholderApplyAction(systemId, event.data.action);
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
        disarmTimers();
        return;
      }
    },
    [disarmTimers, systemId],
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
      setPlaceholderHint("building");
      setState("connecting");

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
        })
        .finally(() => {
          disarmTimers();
          if (abortRef.current === controller) abortRef.current = null;
        });
    },
    [armTimers, conversationId, disarmTimers, handleEvent, state, systemId],
  );

  const stop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    disarmTimers();
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
  }, [disarmTimers]);

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
