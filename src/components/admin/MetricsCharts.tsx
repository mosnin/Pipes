"use client";

import { AreaChart, BarChart, LineChart } from "@tremor/react";
import { CardShell, CardHeader, CardBody, EmptyState, HelpText } from "@/components/ui";

export type LatencyHourlyPoint = { ts: string; p50: number; p95: number };
export type BuildsDailyPoint = { date: string; count: number };
export type ErrorsHourlyPoint = { ts: string; count: number };
export type CostWeeklyPoint = { date: string; tokensIn: number; tokensOut: number };

export type MetricsChartsProps = {
  latencyHourly: LatencyHourlyPoint[];
  buildsDaily: BuildsDailyPoint[];
  errorsHourly: ErrorsHourlyPoint[];
  costWeekly: CostWeeklyPoint[];
};

const HOUR_FMT: Intl.DateTimeFormatOptions = { hour: "numeric", hour12: true };
const DAY_FMT: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };

function formatHour(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString(undefined, HOUR_FMT);
}

function formatDay(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  return d.toLocaleString(undefined, DAY_FMT);
}

function formatMs(value: number): string {
  return `${value.toFixed(0)} ms`;
}

function formatCount(value: number): string {
  return value.toLocaleString();
}

function formatTokens(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function hasSignal(arr: ReadonlyArray<{ [key: string]: unknown }>, keys: string[]): boolean {
  return arr.some((row) => keys.some((k) => Number(row[k] ?? 0) > 0));
}

export function MetricsCharts({
  latencyHourly,
  buildsDaily,
  errorsHourly,
  costWeekly
}: MetricsChartsProps) {
  const latencyData = latencyHourly.map((p) => ({
    label: formatHour(p.ts),
    p50: p.p50,
    p95: p.p95
  }));
  const buildsData = buildsDaily.map((p) => ({ label: formatDay(p.date), count: p.count }));
  const errorsData = errorsHourly.map((p) => ({ label: formatHour(p.ts), count: p.count }));
  const costData = costWeekly.map((p) => ({
    label: formatDay(p.date),
    "Tokens in": p.tokensIn,
    "Tokens out": p.tokensOut
  }));

  const hasLatency = hasSignal(latencyData, ["p50", "p95"]);
  const hasBuilds = hasSignal(buildsData, ["count"]);
  const hasErrors = hasSignal(errorsData, ["count"]);
  const hasCost = hasSignal(costData, ["Tokens in", "Tokens out"]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Latency over time</span>
            <HelpText>p50 vs p95, last 24h</HelpText>
          </div>
        </CardHeader>
        <CardBody>
          {hasLatency ? (
            <AreaChart
              data={latencyData}
              index="label"
              categories={["p50", "p95"]}
              colors={["indigo", "slate"]}
              valueFormatter={formatMs}
              showLegend={true}
              showGridLines={false}
              showAnimation={true}
              className="h-48"
            />
          ) : (
            <EmptyState
              title="No latency yet"
              description="Latency samples will appear once a build runs."
            />
          )}
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Builds by day</span>
            <HelpText>Last 14 days</HelpText>
          </div>
        </CardHeader>
        <CardBody>
          {hasBuilds ? (
            <BarChart
              data={buildsData}
              index="label"
              categories={["count"]}
              colors={["indigo"]}
              valueFormatter={formatCount}
              showLegend={false}
              showGridLines={false}
              showAnimation={true}
              className="h-48"
            />
          ) : (
            <EmptyState
              title="No builds yet"
              description="Build counts will appear here once the agent runs."
            />
          )}
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Errors per hour</span>
            <HelpText>Last 24h</HelpText>
          </div>
        </CardHeader>
        <CardBody>
          {hasErrors ? (
            <BarChart
              data={errorsData}
              index="label"
              categories={["count"]}
              colors={["red"]}
              valueFormatter={formatCount}
              showLegend={false}
              showGridLines={false}
              showAnimation={true}
              className="h-48"
            />
          ) : (
            <EmptyState
              title="No errors"
              description="Nothing failed in the last 24 hours."
            />
          )}
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <span className="t-label font-semibold text-[#111]">Token cost</span>
            <HelpText>Tokens in vs out, last 7 days</HelpText>
          </div>
        </CardHeader>
        <CardBody>
          {hasCost ? (
            <LineChart
              data={costData}
              index="label"
              categories={["Tokens in", "Tokens out"]}
              colors={["indigo", "emerald"]}
              valueFormatter={formatTokens}
              showLegend={true}
              showGridLines={false}
              showAnimation={true}
              className="h-48"
            />
          ) : (
            <EmptyState
              title="No token data"
              description="Token usage will appear once builds report cost."
            />
          )}
        </CardBody>
      </CardShell>
    </div>
  );
}
