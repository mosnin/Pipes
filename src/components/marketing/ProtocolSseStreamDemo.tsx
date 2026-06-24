"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, AnimatePresence } from "framer-motion";

/**
 * ProtocolSseStreamDemo
 *
 * Animated SSE replay. Each event appears in sequence with a delay matching
 * its declared cadence. The full loop runs in ~8 seconds and restarts.
 * Pauses on hover. Under reduced motion, all events appear immediately.
 *
 * The event types and payload shapes mirror the agent contract:
 *   status, tool_call, tool_result, message, done.
 */

type SseEventName =
  | "status"
  | "tool_call"
  | "tool_result"
  | "message"
  | "done";

interface SseEvent {
  name: SseEventName;
  // delay before this event is emitted, ms
  delay: number;
  data: Record<string, unknown>;
}

// Total of delays sums to ~8000ms (the loop period).
const STREAM: ReadonlyArray<SseEvent> = [
  {
    name: "status",
    delay: 200,
    data: { state: "thinking" },
  },
  {
    name: "tool_call",
    delay: 900,
    data: {
      id: "call_01",
      tool_name: "add_node",
      arguments: { systemId: "sys_8a72", type: "Agent", title: "Planner" },
    },
  },
  {
    name: "tool_result",
    delay: 700,
    data: {
      id: "call_01",
      ok: true,
      action: { action: "addNode", clientNodeId: "n_4f1c" },
    },
  },
  {
    name: "tool_call",
    delay: 800,
    data: {
      id: "call_02",
      tool_name: "add_node",
      arguments: { systemId: "sys_8a72", type: "Tool", title: "GitHub" },
    },
  },
  {
    name: "tool_result",
    delay: 700,
    data: {
      id: "call_02",
      ok: true,
      action: { action: "addNode", clientNodeId: "n_9d22" },
    },
  },
  {
    name: "tool_call",
    delay: 800,
    data: {
      id: "call_03",
      tool_name: "add_pipe",
      arguments: { systemId: "sys_8a72", fromNodeId: "n_4f1c", toNodeId: "n_9d22" },
    },
  },
  {
    name: "tool_result",
    delay: 700,
    data: {
      id: "call_03",
      ok: true,
      action: { action: "addPipe", clientPipeId: "p_2a8e" },
    },
  },
  {
    name: "message",
    delay: 900,
    data: { text: "Planner agent calls GitHub. Pipe drawn.", role: "assistant" },
  },
  {
    name: "done",
    delay: 600,
    data: { conversationId: "conv_5e21", turnId: "turn_001" },
  },
] as const;

// Sum: 200+900+700+800+700+800+700+900+600 = 6300ms; we hold for ~1700ms at the
// end before looping, total ~8000ms.
const HOLD_BEFORE_RESTART_MS = 1700;

const EVENT_TONE: Record<SseEventName, { bg: string; border: string; fg: string; dot: string }> = {
  status: { bg: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.25)", fg: "#CBD5E1", dot: "#94A3B8" },
  tool_call: { bg: "rgba(99,102,241,0.10)", border: "rgba(99,102,241,0.35)", fg: "#C7D2FE", dot: "#818CF8" },
  tool_result: { bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.32)", fg: "#A7F3D0", dot: "#34D399" },
  message: { bg: "rgba(244,114,182,0.08)", border: "rgba(244,114,182,0.30)", fg: "#FBCFE8", dot: "#F472B6" },
  done: { bg: "rgba(34,211,238,0.08)", border: "rgba(34,211,238,0.32)", fg: "#A5F3FC", dot: "#22D3EE" },
};

function formatPayload(data: Record<string, unknown>): string {
  return JSON.stringify(data, null, 2);
}

export interface ProtocolSseStreamDemoProps {
  className?: string;
}

