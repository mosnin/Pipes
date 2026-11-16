"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { PageShell } from "@/components/layouts/archetypes";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Activity } from "@/components/ui/icon";
import { PageHeader, Toolbar } from "@/components/ui/page-header";
import { GooeyNav } from "@/components/rare/gooey-nav";
import { RunsTable } from "@/components/runs/runs-table";
import { callApi, isActive, type RunSummary } from "@/components/runs/run-format";
import { useIntro } from "@/lib/onboarding";

type Filter = "all" | "running" | "waiting_approval" | "completed" | "failed";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "waiting_approval", label: "Waiting" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" }
];

const FILTERED_TITLE: Record<Exclude<Filter, "all">, string> = {
  running: "Nothing is running right now",
  waiting_approval: "No runs are waiting for approval",
  completed: "No runs have completed yet",
  failed: "No runs have failed"
};

const POLL_MS = 5000;

export function RunsIndexClient(): ReactNode {
  useIntro("runs");
  const [filter, setFilter] = useState<Filter>("all");
  const [rows, setRows] = useState<RunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (which: Filter) => {
    const result = await callApi<RunSummary[]>(which === "all" ? "/api/runs" : `/api/runs?status=${which}`);
    if (result.ok) {
      setRows(result.data);
      setError(null);
    } else {
      setError(result.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    setRows([]);
    void load(filter);
  }, [filter, load]);

  // Keep live runs moving without a reload: poll only while something can still change.
  const anyLive = rows.some((row) => isActive(row.status));
  useEffect(() => {
    if (!anyLive) return;
    const timer = setInterval(() => void load(filter), POLL_MS);
    return () => clearInterval(timer);
  }, [anyLive, filter, load]);

  return (
    <PageShell measure="page">
      <PageHeader title="Runs" description="Every time an agent or a person walks a workflow, newest first." />

      <Toolbar className="mb-4">
        <GooeyNav
          size="sm"
          aria-label="Filter runs by status"
          value={FILTERS.findIndex((f) => f.value === filter)}
          onChange={(i) => setFilter(FILTERS[i].value)}
          items={FILTERS.map((f) => ({ label: f.label }))}
        />
      </Toolbar>

      {error ? (
        <Banner role="critical" title="Runs could not be loaded" className="mb-4">
          {error}
        </Banner>
      ) : null}

      <RunsTable
        label="Runs"
        rows={rows}
        loading={loading}
        showWorkflow
        empty={
          filter === "all" ? (
            <EmptyState art="activity"
              className="py-8"
              icon={Activity}
              title="No runs yet"
              body="A run starts when an agent picks up a workflow over MCP or the API, or when someone starts one from a workflow's run history."
              action={
                <Button asChild variant="secondary" size="md">
                  <Link href="/dashboard">Open workflows</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState art="activity"
              className="py-8"
              variant="filtered"
              title={FILTERED_TITLE[filter]}
              body="Runs show up here as soon as one reaches this state."
              action={
                <Button variant="secondary" size="md" onClick={() => setFilter("all")}>
                  Show all runs
                </Button>
              }
            />
          )
        }
      />
    </PageShell>
  );
}
