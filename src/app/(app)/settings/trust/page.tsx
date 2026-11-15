"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";

function Loading() {
  return <Skeleton className="ml-auto h-[12px] w-[80px]" />;
}

export default function TrustSettingsPage() {
  const fieldId = useId();
  const [data, setData] = useState<any | null>(null);
  const [allowedDomains, setAllowedDomains] = useState("");
  const [auth0Connection, setAuth0Connection] = useState("");
  const [mode, setMode] = useState("shared");
  const [deactivateReason, setDeactivateReason] = useState("Security review pending");
  const [policy, setPolicy] = useState<any | null>(null);

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
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/agent/policy");
      const body = await res.json();
      if (body.ok) setPolicy(body.data);
    })();
  }, []);

  const saveAuth = async () => {
    await fetch("/api/settings/trust", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ section: "auth", payload: { mode, allowedDomains: allowedDomains.split(",").map((d) => d.trim()).filter(Boolean), auth0Connection: auth0Connection || undefined, enforceDomainMatch: mode === "sso_ready" } }) });
    load();
  };

  const cycleRisk = async () => {
    const next = policy?.risk?.posture === "conservative" ? "balanced" : policy?.risk?.posture === "balanced" ? "aggressive" : "conservative";
    const payload = {
      ...policy,
      scope: "workspace",
      risk: { ...policy.risk, posture: next, safeAutoApplyEnabled: next !== "conservative", maxProposalBatchSize: next === "conservative" ? 2 : next === "aggressive" ? 8 : 5 },
      approval: { ...policy.approval, strictness: next === "conservative" ? "strict" : next === "aggressive" ? "relaxed" : "standard" }
    };
    await fetch("/api/agent/policy", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const refreshed = await fetch("/api/agent/policy").then((r) => r.json());
    if (refreshed.ok) setPolicy(refreshed.data);
  };

  const workspaceState = data?.workspaceState?.state ?? "active";
  const retention = data?.retention;

  return (
    <SettingsShell
      title="Trust"
      measure="prose"
      description="Sign-in policy, retention, agent limits, exports and the workspace lifecycle."
      meta={<StatusPill role={workspaceState === "active" ? "positive" : "caution"}>{workspaceState === "active" ? "Workspace active" : `Workspace ${workspaceState}`}</StatusPill>}
    >
      <SettingsSection
        title="Sign-in"
        description="SSO ready records your domains and Auth0 connection. Turning on SSO itself is done in the Auth0 tenant."
      >
        <Card>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void saveAuth();
            }}
          >
            <div className="grid grid-cols-1 gap-7 p-6 sm:grid-cols-2">
              <Field label="Mode" htmlFor={`${fieldId}-mode`} hint={data?.auth?.mode ? `Saved as ${data.auth.mode === "sso_ready" ? "SSO ready" : "shared"}.` : undefined}>
                <Select
                  id={`${fieldId}-mode`}
                  size="sm"
                  value={mode}
                  onValueChange={setMode}
                  options={[{ value: "shared", label: "Shared" }, { value: "sso_ready", label: "SSO ready" }]}
                />
              </Field>
              <Field label="Auth0 connection" htmlFor={`${fieldId}-connection`} hint="Required for SSO ready.">
                <Input id={`${fieldId}-connection`} value={auth0Connection} onChange={(e) => setAuth0Connection(e.target.value)} placeholder="acme-saml" />
              </Field>
              <Field label="Allowed domains" htmlFor={`${fieldId}-domains`} hint="Separate domains with commas." className="sm:col-span-2">
                <Input id={`${fieldId}-domains`} value={allowedDomains} onChange={(e) => setAllowedDomains(e.target.value)} placeholder="acme.com, acme.co.uk" />
              </Field>
            </div>
            <CardFooter inset className="justify-end">
              <Button type="submit" variant="primary" size="sm">
                Save sign-in settings
              </Button>
            </CardFooter>
          </form>
        </Card>
      </SettingsSection>

      <SettingsSection title="Retention">
        <Card>
          <FactList
            facts={[
              { label: "Archived systems", value: retention ? <span className="tabular">{retention.archivedSystemRetentionDays} days</span> : <Loading /> },
              { label: "Invites", value: retention ? <span className="tabular">{retention.inviteExpiryDays} days</span> : <Loading /> },
              { label: "Stale tokens", value: retention ? <span className="tabular">{retention.staleTokenDays} days</span> : <Loading /> }
            ]}
          />
        </Card>
      </SettingsSection>

      <SettingsSection
        title="Agent policy"
        action={
          <Button variant="secondary" size="sm" onClick={() => void cycleRisk()} disabled={!policy}>
            Cycle risk posture
          </Button>
        }
      >
        <Card>
          <FactList
            facts={[
              { label: "Risk posture", value: policy ? sentenceCase(policy.risk?.posture) : <Loading /> },
              { label: "Approval strictness", value: policy ? sentenceCase(policy.approval?.strictness) : <Loading /> },
              { label: "Allowed tools", value: policy ? <span className="t-mono-hash break-all">{(policy.tool?.allowedTools ?? []).join(", ") || "None"}</span> : <Loading /> },
              { label: "Longest run", value: <span className="tabular">{((policy?.runtime?.maxRunDurationMs ?? 0) / 1000).toLocaleString("en-US")} s</span> },
              { label: "Provider calls per run", value: <span className="tabular">{policy?.runtime?.maxProviderCallsPerRun ?? 0}</span> },
              { label: "Cost per run", value: <span className="tabular">${policy?.cost?.maxRunCostUsd ?? 0}</span> }
            ]}
          />
        </Card>
      </SettingsSection>

      <SettingsSection title="Export">
        <Card>
          <CardContent className="sm:flex-row sm:items-center sm:justify-between">
            <p className="t-body text-ink-2">The manifest lists the workspace, its schema version, the export time and every system reference.</p>
            <Button
              variant="secondary"
              size="sm"
              className="self-start sm:self-auto"
              onClick={async () => {
                const res = await fetch("/api/settings/export/workspace");
                const body = await res.json();
                alert(JSON.stringify(body.data, null, 2));
              }}
            >
              Generate export manifest
            </Button>
          </CardContent>
        </Card>
      </SettingsSection>

      <SettingsSection
        title="Workspace lifecycle"
        description="Systems can be archived and restored. Hard deletes are not supported, for systems or for the workspace. Deactivating shuts the workspace down in a controlled way and can be reversed."
      >
        <Card>
          <div className="p-6">
            <Field label="Reason for deactivating" htmlFor={`${fieldId}-reason`} hint="You will be asked to type DEACTIVATE to confirm.">
              <Input id={`${fieldId}-reason`} value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="Deactivation reason" />
            </Field>
          </div>
          <CardFooter inset className="flex-wrap">
            <span className="t-caption text-ink-3">Workspace state: {sentenceCase(workspaceState)}</span>
            <div className="flex flex-wrap items-center gap-4">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => { await fetch("/api/settings/trust", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "reactivate" }) }); load(); }}
              >
                Reactivate workspace
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  const confirmation = prompt("Type DEACTIVATE to confirm workspace deactivation");
                  await fetch("/api/settings/trust", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "deactivate", reason: deactivateReason, confirmation }) });
                  load();
                }}
              >
                Deactivate workspace
              </Button>
            </div>
          </CardFooter>
        </Card>
      </SettingsSection>
    </SettingsShell>
  );
}
