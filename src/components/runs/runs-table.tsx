"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { CellStack, DataTable, TBody, TD, TH, THead, TR, Table, TableFooter } from "@/components/data/table";
import { RelativeTime } from "@/components/ledger/relative-time";
import { CirclePlay, CircleDot, Clock, GitBranch, ListChecks, Timer, User, Workflow } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useNow } from "@/lib/now";
import { RunStatusPill } from "@/components/runs/run-status-pill";
import { actorName, formatDuration, runDuration, TRIGGER_LABEL, ts, type RunSummary } from "@/components/runs/run-format";
import { Avatar } from "@/components/ledger/author-stamp";

export interface RunsTableProps {
  label: string;
  rows: RunSummary[];
  loading: boolean;
  /** Show the workflow column. Off on a workflow's own run history, where every row would repeat it. */
  showWorkflow?: boolean;
  /** The full-span body shown when there are no rows. */
  empty: ReactNode;
}

/**
 * Runs as a ledger: one row per run, newest first, each opening the run's own
 * page. At phone width the same rows render as a stacked list, because seven
 * columns in a horizontal scrollport hide the status, which is the one thing
 * a phone visitor came to read.
 */
export function RunsTable({ label, rows, loading, showWorkflow = false, empty }: RunsTableProps): ReactNode {
  const router = useRouter();
  const now = useNow();
  const columns = showWorkflow ? 8 : 7;
  const showEmpty = !loading && rows.length === 0;

  return (
    <>
      <section aria-label={label} className="overflow-hidden rounded-12 border border-border bg-raised lg:hidden">
        {loading && rows.length === 0 ? (
          <ul className="divide-y divide-hairline">
            {Array.from({ length: 3 }, (_, index) => (
              <li key={index} className="flex flex-col gap-1.5 p-4">
                <Skeleton className="h-[13px] w-[55%]" />
                <Skeleton className="h-[11px] w-[72%]" />
              </li>
            ))}
          </ul>
        ) : showEmpty ? (
          <div className="flex min-h-[240px] items-center justify-center p-4">{empty}</div>
        ) : (
          <ul className="divide-y divide-hairline">
            {rows.map((row) => {
              const duration = formatDuration(runDuration(row, now));
              return (
                <li key={row.id}>
                  <Link href={`/runs/${row.id}`} className="focus-ring-canvas flex flex-col gap-1.5 p-4 transition-colors hover:bg-state-hover focus-visible:outline-none">
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="t-body-strong min-w-0 flex-1 truncate text-ink">{showWorkflow ? row.systemName : row.versionName ?? "Unversioned draft"}</span>
                      <RunStatusPill status={row.status} />
                    </span>
                    <span className="t-caption flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-3">
                      <RelativeTime at={ts(row.startedAt)} />
                      <span>{actorName(row.startedBy)}</span>
                      <span className="tabular">{row.stepCount === 1 ? "1 step" : `${row.stepCount} steps`}</span>
                      {duration ? <span className="tabular">{duration}</span> : null}
                    </span>
                    {row.currentStepTitle && (row.status === "running" || row.status === "waiting_approval") ? (
                      <span className="t-caption truncate text-ink-2">Now on {row.currentStepTitle}</span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="hidden lg:block">
        <DataTable>
          <Table aria-label={label} className="min-w-[900px] table-fixed">
            <colgroup>
              {showWorkflow ? <col /> : null}
              {/* Fixed columns leave the workflow name at least 240px on Podium's 1024px measure. */}
              <col className="w-[128px]" />
              <col className={showWorkflow ? "w-[124px]" : "w-[160px]"} />
              <col className="w-[96px]" />
              <col className={showWorkflow ? "w-[128px]" : "w-[200px]"} />
              <col className="w-[64px]" />
              <col className="w-[96px]" />
              {showWorkflow ? <col className="w-[128px]" /> : <col />}
            </colgroup>
            <THead>
              <TR>
                {showWorkflow ? <TH icon={Workflow}>Workflow</TH> : null}
                <TH icon={CircleDot}>Status</TH>
                <TH icon={Clock}>Started</TH>
                <TH icon={CirclePlay}>Trigger</TH>
                <TH icon={User}>Started by</TH>
                <TH icon={ListChecks} numeric>Steps</TH>
                <TH icon={Timer} numeric>Duration</TH>
                <TH icon={GitBranch}>Version</TH>
              </TR>
            </THead>
            <TBody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TR key={index}>
                    {Array.from({ length: columns }, (_, cell) => (
                      <TD key={cell}>
                        <Skeleton className="h-[12px] w-[60%]" />
                      </TD>
                    ))}
                  </TR>
                ))
              ) : showEmpty ? (
                <TR>
                  <TD colSpan={columns} className="p-0">
                    <div className="flex min-h-[240px] items-center justify-center">{empty}</div>
                  </TD>
                </TR>
              ) : (
                rows.map((row) => {
                  const duration = formatDuration(runDuration(row, now));
                  const live = row.status === "running" || row.status === "waiting_approval";
                  return (
                    <TR
                      key={row.id}
                      className="cursor-pointer"
                      onClick={(event) => {
                        if ((event.target as HTMLElement).closest("a,button")) return;
                        router.push(`/runs/${row.id}`);
                      }}
                    >
                      {showWorkflow ? (
                        <TD>
                          <Link href={`/runs/${row.id}`} className="focus-ring-canvas block min-w-0 rounded-4 outline-none">
                            <CellStack title={row.systemName} meta={live && row.currentStepTitle ? `Now on ${row.currentStepTitle}` : row.error ?? undefined} />
                          </Link>
                        </TD>
                      ) : null}
                      <TD>
                        {showWorkflow ? (
                          <RunStatusPill status={row.status} />
                        ) : (
                          <Link href={`/runs/${row.id}`} className="focus-ring-canvas inline-flex rounded-4 outline-none">
                            <RunStatusPill status={row.status} />
                          </Link>
                        )}
                      </TD>
                      <TD>
                        <RelativeTime at={ts(row.startedAt)} />
                      </TD>
                      <TD className="text-ink-2">{TRIGGER_LABEL[row.trigger] ?? row.trigger}</TD>
                      <TD>
                        <span className="flex min-w-0 items-center gap-2">
                          {row.startedBy?.type === "trigger" ? null : (
                            <Avatar label={actorName(row.startedBy)} kind={row.startedBy?.type === "agent" ? "agent" : "human"} size={20} />
                          )}
                          <span className="truncate">{actorName(row.startedBy)}</span>
                        </span>
                      </TD>
                      <TD numeric>{row.stepCount}</TD>
                      <TD numeric className={live ? "text-ink-3" : undefined}>
                        {duration}
                      </TD>
                      <TD>
                        {showWorkflow ? (
                          <span className="block truncate text-ink-2">{row.versionName ?? "Unversioned draft"}</span>
                        ) : (
                          <CellStack title={row.versionName ?? "Unversioned draft"} meta={live && row.currentStepTitle ? `Now on ${row.currentStepTitle}` : row.error ?? undefined} />
                        )}
                      </TD>
                    </TR>
                  );
                })
              )}
            </TBody>
          </Table>
          {!loading && rows.length > 0 ? <TableFooter count={rows.length} noun="run" /> : null}
        </DataTable>
      </div>
    </>
  );
}
