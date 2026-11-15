"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Toolbar } from "@/components/ui/page-header";
import { StatCell, StatStrip } from "@/components/data/stat-strip";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList } from "@/components/settings/fact-list";
import { RecordTable } from "@/components/settings/record-table";
import { OperatorGate } from "@/components/admin/operator-gate";

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
    <SettingsShell title="Insights" description="Activation, usage and failure counts since launch, or since the time you set.">
      <Toolbar>
        <div className="min-w-[200px] flex-1 sm:max-w-[320px]">
          <Input aria-label="Since" value={since} onChange={(e) => setSince(e.target.value)} placeholder="Since, ISO timestamp" />
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Refresh
        </Button>
      </Toolbar>

      {error ? <OperatorGate error={error} /> : null}

      {!data ? null : (
        <>
          <SettingsSection title="Activation">
            <StatStrip>
              <StatCell label="Onboarding started" value={data.activation.onboardingStarted} />
              <StatCell label="Onboarding completed" value={data.activation.onboardingCompleted} />
              <StatCell label="First system created" value={data.activation.firstSystemCreated} />
              <StatCell label="Activated" value={data.activation.activationAchieved} />
            </StatStrip>
          </SettingsSection>

          <SettingsSection title="Failures">
            <StatStrip>
              <StatCell label="Autosave failures" value={data.failures.autosaveFailure} />
              <StatCell label="Editor crash boundaries" value={data.failures.editorCrashBoundary} />
              <StatCell label="Import attempts" value={data.failures.importMergeAttempted} />
              <StatCell label="Import conflicts" value={data.failures.importMergeConflicts} />
            </StatStrip>
          </SettingsSection>

          <SettingsSection title="Usage">
            <Card>
              <FactList
                facts={[
                  { label: "Templates used", value: <span className="tabular">{data.product.templateCommitted}</span> },
                  { label: "AI drafts committed", value: <span className="tabular">{data.product.aiDraftCommitted}</span> },
                  { label: "Searches with no result", value: <span className="tabular">{(Number(data.rates.searchNoResultRate) * 100).toFixed(1)}%</span> },
                  { label: "Tokens created", value: <span className="tabular">{data.protocol.tokenCreated}</span> },
                  { label: "Agent protocol writes", value: <span className="tabular">{data.protocol.writesByAgent}</span> }
                ]}
              />
            </Card>
          </SettingsSection>

          <SettingsSection title="Recent signal counts">
            <RecordTable
              noun="signal"
              columns={[{ label: "Signal" }, { label: "Count", numeric: true, className: "w-[120px]" }]}
              rows={data.recentSignalCounts.map((r: any) => ({ key: r.event, cells: [<span key="e" className="t-mono-hash">{r.event}</span>, String(r.count)] }))}
              empty={<EmptyState title="No recent signals" body="Signal counts fill in as people use the product." className="py-9" />}
            />
          </SettingsSection>
        </>
      )}
    </SettingsShell>
  );
}
