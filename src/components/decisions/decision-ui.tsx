"use client";

import { useEffect, useState, type ReactNode } from "react";
import { StatusPill } from "@/components/ledger/status";
import { Sparkles } from "@/components/ui/icon";
import type { StepRecord } from "@/domain/runs/types";
import type { DecisionSuggestion } from "@/domain/decisions/types";

const pct = (n?: number) => (n === undefined ? "" : `${Math.round(n * 100)}%`);

/**
 * What Pipes' decision engine did on a step: chose the route itself,
 * suggested one, or checked the output against doneWhen. One quiet line per
 * fact, under the step in a run's timeline.
 */
export function DecisionNotes({ step }: { step: StepRecord }): ReactNode {
  const lines: ReactNode[] = [];
  if (step.decidedBy) {
    lines.push(
      <span key="d">
        Route chosen by Pipes <span className="tabular">({pct(step.decidedBy.confidence)} sure)</span>
      </span>
    );
  } else if (step.suggestion) {
    const followed = step.pipeId && step.suggestion.pipeId === step.pipeId;
    lines.push(
      <span key="s">
        Pipes suggested “{step.suggestion.label}” <span className="tabular">({pct(step.suggestion.confidence)})</span>
        {step.completedAt ? (followed ? ", and it was taken" : ", and a different route was taken") : ""}
      </span>
    );
  }
  if (step.check) {
    const role = step.check.verdict === "met" ? "positive" : step.check.verdict === "not_met" ? "critical" : "neutral";
    lines.push(
      <span key="c" className="inline-flex flex-wrap items-center gap-1.5">
        <StatusPill role={role}>{step.check.verdict === "met" ? "Finish line met" : step.check.verdict === "not_met" ? "Finish line not met" : "Finish line unclear"}</StatusPill>
        <span>{step.check.reason}</span>
      </span>
    );
  }
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg bg-subtle px-3 py-2 text-[13px] text-muted-foreground">
      {lines.map((line, i) => (
        <div key={i} className="flex items-start gap-2">
          <Sparkles aria-hidden className="mt-[3px] size-3.5 shrink-0 text-agent" />
          {line}
        </div>
      ))}
    </div>
  );
}

/** Pipes' suggested route on the step being performed. The suggested route becomes the primary button. */
export function RouteSuggestion({ suggestion }: { suggestion: DecisionSuggestion }): ReactNode {
  return (
    <p className="flex items-start gap-2 rounded-lg bg-agent/10 px-3 py-2 text-[13px] text-foreground">
      <Sparkles aria-hidden className="mt-[3px] size-3.5 shrink-0 text-agent" />
      <span>
        Pipes suggests <span className="font-medium">{suggestion.label}</span> <span className="tabular text-muted-foreground">({pct(suggestion.confidence)})</span>
        <span className="text-muted-foreground">. {suggestion.reason}</span>
      </span>
    </p>
  );
}

type Triage ={ choice?: string; confidence?: number; risk?: number; complete?: number; reason: string; action: string } | null;

const RISK = ["None", "Low", "Medium", "High"];
const DECISION_LABEL: Record<string, string> = { approve: "Approve", reject: "Reject", send_back: "Send back" };

/**
 * Pipes' suggestion for a person deciding an approval: what it would do, how
 * risky approving looks, whether the work looks complete. A suggestion only;
 * the person always decides.
 */
export function TriageSuggestion({ runId, rev }: { runId: string; rev?: number }): ReactNode {
  const [triage, setTriage] = useState<Triage>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/runs/${encodeURIComponent(runId)}/triage`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (live && json?.ok) setTriage(json.data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [runId, rev]);

  if (!triage || triage.action === "fallback") return null;
  const risk = triage.risk === undefined ? undefined : RISK[Math.min(3, Math.max(0, Math.round(triage.risk)))];
  return (
    <div className="flex flex-col gap-1.5 rounded-[14px] bg-agent/10 px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-foreground">
        <Sparkles aria-hidden className="size-4 text-agent" />
        {triage.action === "suggest" && triage.choice ? (
          <span>
            Pipes suggests <span className="font-medium">{DECISION_LABEL[triage.choice] ?? triage.choice}</span> <span className="tabular text-muted-foreground">({pct(triage.confidence)})</span>
          </span>
        ) : (
          <span>Pipes is not sure either way.</span>
        )}
        {risk ? <StatusPill role={risk === "High" ? "critical" : risk === "Medium" ? "caution" : "neutral"}>{`${risk} risk`}</StatusPill> : null}
        {triage.complete !== undefined ? <StatusPill role={triage.complete >= 0.8 ? "positive" : triage.complete <= 0.2 ? "critical" : "neutral"}>{triage.complete >= 0.8 ? "Looks complete" : triage.complete <= 0.2 ? "Looks incomplete" : "Completeness unclear"}</StatusPill> : null}
      </p>
      <p className="text-[12px] text-muted-foreground">A suggestion only. You decide, and your decision is used to check how often Pipes is right.</p>
    </div>
  );
}
