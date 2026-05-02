"use client";

// The prompt input strip. One job: take a sentence, hand it to the agent.
// Multi-line auto-grow up to ~4 rows. Send / Stop swap based on agent state.
// Esc clears (idle) or stops (running). Enter sends; Shift+Enter newlines.

import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState } from "react";
import { ArrowUp, RotateCw, Square } from "lucide-react";
import { KbdHint, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PlaceholderHint } from "@/lib/agent/hook_types";

export type ConversationInputHandle = {
  focus: () => void;
  clear: () => void;
  setText: (text: string) => void;
};

export type ConversationInputProps = {
  value: string;
  onChange: (next: string) => void;
  onSend: () => void;
  onStop: () => void;
  onRetry?: () => void;
  isRunning: boolean;
  hasError: boolean;
  placeholderHint: PlaceholderHint;
  activeToolLabel?: string;
  size?: "drawer" | "hero";
  placeholder?: string;
  hintText?: string;
};

const MAX_VISIBLE_ROWS = 4;

function placeholderTextFor(hint: PlaceholderHint, fallback: string): string {
  if (hint === "building") return "Building...";
  if (hint === "spinning_up") return "Spinning up...";
  if (hint === "failed") return "Connection failed";
  return fallback;
}

export const ConversationInput = forwardRef<ConversationInputHandle, ConversationInputProps>(
  function ConversationInput(
    {
      value,
      onChange,
      onSend,
      onStop,
      onRetry,
      isRunning,
      hasError,
      placeholderHint,
      activeToolLabel,
      size = "drawer",
      placeholder = "Describe your system. Watch it build itself.",
      hintText,
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [focused, setFocused] = useState(false);

    useImperativeHandle(ref, () => ({
      focus: () => textareaRef.current?.focus(),
      clear: () => onChange(""),
      setText: (text) => onChange(text),
    }));

    // Auto-grow up to MAX_VISIBLE_ROWS.
    useLayoutEffect(() => {
      const ta = textareaRef.current;
      if (!ta) return;
      ta.style.height = "auto";
      const lineHeight = 22;
      const maxHeight = lineHeight * MAX_VISIBLE_ROWS;
      ta.style.height = `${Math.min(ta.scrollHeight, maxHeight)}px`;
      ta.style.overflowY = ta.scrollHeight > maxHeight ? "auto" : "hidden";
    }, [value]);

    const trimmed = value.trim();
    const canSend = !isRunning && trimmed.length > 0;
    const finalPlaceholder = placeholderTextFor(placeholderHint, placeholder);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (canSend) onSend();
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (isRunning) {
          onStop();
        } else if (value.length > 0) {
          onChange("");
        } else {
          textareaRef.current?.blur();
        }
      }
    };

    return (
      <div
        className={cn(
          "relative w-full flex flex-col bg-white border border-black/[0.08] rounded-2xl shadow-md-token transition-all overflow-hidden",
          focused && !isRunning ? "ring-2 ring-indigo-100 border-indigo-300" : "",
        )}
      >
        {isRunning ? (
          <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-3 pt-2">
            <div className="flex-1 relative h-[3px] rounded-full bg-black/[0.06] overflow-hidden">
              <span className="absolute inset-y-0 left-0 w-1/3 bg-indigo-500/80 rounded-full pipes-progress-bar" />
            </div>
            {activeToolLabel ? (
              <span className="t-mono t-caption text-[#8E8E93] shrink-0">{activeToolLabel}</span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-end gap-2",
            size === "hero" ? "px-4 py-3" : "px-3 py-2",
            isRunning ? "pt-4" : "",
          )}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={finalPlaceholder}
            rows={1}
            aria-label="Chat with Pipes"
            className={cn(
              "flex-1 bg-transparent outline-none resize-none border-0 p-0",
              size === "hero" ? "t-body py-1" : "t-label py-1.5",
              "text-[#111] placeholder:text-[#8E8E93] leading-[22px]",
            )}
            style={{ minHeight: 22 }}
            disabled={hasError && placeholderHint === "failed" && !onRetry}
          />
          {hasError && onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              aria-label="Retry"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-amber-500 text-white hover:bg-amber-600 transition-colors"
            >
              <RotateCw size={16} />
            </button>
          ) : isRunning ? (
            <button
              type="button"
              onClick={onStop}
              aria-label="Stop"
              className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#1f2937] text-white hover:bg-black transition-colors"
            >
              <Square size={14} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend}
              aria-label="Send"
              className={cn(
                "inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors",
                canSend
                  ? "bg-[#4F46E5] text-white hover:bg-indigo-700"
                  : "bg-[#F5F5F7] text-[#C7C7CC] cursor-not-allowed",
              )}
            >
              <ArrowUp size={16} />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between px-3 pb-2 min-h-[16px]">
          <div className="flex items-center gap-2">
            {placeholderHint === "building" || placeholderHint === "spinning_up" ? (
              <span className="inline-flex items-center gap-1.5 t-caption text-[#8E8E93]">
                <Spinner size="xs" />
                {placeholderHint === "building" ? "Building..." : "Spinning up..."}
              </span>
            ) : null}
            {hasError ? (
              <span className="t-caption text-amber-700">Connection failed.</span>
            ) : null}
            {!isRunning && !hasError && hintText ? (
              <span className="t-caption text-[#C7C7CC]">{hintText}</span>
            ) : null}
          </div>
          {focused && !isRunning && !hasError ? (
            <span className="t-caption text-[#C7C7CC] inline-flex items-center gap-1.5">
              <KbdHint keys={["Enter"]} /> to send
            </span>
          ) : null}
          {isRunning ? (
            <span className="t-caption text-[#C7C7CC] inline-flex items-center gap-1.5">
              <KbdHint keys={["Esc"]} /> to stop
            </span>
          ) : null}
        </div>
      </div>
    );
  },
);
