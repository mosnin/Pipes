"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, Input, PageHeader, Table, EmptyState } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function AuditSettingsPage() {
  const [events, setEvents] = useState<any[]>([]);
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
    fetch(`/api/settings/audit?${query.toString()}`).then((r) => r.json()).then((d) => setEvents(d.data ?? []));
  }, [actorType, actorId, actionPrefix, outcome, since, systemId, transport]);

  useEffect(() => { load(); }, [load]);

  return (
    <SettingsShell title="Audit" subtitle="Recent protocol and product signal events.">
      <Card>
        <div className="nav-inline">
          <Input value={actorType} onChange={(e) => setActorType(e.target.value)} placeholder="actor type: user|agent" />
          <Input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="actor id" />
          <Input value={actionPrefix} onChange={(e) => setActionPrefix(e.target.value)} placeholder="action prefix: protocol." />
          <Input value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="system id" />
          <Input value={transport} onChange={(e) => setTransport(e.target.value)} placeholder="transport: rest|mcp" />
          <Input value={outcome} onChange={(e) => setOutcome(e.target.value)} placeholder="outcome: success|failure" />
          <Input value={since} onChange={(e) => setSince(e.target.value)} placeholder="since ISO timestamp" />
          <a className="btn" href={`/api/settings/audit?${new URLSearchParams({ actorType, actorId, actionPrefix, systemId, transport, outcome, since, format: "csv" }).toString()}`}>Export CSV</a>
        </div>
        {events.length === 0 ? <EmptyState title="No audit events" description="Events will appear after protocol or signal activity." /> : <Table headers={["Time", "Actor", "Action", "Target", "Transport", "Outcome"]} rows={events.map((e) => [e.createdAt, `${e.actorType}:${e.actorId}`, e.action, `${e.targetType}:${e.targetId ?? ""}`, (() => { try { return JSON.parse(e.metadata ?? "{}").transport ?? "-"; } catch { return "-"; } })(), e.outcome])} />}
      </Card>
    </SettingsShell>
  );
}
