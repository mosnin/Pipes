"use client";

// The streaming message list. Two flavors of bubble:
// - User: right-aligned, surface-muted
// - Pipes (assistant): left-aligned, white card
// Tool calls are NOT bubbles; they appear as a thin inline strip between
// turns. Once `done` lands the strip collapses to a single summary line.

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import type { AgentChatMessage, AgentToolCallRecord } from "@/lib/agent/hook_types";

export type ConversationMessagesProps = {
  messages: AgentChatMessage[];
  toolCalls: AgentToolCallRecord[];
  isRunning: boolean;
  startedAt?: number;
  finishedAt?: number;
};

function formatSeconds(ms: number): string {
  const s = ms / 1000;
  if (s < 10) return `${s.toFixed(1)} s`;
  return `${Math.round(s)} s`;
}

function summarizeToolCalls(records: AgentToolCallRecord[]): { nodes: number; pipes: number; updates: number; deletes: number } {
  let nodes = 0;
  let pipes = 0;
  let updates = 0;
  let deletes = 0;
  for (const r of records) {
    if (r.toolName === "add_node") nodes += 1;
    else if (r.toolName === "add_pipe") pipes += 1;
    else if (r.toolName === "update_node") updates += 1;
    else if (r.toolName === "delete_node") deletes += 1;
  }
  return { nodes, pipes, updates, deletes };
}

function summaryLine(records: AgentToolCallRecord[], elapsedMs: number): string {
  const s = summarizeToolCalls(records);
  const parts: string[] = [];
  if (s.nodes > 0) parts.push(`${s.nodes} node${s.nodes === 1 ? "" : "s"}`);
  if (s.pipes > 0) parts.push(`${s.pipes} pipe${s.pipes === 1 ? "" : "s"}`);
  if (s.updates > 0) parts.push(`${s.updates} edit${s.updates === 1 ? "" : "s"}`);
  if (s.deletes > 0) parts.push(`${s.deletes} removed`);
  if (parts.length === 0) return `Nothing to apply (${formatSeconds(elapsedMs)})`;
  return `Built ${parts.join(", ")} in ${formatSeconds(elapsedMs)}`;
}

export function ConversationMessages({
  messages,
  toolCalls,
  isRunning,
  startedAt,
  finishedAt,
}: ConversationMessagesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, toolCalls.length, isRunning]);

  const collapsed = !isRunning && finishedAt !== undefined && startedAt !== undefined;
  const elapsedMs = finishedAt && startedAt ? finishedAt - startedAt : 0;

  return (
    <div
      ref={scrollerRef}
      className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-3 pb-2 space-y-3"
      role="log"
      aria-live="polite"
    >
      {messages.map((m, idx) => {
        const nextIsUser = messages[idx + 1]?.role === "user";
        const lastAssistantBeforeUser =
          m.role === "assistant" && nextIsUser;
        const isLastMessage = idx === messages.length - 1;
        // Show the tool call strip after the last assistant message of a turn
        // OR (if no assistant message yet) after the most recent user prompt.
        const showStripAfter =
          (m.role === "user" && isLastMessage && toolCalls.length > 0) ||
          (lastAssistantBeforeUser && toolCalls.length > 0);
        return (
          <div key={m.id} className="space-y-2">
            <Bubble role={m.role} text={m.text} />
            {showStripAfter && !collapsed ? (
              <ToolStrip records={toolCalls} />
            ) : null}
          </div>
        );
      })}
      {/* Strip + summary attached to the most recent turn */}
      {messages.length > 0 && toolCalls.length > 0 && isRunning ? (
        <ToolStrip records={toolCalls} />
      ) : null}
      {collapsed && toolCalls.length > 0 ? (
        <p className="t-caption t-num text-[#8E8E93] pl-1">{summaryLine(toolCalls, elapsedMs)}</p>
      ) : null}
    </div>
  );
}

function Bubble({ role, text }: { role: "user" | "assistant"; text: string }) {
  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <span className="t-caption text-[#8E8E93] mb-1 pr-1">You</span>
        <div className="surface-muted rounded-2xl px-3 py-2 max-w-[80%]">
          <p className="t-label text-[#111] whitespace-pre-wrap break-words">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start">
      <span className="t-caption text-[#8E8E93] mb-1 pl-1">Pipes</span>
      <div className="bg-white border border-black/[0.08] rounded-2xl px-3 py-2 max-w-[80%]">
        <p className="t-label text-[#3C3C43] whitespace-pre-wrap break-words">{text}</p>
      </div>
    </div>
  );
}

function ToolStrip({ records }: { records: AgentToolCallRecord[] }) {
  const visible = records.slice(-6);
  return (
    <div className="pl-1 space-y-0.5">
      {visible.map((r) => (
        <p key={r.id} className="t-mono t-caption text-[#8E8E93] flex items-center gap-1.5">
          <span aria-hidden>...</span>
          <span>
            {r.toolName}
            {r.argsLabel ? `(${r.argsLabel})` : "()"}
          </span>
        </p>
      ))}
    </div>
  );
}
