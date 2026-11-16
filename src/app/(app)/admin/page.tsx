"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Toolbar } from "@/components/ui/page-header";
import { StatCell, StatStrip } from "@/components/data/stat-strip";
import { CellStack } from "@/components/data/table";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";
import { RecordTable } from "@/components/settings/record-table";
import { OperatorGate } from "@/components/admin/operator-gate";
import { apiErrorMessage } from "@/components/shell/api-error";

export default function AdminPage() {
  const [data, setData] = useState<any | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [systemId, setSystemId] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (userEmail) q.set("userEmail", userEmail);
    if (systemId) q.set("systemId", systemId);
    const res = await fetch(`/api/admin/support?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(apiErrorMessage(body, "Support data could not be loaded."));
      return;
    }
    setError("");
    setData(body.data);
  }, [systemId, userEmail]);

  useEffect(() => { void load(); // initial snapshot only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ws = data?.workspace;

  return (
    <SettingsShell
      title="Support"
      description="Look up a user or a workflow and read the workspace's recent audit and signal activity."
      meta={
        ws ? (
          <>
            <span className="t-mono-hash text-ink-2">{ws.workspaceId}</span>
            <StatusPill role={ws.plan.status === "active" ? "positive" : "neutral"}>{`${ws.plan.plan} · ${ws.plan.status}`}</StatusPill>
          </>
        ) : null
      }
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void load();
        }}
      >
        <Toolbar>
          <div className="min-w-[200px] flex-1 sm:max-w-[280px]">
            <Input aria-label="User email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Find a user by email" />
          </div>
          <div className="min-w-[200px] flex-1 sm:max-w-[280px]">
            <Input aria-label="Workflow id" value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="Inspect a workflow id" />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Look up
          </Button>
        </Toolbar>
      </form>

      {error ? <OperatorGate error={error} /> : null}

      {!data ? null : (
        <>
          <SettingsSection title="Workspace">
            <StatStrip>
              <StatCell label="Workflows" value={ws.systems.length} />
              <StatCell label="Active workflows" value={ws.health.activeSystems} />
              <StatCell label="Invites" value={ws.invites.length} />
              <StatCell label="Tokens" value={ws.tokens.length} />
            </StatStrip>
            <p className="t-caption tabular mt-3 text-ink-3">
              {ws.health.favorites} favorites · {ws.health.recentReopens} recent reopens
            </p>
          </SettingsSection>

          {data.user ? (
            <SettingsSection title="User">
              <Card>
                <FactList
                  facts={[
                    { label: "Id", value: <span className="t-mono-hash">{data.user.id}</span> },
                    { label: "Email", value: data.user.email },
                    { label: "Name", value: data.user.name }
                  ]}
                />
              </Card>
            </SettingsSection>
          ) : null}

          {data.system ? (
            <SettingsSection title="Workflow">
              <Card>
                <FactList
                  facts={[
                    { label: "Name", value: data.system.bundle.system.name },
                    { label: "Id", value: <span className="t-mono-hash">{data.system.bundle.system.id}</span> },
                    { label: "Nodes", value: <span className="tabular">{data.system.bundle.nodes.length}</span> },
                    { label: "Pipes", value: <span className="tabular">{data.system.bundle.pipes.length}</span> },
                    { label: "Versions", value: <span className="tabular">{data.system.bundle.versions.length}</span> }
                  ]}
                />
              </Card>
            </SettingsSection>
          ) : null}

          <SettingsSection title="Recent audits">
            <RecordTable
              noun="event"
              columns={[{ label: "Time", className: "w-[120px]" }, { label: "Actor" }, { label: "Action" }, { label: "Outcome", className: "w-[112px]" }, { label: "Workflow" }]}
              rows={data.audits.slice(0, 20).map((a: any, index: number) => ({
                key: a.id ?? `${a.createdAt}-${index}`,
                cells: [
                  <RelativeTime key="t" at={Date.parse(a.createdAt)} />,
                  <CellStack key="a" title={<span className="t-mono-hash">{a.actorId}</span>} meta={a.actorType} />,
                  <span key="ac" className="t-mono-hash">{a.action}</span>,
                  <StatusPill key="o" role={a.outcome === "success" ? "positive" : a.outcome === "failure" ? "critical" : "neutral"}>{sentenceCase(a.outcome)}</StatusPill>,
                  a.systemId ? <span key="s" className="t-mono-hash text-ink-2">{a.systemId}</span> : null
                ]
              }))}
              empty={<EmptyState variant="filtered" title="No audits" body="No events match the current lookup." className="py-8" />}
            />
          </SettingsSection>

          <SettingsSection title="Recent product signals">
            <RecordTable
              noun="signal"
              columns={[{ label: "Time", className: "w-[120px]" }, { label: "Signal" }, { label: "Target" }]}
              rows={ws.recentSignals.map((a: any, index: number) => ({
                key: a.id ?? `${a.createdAt}-${index}`,
                cells: [
                  <RelativeTime key="t" at={Date.parse(a.createdAt)} />,
                  <span key="s" className="t-mono-hash">{a.action}</span>,
                  <span key="tg" className="t-mono-hash text-ink-2">{`${a.targetType}:${a.targetId ?? ""}`}</span>
                ]
              }))}
              empty={<EmptyState title="No signals yet" body="Product signals appear as people use the workspace." className="py-8" />}
            />
          </SettingsSection>
        </>
      )}
    </SettingsShell>
  );
}
