"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Download } from "@/components/ui/icon";
import { CellStack } from "@/components/data/table";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { RecordTable } from "@/components/settings/record-table";
import { sentenceCase } from "@/components/settings/fact-list";

function transportOf(metadata: string | undefined) {
  try { return JSON.parse(metadata ?? "{}").transport ?? null; } catch { return null; }
}

export default function AuditSettingsPage() {
  const fieldId = useId();
  const [events, setEvents] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [actorType, setActorType] = useState("");
  const [actorId, setActorId] = useState("");
  const [actionPrefix, setActionPrefix] = useState("");
  const [systemId, setSystemId] = useState("");
  const [transport, setTransport] = useState("");
  const [outcome, setOutcome] = useState("");
  const [since, setSince] = useState("");

  const load = useCallback(() => {
    const query = new URLSearchParams();
    if (actorType) query.set("actorType", actorType);
    if (actorId) query.set("actorId", actorId);
    if (actionPrefix) query.set("actionPrefix", actionPrefix);
    if (systemId) query.set("systemId", systemId);
    if (transport) query.set("transport", transport);
    if (outcome) query.set("outcome", outcome);
    if (since) query.set("since", since);
    fetch(`/api/settings/audit?${query.toString()}`).then((r) => r.json()).then((d) => { setEvents(d.data ?? []); setLoaded(true); });
  }, [actorType, actorId, actionPrefix, outcome, since, systemId, transport]);

  useEffect(() => { load(); }, [load]);

  const filtered = Boolean(actorType || actorId || actionPrefix || systemId || transport || outcome || since);
  const csvHref = `/api/settings/audit?${new URLSearchParams({ actorType, actorId, actionPrefix, systemId, transport, outcome, since, format: "csv" }).toString()}`;

  return (
    <SettingsShell
      title="Audit log"
      description="Every protocol call and product signal recorded for this workspace, newest first."
      actions={
        <Button asChild variant="secondary" size="sm">
          <a href={csvHref}>
            <Download aria-hidden="true" />
            Export CSV
          </a>
        </Button>
      }
    >
      <SettingsSection title="Filters">
        <Card>
          <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Actor type" htmlFor={`${fieldId}-actor-type`}>
              <Select id={`${fieldId}-actor-type`} size="sm" value={actorType} onValueChange={setActorType} options={[{ value: "", label: "Any" }, { value: "user", label: "User" }, { value: "agent", label: "Agent" }]} />
            </Field>
            <Field label="Actor id" htmlFor={`${fieldId}-actor-id`}>
              <Input id={`${fieldId}-actor-id`} value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="usr_1" />
            </Field>
            <Field label="Action starts with" htmlFor={`${fieldId}-action`}>
              <Input id={`${fieldId}-action`} value={actionPrefix} onChange={(e) => setActionPrefix(e.target.value)} placeholder="protocol." />
            </Field>
            <Field label="Workflow id" htmlFor={`${fieldId}-system`}>
              <Input id={`${fieldId}-system`} value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="sys_..." />
            </Field>
            <Field label="Transport" htmlFor={`${fieldId}-transport`}>
              <Select id={`${fieldId}-transport`} size="sm" value={transport} onValueChange={setTransport} options={[{ value: "", label: "Any" }, { value: "rest", label: "REST" }, { value: "mcp", label: "MCP" }]} />
            </Field>
            <Field label="Outcome" htmlFor={`${fieldId}-outcome`}>
              <Select id={`${fieldId}-outcome`} size="sm" value={outcome} onValueChange={setOutcome} options={[{ value: "", label: "Any" }, { value: "success", label: "Success" }, { value: "failure", label: "Failure" }]} />
            </Field>
            <Field label="Since" htmlFor={`${fieldId}-since`} hint="An ISO timestamp." className="sm:col-span-2">
              <Input id={`${fieldId}-since`} value={since} onChange={(e) => setSince(e.target.value)} placeholder="2026-11-01T00:00:00Z" />
            </Field>
          </div>
        </Card>
      </SettingsSection>

      <SettingsSection title="Events">
        <RecordTable
          loading={!loaded}
          noun="event"
          columns={[
            { label: "Time", className: "w-[120px]" },
            { label: "Actor" },
            { label: "Action" },
            { label: "Target" },
            { label: "Transport", className: "w-[96px]" },
            { label: "Outcome", className: "w-[112px]" }
          ]}
          rows={events.map((e, index) => {
            const via = transportOf(e.metadata);
            return {
              key: e.id ?? `${e.createdAt}-${index}`,
              cells: [
                <RelativeTime key="t" at={Date.parse(e.createdAt)} />,
                <CellStack key="a" title={<span className="t-mono-hash">{e.actorId}</span>} meta={e.actorType} />,
                <span key="ac" className="t-mono-hash">{e.action}</span>,
                <span key="tg" className="t-mono-hash text-ink-2">{`${e.targetType}:${e.targetId ?? ""}`}</span>,
                via ? <span key="v" className="t-caption text-ink-2">{String(via).toUpperCase()}</span> : null,
                <StatusPill key="o" role={e.outcome === "success" ? "positive" : e.outcome === "failure" ? "critical" : "neutral"}>{sentenceCase(e.outcome)}</StatusPill>
              ]
            };
          })}
          empty={
            <EmptyState
              variant={filtered ? "filtered" : "never"}
              title={filtered ? "No events match these filters" : "No audit events yet"}
              body={filtered ? "Clear a filter to widen the search." : "Events appear here once an agent calls the protocol or someone works on a workflow."}
              className="py-9"
            />
          }
        />
      </SettingsSection>
    </SettingsShell>
  );
}
