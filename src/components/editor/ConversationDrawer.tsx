"use client";

// The new primary chat surface. Floats at the bottom-center of the editor
// canvas. Three states: resting (input strip only), active (input + history),
// hidden (a single "Continue conversation" pill).
//
// This is the front door of Pipes. The chat IS the input; it is not a panel.
// See docs/agent-product.md and docs/magic-moment.md.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { ConversationInput, type ConversationInputHandle } from "@/components/editor/ConversationInput";
import { ConversationMessages } from "@/components/editor/ConversationMessages";
import { NpsPrompt } from "@/components/editor/NpsPrompt";
import { useAgentBuild, type AgentApplyContext } from "@/lib/agent/hooks";
import { getNpsSeen, incrementBuildCount } from "@/lib/feedback/storage";
import { useSound } from "@/lib/sound/SoundProvider";
import { cn } from "@/lib/utils";

export type ConversationDrawerProps = {
  systemId: string;
  initialPrompt?: string;
  onInitialPromptHandled?: () => void;
  // Optional bridge to the editor canvas. When wired, every tool_result
  // mutates the local canvas immediately and the whole turn collapses to one
  // composite undo entry.
  agentApplyContext?: AgentApplyContext;
  // Forwarded to the canvas so it can pulse a 1 px ring on the node the
  // agent's most recent tool_call references. null when nothing is active.
  onCurrentTargetNodeIdChange?: (nodeId: string | null) => void;
  // Editor exposes this so a Revert click on the build summary line can pop
  // the most recent composite history entry. The drawer also returns focus
  // to the prompt input after the revert lands.
  onRevertCurrentTurn?: () => void;
  // Fired the first time the user starts typing in the input. EditorWorkspace
  // uses this to dismiss the first tutorial pill.
  onPromptStarted?: () => void;
};

export const STARTER_CHIPS: Array<{ id: string; label: string; prompt: string }> = [
  {
    id: "customer-support-triage",
    label: "Customer support triage",
    prompt:
      "Build a customer support triage flow. An inbound ticket gets classified, a knowledge base lookup runs, a confidence check splits between auto-resolve and a specialist queue, and the result lands at an escalation handoff.",
  },
  {
    id: "code-review-assistant",
    label: "Code review assistant",
    prompt:
      "Build a code review assistant. A PR webhook fires, a diff fetcher pulls the changes, a linter, a security scanner, and a style critic run in parallel, an aggregator merges the findings, and a comment poster replies on the PR.",
  },
  {
    id: "sales-lead-qualifier",
    label: "Sales lead qualifier",
    prompt:
      "Build a sales lead qualifier. A lead form intake feeds an enrichment lookup, a BANT qualifier scores it, a tier classifier splits hot from warm and cold, hot leads alert a Slack channel, and every lead writes back to the CRM.",
  },
];

const DEFAULT_HEADLINE = "Describe your system. Watch it build itself.";

