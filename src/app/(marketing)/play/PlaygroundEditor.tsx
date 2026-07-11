"use client";

// Guest playground. Runs entirely client-side: no Convex, no Clerk, no
// /api/agent/build. A visitor lands here, picks one of three starter prompts,
// and watches the canvas come alive in under three seconds. The replay engine
// reads a static fixture from /playground-fixtures/<key>.json and walks the
// events with their declared delays. Nothing persists. There is no autosave.
//
// Why a bespoke replay loop instead of useAgentBuild: the real hook fetches
// SSE from a Clerk-gated route and feeds the editor's optimistic queue. The
// playground needs neither — it just needs three nodes and two pipes to land
// on the canvas with the right cadence so the "magic moment" reads.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  ConnectionLineType,
  Handle,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowRight, Sparkles, Square } from "lucide-react";
import type {
  EditorGraphAction,
  GraphNode,
  GraphPipe,
} from "@/components/editor/editor_state";

// ---------------------------------------------------------------------------
// Starter prompts
// ---------------------------------------------------------------------------

export type PlaygroundStarterKey =
  | "customer-support"
  | "code-review"
  | "lead-qualifier";

type Starter = {
  key: PlaygroundStarterKey;
  label: string;
  prompt: string;
  blurb: string;
};

export const PLAYGROUND_STARTERS: Starter[] = [
  {
    key: "customer-support",
    label: "Triage support tickets in three steps",
    prompt:
      "Triage support tickets in three steps: intake, classify, escalate.",
    blurb: "Three nodes wired left to right.",
  },
  {
    key: "code-review",
    label: "Review code changes with three agents",
    prompt:
      "Review a pull request with a linter, a security scanner, and a comment poster.",
    blurb: "A diff fans out to two reviewers and back to one comment.",
  },
  {
    key: "lead-qualifier",
    label: "Qualify inbound sales leads",
    prompt:
      "Qualify inbound leads: intake, enrich, tier, write to the CRM.",
    blurb: "Four nodes, one straight pipeline to CRM.",
  },
];

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

