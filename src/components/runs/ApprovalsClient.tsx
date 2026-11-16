"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PageShell } from "@/components/layouts/archetypes";
import { RelativeTime } from "@/components/ledger/relative-time";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import { Stamp } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import type { WorkflowRun } from "@/domain/runs/types";
import { actorName, callApi, ts, type RunSummary } from "@/components/runs/run-format";

type Waiting = RunSummary & { waitingSince?: string; approverRole?: string };

const POLL_MS = 10000;

/**
 * The approval inbox. A run's summary does not say when its current step
 * began, so each waiting run's record is read for the moment it reached the
 * approval: that, not the run's start, is how long someone has been waiting.
 */
export function ApprovalsClient(): ReactNode {
  const [rows, setRows] = useState<Waiting[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const result = await callApi<RunSummary[]>("/api/runs?status=waiting_approval");
    if (!result.ok) {
      setError(result.message);
      setRows((current) => current ?? []);
      return;
    }
    const detailed = await Promise.all(
      result.data.map(async (summary): Promise<Waiting> => {
        const detail = await callApi<{ run: WorkflowRun }>(`/api/runs/${summary.id}`);
        if (!detail.ok) return summary;
        const run = detail.data.run;
        const current = run.steps[run.steps.length - 1];
        return { ...summary, waitingSince: current?.startedAt, approverRole: run.currentNodeId ? run.snapshot.steps[run.currentNodeId]?.approverRole : undefined };
      })
    );
    detailed.sort((a, b) => (ts(a.waitingSince ?? a.startedAt) ?? 0) - (ts(b.waitingSince ?? b.startedAt) ?? 0));
    setRows(detailed);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  return (
    <PageShell measure="page">
      <PageHeader title="Approvals" description="Runs paused at a human approval step. The longest wait is at the top." />

      {error ? (
        <Banner role="critical" title="Approvals could not be loaded" className="mb-6">
          {error}
        </Banner>
      ) : null}

      {rows === null ? (
        <Skeleton className="h-[168px] w-full rounded-12" />
      ) : rows.length === 0 ? (
        <Card className="flex min-h-[280px] items-center justify-center">
          <EmptyState
            className="py-9"
            icon={Stamp}
            title="Nothing is waiting for you"
            body="When a run reaches a human approval step, it stops here until someone approves it, rejects it or sends it back to an earlier step."
          />
        </Card>
      ) : (
        <GroupedList aria-label="Runs waiting for approval">
          {rows.map((row) => (
            <GroupedRow
              key={row.id}
              href={`/runs/${row.id}`}
              title={row.currentStepTitle ?? "Approval"}
              subtitle={`${row.systemName} · Started by ${actorName(row.startedBy)}${row.approverRole ? ` · ${row.approverRole} or above` : ""}`}
              trailing={
                <span className="flex flex-col items-end gap-1">
                  <span className="t-micro hidden text-ink-3 sm:inline">Waiting since</span>
                  <RelativeTime at={ts(row.waitingSince ?? row.startedAt)} />
                </span>
              }
            />
          ))}
        </GroupedList>
      )}
    </PageShell>
  );
}
