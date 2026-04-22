"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function TrustSettingsPage() {
  const [data, setData] = useState<any | null>(null);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [auth0Connection, setAuth0Connection] = useState("");
  const [mode, setMode] = useState("shared");
  const [deactivateReason, setDeactivateReason] = useState("Security review pending");

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/trust");
    const body = await res.json();
    if (!body.ok) return;
    setData(body.data);
    setAllowedDomains((body.data.auth.allowedDomains ?? []).join(","));
    setAuth0Connection(body.data.auth.auth0Connection ?? "");
    setMode(body.data.auth.mode ?? "shared");
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SettingsShell title="Trust & Governance" subtitle="Enterprise auth readiness, retention policy, exports, and lifecycle controls.">
      <PageHeader title="Workspace Trust" subtitle="Bounded governance controls with explicit recovery and deferral posture." />
      <Card>
        <h4>Enterprise auth posture</h4>
        <p>Current mode: {data?.auth?.mode ?? "loading"}. `sso_ready` prepares domain and connection metadata; full SSO provisioning remains an Auth0 tenant operation.</p>
        <div className="nav-inline">
          <Input value={mode} onChange={(e) => setMode(e.target.value)} placeholder="shared | sso_ready" />
          <Input value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder="allowed domains (comma-separated)" />
          <Input value={auth0Connection} onChange={(e) => setAuth0Connection(e.target.value)} placeholder="auth0 connection (required for sso_ready)" />
          <Button onClick={async () => {
            await fetch("/api/settings/trust", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: "auth", payload: { mode, allowedDomains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean), auth0Connection: auth0Connection || undefined, enforceDomainMatch: mode === "sso_ready" } }) });
            load();
          }}>Save auth settings</Button>
        </div>
      </Card>

      <Card>
        <h4>Retention defaults</h4>
        <p>Archived systems: {data?.retention?.archivedSystemRetentionDays} days · Invites: {data?.retention?.inviteExpiryDays} days · Stale tokens: {data?.retention?.staleTokenDays} days.</p>
      </Card>

      <Card>
        <h4>Workspace export manifest</h4>
        <p>Export includes workspace context, schema version, export timestamp, and system references.</p>
        <Button onClick={async () => {
          const res = await fetch("/api/settings/export/workspace");
          const body = await res.json();
          alert(JSON.stringify(body.data, null, 2));
        }}>Generate export manifest</Button>
      </Card>

      <Card>
        <h4>Deletion and lifecycle posture</h4>
        <p>Systems support archive/restore. Hard delete is intentionally not supported in this pass. Workspace deletion is not supported; workspace deactivation is supported for controlled shutdown.</p>
        <p>Workspace state: {data?.workspaceState?.state ?? "active"}</p>
        <div className="nav-inline">
          <Input value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="deactivation reason" />
          <Button onClick={async () => {
            const confirmation = prompt("Type DEACTIVATE to confirm workspace deactivation");
            await fetch("/api/settings/trust", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "deactivate", reason: deactivateReason, confirmation }) });
            load();
          }}>Deactivate workspace</Button>
          <Button onClick={async () => { await fetch("/api/settings/trust", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reactivate" }) }); load(); }}>Reactivate workspace</Button>
        </div>
      </Card>
    </SettingsShell>
  );
}
