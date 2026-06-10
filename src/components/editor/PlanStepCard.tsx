"use client";

// One row in the interactive plan editor. Three controls per card:
//   * Checkbox: include or skip the step (default included).
//   * Label: click to edit in place; blur to save.
//   * Drag handle: native HTML5 drag-drop for reorder (no extra dependency).
//
// Cards announce the "skipped" state by dropping opacity and striking through
// the label. The drag handle is keyboard-reachable; press Space+arrow up/down
// to move the card without a mouse.

import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { Check, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlanStep } from "@/lib/agent/plan-types";

export type PlanStepCardProps = {
  step: PlanStep;
  index: number;
  total: number;
  status?: "pending" | "running" | "done" | "failed";
  // Live edits flow through these callbacks. PlanEditor owns the array.
  onToggleEnabled: (id: string) => void;
  onLabelChange: (id: string, nextLabel: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  // True while a tool call related to this step is in flight; the card
  // dims its background slightly so the user can spot the active row.
  readOnly?: boolean;
};

export function PlanStepCard({
  step,
  index,
  total,
  status,
  onToggleEnabled,
  onLabelChange,
  onReorder,
  readOnly = false,
}: PlanStepCardProps) {
  const enabled = step.enabled !== false;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(step.label);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState<"top" | "bottom" | null>(null);

  useEffect(() => {
    setDraft(step.label);
  }, [step.label]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commitLabel = useCallback(() => {
    const next = draft.trim();
    setEditing(false);
    if (!next || next === step.label) {
      setDraft(step.label);
      return;
    }
    onLabelChange(step.id, next);
  }, [draft, onLabelChange, step.id, step.label]);

  const handleLabelKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commitLabel();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setDraft(step.label);
      setEditing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const halfway = rect.top + rect.height / 2;
    setDragOver(e.clientY < halfway ? "top" : "bottom");
  };

  const handleDragLeave = () => {
    setDragOver(null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    if (readOnly) return;
    e.preventDefault();
    const fromIndex = Number(e.dataTransfer.getData("text/plain"));
    setDragOver(null);
    if (Number.isNaN(fromIndex) || fromIndex === index) return;
    // If dropping in the top half of a later card, target = index; in the
    // bottom half, target = index + 1. Mirror for earlier cards.
    let toIndex = index;
    if (fromIndex < index && dragOver === "top") toIndex = index - 1;
    if (fromIndex > index && dragOver === "bottom") toIndex = index + 1;
    onReorder(fromIndex, toIndex);
  };

  const handleHandleKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (readOnly) return;
    if (e.key === "ArrowUp" && index > 0) {
      e.preventDefault();
      onReorder(index, index - 1);
    } else if (e.key === "ArrowDown" && index < total - 1) {
      e.preventDefault();
      onReorder(index, index + 1);
    }
  };

  const description = describeStep(step);

  return (
    <div
      role="listitem"
      data-testid={`plan-step-${step.id}`}
      draggable={!readOnly}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "group relative flex items-start gap-2 bg-white border border-black/[0.08] rounded-lg shadow-xs px-2.5 py-2 transition-colors",
        enabled ? "" : "opacity-50",
        status === "running" ? "ring-1 ring-indigo-200 bg-indigo-50/30" : "",
        dragOver === "top" ? "border-t-2 border-t-indigo-400" : "",
        dragOver === "bottom" ? "border-b-2 border-b-indigo-400" : "",
        enabled && status !== "running"
          ? "border-l-2 border-l-indigo-500"
          : "",
      )}
    >
      <div className="flex items-center justify-center w-5 h-5 mt-[1px] shrink-0">
        <button
          type="button"
          role="checkbox"
          aria-checked={enabled}
          aria-label={enabled ? `Skip step ${index + 1}` : `Include step ${index + 1}`}
          disabled={readOnly}
          onClick={() => onToggleEnabled(step.id)}
          className={cn(
            "inline-flex items-center justify-center w-4 h-4 rounded border transition-colors",
            enabled
              ? "bg-indigo-600 border-indigo-600 text-white"
              : "bg-white border-black/[0.16] text-transparent hover:border-black/[0.32]",
          )}
        >
          {enabled ? <Check size={10} strokeWidth={3} /> : null}
        </button>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="t-caption text-[#8E8E93] w-5 shrink-0 text-right">
            {index + 1}
          </span>
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitLabel}
              onKeyDown={handleLabelKey}
              aria-label="Edit step label"
              className="flex-1 t-label text-[#111] bg-transparent outline-none border-b border-indigo-300 px-0.5 py-0.5"
            />
          ) : (
            <button
              type="button"
              onClick={() => !readOnly && setEditing(true)}
              disabled={readOnly}
              className={cn(
                "flex-1 text-left t-label truncate",
                enabled ? "text-[#111]" : "text-[#8E8E93] line-through",
              )}
            >
              {step.label}
            </button>
          )}
          {status === "done" ? (
            <span className="t-caption text-emerald-600 shrink-0" aria-label="Step complete">
              <Check size={12} strokeWidth={3} />
            </span>
          ) : null}
        </div>
        {description ? (
          <p className="t-caption text-[#8E8E93] pl-7 truncate">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        onKeyDown={handleHandleKey}
        aria-label={`Reorder step ${index + 1}`}
        disabled={readOnly}
        className="shrink-0 inline-flex items-center justify-center w-5 h-5 mt-[1px] text-[#C7C7CC] hover:text-[#8E8E93] cursor-grab disabled:cursor-not-allowed"
      >
        <GripVertical size={14} />
      </button>
    </div>
  );
}

// Pull a short secondary line out of the step's args. Pure presentation —
// the editor renders this beneath the label so the user can read the gist
// without expanding the card.
function describeStep(step: PlanStep): string {
  if (step.kind === "add_node") {
    return step.args.description ?? "";
  }
  if (step.kind === "add_pipe") {
    const from = step.args.fromStepId ?? step.args.fromNodeId ?? "?";
    const to = step.args.toStepId ?? step.args.toNodeId ?? "?";
    return `${from} -> ${to}`;
  }
  if (step.kind === "update_node") {
    return step.args.description ?? step.args.title ?? step.args.nodeId;
  }
  if (step.kind === "delete_node") {
    return `Remove ${step.args.nodeId}`;
  }
  if (step.kind === "validate") {
    return "Run a graph validation";
  }
  return "";
}
