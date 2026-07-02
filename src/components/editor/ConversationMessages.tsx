"use client";

// The streaming message list. Two flavors of bubble:
// - User: right-aligned, surface-muted
// - Pipes (assistant): left-aligned, white card
// Tool calls are NOT bubbles; they appear as a thin inline strip between
// turns. Once `done` lands the strip collapses to a single summary line.
//
// Each assistant bubble carries a tiny thumbs-up/thumbs-down pair below the
// timestamp; the build summary line carries the same pair plus the
// PostBuildSuccess affordance card (Open in Claude / See diff / Revert).

import { useCallback, useEffect, useRef, useState } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { sendFeedback } from "@/lib/feedback/client";
import type { ThumbsTargetType, ThumbsVerdict } from "@/lib/feedback/types";
import type { AgentChatMessage, AgentToolCallRecord } from "@/lib/agent/hook_types";
import { PostBuildSuccess } from "@/components/editor/PostBuildSuccess";

export type ConversationMessagesProps = {
  messages: AgentChatMessage[];
  toolCalls: AgentToolCallRecord[];
  isRunning: boolean;
  startedAt?: number;
  finishedAt?: number;
  // Stable conversation id from the agent hook. Empty string before the
  // server replies; we still send thumbs (the route may correlate later).
  conversationId?: string;
  // Most recent turn id once the build summary collapses. Used by Revert and
  // by every thumbs POST attached to this turn.
  lastTurnId?: string;
  // Revert hook into the editor's composite history. The drawer wires this
  // to popUndo on the most recent composite entry.
  onRevertTurn?: (turnId: string) => void;
  // True once the user starts typing the next prompt; we hide the Revert
  // link after that.
  nextPromptStarted?: boolean;
  // Triggers the Open-in-Claude flow. Threaded from EditorWorkspace through
  // the drawer. Shown as the primary CTA on the post-build success card.
  onOpenInClaude?: () => void;
  // Opens the TurnDiffDialog. Hidden when there is no prior turn to diff
  // against.
  onShowDiff?: () => void;
  // True when at least one prior turn exists, so we can compute a meaningful
  // diff.
  diffAvailable?: boolean;
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
  conversationId,
  lastTurnId,
  onRevertTurn,
  nextPromptStarted,
  onOpenInClaude,
  onShowDiff,
  diffAvailable,
}: ConversationMessagesProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, toolCalls.length, isRunning]);

  const collapsed = !isRunning && finishedAt !== undefined && startedAt !== undefined;
  const elapsedMs = finishedAt && startedAt ? finishedAt - startedAt : 0;
  const turnId = lastTurnId ?? "";
  const convId = conversationId ?? "";

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
            <Bubble
              role={m.role}
              text={m.text}
              streaming={Boolean(m.streaming)}
              messageId={m.id}
              conversationId={convId}
              turnId={turnId}
            />
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
        <SummaryLine
          text={summaryLine(toolCalls, elapsedMs)}
          conversationId={convId}
          turnId={turnId}
          onRevertTurn={onRevertTurn}
          revertVisible={!nextPromptStarted}
          onOpenInClaude={onOpenInClaude}
          onShowDiff={diffAvailable ? onShowDiff : undefined}
          nextPromptStarted={Boolean(nextPromptStarted)}
        />
      ) : null}
    </div>
  );
}

