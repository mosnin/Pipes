"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Card,
  CardHeader,
  Chip,
  Separator,
  Spinner,
} from "@heroui/react";
import { AlertTriangle, BarChart2, CheckCircle2, XCircle } from "lucide-react";

export default function AdminReleasePage() {
  const [since, setSince] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (since) q.set("since", since);
    const res = await fetch(`/api/admin/release?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load release review");
      setLoading(false);
      return;
    }
    setError("");
    setData(body.data);
    setLoading(false);
  }, [since]);

  useEffect(() => { void load(); }, [load]);

  const providerStatusColor = (ready: boolean | string) =>
    ready === true || ready === "true" ? "success" : "danger";

  const flowStatusColor = (status: string) => {
    if (status === "pass" || status === "ok" || status === "ready") return "success";
    if (status === "warn" || status === "degraded") return "warning";
    return "danger";
  };

  const flowStatusIcon = (status: string) => {
    if (status === "pass" || status === "ok" || status === "ready") {
      return <CheckCircle2 className="w-4 h-4 text-success" />;
    }
    return <XCircle className="w-4 h-4 text-danger" />;
  };

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Release Review</h1>
          <p className="text-default-500 text-sm mt-1">Pre-launch readiness overview</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="border border-default-200 rounded-lg px-3 py-2 text-sm bg-default-50 focus:outline-none focus:ring-2 focus:ring-primary"
            value={since}
            onChange={(e) => setSince(e.target.value)}
            placeholder="Since ISO timestamp (optional)"
          />
          <button
            className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
            onClick={() => void load()}
          >
            Refresh
          </button>
          <Link href="/admin/issues">
            <button className="px-4 py-2 rounded-lg border border-default-200 text-sm font-medium hover:bg-default-100 transition-colors">
              Issues
            </button>
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border border-danger-200 bg-danger-50">
          <Card.Content className="flex flex-row items-center gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            <div>
              <p className="font-semibold text-danger">Operator access required</p>
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {data && (
        <>
          {/* Environment Readiness */}
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold">Environment Readiness</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-default-500">Runtime mode:</span>
                <Chip size="sm" variant="soft" color="accent">
                  {data.environment.runtimeMode}
                </Chip>
                {data.environment.plan && (
                  <Chip size="sm" variant="soft" color="default">
                    Plan: {data.environment.plan}
                  </Chip>
                )}
                {data.environment.billingStatus && (
                  <Chip size="sm" variant="soft" color="default">
                    Billing: {data.environment.billingStatus}
                  </Chip>
                )}
              </div>

              {/* Config warnings */}
              {data.environment.configurationWarning && (
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                  <Chip size="sm" color="danger" variant="soft">
                    {data.environment.configurationWarning}
                  </Chip>
                </div>
              )}
              {Array.isArray(data.environment.configurationWarnings) && data.environment.configurationWarnings.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {data.environment.configurationWarnings.map((w: string, i: number) => (
                    <Chip key={i} size="sm" color="danger" variant="soft">
                      {w}
                    </Chip>
                  ))}
                </div>
              )}

              {/* Provider readiness grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-1">
                {[
                  { label: "Convex", key: "convexConfigured" },
                  { label: "Auth", key: "authConfigured" },
                  { label: "Billing", key: "billingConfigured" },
                  { label: "AI", key: "aiConfigured" },
                ].map(({ label, key }) => {
                  const val = data.environment.providerReadiness?.[key];
                  const isReady = val === true || val === "true";
                  return (
                    <div
                      key={key}
                      className="flex flex-col items-center gap-2 p-3 rounded-xl border border-default-100 bg-default-50"
                    >
                      <span className="text-xs font-medium text-default-600">{label}</span>
                      <Chip
                        size="sm"
                        color={providerStatusColor(val)}
                        variant="soft"
                      >
                        {isReady ? <CheckCircle2 className="w-3 h-3 inline mr-1" /> : <XCircle className="w-3 h-3 inline mr-1" />}
                        {isReady ? "Ready" : "Not ready"}
                      </Chip>
                    </div>
                  );
                })}
              </div>
            </Card.Content>
          </Card>

          {/* Activation Metrics */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-primary" />
                <h2 className="text-lg font-semibold">Activation Metrics</h2>
              </div>
            </CardHeader>
            <Separator />
            <Card.Content>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-default-50 border border-default-100">
                  <span className="text-3xl font-bold text-foreground">
                    {data.summaries.signupActivation.signupStarted ?? 0}
                  </span>
                  <span className="text-xs text-default-500 text-center">Onboarding started</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-default-50 border border-default-100">
                  <span className="text-3xl font-bold text-foreground">
                    {data.summaries.signupActivation.onboardingCompleted ?? 0}
                  </span>
                  <span className="text-xs text-default-500 text-center">Onboarding completed</span>
                </div>
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-success-50 border border-success-100">
                  <span className="text-3xl font-bold text-success">
                    {data.summaries.signupActivation.activationAchieved ?? 0}
                  </span>
                  <span className="text-xs text-success-600 text-center">Activated workspaces</span>
                </div>
              </div>
            </Card.Content>
          </Card>

          {/* Critical Flows Checklist */}
          <Card>
            <CardHeader className="pb-2">
              <h2 className="text-lg font-semibold">Critical Flows Checklist</h2>
            </CardHeader>
            <Separator />
            <Card.Content className="px-0 pb-0">
              {(data.checklist.criticalFlows ?? []).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-default-400">
                  <p className="text-sm font-medium">No critical flows defined.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-default-100 bg-default-50">
                      <th className="text-left px-4 py-2 text-xs font-semibold text-default-500 uppercase tracking-wide">Flow</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-default-500 uppercase tracking-wide">Route</th>
                      <th className="text-left px-4 py-2 text-xs font-semibold text-default-500 uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(data.checklist.criticalFlows ?? []).map((item: any) => (
                      <tr key={item.key} className="border-b border-default-100 last:border-0">
                        <td className="px-4 py-3 font-medium">{item.key}</td>
                        <td className="px-4 py-3">
                          <span className="text-default-500 font-mono text-xs">{item.route}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {flowStatusIcon(item.status)}
                            <Chip
                              size="sm"
                              color={flowStatusColor(item.status)}
                              variant="soft"
                            >
                              {item.status}
                            </Chip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card.Content>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Failure Groups */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold">Failure Groups</h2>
              </CardHeader>
              <Separator />
              <Card.Content>
                {(data.summaries.failures ?? []).length === 0 ? (
                  <p className="text-sm text-default-400 py-2">No failure groups recorded.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(data.summaries.failures ?? []).map((item: any) => (
                      <li key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-default-700">{item.label}</span>
                        <Chip
                          size="sm"
                          color={item.count > 0 ? "danger" : "default"}
                          variant="soft"
                        >
                          {item.count}
                        </Chip>
                      </li>
                    ))}
                  </ul>
                )}
              </Card.Content>
            </Card>

            {/* Protocol + Editor Metrics */}
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold">Protocol + Editor Metrics</h2>
              </CardHeader>
              <Separator />
              <Card.Content>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Protocol failures",
                      value: data.summaries.protocolErrors?.length ?? 0,
                    },
                    {
                      label: "Editor crash boundaries",
                      value: data.summaries.editorReliability?.editorCrashBoundary ?? 0,
                    },
                    {
                      label: "Autosave failures",
                      value: data.summaries.editorReliability?.autosaveFailure ?? 0,
                    },
                    {
                      label: "Invite accepted",
                      value: data.summaries.inviteAndBilling?.inviteAccepted ?? 0,
                    },
                    {
                      label: "Billing failures",
                      value: data.summaries.inviteAndBilling?.billingFailures ?? 0,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex flex-col gap-1 p-3 rounded-lg bg-default-50 border border-default-100"
                    >
                      <span className="text-lg font-bold">{value}</span>
                      <span className="text-xs text-default-500">{label}</span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          </div>

          {/* Launch Links */}
          {data.links?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <h2 className="text-lg font-semibold">Launch Links</h2>
              </CardHeader>
              <Separator />
              <Card.Content>
                <div className="flex flex-wrap gap-2">
                  {data.links.map((link: any) => (
                    <Link key={link.href} href={link.href}>
                      <button className="px-3 py-1.5 rounded-lg border border-default-200 text-sm hover:bg-default-100 transition-colors">
                        {link.label}
                      </button>
                    </Link>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