export function ConversationDrawer({
  systemId,
  initialPrompt,
  onInitialPromptHandled,
  agentApplyContext,
  onCurrentTargetNodeIdChange,
  onRevertCurrentTurn,
  onPromptStarted,
}: ConversationDrawerProps) {
  const [text, setText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<ConversationInputHandle>(null);
  const handledInitialRef = useRef(false);
  const promptStartedRef = useRef(false);

  // Track the active turn's id by intercepting beginTurn / endTurn on the
  // editor's agent apply context. This is the same id the editor uses to
  // build its composite undo entry, so a Revert click at the summary line
  // can ask the editor to pop that exact entry.
  const [lastTurnId, setLastTurnId] = useState<string | undefined>();
  // Toggled true the moment the user starts typing the next prompt after a
  // turn lands. Hides the Revert link.
  const [nextPromptStarted, setNextPromptStarted] = useState<boolean>(false);
  // NPS prompt mounting flag. Set once on the third successful build, and
  // never again for this user.
  const [showNps, setShowNps] = useState<boolean>(false);

  const wrappedApplyContext = useMemo<AgentApplyContext | undefined>(() => {
    if (!agentApplyContext) return undefined;
    return {
      ...agentApplyContext,
      beginTurn: (turnId: string) => {
        setLastTurnId(turnId);
        // A new turn starting always re-arms the Revert link for that turn.
        setNextPromptStarted(false);
        agentApplyContext.beginTurn(turnId);
      },
    };
  }, [agentApplyContext]);

  const agent = useAgentBuild(systemId, wrappedApplyContext);

  // Forward the live target node id to the parent so the canvas can pulse it.
  // Only fires when the value actually changes; the parent treats null as
  // "stop pulsing".
  useEffect(() => {
    if (!onCurrentTargetNodeIdChange) return;
    onCurrentTargetNodeIdChange(agent.currentTargetNodeId);
  }, [agent.currentTargetNodeId, onCurrentTargetNodeIdChange]);

  // Auto-fire the initial prompt exactly once on mount.
  useEffect(() => {
    if (handledInitialRef.current) return;
    if (!initialPrompt) return;
    handledInitialRef.current = true;
    setText(initialPrompt);
    // Defer to the next tick so the input renders with the value first.
    const id = window.setTimeout(() => {
      inputRef.current?.focus();
      agent.send(initialPrompt);
      setText("");
      if (onInitialPromptHandled) onInitialPromptHandled();
    }, 16);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const isRunning = agent.state === "connecting" || agent.state === "running";
  const hasError = agent.state === "error";
  const hasMessages = agent.messages.length > 0 || agent.toolCalls.length > 0;
  const showActive = !collapsed && (hasMessages || isRunning);

  const sound = useSound();

  // Detect successful turn completion: state transitions from running to
  // idle (not error, not stopped) and at least one tool result landed. Bump
  // the build counter and conditionally mount the NPS prompt. Also chime a
  // subtle build-complete confirmation if the user has opted in to sound.
  // Errors get a short two-note descending alert instead. Streaming text
  // never makes a sound.
  const prevStateRef = useRef<typeof agent.state>("idle");
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = agent.state;
    if (prev !== "running" && prev !== "connecting") return;
    if (agent.state === "error") {
      sound.play("error");
      return;
    }
    if (agent.state !== "idle") return;
    sound.play("buildComplete");
    // Treat "no tool calls landed" as a soft success: still increment the
    // counter, since the user did get a reply, but the spec mainly cares
    // about builds that produced graph changes.
    const count = incrementBuildCount();
    if (count >= 3 && !getNpsSeen() && !showNps) {
      setShowNps(true);
    }
  }, [agent.state, showNps, sound]);

  const handleSend = () => {
    const value = text.trim();
    if (!value) return;
    agent.send(value);
    setText("");
  };

  const handleStop = () => {
    agent.stop();
  };

  const handleRetry = () => {
    if (agent.messages.length === 0) return;
    const lastUser = [...agent.messages].reverse().find((m) => m.role === "user");
    if (!lastUser) return;
    agent.send(lastUser.text);
  };

  const handleStarter = (prompt: string) => {
    setText(prompt);
    inputRef.current?.focus();
  };

  const handleTextChange = useCallback(
    (next: string) => {
      setText(next);
      if (next.length > 0 && !promptStartedRef.current) {
        promptStartedRef.current = true;
        if (onPromptStarted) onPromptStarted();
      }
      if (next.length > 0 && !nextPromptStarted) {
        setNextPromptStarted(true);
      }
    },
    [nextPromptStarted, onPromptStarted],
  );

  const handleRevertTurn = useCallback(
    (_turnId: string) => {
      if (!onRevertCurrentTurn) return;
      onRevertCurrentTurn();
      // Return focus to the prompt input so the user can immediately rephrase.
      inputRef.current?.focus();
    },
    [onRevertCurrentTurn],
  );

  const activeToolLabel = agent.activeToolName
    ? `${agent.activeToolName}(${agent.toolCalls[agent.toolCalls.length - 1]?.argsLabel ?? ""})`
    : agent.statusState === "thinking"
      ? "thinking"
      : agent.statusState === "writing_message"
        ? "writing"
        : undefined;

  if (collapsed) {
    return (
      <DrawerShell>
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-label="Continue conversation"
          className="inline-flex items-center gap-2 bg-white border border-black/[0.08] rounded-full shadow-md-token px-4 h-8 t-label text-[#3C3C43] hover:text-[#111] hover:border-black/[0.16] transition-colors"
        >
          <MessageSquare size={14} />
          Continue conversation
        </button>
      </DrawerShell>
    );
  }

  return (
    <DrawerShell>
      <div className="w-full max-w-[720px] flex flex-col gap-2">
        {showActive ? (
          <div className="bg-white border border-black/[0.08] rounded-2xl shadow-md-token flex flex-col overflow-hidden" style={{ height: 280 }}>
            <div className="flex items-center justify-between px-3 pt-2 pb-1">
              <span className="t-caption text-[#8E8E93]">Pipes</span>
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                aria-label="Minimize conversation"
                className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[#8E8E93] hover:text-[#111] hover:bg-black/[0.04]"
              >
                <ChevronDown size={14} />
              </button>
            </div>
            <ConversationMessages
              messages={agent.messages}
              toolCalls={agent.toolCalls}
              isRunning={isRunning}
              startedAt={agent.startedAt}
              finishedAt={agent.finishedAt}
              conversationId={agent.conversationId}
              lastTurnId={lastTurnId}
              onRevertTurn={onRevertCurrentTurn ? handleRevertTurn : undefined}
              nextPromptStarted={nextPromptStarted}
            />
          </div>
        ) : !hasMessages ? (
          <EmptyStarters
            headline={DEFAULT_HEADLINE}
            onPick={handleStarter}
          />
        ) : null}
        <ConversationInput
          ref={inputRef}
          value={text}
          onChange={handleTextChange}
          onSend={handleSend}
          onStop={handleStop}
          onRetry={hasError ? handleRetry : undefined}
          isRunning={isRunning}
          hasError={hasError}
          placeholderHint={agent.placeholderHint}
          activeToolLabel={activeToolLabel}
          placeholder={DEFAULT_HEADLINE}
        />
      </div>
      {showNps ? <NpsPrompt onDismiss={() => setShowNps(false)} /> : null}
    </DrawerShell>
  );
}

// Wraps the floating layout so the input lives inside the canvas region,
// pinned to the bottom-center.
function DrawerShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none",
        "px-3 sm:px-6 pb-4",
      )}
    >
      <div className="pointer-events-auto w-full flex justify-center">{children}</div>
    </div>
  );
}

function EmptyStarters({
  headline,
  onPick,
}: {
  headline: string;
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 mb-1">
      <p className="t-caption text-[#8E8E93]">{headline}</p>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {STARTER_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onPick(chip.prompt)}
            className="t-label text-[#3C3C43] hover:text-[#111] bg-white border border-black/[0.08] hover:border-black/[0.16] rounded-full px-3 h-8 transition-colors"
          >
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
}

