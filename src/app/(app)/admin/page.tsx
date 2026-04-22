"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Card, EmptyState, Input, PageHeader, Table, Button } from "@/components/ui";

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
      setError(body.error ?? "Failed to load admin data");
      return;
    }
    setError("");
    setData(body.data);
  }, [systemId, userEmail]);

  useEffect(() => { void load(); // initial snapshot only
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <PageHeader title="Admin Support" subtitle="Bounded operator inspection over services and audit data." actions={<div className="nav-inline"><Link href="/admin/insights"><Button>Insights</Button></Link><Link href="/admin/release"><Button>Release</Button></Link><Link href="/admin/issues"><Button>Issues</Button></Link></div>} />
      <Card>
        <div className="nav-inline">
          <Input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Find user by email" />
          <Input value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="Inspect system id" />
          <Button onClick={() => void load()}>Refresh</Button>
        </div>
      </Card>
      {error ? <EmptyState title="Operator access required" description={error} /> : null}
      {!data ? null : (
        <>
          <Card>
            <h3>Workspace Summary</h3>
            <p>Workspace: {data.workspace.workspaceId}</p>
            <p>Plan: {data.workspace.plan.plan} · {data.workspace.plan.status}</p>
            <p>Systems: {data.workspace.systems.length} · Invites: {data.workspace.invites.length} · Tokens: {data.workspace.tokens.length}</p>
            <p>Activation health: active systems {data.workspace.health.activeSystems}, favorites {data.workspace.health.favorites}, recent reopens {data.workspace.health.recentReopens}</p>
          </Card>
          <Card>
            <h3>Recent Audits</h3>
            {data.audits.length === 0 ? <EmptyState title="No audits" description="No events in the selected filter." /> : <Table headers={["Time", "Actor", "Action", "Outcome", "System"]} rows={data.audits.slice(0, 20).map((a: any) => [a.createdAt, `${a.actorType}:${a.actorId}`, a.action, a.outcome, a.systemId ?? "-"])} />}
          </Card>
          <Card>
            <h3>Recent Product Signals</h3>
            {data.workspace.recentSignals.length === 0 ? <EmptyState title="No signals" description="No recent signal events yet." /> : <Table headers={["Time", "Signal", "Target"]} rows={data.workspace.recentSignals.map((a: any) => [a.createdAt, a.action, `${a.targetType}:${a.targetId ?? ""}`])} />}
          </Card>
          {data.user ? <Card><h3>User Lookup</h3><p>{data.user.id} · {data.user.email} · {data.user.name}</p></Card> : null}
          {data.system ? <Card><h3>System Summary</h3><p>{data.system.bundle.system.name} ({data.system.bundle.system.id})</p><p>Nodes: {data.system.bundle.nodes.length} · Pipes: {data.system.bundle.pipes.length} · Versions: {data.system.bundle.versions.length}</p></Card> : null}
        </>
      )}
    </div>
  );
}