export function ProtocolSseStreamDemo({ className }: ProtocolSseStreamDemoProps) {
  const reduced = useReducedMotion();
  const [visibleCount, setVisibleCount] = useState(reduced ? STREAM.length : 0);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced) {
      setVisibleCount(STREAM.length);
      return;
    }
    if (paused) return;

    let cancelled = false;

    const schedule = (idx: number): void => {
      if (cancelled) return;
      if (idx >= STREAM.length) {
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          setVisibleCount(0);
          schedule(0);
        }, HOLD_BEFORE_RESTART_MS);
        return;
      }
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        setVisibleCount(idx + 1);
        schedule(idx + 1);
      }, STREAM[idx].delay);
    };

    schedule(visibleCount);

    return () => {
      cancelled = true;
      if (timerRef.current != null) clearTimeout(timerRef.current);
    };
    // We intentionally re-run when `paused` toggles; visibleCount is the
    // resume point so we capture it once via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, paused]);

  // Auto-scroll the stream as new events arrive.
  useEffect(() => {
    if (containerRef.current == null) return;
    containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [visibleCount]);

  const events = STREAM.slice(0, visibleCount);
  const progress = STREAM.length === 0 ? 0 : visibleCount / STREAM.length;

  return (
    <div
      className={["rounded-[24px] border border-white/10 bg-[#0F1115] overflow-hidden shadow-xl-token", className ?? ""].join(" ")}
      data-testid="protocol-sse-stream-demo"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {/* Window chrome */}
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-[#16181D] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FF5F57]" aria-hidden="true" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" aria-hidden="true" />
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#28C840]" aria-hidden="true" />
        </div>
        <div className="t-caption text-white/55 t-mono">
          POST /api/agent/build
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400"
            aria-hidden="true"
          />
          <span className="t-caption text-white/55">stream</span>
        </div>
      </div>

      {/* Stream area */}
      <div
        ref={containerRef}
        className="px-4 py-4 max-h-[420px] min-h-[420px] overflow-y-auto scrollbar-thin"
        data-testid="protocol-sse-stream-events"
      >
        <div className="flex flex-col gap-2.5">
          <AnimatePresence initial={false}>
            {events.map((ev, idx) => {
              const tone = EVENT_TONE[ev.name];
              return (
                <motion.div
                  key={`${idx}-${ev.name}-${visibleCount}`}
                  data-event-name={ev.name}
                  initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="rounded-[10px] border px-3 py-2.5"
                  style={{ backgroundColor: tone.bg, borderColor: tone.border }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: tone.dot }}
                      aria-hidden="true"
                    />
                    <span
                      className="t-mono t-caption font-semibold"
                      style={{ color: tone.fg }}
                    >
                      event: {ev.name}
                    </span>
                  </div>
                  <pre
                    className="t-mono whitespace-pre-wrap break-all m-0"
                    style={{ fontSize: 11.5, lineHeight: 1.55, color: "rgba(230,230,233,0.85)" }}
                  >
                    {formatPayload(ev.data)}
                  </pre>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {visibleCount > 0 && visibleCount < STREAM.length && (
            <div className="flex items-center gap-1.5 pl-1 t-caption text-white/45 t-mono">
              <span
                aria-hidden="true"
                className="inline-block w-1 h-3 bg-white/50"
                style={{ animation: reduced ? undefined : "pulse 1s ease-in-out infinite" }}
              />
              streaming...
            </div>
          )}
        </div>
      </div>

      {/* Footer progress */}
      <div className="border-t border-white/[0.08] bg-[#16181D] px-4 py-2.5 flex items-center justify-between">
        <span className="t-caption t-mono text-white/45">
          {visibleCount} / {STREAM.length} events
        </span>
        <div className="flex-1 mx-4 h-[2px] rounded-full bg-white/[0.08] overflow-hidden">
          <motion.div
            className="h-full bg-violet-400"
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
          />
        </div>
        <span className="t-caption t-mono text-white/45">
          {paused ? "paused" : "live"}
        </span>
      </div>
    </div>
  );
}
