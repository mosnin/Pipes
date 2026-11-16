"use client";

import { useCallback, useEffect, useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import { Input } from "@/components/ui/input";
import { Toolbar } from "@/components/ui/page-header";
import { StatCell, StatStrip } from "@/components/data/stat-strip";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";
import { RecordTable } from "@/components/settings/record-table";
import { OperatorGate } from "@/components/admin/operator-gate";
import { apiErrorMessage } from "@/components/shell/api-error";

const FLOW_ROLE: Record<string, SignalRole> = { pass: "positive", passed: "positive", ready: "positive", review: "caution", fail: "critical", failed: "critical", blocked: "critical" };

function Readiness({ ready }: { ready: boolean }) {
  return <StatusPill role={ready ? "positive" : "neutral"}>{ready ? "Configured" : "Not configured"}</StatusPill>;
}

export default function AdminReleasePage() {
  const [since, setSince] = useState("");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (since) q.set("since", since);
    const res = await fetch(`/api/admin/release?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(apiErrorMessage(body, "The release review could not be loaded."));
      return;
    }
    setError("");
    setData(body.data);
  }, [since]);

  useEffect(() => { void load(); }, [load]);

  const env = data?.environment;

  return (
    <SettingsShell title="Release review" description="Whether the environment, the critical flows and the failure counts are ready for the next beta release.">
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
          {env.configurationWarning ? (
            <Banner role="caution" title="Runtime warning">
              {env.configurationWarning}
            </Banner>
          ) : null}

          <SettingsSection title="Environment">
            <Card>
              <FactList
                facts={[
                  { label: "Runtime mode", value: <span className="t-mono-hash">{env.runtimeMode}</span> },
                  { label: "Plan", value: `${env.plan} · billing ${env.billingStatus}` },
                  { label: "Convex", value: <Readiness ready={Boolean(env.providerReadiness.convexConfigured)} /> },
                  { label: "Auth", value: <Readiness ready={Boolean(env.providerReadiness.authConfigured)} /> },
                  { label: "Billing", value: <Readiness ready={Boolean(env.providerReadiness.billingConfigured)} /> },
                  { label: "AI", value: <Readiness ready={Boolean(env.providerReadiness.aiConfigured)} /> }
                ]}
              />
            </Card>
          </SettingsSection>

          <SettingsSection title="Signup and activation">
            <StatStrip>
              <StatCell label="Signups started" value={data.summaries.signupActivation.signupStarted} />
              <StatCell label="Onboarding completed" value={data.summaries.signupActivation.onboardingCompleted} />
              <StatCell label="Activated" value={data.summaries.signupActivation.activationAchieved} />
              <StatCell label="Invites accepted" value={data.summaries.inviteAndBilling.inviteAccepted} />
            </StatStrip>
          </SettingsSection>

          <SettingsSection title="Reliability">
            <StatStrip>
              <StatCell label="Protocol failures" value={data.summaries.protocolErrors.length} />
              <StatCell label="Editor crash boundaries" value={data.summaries.editorReliability.editorCrashBoundary} />
              <StatCell label="Autosave failures" value={data.summaries.editorReliability.autosaveFailure} />
              <StatCell label="Billing failures" value={data.summaries.inviteAndBilling.billingFailures} />
            </StatStrip>
          </SettingsSection>

          <SettingsSection title="Critical flows">
            <RecordTable
              noun="flow"
              columns={[{ label: "Flow" }, { label: "Route" }, { label: "Status", className: "w-[112px]" }]}
              rows={data.checklist.criticalFlows.map((item: any) => ({
                key: item.key,
                cells: [
                  <span key="k" className="t-mono-hash">{item.key}</span>,
                  <span key="r" className="t-mono-hash text-ink-2">{item.route}</span>,
                  <StatusPill key="s" role={FLOW_ROLE[item.status] ?? "neutral"}>{sentenceCase(item.status)}</StatusPill>
                ]
              }))}
              empty={<EmptyState title="No critical flows listed" className="py-9" />}
            />
          </SettingsSection>

          <SettingsSection title="Failure groups">
            <RecordTable
              noun="group"
              footer={false}
              columns={[{ label: "Group" }, { label: "Count", numeric: true, className: "w-[96px]" }, { label: "Example signals" }]}
              rows={data.summaries.failures.map((item: any) => ({
                key: item.key,
                cells: [
                  item.label,
                  String(item.count),
                  (item.examples ?? []).length ? <span key="e" className="t-mono-hash block whitespace-normal text-ink-2">{item.examples.join(", ")}</span> : null
                ]
              }))}
              empty={<EmptyState title="No failure groups" className="py-9" />}
            />
          </SettingsSection>

          <SettingsSection title="Launch links">
            <GroupedList empty="No launch links">
              {data.links.map((link: any) => (
                <GroupedRow key={link.href} href={link.href} title={link.label} trailing={<span className="t-mono-hash text-ink-3">{link.href}</span>} />
              ))}
            </GroupedList>
          </SettingsSection>
        </>
      )}
    </SettingsShell>
  );
}