function Bubble({
  role,
  text,
  streaming,
  messageId,
  conversationId,
  turnId,
}: {
  role: "user" | "assistant";
  text: string;
  streaming: boolean;
  messageId: string;
  conversationId: string;
  turnId: string;
}) {
  if (role === "user") {
    return (
      <div className="flex flex-col items-end">
        <span className="t-caption text-ink-3 mb-1 pr-1">You</span>
        <div className="surface-muted rounded-2xl px-3 py-2 max-w-[80%]">
          <p className="t-label text-ink-1 whitespace-pre-wrap break-words">{text}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-start">
      <span className="t-caption text-ink-3 mb-1 pl-1">Looper</span>
      <div className="surface-canvas border border-line rounded-2xl px-3 py-2 max-w-[80%]">
        <p className="t-label text-ink-2 whitespace-pre-wrap break-words">{text}</p>
      </div>
      {!streaming && text.length > 0 ? (
        <div className="pl-1 pt-0.5">
          <ThumbsRow
            targetType="agent_message"
            targetId={messageId}
            conversationId={conversationId}
            turnId={turnId}
          />
        </div>
      ) : null}
    </div>
  );
}

function ToolStrip({ records }: { records: AgentToolCallRecord[] }) {
  const visible = records.slice(-6);
  return (
    <div className="pl-1 space-y-0.5">
      {visible.map((r) => (
        <p key={r.id} className="t-mono t-caption text-ink-3 flex items-center gap-1.5">
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

function SummaryLine({
  text,
  conversationId,
  turnId,
  onRevertTurn,
  revertVisible,
  onOpenInClaude,
  onShowDiff,
  nextPromptStarted,
}: {
  text: string;
  conversationId: string;
  turnId: string;
  onRevertTurn?: (turnId: string) => void;
  revertVisible: boolean;
  onOpenInClaude?: () => void;
  onShowDiff?: () => void;
  nextPromptStarted: boolean;
}) {
  const [reverted, setReverted] = useState(false);
  const handleRevert = useCallback(() => {
    if (!onRevertTurn || !turnId || reverted) return;
    setReverted(true);
    onRevertTurn(turnId);
  }, [onRevertTurn, turnId, reverted]);

  const revertActive = revertVisible && !reverted && Boolean(onRevertTurn) && Boolean(turnId);

  return (
    <div className="flex items-start justify-between gap-2 pl-1 pr-1">
      <p className="t-caption t-num text-ink-3 flex-1 min-w-0">{text}</p>
      <div className="flex items-center gap-1.5 shrink-0 pt-px">
        <PostBuildSuccess
          onOpenInClaude={onOpenInClaude}
          onShowDiff={onShowDiff}
          onRevert={revertActive ? handleRevert : undefined}
          nextPromptStarted={nextPromptStarted}
        />
        <ThumbsRow
          targetType="agent_build_summary"
          targetId={turnId || "summary"}
          conversationId={conversationId}
          turnId={turnId}
        />
      </div>
    </div>
  );
}

// Tiny thumbs-up / thumbs-down pair. Click POSTs once and locks for 800 ms so
// users can't spam-fire the route. The clicked thumb fills indigo for one
// second then fades back to its ghost state.
function ThumbsRow({
  targetType,
  targetId,
  conversationId,
  turnId,
}: {
  targetType: ThumbsTargetType;
  targetId: string;
  conversationId: string;
  turnId: string;
}) {
  const [picked, setPicked] = useState<ThumbsVerdict | null>(null);
  const [fading, setFading] = useState<boolean>(false);
  const lockedRef = useRef<boolean>(false);

  const click = useCallback(
    (verdict: ThumbsVerdict) => {
      if (lockedRef.current) return;
      lockedRef.current = true;
      setPicked(verdict);
      setFading(false);
      void sendFeedback({
        kind: "thumbs",
        targetType,
        targetId,
        conversationId,
        turnId,
        verdict,
      });
      window.setTimeout(() => {
        setFading(true);
      }, 1000);
      window.setTimeout(() => {
        lockedRef.current = false;
      }, 800);
    },
    [targetType, targetId, conversationId, turnId],
  );

  return (
    <div className="inline-flex items-center gap-0.5">
      <ThumbButton
        verdict="up"
        active={picked === "up"}
        fading={fading && picked === "up"}
        onClick={() => click("up")}
      />
      <ThumbButton
        verdict="down"
        active={picked === "down"}
        fading={fading && picked === "down"}
        onClick={() => click("down")}
      />
    </div>
  );
}

function ThumbButton({
  verdict,
  active,
  fading,
  onClick,
}: {
  verdict: ThumbsVerdict;
  active: boolean;
  fading: boolean;
  onClick: () => void;
}) {
  const Icon = verdict === "up" ? ThumbsUp : ThumbsDown;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={verdict === "up" ? "Helpful" : "Not helpful"}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center justify-center w-6 h-6 rounded-md transition-colors",
        active && !fading
          ? "text-indigo-600 bg-indigo-50"
          : active && fading
            ? "text-indigo-500 hover:text-indigo-600"
            : "text-ink-3 hover:text-ink-2 hover:bg-[var(--color-hover)]",
      )}
      style={{ transition: "color 200ms ease, background-color 200ms ease" }}
    >
      <Icon size={12} />
    </button>
  );
}
