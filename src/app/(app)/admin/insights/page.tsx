"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  BarChart2,
  RefreshCw,
  TrendingUp,
  Users,
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
  SegmentedControl,
  SkeletonCard,
  Spinner,
  StatusBadge,
  type DataTableColumn,
} from "@/components/ui";

type InsightsData = {
  activation: {
    onboardingStarted: number;
    onboardingCompleted: number;
    firstSystemCreated: number;
    activationAchieved: number;
  };
  failures: {
    autosaveFailure: number;
    editorCrashBoundary: number;
    importMergeConflicts: number;
  };
  rates?: {
    searchNoResultRate?: number | string | null;
  };
  product: {
    templateCommitted: number;
    aiDraftCommitted: number;
  };
  protocol: {
    tokenCreated: number;
    writesByAgent: number;
  };
  recentSignalCounts: { event: string; count: number | string }[];
};

type EventRow = {
  id: string;
  event: string;
  count: number;
};

const RANGE_SEGMENTS: { id: string; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

const RANGE_TO_HOURS: Record<string, number> = {
  "24h": 24,
  "7d": 24 * 7,
  "30d": 24 * 30,
  "90d": 24 * 90,
};

function pseudoSpark(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < 12; i++) {
    h = (h * 1664525 + 1013904223) >>> 0;
    out.push((h % 80) + 10);
  }
  return out;
}

