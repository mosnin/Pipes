"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";
import { apiErrorMessage } from "@/components/shell/api-error";
import { useToast } from "@/components/ui/toast";

/** Send a change and report the server's own sentence when it says no. */
async function mutate(url: string, method: "POST" | "PUT", body: unknown, fallback: string): Promise<string | null> {
  try {
    const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    return json?.ok ? null : apiErrorMessage(json, fallback);
  } catch {
    return "Pipes could not be reached. Check your connection and try again.";
  }
}

function Loading() {
  return <Skeleton className="ml-auto h-[12px] w-[80px]" />;
}

export default function TrustSettingsPage() {
  const fieldId = useId();
  const [data, setData] = useState<any | null>(null);
  const [deactivateReason, setDeactivateReason] = useState("Security review pending");
  const [policy, setPolicy] = useState<any | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const res = await fetch("/api/settings/trust");
    const body = await res.json();
    if (!body.ok) return;
    setData(body.data);
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/agent/policy");
      const body = await res.json();
      if (body.ok) setPolicy(body.data);
    })();
  }, []);

  const cycleRisk = async () => {
    const next = policy?.risk?.posture === "conservative" ? "balanced" : policy?.risk?.posture === "balanced" ? "aggressive" : "conservative";
    const payload = {
      ...policy,
      scope: "workspace",
      risk: { ...policy.risk, posture: next, safeAutoApplyEnabled: next !== "conservative", maxProposalBatchSize: next === "conservative" ? 2 : next === "aggressive" ? 8 : 5 },
      approval: { ...policy.approval, strictness: next === "conservative" ? "strict" : next === "aggressive" ? "relaxed" : "standard" }
    };
    const failed = await mutate("/api/agent/policy", "POST", payload, "The risk posture did not change.");
    if (failed) toast(failed);
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
      <SettingsSection title="Sign-in" description="Two-step sign-in, session length and allowed email domains are set on the Security page, where they apply to every request.">
        <Card>
          <CardFooter className="border-t-0">
            <span className="t-body text-ink-2">Sign-in policy and roles</span>
            <Button asChild variant="secondary" size="sm">
              <Link href="/settings/security">Open Security</Link>
            </Button>
          </CardFooter>
        </Card>
      </SettingsSection>

      <SettingsSection title="Retention">
        <Card>
          <FactList
            facts={[
              { label: "Archived workflows", value: retention ? <span className="tabular">{retention.archivedSystemRetentionDays} days</span> : <Loading /> },
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
            <p className="t-body text-ink-2">The manifest lists the workspace, its schema version, the export time and every workflow reference.</p>
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
        description="Workflows can be archived and restored. Hard deletes are not supported, for workflows or for the workspace. Deactivating shuts the workspace down in a controlled way and can be reversed."
      >
        <Card>
          <div className="p-4">
            <Field label="Reason for deactivating" htmlFor={`${fieldId}-reason`} hint="You will be asked to type DEACTIVATE to confirm.">
              <Input id={`${fieldId}-reason`} value={deactivateReason} onChange={(e) => setDeactivateReason(e.target.value)} placeholder="Deactivation reason" />
            </Field>
          </div>
          <CardFooter inset className="flex-wrap">
            <span className="t-caption text-ink-3">Workspace state: {sentenceCase(workspaceState)}</span>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  const failed = await mutate("/api/settings/trust", "POST", { action: "reactivate" }, "The workspace could not be reactivated.");
                  if (failed) toast(failed);
                  load();
                }}
              >
                Reactivate workspace
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  const confirmation = prompt("Type DEACTIVATE to confirm workspace deactivation");
                  if (confirmation === null) return;
                  const failed = await mutate("/api/settings/trust", "POST", { action: "deactivate", reason: deactivateReason, confirmation }, "The workspace could not be deactivated.");
                  if (failed) toast(failed);
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
