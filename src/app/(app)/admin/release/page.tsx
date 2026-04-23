"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button, Card, EmptyState, Input, PageHeader, Table } from "@/components/ui";

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
      setError(body.error ?? "Failed to load release review");
      return;
    }
    setError("");
    setData(body.data);
  }, [since]);

  useEffect(() => { void load(); }, [load]);

  return (
    <div>
      <PageHeader title="Admin Release Review" subtitle="Compact launch-readiness review for beta operations." actions={<Link href="/admin/issues"><Button>Issues</Button></Link>} />
      <Card>
        <div className="nav-inline">
          <Input value={since} onChange={(e) => setSince(e.target.value)} placeholder="Since ISO timestamp (optional)" />
          <Button onClick={() => void load()}>Refresh</Button>
        </div>
      </Card>
      {error ? <EmptyState title="Operator access required" description={error} /> : null}
      {!data ? null : (
        <>
          <div className="grid-2">
            <Card>
              <h3>Environment readiness</h3>
              <p>Mode: {data.environment.runtimeMode}</p>
              {data.environment.configurationWarning ? <p>Runtime warning: {data.environment.configurationWarning}</p> : null}
              <p>Plan: {data.environment.plan} · Billing: {data.environment.billingStatus}</p>
              <p>Providers: Convex {String(data.environment.providerReadiness.convexConfigured)} · Auth {String(data.environment.providerReadiness.authConfigured)} · Billing {String(data.environment.providerReadiness.billingConfigured)} · AI {String(data.environment.providerReadiness.aiConfigured)}</p>
            </Card>
            <Card>
              <h3>Signup + activation</h3>
              <p>Started: {data.summaries.signupActivation.signupStarted}</p>
              <p>Completed: {data.summaries.signupActivation.onboardingCompleted}</p>
              <p>Activated: {data.summaries.signupActivation.activationAchieved}</p>
            </Card>
          </div>
          <Card>
            <h3>Critical flow checklist</h3>
            <Table headers={["Flow", "Route reference", "Status"]} rows={data.checklist.criticalFlows.map((item: any) => [item.key, item.route, item.status])} />
          </Card>
          <div className="grid-2">
            <Card>
              <h3>Failure groups</h3>
              <Table headers={["Group", "Count", "Examples"]} rows={data.summaries.failures.map((item: any) => [item.label, String(item.count), (item.examples ?? []).join(", ") || "-"])} />
            </Card>
            <Card>
              <h3>Protocol + editor reliability</h3>
              <p>Protocol failures: {data.summaries.protocolErrors.length}</p>
              <p>Editor crash boundaries: {data.summaries.editorReliability.editorCrashBoundary}</p>
              <p>Autosave failures: {data.summaries.editorReliability.autosaveFailure}</p>
              <p>Invite accepted: {data.summaries.inviteAndBilling.inviteAccepted}</p>
              <p>Billing failures: {data.summaries.inviteAndBilling.billingFailures}</p>
            </Card>
          </div>
          <Card>
            <h3>Launch links</h3>
            <div className="nav-inline" style={{ flexWrap: "wrap" }}>
              {data.links.map((link: any) => <Link key={link.href} href={link.href}><Button>{link.label}</Button></Link>)}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
