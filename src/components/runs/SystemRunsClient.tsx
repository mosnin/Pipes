"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CellStack, DataTable, TBody, TD, TH, THead, TR, Table } from "@/components/data/table";
import { PageShell } from "@/components/layouts/archetypes";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity, CircleCheck, GitBranch, Hash, OctagonAlert, CirclePlay, Timer } from "@/components/ui/icon";
import { PageHeader, SectionHeading } from "@/components/ui/page-header";
import type { WorkflowRun } from "@/domain/runs/types";
import { RunsTable } from "@/components/runs/runs-table";
import { callApi, formatDuration, isActive, ts, type RunSummary } from "@/components/runs/run-format";

const POLL_MS = 5000;
const UNVERSIONED = "Unversioned draft";

type VersionResult = {
  name: string;
  runs: number;
  completed: number;
  finished: number;
  medianMs?: number;
  stoppedAt?: { title: string; count: number };
  lastStartedAt: number;
};

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Where a failed run stopped: its last step, or failing that the step named in its error. */
function stopStep(row: RunSummary, lastStepTitle: Record<string, string>): string | undefined {
  if (row.stoppedAtTitle) return row.stoppedAtTitle;
  if (lastStepTitle[row.id]) return lastStepTitle[row.id];
  if (row.currentStepTitle) return row.currentStepTitle;
  const match = row.error?.match(/^(.+?) (failed|was rejected)/);
  return match?.[1];
}

function resultsByVersion(rows: RunSummary[], lastStepTitle: Record<string, string>): VersionResult[] {
  const groups = new Map<string, RunSummary[]>();
  for (const row of rows) {
    const key = row.versionName ?? UNVERSIONED;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.entries()]
    .map(([name, group]) => {
      const completed = group.filter((r) => r.status === "completed");
      const failed = group.filter((r) => r.status === "failed");
      const durations = group.filter((r) => r.status === "completed" || r.status === "failed").map((r) => r.durationMs).filter((d): d is number => typeof d === "number");
      const stops = new Map<string, number>();
      for (const run of failed) {
        const title = stopStep(run, lastStepTitle);
        if (title) stops.set(title, (stops.get(title) ?? 0) + 1);
      }
      const top = [...stops.entries()].sort((a, b) => b[1] - a[1])[0];
      return {
        name,
        runs: group.length,
        completed: completed.length,
        finished: completed.length + failed.length,
        medianMs: median(durations),
        stoppedAt: top ? { title: top[0], count: top[1] } : undefined,
        lastStartedAt: Math.max(...group.map((r) => ts(r.startedAt) ?? 0))
      };
    })
    .sort((a, b) => b.lastStartedAt - a.lastStartedAt);
}

