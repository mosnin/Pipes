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
import { apiErrorMessage } from "@/components/shell/api-error";
import { PlanNote } from "@/components/shell/plan-note";
import { useBillingStatus } from "@/components/shell/use-billing-status";
import { useToast } from "@/components/ui/toast";
import { HoldConfirm } from "@/components/micro/hold-confirm";

export default function TokensSettingsPage() {
  const fieldId = useId();
  const [tokens, setTokens] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("CI Bot");
  const [capabilities, setCapabilities] = useState<string[]>(["systems:read", "schema:read"]);
  const [secret, setSecret] = useState<string | null>(null);
  const [authHeader, setAuthHeader] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const billing = useBillingStatus();
  const canCreate = billing ? billing.entitlements.apiMcpAccess : true;

  const load = () => fetch("/api/settings/tokens").then((r) => r.json()).then((d) => { setTokens(d.data ?? []); setLoaded(true); });
  useEffect(() => { load(); }, []);

  const create = async () => {
    setBusy(true);
    setError(null);
    const res = await fetch("/api/settings/tokens", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, capabilities }) }).catch(() => null);
    const data = await res?.json().catch(() => null);
    setBusy(false);
    if (data?.ok) {
      setSecret(data.data.secret);
      setAuthHeader(data.data.authHeaderExample);
    } else {
      setError(apiErrorMessage(data, "The token could not be created."));
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
          <div className="mt-1 flex flex-col gap-1.5">
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
        {!canCreate ? (
          <PlanNote title="API tokens are on the Pro plan" className="mb-3">
            {billing ? `This workspace is on the ${billing.plan} plan. REST and MCP access start on Pro.` : null}
          </PlanNote>
        ) : null}
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void create();
            }}
          >
            <div className="flex flex-col gap-5 p-4">
              <Field label="Name" htmlFor={`${fieldId}-name`} hint="Name it after the client that will use it." className="max-w-[360px]">
                <Input id={`${fieldId}-name`} value={name} onChange={(e) => setName(e.target.value)} placeholder="Token name" />
              </Field>
              <fieldset className="flex flex-col gap-1.5">
                <legend className="t-caption-medium mb-1.5 text-ink">Capabilities</legend>
                <div className="-mx-2 grid grid-cols-1 gap-0.5 sm:grid-cols-2 lg:grid-cols-3">
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
            {error ? (
              <div role="alert" className="px-4 pb-4">
                <Banner role="critical" title="The token wasn't created">
                  {error}
                </Banner>
              </div>
            ) : null}
            <CardFooter inset>
              <span className="t-caption tabular text-ink-3">
                {capabilities.length} of {AGENT_CAPABILITIES.length} capabilities
              </span>
              <Button type="submit" variant="primary" size="sm" disabled={!canCreate} loading={busy}>
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
                <HoldConfirm
                  key="r"
                  label="Revoke"
                  confirmedLabel="Revoked"
                  question={`Revoke ${t.name}? Clients using it stop working at once, and it cannot be turned back on.`}
                  onConfirm={async () => {
                    const res = await fetch(`/api/settings/tokens/${t.id}/revoke`, { method: "POST" }).catch(() => null);
                    const data = await res?.json().catch(() => null);
                    if (!data?.ok) toast(apiErrorMessage(data, "The token could not be revoked."), { tone: "error" });
                    await load();
                  }}
                />
              )
            ]
          }))}
          empty={
            <EmptyState art="pins"
              title="No tokens yet"
              body="Create a token when you are ready to connect a REST or MCP client."
              className="py-8"
            />
          }
        />
      </SettingsSection>
    </SettingsShell>
  );
}
