"use client";

import { useEffect, useState } from "react";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";
import { Button, Card, Input, PageHeader, Table, EmptyState } from "@/components/ui";
import { SettingsShell } from "@/components/settings/SettingsShell";

export default function TokensSettingsPage() {
  const [tokens, setTokens] = useState<any[]>([]);
  const [name, setName] = useState("CI Bot");
  const [capabilities, setCapabilities] = useState<string[]>(["systems:read", "schema:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  const load = () => fetch("/api/settings/tokens").then((r) => r.json()).then((d) => setTokens(d.data ?? []));
  useEffect(() => { load(); }, []);

  return (
    <SettingsShell title="Protocol tokens" subtitle="Create workspace or system scoped tokens for REST and MCP integrations.">
      <Card>
        <div className="nav-inline">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" />
          <Button onClick={async () => {
            const res = await fetch("/api/settings/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, capabilities }) });
            const data = await res.json();
            if (data.ok) {
              setSecret(data.data.secret);
              setAuthHeader(data.data.authHeaderExample);
            }
            await load();
          }}>Create token</Button>
        </div>
        <p>Capabilities</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {AGENT_CAPABILITIES.map((cap) => (
            <label key={cap} style={{ fontSize: 12 }}>
              <input type="checkbox" checked={capabilities.includes(cap)} onChange={(e) => setCapabilities((prev) => e.target.checked ? [...prev, cap] : prev.filter((x) => x !== cap))} /> {cap}
            </label>
          ))}
        </div>
        {secret ? <p><strong>Copy now (shown once):</strong> <code>{secret}</code></p> : null}
        {authHeader ? <p><strong>Example auth header:</strong> <code>{authHeader}</code></p> : null}
      </Card>
      <Card>
        {tokens.length === 0 ? <EmptyState title="No tokens yet" description="Create a token when you are ready to connect REST or MCP clients." /> : <Table headers={["Name", "Capabilities", "Last used", "Status", "Usage", "Action"]} rows={tokens.map((t) => [t.name, (t.capabilities ?? []).join(", "), t.lastUsedAt ?? "never", t.revokedAt ? "Revoked" : "Active", String(t.usageCount ?? 0), "revoke"])} />}
        <div style={{ display: "grid", gap: 8 }}>
          {tokens.filter((t) => !t.revokedAt).map((t) => (
            <Button key={t.id} onClick={async () => { await fetch(`/api/settings/tokens/${t.id}/revoke`, { method: "POST" }); await load(); }}>Revoke {t.name}</Button>
          ))}
        </div>
      </Card>
    </SettingsShell>
  );
}
