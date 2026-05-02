"use client";

// The new primary chat surface. Floats at the bottom-center of the editor
// canvas. Three states: resting (input strip only), active (input + history),
// hidden (a single "Continue conversation" pill).
//
// This is the front door of Pipes. The chat IS the input; it is not a panel.
// See docs/agent-product.md and docs/magic-moment.md.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, MessageSquare } from "lucide-react";
import { ConversationInput, type ConversationInputHandle } from "@/components/editor/ConversationInput";
import { ConversationMessages } from "@/components/editor/ConversationMessages";
import { useAgentBuild, type AgentApplyContext } from "@/lib/agent/hooks";
import { cn } from "@/lib/utils";

export type ConversationDrawerProps = {
  systemId: string;
  initialPrompt?: string;
  onInitialPromptHandled?: () => void;
  // Optional bridge to the editor canvas. When wired, every tool_result
  // mutates the local canvas immediately and the whole turn collapses to one
  // composite undo entry.
  agentApplyContext?: AgentApplyContext;
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
}: ConversationDrawerProps) {
  const [text, setText] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const inputRef = useRef<ConversationInputHandle>(null);
  const handledInitialRef = useRef(false);

  const agent = useAgentBuild(systemId, agentApplyContext);

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
          onChange={setText}
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
