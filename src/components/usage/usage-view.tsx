"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/banner";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Meter, type MeterRole } from "@/components/data/meter";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList } from "@/components/settings/fact-list";
import { request } from "@/components/connections/request";
import { DailyBars, type DailyPoint } from "@/components/usage/daily-bars";

type Metric = "runs" | "steps" | "calls";

type UsageSummary = {
  month: string;
  plan: "Free" | "Pro" | "Builder";
  totals: Record<Metric, number>;
  included: Record<Metric, number>;
  overage: Record<Metric, number>;
  overageCents: number;
  daily: Array<{ day: string } & Record<Metric, number>>;
  decisions?: { fast: number; deliberate: number; costMicros: number };
};

const METRICS: { key: Metric; label: string; noun: string; description: string }[] = [
  { key: "runs", label: "Runs", noun: "runs", description: "Workflow runs started, by people, agents, webhooks or schedules." },
  { key: "steps", label: "Steps", noun: "steps", description: "Steps completed inside those runs." },
  { key: "calls", label: "Calls", noun: "calls", description: "API, MCP and webhook requests." }
];

const fmt = (n: number) => n.toLocaleString("en-US");
const money = (cents: number) => (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** The last twelve months, newest first, as `YYYY-MM`. */
function recentMonths(): { value: string; label: string }[] {
  const now = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    return {
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    };
  });
}

/** Every day of the month up to today (or the whole month, for a past one), zero-filled. */
function fillDays(month: string, daily: UsageSummary["daily"], metric: Metric): DailyPoint[] {
  const [year, mon] = month.split("-").map(Number);
  const days = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const today = new Date();
  const last = month === currentMonth() ? today.getUTCDate() : days;
  const byDay = new Map(daily.map((d) => [d.day, d[metric]]));
  return Array.from({ length: days }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    return { day, value: i + 1 <= last ? byDay.get(day) ?? 0 : 0 };
  });
}

function meterRole(used: number, included: number): MeterRole {
  if (included <= 0) return "neutral-mono";
  const ratio = used / included;
  if (ratio > 1) return "critical";
  if (ratio >= 0.8) return "caution";
  return "neutral-mono";
}

export function UsageView(): ReactNode {
  const [months] = useState(recentMonths);
  const [month, setMonth] = useState(months[0]?.value ?? currentMonth());
  const [result, setResult] = useState<{ month: string; summary: UsageSummary | null; error: string | null } | null>(null);
  const [metric, setMetric] = useState<Metric>("runs");

  useEffect(() => {
    let live = true;
    void request<UsageSummary>(`/api/usage?month=${month}`).then((res) => {
      if (!live) return;
      setResult({ month, summary: res.ok ? res.data : null, error: res.ok ? null : res.message });
    });
    return () => {
      live = false;
    };
  }, [month]);

  const summary = result?.month === month ? result.summary : null;
  const error = result?.month === month ? result.error : null;
  const paid = summary ? summary.plan !== "Free" : false;
  const monthLabel = months.find((m) => m.value === month)?.label ?? month;
  const chosen = METRICS.find((m) => m.key === metric) ?? METRICS[0];
  const points = summary ? fillDays(month, summary.daily, metric) : [];
  const anyOver = summary ? METRICS.some((m) => summary.overage[m.key] > 0) : false;

  return (
    <SettingsShell
      title="Usage"
      description="What this workspace ran in a month, against what its plan includes."
      meta={summary ? <StatusPill role="info">{summary.plan} plan</StatusPill> : <Skeleton className="h-[20px] w-[72px] rounded-8" />}
      actions={<Select size="sm" aria-label="Month" value={month} onValueChange={setMonth} options={months} className="w-[180px]" align="end" />}
    >
      {error ? (
        <Banner role="critical" title="Usage could not be loaded">
          {error}
        </Banner>
      ) : null}

      <SettingsSection title={monthLabel}>
        <Card aria-live="polite">
          <div className="grid grid-cols-1 md:grid-cols-3">
            {METRICS.map((m, index) => (
              <div key={m.key} className={index > 0 ? "border-t border-border p-5 md:border-l md:border-t-0" : "p-5"}>
                {summary ? (
                  <div className="flex flex-col gap-2">
                    <Meter
                      label={m.label}
                      value={summary.totals[m.key]}
                      max={summary.included[m.key]}
                      role={meterRole(summary.totals[m.key], summary.included[m.key])}
                      readout={fmt(summary.totals[m.key])}
                    />
                    <span className="t-caption tabular text-ink-3">
                      of {fmt(summary.included[m.key])} included
                      {summary.overage[m.key] > 0 ? <span className="text-critical-text">, {fmt(summary.overage[m.key])} over</span> : null}
                    </span>
                    <span className="t-caption text-ink-3">{m.description}</span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Skeleton className="h-[14px] w-[96px]" />
                    <Skeleton className="h-[6px] w-full" />
                    <Skeleton className="h-[12px] w-[120px]" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </SettingsSection>

      {summary && !paid ? (
        <SettingsSection title="Limits">
          <p className="t-body max-w-[90ch] text-ink-2">
            On the Free plan, new runs stop once the included runs are used, and start again on the first of next month.{" "}
            <Link href="/settings/billing" className="t-link text-ink">
              Upgrade on Billing
            </Link>{" "}
            to keep running past the included amounts and pay only for what you use beyond them.
          </p>
        </SettingsSection>
      ) : null}

      {summary?.decisions && summary.decisions.fast + summary.decisions.deliberate > 0 ? (
        <SettingsSection title="Decisions" description="Questions Pipes asked decision models this month, and what the models charged. See the Decisions page for how often they were right.">
          <Card>
            <FactList
              facts={[
                { label: "Fast decisions", value: <span className="tabular">{fmt(summary.decisions.fast)}</span> },
                { label: "Second opinions", value: <span className="tabular">{fmt(summary.decisions.deliberate)}</span> },
                { label: "Model spend", value: <span className="tabular">{"$" + (summary.decisions.costMicros / 1_000_000).toFixed(4)}</span> }
              ]}
            />
          </Card>
        </SettingsSection>
      ) : null}

      {summary && paid ? (
        <SettingsSection
          title="Overage"
          description="Usage beyond the included amounts is billed at the end of the month. This is an estimate until the invoice is issued."
        >
          <Card>
            <FactList
              facts={[
                ...METRICS.map((m) => ({
                  label: `${m.label} over included`,
                  value: <span className="tabular">{fmt(summary.overage[m.key])}</span>
                })),
                {
                  label: "Estimated overage cost",
                  value: <span className={anyOver ? "t-body-strong tabular text-ink" : "tabular text-ink-3"}>{money(summary.overageCents)}</span>
                }
              ]}
            />
          </Card>
        </SettingsSection>
      ) : null}

      <SettingsSection
        title="By day"
        action={
          <Segmented<Metric>
            size="sm"
            label="Metric"
            value={metric}
            onValueChange={setMetric}
            options={METRICS.map((m) => ({ value: m.key, label: m.label }))}
          />
        }
      >
        <Card padded>
          {summary ? (
            <DailyBars points={points} noun={chosen.noun} />
          ) : (
            <Skeleton className="h-[180px] w-full" />
          )}
          {summary && points.every((p) => p.value === 0) ? (
            <p className="t-caption mt-3 text-ink-3">No {chosen.noun} recorded in {monthLabel}.</p>
          ) : null}
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}
