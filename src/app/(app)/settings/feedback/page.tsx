"use client";

import { useState } from "react";
import { Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function FeedbackSettingsPage() {
  const [category, setCategory] = useState("bug");
  const [severity, setSeverity] = useState("medium");
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [systemId, setSystemId] = useState("");
  const [status, setStatus] = useState("");

  return (
    <SettingsShell title="Feedback" subtitle="Send structured beta feedback directly to operator triage.">
      <PageHeader title="Beta feedback intake" subtitle="Lightweight feedback loop: category, severity, context, and summary." />
      <Card>
        <div style={{ display: "grid", gap: 8 }}>
          <Select value={category} onChange={(e) => setCategory(e.target.value)}><option value="bug">Bug</option><option value="ux">UX</option><option value="feature_request">Feature request</option><option value="reliability">Reliability</option><option value="billing">Billing</option><option value="other">Other</option></Select>
          <Select value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></Select>
          <Input value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summary (minimum 8 chars)" />
          <Input value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Details" />
          <Input value={systemId} onChange={(e) => setSystemId(e.target.value)} placeholder="Optional system id" />
          <Button onClick={async () => {
            const res = await fetch("/api/feedback", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ category, severity, summary, details, systemId: systemId || undefined, page: window.location.pathname }) });
            const body = await res.json();
            if (body.ok) {
              setSummary("");
              setDetails("");
              setSystemId("");
              setStatus("Feedback submitted.");
            } else setStatus(body.error ?? "Failed to submit feedback.");
          }}>Submit feedback</Button>
        </div>
      </Card>
      {status ? <EmptyState title="Feedback status" description={status} /> : null}
    </SettingsShell>
  );
}
