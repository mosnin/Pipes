"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Chip,
  Separator,
  Spinner,
  Table,
} from "@heroui/react";
import {
  Activity,
  AlertCircle,
  BarChart2,
  TrendingUp,
  Users,
} from "lucide-react";

export default function AdminInsightsPage() {
  const [since, setSince] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (since) q.set("since", since);
    const res = await fetch(`/api/admin/insights?${q.toString()}`);
    const body = await res.json();
    setLoading(false);
    if (!body.ok) {
      setError(body.error ?? "Failed to load insights");
      return;
    }
    setError("");
    setData(body.data);
  }, [since]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Product Insights</h1>
          <p className="text-sm text-default-500 mt-0.5">
            Post-launch activation, retention, and failure diagnostics.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            placeholder="Since ISO timestamp (optional)"
            className="px-3 py-2 rounded-lg border border-default-200 bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 w-64"
          />
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? <Spinner size="sm" /> : null}
            Refresh
          </button>
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <Card className="shadow-sm border-danger-200">
          <Card.Content>
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle size={18} />
              <div>
                <p className="font-semibold text-sm">Operator access required</p>
                <p className="text-xs text-default-500 mt-0.5">{error}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {data ? (
        <>
          {/* Activation funnel */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <TrendingUp size={15} />
                Activation Funnel
              </div>
            </Card.Header>
            <Separator />
            <Card.Content>
              {(() => {
                const steps = [
                  {
                    label: "Onboarding Started",
                    value: data.activation.onboardingStarted,
                    colorClass: "bg-indigo-600",
                  },
                  {
                    label: "Completed",
                    value: data.activation.onboardingCompleted,
                    colorClass: "bg-purple-500",
                  },
                  {
                    label: "First System",
                    value: data.activation.firstSystemCreated,
                    colorClass: "bg-green-500",
                  },
                  {
                    label: "Activated",
                    value: data.activation.activationAchieved,
                    colorClass: "bg-amber-500",
                  },
                ];
                const top = Math.max(steps[0].value, 1);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {steps.map(({ label, value, colorClass }) => {
                      const pct = Math.min((value / top) * 100, 100);
                      return (
                        <div
                          key={label}
                          className="flex flex-col gap-2 p-4 rounded-xl bg-default-50 border border-default-100"
                        >
                          <span className="text-xs text-default-400 font-medium">{label}</span>
                          <span className="text-3xl font-bold text-default-800">{value}</span>
                          <div className="w-full bg-slate-200 rounded-full h-1.5">
                            <div
                              className={`${colorClass} h-1.5 rounded-full transition-all`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-default-400">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card.Content>
          </Card>

          {/* Failure signals */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertCircle size={15} />
                Failure Signals
              </div>
            </Card.Header>
            <Separator />
            <Card.Content>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Autosave Failures",
                    value: data.failures.autosaveFailure,
                    iconColor: "text-danger",
                    bg: "bg-danger-50 border-danger-100",
                  },
                  {
                    label: "Editor Crashes",
                    value: data.failures.editorCrashBoundary,
                    iconColor: "text-warning",
                    bg: "bg-warning-50 border-warning-100",
                  },
                  {
                    label: "Import Conflicts",
                    value: data.failures.importMergeConflicts,
                    iconColor: "text-secondary",
                    bg: "bg-secondary-50 border-secondary-100",
                  },
                  {
                    label: "Search No Results",
                    value: data.rates?.searchNoResultRate != null
                      ? `${(Number(data.rates.searchNoResultRate) * 100).toFixed(1)}%`
                      : "—",
                    iconColor: "text-primary",
                    bg: "bg-primary-50 border-primary-100",
                  },
                ].map(({ label, value, iconColor, bg }) => (
                  <div
                    key={label}
                    className={`flex flex-col gap-2 p-4 rounded-xl border ${bg}`}
                  >
                    <div className={`${iconColor}`}>
                      <AlertCircle size={18} />
                    </div>
                    <span className="text-2xl font-bold text-default-800">{value}</span>
                    <span className="text-xs text-default-500 font-medium">{label}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Usage metrics */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart2 size={15} />
                Usage Metrics
              </div>
            </Card.Header>
            <Separator />
            <Card.Content>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  {
                    label: "Template Usage",
                    value: data.product.templateCommitted,
                    icon: <Activity size={16} className="text-primary" />,
                  },
                  {
                    label: "AI Commits",
                    value: data.product.aiDraftCommitted,
                    icon: <TrendingUp size={16} className="text-success" />,
                  },
                  {
                    label: "Tokens Created",
                    value: data.protocol.tokenCreated,
                    icon: <Users size={16} className="text-secondary" />,
                  },
                  {
                    label: "Agent Writes",
                    value: data.protocol.writesByAgent,
                    icon: <BarChart2 size={16} className="text-warning" />,
                  },
                ].map(({ label, value, icon }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-2 p-4 rounded-xl bg-default-50 border border-default-100"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-default-400 font-medium">{label}</span>
                      {icon}
                    </div>
                    <span className="text-2xl font-bold text-default-800">{value}</span>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          {/* Signal breakdown table */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BarChart2 size={15} />
                Signal Breakdown
                <Chip size="sm" variant="soft" color="default" className="ml-auto">
                  by count
                </Chip>
              </div>
            </Card.Header>
            <Separator />
            <Card.Content className="px-0 pb-0">
              {data.recentSignalCounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-default-400">
                  <BarChart2 size={24} className="mb-2" />
                  <p className="text-sm font-medium">No recent signals</p>
                  <p className="text-xs">Signal counts will populate with product usage.</p>
                </div>
              ) : (
                <Table
                  aria-label="Signal breakdown"
                >
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Event name</Table.Column>
                        <Table.Column>Count</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {[...data.recentSignalCounts]
                        .sort((a: any, b: any) => Number(b.count) - Number(a.count))
                        .map((r: any, i: number) => (
                          <Table.Row key={i}>
                            <Table.Cell className="text-sm font-mono">{r.event}</Table.Cell>
                            <Table.Cell>
                              <Chip size="sm" variant="soft" color="accent">
                                {r.count}
                              </Chip>
                            </Table.Cell>
                          </Table.Row>
                        ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>
        </>
      ) : null}
    </div>
  );
}
