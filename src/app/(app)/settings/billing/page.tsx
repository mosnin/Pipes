"use client";

import { useEffect, useState } from "react";
import { Button, Card, Table, EmptyState } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function BillingSettingsPage() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    fetch("/api/billing/status").then((r) => r.json()).then((d) => setSummary(d.data));
  }, []);

  const startCheckout = async (plan: "Pro" | "Builder") => {
    const res = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plan }) });
    const data = await res.json();
    if (data.ok) window.location.href = data.data.checkoutUrl;
  };

  const openPortal = async () => {
    const res = await fetch("/api/billing/portal", { method: "POST" });
    const data = await res.json();
    if (data.ok) window.location.href = data.data.portalUrl;
  };

  return (
    <SettingsShell title="Billing" subtitle="Manage workspace plan, limits, and billing links.">
      <Card>
        {!summary ? <EmptyState title="Loading billing" description="Retrieving plan and entitlement limits." /> : <>
        <p aria-live="polite">Current plan: <strong>{summary.plan}</strong> ({summary.status})</p>
        <Table headers={["Feature", "Limit"]} rows={[["Max systems", String(summary.entitlements.maxSystems)], ["Collaboration", summary.entitlements.collaboration ? "Enabled" : "Disabled"], ["Version history", summary.entitlements.versionHistory ? "Enabled" : "Disabled"]]} />
        </>}
        <div className="nav-inline">
          <Button onClick={() => startCheckout("Pro")}>Upgrade to Pro</Button>
          <Button onClick={() => startCheckout("Builder")}>Upgrade to Builder</Button>
          <Button onClick={openPortal}>Manage billing</Button>
        </div>
      </Card>
    </SettingsShell>
  );
}