type FixtureFrame = {
  event: string;
  delay_ms?: number;
  data: Record<string, unknown>;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type ReplayState = "idle" | "running" | "done";

// ---------------------------------------------------------------------------
// Replay loop — walks the fixture, applies actions, populates the chat strip
// ---------------------------------------------------------------------------

function applyAction(
  state: { nodes: GraphNode[]; pipes: GraphPipe[] },
  action: EditorGraphAction,
): { nodes: GraphNode[]; pipes: GraphPipe[] } {
  if (action.action === "addNode") {
    const id = action.clientNodeId ?? `pg_${Math.random().toString(36).slice(2, 9)}`;
    const next: GraphNode = {
      id,
      type: action.type,
      title: action.title,
      description: action.description,
      position: { x: action.x ?? 240, y: action.y ?? 180 },
      portIds: [`${id}_in`, `${id}_out`],
      config: {},
    };
    return { nodes: [...state.nodes, next], pipes: state.pipes };
  }
  if (action.action === "addPipe") {
    const id = action.clientPipeId ?? `pg_pipe_${Math.random().toString(36).slice(2, 9)}`;
    const next: GraphPipe = {
      id,
      systemId: action.systemId,
      fromPortId: `${action.fromNodeId}_out`,
      toPortId: `${action.toNodeId}_in`,
      fromNodeId: action.fromNodeId,
      toNodeId: action.toNodeId,
    };
    return { nodes: state.nodes, pipes: [...state.pipes, next] };
  }
  return state;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

// ---------------------------------------------------------------------------
// xyflow node renderer — a slimmed copy of the editor's PipesNode so we don't
// drag the entire editor in
// ---------------------------------------------------------------------------

function PlaygroundNode({ data }: { data: { title: string; subtitle?: string; arrived?: boolean } }) {
  return (
    <div
      className={data.arrived ? "looper-node-arrival" : undefined}
      style={{
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 8,
        background: "#FFFFFF",
        padding: 10,
        minWidth: 184,
        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{ background: "#6366F1", width: 10, height: 10, border: "2px solid #FFFFFF" }}
      />
      <strong style={{ color: "#111", fontSize: 13, lineHeight: 1.2 }}>{data.title}</strong>
      {data.subtitle ? (
        <div style={{ color: "#8E8E93", fontSize: 11, marginTop: 2 }}>{data.subtitle}</div>
      ) : null}
      <Handle
        type="source"
        position={Position.Right}
        style={{ background: "#4F46E5", width: 10, height: 10, border: "2px solid #FFFFFF" }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main playground component
// ---------------------------------------------------------------------------

export function PlaygroundEditor() {
  const [activeKey, setActiveKey] = useState<PlaygroundStarterKey | null>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [pipes, setPipes] = useState<GraphPipe[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [state, setState] = useState<ReplayState>("idle");
  const [activeToolLabel, setActiveToolLabel] = useState<string | undefined>();
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [input, setInput] = useState<string>("");
  const [freshNodeIds, setFreshNodeIds] = useState<Set<string>>(() => new Set());

  const abortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
  const startedAtRef = useRef<number>(0);
  const arrivalTimerRef = useRef<number | null>(null);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      abortRef.current.cancelled = true;
      if (arrivalTimerRef.current !== null) {
        window.clearTimeout(arrivalTimerRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    abortRef.current.cancelled = true;
    abortRef.current = { cancelled: false };
    setActiveKey(null);
    setNodes([]);
    setPipes([]);
    setMessages([]);
    setState("idle");
    setActiveToolLabel(undefined);
    setElapsedMs(0);
    setInput("");
    setFreshNodeIds(new Set());
  }, []);

  const stop = useCallback(() => {
    abortRef.current.cancelled = true;
    setState("done");
    setActiveToolLabel(undefined);
    setElapsedMs(Date.now() - startedAtRef.current);
  }, []);

  // Mark a node id as "fresh" so the canvas can run the arrival keyframe once.
  // The class is dropped after ~350 ms so a re-render does not re-trigger it.
  const markFresh = useCallback((nodeId: string) => {
    setFreshNodeIds((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    const timer = window.setTimeout(() => {
      setFreshNodeIds((prev) => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    }, 350);
    arrivalTimerRef.current = timer;
  }, []);

  const runReplay = useCallback(
    async (starter: Starter) => {
      abortRef.current.cancelled = true;
      const controller = { cancelled: false };
      abortRef.current = controller;

      setActiveKey(starter.key);
      setNodes([]);
      setPipes([]);
      setMessages([{ id: `u_${Date.now()}`, role: "user", text: starter.prompt }]);
      setState("running");
      setInput(starter.prompt);
      setActiveToolLabel("thinking");
      startedAtRef.current = Date.now();
      setElapsedMs(0);

      let fixture: FixtureFrame[] = [];
      try {
        const res = await fetch(`/playground-fixtures/${starter.key}.json`, { cache: "force-cache" });
        if (!res.ok) throw new Error(`fixture ${starter.key} failed (${res.status})`);
        fixture = (await res.json()) as FixtureFrame[];
      } catch {
        // Fall back to a minimal hard-coded message so the page never dead-ends.
        setMessages((prev) => [
          ...prev,
          { id: `e_${Date.now()}`, role: "assistant", text: "Could not load the playground fixture." },
        ]);
        setState("done");
        setActiveToolLabel(undefined);
        return;
      }

      const reduceMotion = prefersReducedMotion();
      let assistantBuffer = "";
      const localState = { nodes: [] as GraphNode[], pipes: [] as GraphPipe[] };

      for (const frame of fixture) {
        if (controller.cancelled) return;
        const delay = reduceMotion ? 0 : frame.delay_ms ?? 0;
        if (delay > 0) {
          await new Promise<void>((resolve) => {
            const t = window.setTimeout(resolve, delay);
            // Best-effort cancel: if reset/stop fires while we sleep, we just
            // continue on wake and the outer cancelled check exits.
            void t;
          });
        }
        if (controller.cancelled) return;

        if (frame.event === "status") {
          const stateName = (frame.data as { state?: string }).state;
          if (stateName) setActiveToolLabel(stateName);
          continue;
        }
        if (frame.event === "tool_call") {
          const data = frame.data as { tool_name?: string; arguments?: Record<string, unknown> };
          setActiveToolLabel(summarizeTool(data.tool_name, data.arguments));
          continue;
        }
        if (frame.event === "tool_result") {
          const data = frame.data as { action?: EditorGraphAction };
          if (data.action) {
            const next = applyAction(localState, data.action);
            localState.nodes = next.nodes;
            localState.pipes = next.pipes;
            setNodes(next.nodes);
            setPipes(next.pipes);
            if (data.action.action === "addNode" && data.action.clientNodeId) {
              markFresh(data.action.clientNodeId);
            }
          }
          continue;
        }
        if (frame.event === "message") {
          const data = frame.data as { text?: string };
          if (typeof data.text === "string") {
            assistantBuffer = assistantBuffer ? `${assistantBuffer}\n${data.text}` : data.text;
            const snapshot = assistantBuffer;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === "assistant") {
                return [...prev.slice(0, -1), { ...last, text: snapshot }];
              }
              return [...prev, { id: `m_${Date.now()}`, role: "assistant", text: snapshot }];
            });
          }
          continue;
        }
        if (frame.event === "done") {
          setState("done");
          setActiveToolLabel(undefined);
          setElapsedMs(Date.now() - startedAtRef.current);
          return;
        }
      }
      // Fixture ended without an explicit done.
      if (!controller.cancelled) {
        setState("done");
        setActiveToolLabel(undefined);
        setElapsedMs(Date.now() - startedAtRef.current);
      }
    },
    [markFresh],
  );

  const pickStarter = useCallback(
    (starter: Starter) => {
      if (state === "running") return;
      void runReplay(starter);
    },
    [runReplay, state],
  );

  // Render the canvas nodes/edges. xyflow needs Node/Edge typed objects, not
  // our internal GraphNode/GraphPipe, so we map here.
  const flowNodes: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        id: n.id,
        type: "playgroundNode",
        position: n.position,
        data: {
          title: n.title,
          subtitle: n.description,
          arrived: freshNodeIds.has(n.id),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      })),
    [nodes, freshNodeIds],
  );
  const flowEdges: Edge[] = useMemo(
    () =>
      pipes
        .filter((p) => p.fromNodeId && p.toNodeId)
        .map((p) => ({
          id: p.id,
          source: p.fromNodeId as string,
          target: p.toNodeId as string,
          type: "smoothstep",
          animated: state === "running",
          style: { stroke: "#8E8E93", strokeWidth: 1.5 },
        })),
    [pipes, state],
  );

  const nodeTypes = useMemo(() => ({ playgroundNode: PlaygroundNode }), []);

  const canvasIsEmpty = nodes.length === 0;
  const elapsedSeconds = (elapsedMs / 1000).toFixed(1);

  return (
    <div className="flex flex-col">
      {/* Hero strip */}
      <section className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-8 text-center">
          <h1 className="t-h1 font-bold text-[#111] tracking-tight">
            Describe your system. Watch it build itself.
          </h1>
          <p className="mt-3 t-body text-[#3C3C43] max-w-xl mx-auto">
            Pick a starter. The agent draws the system on the canvas in seconds.
            Nothing to sign up for.
          </p>
          <p className="mt-2 t-caption text-[#8E8E93]">
            Sign up to keep your work.{" "}
            <Link
              href="/signup?source=playground"
              className="text-violet-600 hover:text-violet-700 font-semibold"
            >
              Start building
            </Link>
          </p>
        </div>
      </section>

      {/* Mobile hint */}
      <div className="lg:hidden bg-amber-50 border-b border-amber-200 px-4 py-3 text-center">
        <p className="t-caption text-amber-900">
          The playground is best on a wider screen. The canvas animation needs the room.
        </p>
      </div>

      {/* Starter chips */}
      <section className="bg-white px-4 sm:px-6 lg:px-8 py-6 border-b border-black/[0.06]">
        <div className="mx-auto max-w-5xl flex flex-wrap items-center justify-center gap-3" role="group" aria-label="Starter prompts">
          {PLAYGROUND_STARTERS.map((s) => {
            const isActive = activeKey === s.key;
            const disabled = state === "running" && !isActive;
            return (
              <button
                key={s.key}
                type="button"
                data-testid={`playground-starter-${s.key}`}
                onClick={() => pickStarter(s)}
                disabled={disabled}
                className={[
                  "inline-flex items-center gap-2 rounded-full px-5 h-12 t-label font-medium transition-all",
                  "border shadow-sm",
                  isActive
                    ? "bg-violet-600 border-violet-600 text-white"
                    : disabled
                      ? "bg-white border-black/[0.06] text-[#8E8E93] cursor-not-allowed"
                      : "bg-white border-black/[0.08] text-[#111] hover:border-violet-300 hover:-translate-y-0.5 hover:shadow-md",
                ].join(" ")}
              >
                <Sparkles size={14} className={isActive ? "text-white" : "text-violet-500"} />
                {s.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Canvas */}
      <section className="bg-[#FAFAFA] px-4 sm:px-6 lg:px-8 py-6">
        <div
          className="mx-auto max-w-6xl border border-black/[0.08] rounded-2xl bg-white overflow-hidden"
          style={{ height: 480 }}
          data-testid="playground-canvas"
        >
          {canvasIsEmpty ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
              <p className="t-h3 text-[#3C3C43]">Pick a starter above.</p>
              <p className="mt-2 t-label text-[#8E8E93]">
                The canvas comes alive in under three seconds.
              </p>
            </div>
          ) : (
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              nodeTypes={nodeTypes}
              fitView
              fitViewOptions={{ padding: 0.2, duration: 300 }}
              minZoom={0.3}
              maxZoom={1.8}
              snapToGrid
              snapGrid={[16, 16]}
              panOnScroll
              zoomOnPinch
              zoomOnScroll={false}
              zoomOnDoubleClick={false}
              nodesDraggable={false}
              nodesConnectable={false}
              elementsSelectable={false}
              proOptions={{ hideAttribution: true }}
              connectionLineType={ConnectionLineType.SmoothStep}
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={20}
                size={1.2}
                color="rgba(0,0,0,0.12)"
                style={{ background: "#FAFAFA" }}
              />
            </ReactFlow>
          )}
        </div>
      </section>

      {/* After-build callout */}
      {state === "done" && nodes.length > 0 ? (
        <section className="px-4 sm:px-6 lg:px-8 pb-6" data-testid="playground-after-build">
          <div className="mx-auto max-w-3xl bg-white border border-violet-200 rounded-2xl px-6 py-5 shadow-sm">
            <p className="t-h3 text-[#111]">
              You just built a system in {elapsedSeconds} seconds.
            </p>
            <p className="mt-2 t-label text-[#3C3C43]">
              That graph is reusable. Any AI agent can read it through one protocol.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={`/signup?source=playground&starter=${activeKey ?? ""}`}
                data-testid="playground-signup-cta"
                className="inline-flex items-center gap-1.5 rounded-md bg-violet-600 px-4 py-2 t-label font-semibold text-white hover:bg-violet-700 transition-colors"
              >
                Sign up to keep this
                <ArrowRight size={14} />
              </Link>
              <button
                type="button"
                data-testid="playground-try-another"
                onClick={reset}
                className="inline-flex items-center rounded-md border border-black/[0.08] bg-white px-4 py-2 t-label font-medium text-[#3C3C43] hover:border-black/[0.14] hover:bg-black/[0.03] transition-colors"
              >
                Try another prompt
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {/* Slim conversation strip */}
      <section className="bg-white border-t border-black/[0.06] sticky bottom-0 z-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 py-3">
          <ConversationStrip
            input={input}
            messages={messages}
            isRunning={state === "running"}
            activeToolLabel={activeToolLabel}
            onStop={stop}
          />
        </div>
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Slim conversation strip — read-only echo of the prompt + assistant reply,
// plus a stop affordance while the replay runs
// ---------------------------------------------------------------------------

function ConversationStrip({
  input,
  messages,
  isRunning,
  activeToolLabel,
  onStop,
}: {
  input: string;
  messages: ChatMessage[];
  isRunning: boolean;
  activeToolLabel?: string;
  onStop: () => void;
}) {
  return (
    <div
      className="bg-white border border-black/[0.08] rounded-2xl shadow-md flex flex-col"
      data-testid="playground-conversation"
    >
      {messages.length > 0 ? (
        <div className="px-3 py-3 space-y-2 max-h-[160px] overflow-y-auto" role="log" aria-live="polite">
          {messages.map((m) => (
            <div
              key={m.id}
              className={m.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start"}
            >
              <span className="t-caption text-[#8E8E93] mb-0.5 px-1">
                {m.role === "user" ? "You" : "Pipes"}
              </span>
              <div
                className={
                  m.role === "user"
                    ? "rounded-2xl px-3 py-2 max-w-[80%] bg-[#F5F5F7]"
                    : "rounded-2xl px-3 py-2 max-w-[80%] bg-white border border-black/[0.08]"
                }
              >
                <p className="t-label text-[#111] whitespace-pre-wrap break-words">{m.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex items-end gap-2 px-3 py-2 border-t border-black/[0.06]">
        <input
          type="text"
          readOnly
          value={input}
          aria-label="Playground prompt"
          placeholder="Pick a starter above to fill this in."
          className="flex-1 bg-transparent outline-none border-0 t-label text-[#111] placeholder:text-[#8E8E93] py-1"
        />
        {isRunning ? (
          <>
            {activeToolLabel ? (
              <span className="t-mono t-caption text-[#8E8E93] shrink-0">{activeToolLabel}</span>
            ) : null}
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              data-testid="playground-stop"
              className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1f2937] text-white hover:bg-black transition-colors"
            >
              <Square size={12} fill="currentColor" />
            </button>
          </>
        ) : (
          <span className="t-caption text-[#C7C7CC]">Read-only preview</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function summarizeTool(tool: string | undefined, args: Record<string, unknown> | undefined): string {
  if (!tool) return "thinking";
  if (tool === "add_node") {
    const title = args && typeof args.title === "string" ? args.title : "node";
    return `add_node("${title}")`;
  }
  if (tool === "add_pipe") {
    const from = args && typeof args.fromNodeId === "string" ? args.fromNodeId : "?";
    const to = args && typeof args.toNodeId === "string" ? args.toNodeId : "?";
    return `add_pipe(${from} -> ${to})`;
  }
  return tool;
}
