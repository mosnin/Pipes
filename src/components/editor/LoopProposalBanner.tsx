"use client";

// Shown above the canvas when the agent has pending loop proposals.
// Gives the human a one-click path to review or dismiss without
// requiring them to open the full agent chat panel.

import { CheckCheck, X, Wand2 } from "lucide-react";

type ReviewPreviewItem = {
  diffId: string;
  entityType: string;
  entityId: string;
  changeType: string;
  previewKind: string;
  emphasis: "pending_review" | "selected_preview" | "applied";
  x?: number;
  y?: number;
};

interface LoopProposalBannerProps {
  proposals: ReviewPreviewItem[];
  onOpenAgentChat: () => void;
  onDismiss: () => void;
}

export function LoopProposalBanner({ proposals, onOpenAgentChat, onDismiss }: LoopProposalBannerProps) {
  if (proposals.length === 0) return null;

  const pending = proposals.filter((p) => p.emphasis === "pending_review");
  if (pending.length === 0) return null;

  const stepWord = pending.length === 1 ? "step" : "steps";

  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 px-4 py-2 bg-indigo-50 border-b border-indigo-100"
      style={{ minHeight: 44 }}
    >
      <Wand2 size={14} className="text-indigo-600 shrink-0" />
      <p className="t-label text-indigo-700 flex-1">
        <span className="font-semibold">Agent proposed {pending.length} {stepWord}</span>
        <span className="font-normal text-indigo-600/80"> — review on the canvas</span>
      </p>
      <button
        onClick={onOpenAgentChat}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white t-caption font-semibold hover:bg-indigo-700 transition-colors"
      >
        <CheckCheck size={11} />
        Review
      </button>
      <button
        onClick={onDismiss}
        className="inline-flex items-center justify-center w-6 h-6 rounded-full hover:bg-indigo-100 text-indigo-500 transition-colors"
        aria-label="Dismiss proposals"
      >
        <X size={12} />
      </button>
    </div>
  );
}