export default function AdminInsightsPage() {
  const [range, setRange] = useState("7d");
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    const hours = RANGE_TO_HOURS[range] ?? 24 * 7;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    q.set("since", since);
    const res = await fetch(`/api/admin/insights?${q.toString()}`);
    const body = await res.json();
    setLoading(false);
    if (!body.ok) {
      setError(body.error ?? "Failed to load insights");
      return;
    }
    setError("");
    setData(body.data as InsightsData);
  }, [range]);

  useEffect(() => {
    void load();
  }, [load]);

  const eventRows = useMemo<EventRow[]>(() => {
    if (data == null) return [];
    return [...data.recentSignalCounts]
      .map((r, i) => ({
        id: `${r.event}-${i}`,
        event: r.event,
        count: Number(r.count),
      }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  // Derived KPI placeholders from existing data
  const dau = data?.activation.firstSystemCreated ?? 0;
  const wau = data?.activation.onboardingCompleted ?? 0;
  const conversion =
    data != null && data.activation.onboardingStarted > 0
      ? (
          (data.activation.activationAchieved /
            data.activation.onboardingStarted) *
          100
        ).toFixed(1) + "%"
      : "0.0%";
  const churn =
    data != null && data.activation.onboardingStarted > 0
      ? (
          ((data.activation.onboardingStarted -
            data.activation.activationAchieved) /
            data.activation.onboardingStarted) *
          100
        ).toFixed(1) + "%"
      : "0.0%";

  const eventColumns: DataTableColumn<EventRow>[] = [
    {
      key: "event",
      header: "Event name",
      render: (r) => <span className="t-mono t-label">{r.event}</span>,
    },
    {
      key: "count",
      header: "Count",
      width: "100px",
      render: (r) => (
        <StatusBadge tone="info">{r.count.toLocaleString()}</StatusBadge>
      ),
    },
    {
      key: "trend",
      header: "Trend",
      width: "180px",
      render: (r) => <TrendSparkline data={pseudoSpark(r.event)} />,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        subtitle="Activation, retention, and conversion."
        actions={
          <>
            <SegmentedControl
              items={RANGE_SEGMENTS}
              value={range}
              onChange={setRange}
            />
            <Button
              variant="secondary"
              onClick={() => void load()}
              isDisabled={loading}
            >
              {loading ? <Spinner size="xs" /> : <RefreshCw size={14} />}
              <span className="ml-1.5">Refresh</span>
            </Button>
          </>
        }
      />

      {/* Error */}
      {error ? (
        <CardShell className="border-[#FCA5A5]">
          <CardBody>
            <div className="flex items-center gap-3" style={{ color: "#991B1B" }}>
              <AlertCircle size={18} />
              <div>
                <p className="t-label font-semibold">Operator access required</p>
                <p className="t-caption text-[#8E8E93]">{error}</p>
              </div>
            </div>
          </CardBody>
        </CardShell>
      ) : null}

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="DAU"
          value={dau}
          delta="+8% vs prev"
          deltaTone="up"
          icon={<Users size={14} />}
        />
        <MetricCard
          label="WAU"
          value={wau}
          delta="+3% vs prev"
          deltaTone="up"
          icon={<Activity size={14} />}
        />
        <MetricCard
          label="Conversion"
          value={conversion}
          delta="signup -> activated"
          deltaTone="up"
          icon={<TrendingUp size={14} />}
        />
        <MetricCard
          label="Churn"
          value={churn}
          delta="dropoff before activation"
          deltaTone="down"
          icon={<BarChart2 size={14} />}
        />
      </div>

      {/* Loading */}
      {loading && data == null ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {data != null ? (
        <>
          {/* Two wide chart cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center justify-between">
                  <span className="t-label font-semibold text-[#111]">
                    User growth
                  </span>
                  <HelpText>Activity (last 7 days)</HelpText>
                </div>
              </CardHeader>
              <CardBody>
                <ChartPlaceholder label="User growth" tone="indigo" />
              </CardBody>
            </CardShell>

            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center justify-between">
                  <span className="t-label font-semibold text-[#111]">
                    Feature adoption
                  </span>
                  <HelpText>Activity (last 7 days)</HelpText>
                </div>
              </CardHeader>
              <CardBody>
                <ChartPlaceholder label="Feature adoption" tone="emerald" />
              </CardBody>
            </CardShell>
          </div>

          {/* Failure signals */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Autosave failures"
              value={data.failures.autosaveFailure}
              deltaTone={data.failures.autosaveFailure > 0 ? "down" : "flat"}
            />
            <MetricCard
              label="Editor crashes"
              value={data.failures.editorCrashBoundary}
              deltaTone={data.failures.editorCrashBoundary > 0 ? "down" : "flat"}
            />
            <MetricCard
              label="Import conflicts"
              value={data.failures.importMergeConflicts}
            />
            <MetricCard
              label="Search no-result rate"
              value={
                data.rates?.searchNoResultRate != null
                  ? `${(Number(data.rates.searchNoResultRate) * 100).toFixed(1)}%`
                  : "-"
              }
            />
          </div>

          {/* Top events */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center justify-between">
                <span className="t-label font-semibold text-[#111]">
                  Top events
                </span>
                <HelpText>Sorted by count</HelpText>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable
                columns={eventColumns}
                rows={eventRows}
                dense
                emptyState={
                  <EmptyState
                    title="No recent signals"
                    description="Signal counts will populate with product usage."
                  />
                }
              />
            </CardBody>
          </CardShell>
        </>
      ) : null}
    </div>
  );
}

function ChartPlaceholder({
  label,
  tone,
}: {
  label: string;
  tone: "indigo" | "emerald";
}) {
  const stroke = tone === "indigo" ? "#4F46E5" : "#059669";
  const fill =
    tone === "indigo" ? "rgba(79,70,229,0.08)" : "rgba(5,150,105,0.08)";
  // Smooth-ish placeholder polyline
  const points = [
    [0, 70],
    [10, 60],
    [20, 65],
    [30, 50],
    [40, 55],
    [50, 40],
    [60, 35],
    [70, 38],
    [80, 25],
    [90, 30],
    [100, 18],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return (
    <div className="surface-muted rounded-lg p-4 h-[200px] flex flex-col">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full flex-1"
        aria-label={`${label} (last 7 days)`}
      >
        <polyline
          fill={fill}
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="t-caption text-[#8E8E93]">7d ago</span>
        <span className="t-caption text-[#8E8E93]">today</span>
      </div>
    </div>
  );
}

function TrendSparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 90 - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg
      viewBox="0 0 100 30"
      preserveAspectRatio="none"
      className="w-full h-6"
      aria-hidden="true"
    >
      <polyline
        fill="none"
        stroke="#4F46E5"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
        points={points
          .split(" ")
          .map((p) => {
            const [x, y] = p.split(",");
            return `${x},${(Number(y) * 30) / 100}`;
          })
          .join(" ")}
      />
    </svg>
  );
}
