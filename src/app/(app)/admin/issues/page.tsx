"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, EmptyState, Input, PageHeader, Select, Table, Button } from "@/components/ui";

export default function AdminIssuesPage() {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (category !== "all") q.set("category", category);
    const res = await fetch(`/api/admin/issues?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load issue triage");
      return;
    }
    setError("");
    setData(body.data);
  }, [status, category]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader title="Admin Issue Triage" subtitle="Early beta feedback queue with lightweight issue triage statuses." />
      <Card>
        <div className="nav-inline">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="new">New</option><option value="reviewing">Reviewing</option><option value="closed">Closed</option>
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option><option value="bug">Bug</option><option value="ux">UX</option><option value="feature_request">Feature request</option><option value="reliability">Reliability</option><option value="billing">Billing</option><option value="other">Other</option>
          </Select>
          <Button onClick={() => void load()}>Refresh</Button>
        </div>
      </Card>
      {error ? <EmptyState title="Operator access required" description={error} /> : null}
      {!data ? null : (
        <>
          <div className="grid-2">
            <Card><h3>Queue summary</h3><p>Total: {data.items.length}</p><p>Open: {data.openCount}</p></Card>
            <Card><h3>Failure rollup</h3>{data.failureGroups.map((group: any) => <p key={group.key}>{group.label}: {group.count}</p>)}</Card>
          </div>
          <Card>
            <h3>Feedback items</h3>
            {data.items.length === 0 ? <EmptyState title="No feedback items" description="Feedback submitted by users appears here for triage." /> : <Table headers={["Time", "Category", "Severity", "Summary", "Page", "Status", "Action"]} rows={data.items.map((item: any) => [item.createdAt, item.category, item.severity, item.summary, item.page, item.status, "Update below"])} />}
            <div style={{ display: "grid", gap: 8 }}>
              {data.items.map((item: any) => (
                <div key={item.id} className="nav-inline" style={{ justifyContent: "space-between" }}>
                  <span>{item.id} · {item.summary}</span>
                  <div className="nav-inline">
                    <Select defaultValue={item.status} onChange={async (e) => { await fetch("/api/admin/issues", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: item.id, status: e.target.value }) }); void load(); }}>
                      <option value="new">new</option><option value="reviewing">reviewing</option><option value="closed">closed</option>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
