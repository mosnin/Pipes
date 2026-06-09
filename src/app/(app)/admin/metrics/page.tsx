"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  DataTable,
  EmptyState,
  HelpText,
  MetricCard,
  PageHeader,
  SkeletonCard,
  Spinner,
  type DataTableColumn,
} from "@/components/ui";
import { MetricsCharts } from "@/components/admin/MetricsCharts";

type ErrorRow = {
  id: string;
  ts: string;
  label: string;
  tags: Record<string, string>;
};

type SlowRow = {
  id: string;
  ts: string;
  ms: number;
  tags: Record<string, string>;
};

type LatencyHourlyPoint = { ts: string; p50: number; p95: number };
type BuildsDailyPoint = { date: string; count: number };
type ErrorsHourlyPoint = { ts: string; count: number };
type CostWeeklyPoint = { date: string; tokensIn: number; tokensOut: number };

type MetricsData = {
  kpis: {
    p50: number;
    p95: number;
    errorRate24: number;
    feedbackRate7: number;
  };
  series: {
    latencyHourly: LatencyHourlyPoint[];
    buildsDaily: BuildsDailyPoint[];
    errorsHourly: ErrorsHourlyPoint[];
    costWeekly: CostWeeklyPoint[];
  };
  recentErrors: ErrorRow[];
  slowestBuilds: SlowRow[];
};

function formatMs(ms: number): string {
  if (ms === 0) return "-";
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      const body = await res.json();
      setLoading(false);
      if (!body.ok) {
        setError(body.error ?? "Failed to load metrics.");
        return;
      }
      setError("");
      setData(body.data as MetricsData);
    } catch (e) {
      setLoading(false);
      setError((e as Error).message ?? "Failed to load metrics.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const errorColumns: DataTableColumn<ErrorRow>[] = useMemo(() => [
    {
      key: "label",
      header: "Label",
      render: (r) => <span className="font-medium">{r.label}</span>,
    },
    {
      key: "tags",
      header: "Tags",
      render: (r) => (
        <span className="t-mono t-caption text-[#3C3C43] truncate block max-w-[260px]">
          {Object.entries(r.tags).map(([k, v]) => `${k}=${v}`).join(" ") || "-"}
        </span>
      ),
    },
    {
      key: "ts",
      header: "When",
      render: (r) => <span className="t-caption text-[#8E8E93]">{formatTime(r.ts)}</span>,
    },
  ], []);

  const slowColumns: DataTableColumn<SlowRow>[] = useMemo(() => [
    {
      key: "ms",
      header: "Duration",
      render: (r) => <span className="font-medium t-num">{formatMs(r.ms)}</span>,
    },
    {
      key: "tags",
      header: "User",
      render: (r) => (
        <span className="t-mono t-caption text-[#3C3C43]">
          {r.tags.userId ?? "-"}
        </span>
      ),
    },
    {
      key: "ts",
      header: "When",
      align: "right",
      render: (r) => <span className="t-caption text-[#8E8E93]">{formatTime(r.ts)}</span>,
    },
  ], []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Metrics"
        subtitle="Build latency, error rate, and feedback signal."
        actions={
          <Button
            variant="secondary"
            onClick={() => void load()}
            isDisabled={loading}
          >
            {loading ? <Spinner size="xs" /> : null}
            <span className="ml-1.5">Refresh</span>
          </Button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Build p50"
          value={formatMs(data?.kpis.p50 ?? 0)}
          delta="last 24h"
          deltaTone="flat"
        />
        <MetricCard
          label="Build p95"
          value={formatMs(data?.kpis.p95 ?? 0)}
          delta="last 24h"
          deltaTone="flat"
        />
        <MetricCard
          label="Error rate"
          value={`${((data?.kpis.errorRate24 ?? 0) * 100).toFixed(2)}%`}
          delta="last 24h"
          deltaTone={(data?.kpis.errorRate24 ?? 0) > 0.05 ? "down" : "flat"}
        />
        <MetricCard
          label="Feedback (7d)"
          value={data?.kpis.feedbackRate7 ?? 0}
          delta="thumbs + nps"
          deltaTone="up"
        />
      </div>

      {error ? (
        <CardShell className="border-[#FCA5A5]">
          <CardBody>
            <p className="t-caption text-[#991B1B]">{error}</p>
          </CardBody>
        </CardShell>
      ) : null}

      {loading && data == null ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <MetricsCharts
          latencyHourly={data?.series.latencyHourly ?? []}
          buildsDaily={data?.series.buildsDaily ?? []}
          errorsHourly={data?.series.errorsHourly ?? []}
          costWeekly={data?.series.costWeekly ?? []}
        />
      )}

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Recent errors</span>
            <HelpText>Last 24h, top 50</HelpText>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={errorColumns}
            rows={data?.recentErrors ?? []}
            dense
            emptyState={
              <EmptyState
                title="No errors"
                description="Nothing failed in the last window."
              />
            }
          />
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Slowest builds</span>
            <HelpText>Top 50 by duration</HelpText>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          <DataTable
            columns={slowColumns}
            rows={data?.slowestBuilds ?? []}
            dense
            emptyState={
              <EmptyState
                title="No data yet"
                description="Build samples will appear here as users run the agent."
              />
            }
          />
        </CardBody>
      </CardShell>

      <HelpText>Samples are persisted in the metrics_samples table; cap is the last 24h for KPIs.</HelpText>
    </div>
  );
}
