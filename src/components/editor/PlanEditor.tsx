"use client";

// The interactive plan editor. Mounts inline in the conversation when a
// `plan_proposal` event arrives. Each step is a draggable, toggleable card.
//
// Two states:
//   1. Editing: the user reorders, disables, or rewrites steps, then clicks
//      "Build edited plan" to launch the execute_steps run.
//   2. Live: while a build is in flight, the same list shows progress with a
//      checkmark next to each step as its tool_result lands.

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { PlanStepCard } from "@/components/editor/PlanStepCard";
import type { PlanStep } from "@/lib/agent/plan-types";
import type { AgentToolCallRecord } from "@/lib/agent/hook_types";

export type PlanEditorProps = {
  steps: PlanStep[];
  // True while a build derived from this plan is running. In this mode the
  // cards become read-only and the buttons collapse to a single "Stop".
  isBuilding?: boolean;
  // Tool calls observed so far this turn. Used to mark step completion.
  toolCalls?: AgentToolCallRecord[];
  // Submit the user-edited (filtered + reordered) step list. Triggers a new
  // POST to /api/agent/build with executeSteps.
  onAccept: (steps: PlanStep[]) => void;
  // Discard the plan and abort any in-flight build.
  onAbort: () => void;
};

export function PlanEditor({
  steps: initialSteps,
  isBuilding = false,
  toolCalls,
  onAccept,
  onAbort,
}: PlanEditorProps) {
  const [steps, setSteps] = useState<PlanStep[]>(initialSteps);

  // Sync the local list back to the prop when the proposal changes. We mostly
  // own the array locally so edits feel instant, but the upstream may swap
  // the proposal if the user fires a fresh "plan first" turn.
  useEffect(() => {
    setSteps(initialSteps);
  }, [initialSteps]);

  const handleToggleEnabled = useCallback((id: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? ({ ...s, enabled: s.enabled === false } as PlanStep) : s,
      ),
    );
  }, []);

  const handleLabelChange = useCallback((id: string, nextLabel: string) => {
    setSteps((prev) =>
      prev.map((s) =>
        s.id === id ? ({ ...s, label: nextLabel } as PlanStep) : s,
      ),
    );
  }, []);

  const handleReorder = useCallback((fromIndex: number, toIndex: number) => {
    setSteps((prev) => {
      if (
        fromIndex < 0 ||
        fromIndex >= prev.length ||
        toIndex < 0 ||
        toIndex >= prev.length ||
        fromIndex === toIndex
      ) {
        return prev;
      }
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  const enabledCount = useMemo(
    () => steps.filter((s) => s.enabled !== false).length,
    [steps],
  );

  // Per-step status: pending until a matching tool_call is seen; running while
  // it's in-flight; done when its tool_result lands.
  const stepStatuses = useMemo<Map<string, "pending" | "running" | "done">>(() => {
    const out = new Map<string, "pending" | "running" | "done">();
    if (!isBuilding || !toolCalls) {
      return out;
    }
    // Tool call ids are formatted `tc_<n>_<stepId>` by the builder when steps
    // are supplied; if not, we map by index against enabled steps.
    const enabled = steps.filter((s) => s.enabled !== false);
    for (const s of steps) {
      out.set(s.id, "pending");
    }
    for (const call of toolCalls) {
      // tc_<n>_<stepId>: extract the suffix and mark that step.
      const match = call.id.match(/^tc_\d+_(.+)$/);
      const stepId = match
        ? match[1]
        : enabled[toolCalls.indexOf(call)]?.id;
      if (!stepId) continue;
      out.set(stepId, call.ok === undefined ? "running" : "done");
    }
    return out;
  }, [isBuilding, steps, toolCalls]);

  const handleAccept = useCallback(() => {
    const enabled = steps.filter((s) => s.enabled !== false);
    if (enabled.length === 0) return;
    onAccept(enabled);
  }, [onAccept, steps]);

  return (
    <div
      role="region"
      aria-label="Plan editor"
      data-testid="plan-editor"
      className="bg-white border border-black/[0.08] rounded-xl shadow-xs p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="t-caption text-[#8E8E93]">
          {isBuilding ? "Building..." : "Plan"}
        </p>
        <span className="t-caption t-num text-[#8E8E93]">
          {enabledCount} of {steps.length} steps
        </span>
      </div>
      <div role="list" className="space-y-1.5">
        {steps.map((step, idx) => (
          <PlanStepCard
            key={step.id}
            step={step}
            index={idx}
            total={steps.length}
            status={stepStatuses.get(step.id)}
            onToggleEnabled={handleToggleEnabled}
            onLabelChange={handleLabelChange}
            onReorder={handleReorder}
            readOnly={isBuilding}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 mt-3">
        {!isBuilding ? (
          <>
            <button
              type="button"
              onClick={handleAccept}
              disabled={enabledCount === 0}
              className={cn(
                "inline-flex items-center justify-center h-8 px-3 rounded-full t-label transition-colors",
                enabledCount > 0
                  ? "bg-[#4F46E5] text-white hover:bg-indigo-700"
                  : "bg-[#F5F5F7] text-[#C7C7CC] cursor-not-allowed",
              )}
            >
              Build edited plan
            </button>
            <button
              type="button"
              onClick={onAbort}
              className="inline-flex items-center justify-center h-8 px-3 rounded-full t-label text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04]"
            >
              Discard
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onAbort}
            className="inline-flex items-center justify-center h-8 px-3 rounded-full t-label text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04]"
          >
            Stop
          </button>
        )}
      </div>
    </div>
  );
}
