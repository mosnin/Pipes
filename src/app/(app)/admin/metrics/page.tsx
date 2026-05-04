"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Heart,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
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

type MetricsData = {
  kpis: {
    p50: number;
    p95: number;
    errorRate24: number;
    feedbackRate7: number;
  };
  timelines: {
    latencyHourly: number[];
    buildsDaily: number[];
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

function Sparkline({ data, label }: { data: number[]; label: string }) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 90 - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="surface-muted rounded-lg p-4 h-[200px] flex flex-col">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full flex-1"
        aria-label={label}
      >
        <polyline
          fill="none"
          stroke="#4F46E5"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
        <polyline
          fill="rgba(79,70,229,0.08)"
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="t-caption text-[#8E8E93]">start</span>
        <span className="t-caption text-[#8E8E93]">now</span>
      </div>
    </div>
  );
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
            {loading ? <Spinner size="xs" /> : <RefreshCw size={14} />}
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
          icon={<Clock size={14} />}
        />
        <MetricCard
          label="Build p95"
          value={formatMs(data?.kpis.p95 ?? 0)}
          delta="last 24h"
          deltaTone="flat"
          icon={<Activity size={14} />}
        />
        <MetricCard
          label="Error rate"
          value={`${((data?.kpis.errorRate24 ?? 0) * 100).toFixed(2)}%`}
          delta="last 24h"
          deltaTone={(data?.kpis.errorRate24 ?? 0) > 0.05 ? "down" : "flat"}
          icon={<AlertTriangle size={14} />}
        />
        <MetricCard
          label="Feedback (7d)"
          value={data?.kpis.feedbackRate7 ?? 0}
          delta="thumbs + nps"
          deltaTone="up"
          icon={<Heart size={14} />}
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
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CardShell>
          <CardHeader bordered>
            <div className="flex items-center justify-between">
              <span className="t-label font-semibold text-[#111]">
                Latency over time
              </span>
              <HelpText>Hourly average, last 24h</HelpText>
            </div>
          </CardHeader>
          <CardBody>
            <Sparkline data={data?.timelines.latencyHourly ?? new Array(24).fill(0)} label="Latency last 24h" />
          </CardBody>
        </CardShell>

        <CardShell>
          <CardHeader bordered>
            <div className="flex items-center justify-between">
              <span className="t-label font-semibold text-[#111]">
                Builds by day
              </span>
              <HelpText>Last 7 days</HelpText>
            </div>
          </CardHeader>
          <CardBody>
            <Sparkline data={data?.timelines.buildsDaily ?? new Array(7).fill(0)} label="Builds by day" />
          </CardBody>
        </CardShell>
      </div>

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

      <div className="flex items-center gap-2 text-[#8E8E93]">
        <TrendingUp size={12} />
        <HelpText>Samples are persisted in the metrics_samples table; cap is the last 24h for KPIs.</HelpText>
      </div>
    </div>
  );
}
