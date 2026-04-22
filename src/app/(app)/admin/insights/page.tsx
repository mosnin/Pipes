"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, EmptyState, Input, PageHeader, Table } from "@/components/ui";

export default function AdminInsightsPage() {
  const [since, setSince] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (since) q.set("since", since);
    const res = await fetch(`/api/admin/insights?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load insights");
      return;
    }
    setError("");
    setData(body.data);
  }, [since]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader title="Admin Insights" subtitle="Post-launch activation, retention, and failure diagnostics." />
      <Card>
        <div className="nav-inline">
          <Input value={since} onChange={(e) => setSince(e.target.value)} placeholder="Since ISO timestamp (optional)" />
          <button className="btn" onClick={() => void load()}>Refresh</button>
        </div>
      </Card>
      {error ? <EmptyState title="Operator access required" description={error} /> : null}
      {!data ? null : (
        <>
          <div className="grid-2">
            <Card><h3>Activation Funnel</h3><p>Started: {data.activation.onboardingStarted}</p><p>Completed: {data.activation.onboardingCompleted}</p><p>First System: {data.activation.firstSystemCreated}</p><p>Activated: {data.activation.activationAchieved}</p></Card>
            <Card><h3>Failure Signals</h3><p>Autosave failures: {data.failures.autosaveFailure}</p><p>Editor crash boundaries: {data.failures.editorCrashBoundary}</p><p>Import attempts: {data.failures.importMergeAttempted}</p><p>Import conflicts: {data.failures.importMergeConflicts}</p></Card>
          </div>
          <Card><h3>Usage Summaries</h3><p>Template usage: {data.product.templateCommitted}</p><p>AI commits: {data.product.aiDraftCommitted}</p><p>Search no result rate: {(Number(data.rates.searchNoResultRate) * 100).toFixed(1)}%</p><p>Token-created signals: {data.protocol.tokenCreated}</p><p>Agent protocol writes: {data.protocol.writesByAgent}</p></Card>
          <Card>
            <h3>Recent Signal Counts</h3>
            {data.recentSignalCounts.length === 0 ? <EmptyState title="No recent signals" description="Signal counts will populate with product usage." /> : <Table headers={["Signal", "Count"]} rows={data.recentSignalCounts.map((r: any) => [r.event, String(r.count)])} />}
          </Card>
        </>
      )}
    </div>
  );
}
