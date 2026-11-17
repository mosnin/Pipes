"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/page-header";
import { actorName, formatClock } from "@/components/runs/run-format";
import type { RunEvent } from "@/domain/rails/types";

const LABEL: Record<RunEvent["type"], string> = {
  "run.started": "Run started",
  "step.completed": "Step completed",
  "step.output_rejected": "Output refused",
  "step.timed_out": "Step ran out of time",
  "approval.decided": "Approval decided",
  "run.canceled": "Run canceled",
  "run.deadline_exceeded": "Deadline passed",
  "run.finished": "Stopped by a rail",
  "rail.denied": "Refused by a rail"
};

const dollars = (micros: number) => `$${(micros / 1_000_000).toFixed(4)}`;

function detail(event: RunEvent): string | undefined {
  const d = event.data;
  if (event.type === "step.completed") {
    const parts = [d.outcome ? `Outcome ${String(d.outcome)}` : undefined, typeof d.costMicros === "number" ? dollars(d.costMicros) : undefined].filter(Boolean);
    return parts.length ? parts.join(", ") : undefined;
  }
  if (event.type === "approval.decided") return String(d.decision ?? "").replace("_", " ");
  if (event.type === "run.finished") return typeof d.message === "string" ? d.message : undefined;
  if (event.type === "run.canceled") return typeof d.reason === "string" ? d.reason : undefined;
  return undefined;
}

/**
 * The run's journal: every change in order, who made it and when. Refetched
 * when the run's rev moves. See docs/run_journal.md.
 */
export function RunJournal({ runId, rev }: { runId: string; rev?: number }): ReactNode {
  const [events, setEvents] = useState<RunEvent[] | null>(null);
  useEffect(() => {
    let live = true;
    fetch(`/api/runs/${encodeURIComponent(runId)}/events`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => {
        if (live && json?.ok) setEvents(json.data);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [runId, rev]);

  if (!events || events.length === 0) return null;
  return (
    <section aria-labelledby="run-journal-heading">
      <SectionHeading>
        <span id="run-journal-heading">Journal</span>
      </SectionHeading>
      <Card>
        <ol>
          {events.map((event) => {
            const more = detail(event);
            return (
              <li key={event.seq} className="flex items-baseline gap-3 border-t border-hairline px-4 py-2.5 first:border-t-0">
                <span className="t-mono-micro w-6 shrink-0 tabular text-ink-4">{event.seq}</span>
                <span className="min-w-0 flex-1">
                  <span className="t-body-medium block text-ink">{LABEL[event.type] ?? event.type}</span>
                  <span className="t-caption block truncate text-ink-3">
                    {actorName(event.actor)}
                    {more ? ` · ${more}` : ""}
                  </span>
                </span>
                <span className="t-caption shrink-0 tabular text-ink-3">{formatClock(event.at)}</span>
              </li>
            );
          })}
        </ol>
      </Card>
    </section>
  );
}