export function SystemRunsClient({ systemId }: { systemId: string }): ReactNode {
  const router = useRouter();
  const [rows, setRows] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [systemName, setSystemName] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [lastStepTitle, setLastStepTitle] = useState<Record<string, string>>({});
  const fetched = useRef(new Set<string>());

  const load = useCallback(async () => {
    const result = await callApi<RunSummary[]>(`/api/systems/${systemId}/runs`);
    if (result.ok) {
      setRows(result.data);
      setError(null);
      if (result.data[0]) setSystemName(result.data[0].systemName);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, [systemId]);

  useEffect(() => {
    void load();
  }, [load]);

  // The workflow's name for a history with no runs in it yet.
  useEffect(() => {
    if (loading || systemName || rows.length > 0) return;
    void callApi<{ system?: { name?: string } }>(`/api/systems/${systemId}`).then((result) => {
      if (result.ok && result.data.system?.name) setSystemName(result.data.system.name);
    });
  }, [loading, rows.length, systemId, systemName]);

  const anyLive = rows.some((row) => isActive(row.status));
  useEffect(() => {
    if (!anyLive) return;
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [anyLive, load]);

  // A finished run's summary no longer names its last step, so failed runs are
  // read once each to find where they stopped. Capped: the table is a trend,
  // not an audit.
  useEffect(() => {
    const pending = rows.filter((r) => r.status === "failed" && !r.stoppedAtTitle && !fetched.current.has(r.id)).slice(0, 40);
    if (pending.length === 0) return;
    for (const run of pending) fetched.current.add(run.id);
    void Promise.all(
      pending.map(async (run) => {
        const detail = await callApi<{ run: WorkflowRun }>(`/api/runs/${run.id}`);
        if (!detail.ok) return null;
        const last = detail.data.run.steps[detail.data.run.steps.length - 1];
        return last ? ([run.id, last.nodeTitle] as const) : null;
      })
    ).then((pairs) => {
      const found = pairs.filter((p): p is readonly [string, string] => p !== null);
      if (found.length) setLastStepTitle((current) => ({ ...current, ...Object.fromEntries(found) }));
    });
  }, [rows]);

  const versions = useMemo(() => resultsByVersion(rows, lastStepTitle), [rows, lastStepTitle]);

  const startRun = async () => {
    setStarting(true);
    const result = await callApi<{ runId: string }>(`/api/systems/${systemId}/runs`, { method: "POST", body: {} });
    if (result.ok) {
      router.push(`/runs/${result.data.runId}`);
      return;
    }
    setError(result.message);
    setStarting(false);
  };

  return (
    <PageShell measure="page">
      <PageHeader
        title="Run history"
        description={
          systemName ? (
            <>
              Every run of{" "}
              <Link href={`/systems/${systemId}`} className="t-link text-ink-2">
                {systemName}
              </Link>
              , newest first.
            </>
          ) : (
            "Every run of this workflow, newest first."
          )
        }
        actions={
          <>
            <Button asChild variant="secondary" size="sm">
              <Link href={`/systems/${systemId}`}>Open workflow</Link>
            </Button>
            <Button variant="primary" size="sm" onClick={() => void startRun()} loading={starting} disabled={starting}>
              <CirclePlay />
              Start run
            </Button>
          </>
        }
      />

      {error ? (
        <Banner role="critical" title="Something went wrong" className="mb-4">
          {error}
        </Banner>
      ) : null}

      <section aria-labelledby="runs-heading">
        <SectionHeading>
          <span id="runs-heading">Runs</span>
        </SectionHeading>
        <RunsTable
          label="Runs of this workflow"
          rows={rows}
          loading={loading}
          empty={
            <EmptyState
              className="py-8"
              icon={Activity}
              title="This workflow has not run yet"
              body="Start a run to walk it step by step yourself, or hand the workflow to an agent over MCP. Every run lands here with its outcome."
              action={
                <Button variant="primary" size="md" onClick={() => void startRun()} disabled={starting}>
                  <CirclePlay />
                  Start the first run
                </Button>
              }
            />
          }
        />
      </section>

      <section aria-labelledby="versions-heading" className="mt-8">
        <SectionHeading>
          <span id="versions-heading">Results by version</span>
        </SectionHeading>
        <VersionResults versions={versions} loading={loading} />
      </section>
    </PageShell>
  );
}

function VersionResults({ versions, loading }: { versions: VersionResult[]; loading: boolean }): ReactNode {
  if (!loading && versions.length === 0) {
    return (
      <div className="flex min-h-[160px] items-center rounded-12 border border-border bg-raised px-4">
        <p className="t-caption max-w-[60ch] text-ink-3">
          Once runs finish, each version shows its success rate, median run time and the step where failed runs most often stopped, so you can tell whether a change helped.
        </p>
      </div>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-3 lg:hidden">
        {versions.map((v) => (
          <li key={v.name} className="rounded-12 border border-border bg-raised p-4">
            <p className="t-body-strong text-ink">{v.name}</p>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <VersionFact label="Runs" value={String(v.runs)} />
              <VersionFact label="Success rate" value={rateLabel(v)} meta={finishedLabel(v)} />
              <VersionFact label="Median duration" value={formatDuration(v.medianMs) ?? "No finished runs"} />
              <VersionFact label="Failed runs stop at" value={v.stoppedAt?.title ?? "No failures"} meta={v.stoppedAt ? stopCount(v) : undefined} />
            </dl>
          </li>
        ))}
      </ul>
      <div className="hidden lg:block">
        <DataTable>
          <Table aria-label="Results by version" className="min-w-[880px] table-fixed">
            <colgroup>
              <col />
              <col className="w-[96px]" />
              <col className="w-[180px]" />
              <col className="w-[160px]" />
              <col className="w-[280px]" />
            </colgroup>
            <THead>
              <TR>
                <TH icon={GitBranch}>Version</TH>
                <TH icon={Hash} numeric>Runs</TH>
                <TH icon={CircleCheck} numeric>Success rate</TH>
                <TH icon={Timer} numeric>Median duration</TH>
                <TH icon={OctagonAlert}>Failed runs stop at</TH>
              </TR>
            </THead>
            <TBody>
              {versions.map((v) => (
                <TR key={v.name}>
                  <TD className="t-body-strong">{v.name}</TD>
                  <TD numeric>{v.runs}</TD>
                  <TD numeric>
                    <span className="flex flex-col items-end gap-0.5">
                      <span>{rateLabel(v)}</span>
                      <span className="t-caption text-ink-3">{finishedLabel(v)}</span>
                    </span>
                  </TD>
                  <TD numeric>{formatDuration(v.medianMs) ?? <span className="t-caption text-ink-3">No finished runs</span>}</TD>
                  <TD>{v.stoppedAt ? <CellStack title={v.stoppedAt.title} meta={stopCount(v)} /> : <span className="t-caption text-ink-3">No failures</span>}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </DataTable>
      </div>
    </>
  );
}

function VersionFact({ label, value, meta }: { label: string; value: string; meta?: string }): ReactNode {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="t-caption text-ink-3">{label}</dt>
      <dd className="t-body tabular text-ink">{value}</dd>
      {meta ? <dd className="t-caption text-ink-3">{meta}</dd> : null}
    </div>
  );
}

function rateLabel(v: VersionResult) {
  return v.finished === 0 ? "No finished runs" : `${Math.round((v.completed / v.finished) * 100)}%`;
}

function finishedLabel(v: VersionResult) {
  return v.finished === 0 ? "" : `${v.completed} of ${v.finished} finished runs`;
}

function stopCount(v: VersionResult) {
  if (!v.stoppedAt) return "";
  return v.stoppedAt.count === 1 ? "1 failed run" : `${v.stoppedAt.count} failed runs`;
}
