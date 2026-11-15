"use client";

import { useEffect, useId, useState } from "react";
import { AGENT_CAPABILITIES } from "@/lib/protocol/tokens";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { CellStack } from "@/components/data/table";
import { RelativeTime } from "@/components/ledger/relative-time";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { CheckRow } from "@/components/settings/check-row";
import { RecordTable } from "@/components/settings/record-table";

export default function TokensSettingsPage() {
  const fieldId = useId();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("CI Bot");
  const [capabilities, setCapabilities] = useState<string[]>(["systems:read", "schema:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);

  const load = () => fetch("/api/settings/tokens").then((r) => r.json()).then((d) => { setTokens(d.data ?? []); setLoaded(true); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    const res = await fetch("/api/settings/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, capabilities }) });
    const data = await res.json();
    if (data.ok) {
      setSecret(data.data.secret);
      setAuthHeader(data.data.authHeaderExample);
    }
    await load();
  };

  return (
    <SettingsShell
      title="API tokens"
      description="Bearer tokens for REST and MCP clients. Each token holds only the capabilities you grant it."
    >
      {secret ? (
        <Banner role="caution" title="Copy this token now. It is shown once.">
          <div className="mt-2 flex flex-col gap-3">
            <code className="t-mono-hash block break-all text-ink">{secret}</code>
            {authHeader ? (
              <span>
                Send it as <code className="t-mono-hash break-all text-ink">{authHeader}</code>
              </span>
            ) : null}
          </div>
        </Banner>
      ) : null}

      <SettingsSection title="New token">
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="flex flex-col gap-7 p-6">
              <Field label="Name" htmlFor={`${fieldId}-name`} hint="Name it after the client that will use it." className="max-w-[360px]">
                <Input id={`${fieldId}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" />
              </Field>
              <fieldset className="flex flex-col gap-3">
                <legend className="t-caption-medium mb-3 text-ink">Capabilities</legend>
                <div className="-mx-4 grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {AGENT_CAPABILITIES.map((cap) => (
                    <CheckRow
                      key={cap}
                      mono
                      label={cap}
                      checked={capabilities.includes(cap)}
                      onToggle={() => setCapabilities((prev) => (prev.includes(cap) ? prev.filter((x) => x !== cap) : [...prev, cap]))}
                    />
                  ))}
                </div>
              </fieldset>
            </div>
            <CardFooter inset>
              <span className="t-caption tabular text-ink-3">
                {capabilities.length} of {AGENT_CAPABILITIES.length} capabilities
              </span>
              <Button type="submit" variant="primary" size="sm">
                Create token
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SettingsSection>

      <SettingsSection title="Tokens">
        <RecordTable
          loading={!loaded}
          noun="token"
          columns={[
            { label: "Name" },
            { label: "Capabilities" },
            { label: "Last used", className: "w-[120px]" },
            { label: "Status", className: "w-[104px]" },
            { label: "Calls", numeric: true, className: "w-[80px]" },
            { label: "Actions", hidden: true, className: "w-[96px]" }
          ]}
          rows={tokens.map((t) => ({
            key: t.id,
            cells: [
              <CellStack key="n" title={t.name} meta={t.id} />,
              <span key="c" className="t-mono-hash block min-w-[200px] whitespace-normal text-ink-2">{(t.capabilities ?? []).join(", ")}</span>,
              t.lastUsedAt ? <RelativeTime key="u" at={Date.parse(t.lastUsedAt)} /> : <span key="u" className="t-caption text-ink-3">Never</span>,
              <StatusPill key="s" role={t.revokedAt ? "critical" : "positive"}>{t.revokedAt ? "Revoked" : "Active"}</StatusPill>,
              String(t.usageCount ?? 0),
              t.revokedAt ? null : (
                <Button
                  key="r"
                  variant="destructive"
                  size="sm"
                  aria-label={`Revoke ${t.name}`}
                  onClick={async () => { await fetch(`/api/settings/tokens/${t.id}/revoke`, { method: "POST" }); await load(); }}
                >
                  Revoke
                </Button>
              )
            ]
          }))}
          empty={
            <EmptyState
              title="No tokens yet"
              body="Create a token when you are ready to connect a REST or MCP client."
              className="py-9"
            />
          }
        />
      </SettingsSection>
    </SettingsShell>
  );
}
