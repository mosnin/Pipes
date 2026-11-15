"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";
import { getEntitlements, type Entitlements } from "@/domain/templates/plans";
import { cn } from "@/lib/utils";

const PLANS = ["Free", "Pro", "Builder"] as const;

const STATUS_ROLE: Record<string, SignalRole> = {
  active: "positive",
  trialing: "info",
  past_due: "caution",
  canceled: "neutral",
  cancelled: "neutral"
};

const FEATURES: { key: Exclude<keyof Entitlements, "maxSystems">; label: string }[] = [
  { key: "collaboration", label: "Collaboration" },
  { key: "versionHistory", label: "Version history" },
  { key: "advancedValidation", label: "Advanced validation" },
  { key: "simulation", label: "Simulation" },
  { key: "apiMcpAccess", label: "REST and MCP access" },
  { key: "aiGeneration", label: "AI generation" }
];

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

  const entitlements: Entitlements | null = summary?.entitlements ?? null;

  return (
    <SettingsShell
      title="Billing"
      description={summary ? `${summary.plan} plan, and the limits it sets for this workspace.` : "The workspace plan and the limits it sets."}
      meta={
        summary ? (
          <StatusPill role={STATUS_ROLE[summary.status] ?? "neutral"}>{sentenceCase(summary.status)}</StatusPill>
        ) : (
          <Skeleton className="h-[20px] w-[64px] rounded-8" />
        )
      }
      actions={
        <Button variant="secondary" size="sm" onClick={openPortal}>
          Manage billing
        </Button>
      }
    >
      <SettingsSection title="Plan limits">
        <Card aria-live="polite">
          {!entitlements ? (
            <div className="flex flex-col gap-5 p-6">
              <Skeleton className="h-[14px] w-[240px]" />
              <Skeleton className="h-[14px] w-[200px]" />
              <Skeleton className="h-[14px] w-[220px]" />
            </div>
          ) : (
            <FactList
              facts={[
                { label: "Systems", value: <span className="tabular">Up to {entitlements.maxSystems}</span> },
                ...FEATURES.map((feature) => ({
                  label: feature.label,
                  value: entitlements[feature.key] ? "Included" : <span className="text-ink-3">Not included</span>
                }))
              ]}
            />
          )}
        </Card>
      </SettingsSection>

      <SettingsSection title="Plans">
        <ol className="grid gap-5 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const limits = getEntitlements(plan);
            const current = summary?.plan === plan;
            return (
              <li
                key={plan}
                className={cn("flex flex-col gap-6 rounded-12 border bg-raised p-7", current ? "border-strong" : "border-border")}
              >
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-4">
                    <span className="t-title-3 text-ink">{plan}</span>
                    {current ? <StatusPill role="info">Current</StatusPill> : null}
                  </div>
                  <span className="t-caption tabular text-ink-2">Up to {limits.maxSystems} systems</span>
                </div>
                <ul className="flex flex-col gap-2">
                  {FEATURES.filter((feature) => limits[feature.key]).map((feature) => (
                    <li key={feature.key} className="t-caption text-ink-2">
                      {feature.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {plan === "Free" || current ? null : (
                    <Button variant="primary" size="sm" onClick={() => startCheckout(plan)}>
                      Upgrade to {plan}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="t-caption mt-5 text-ink-3">Checkout and invoices open in the billing provider. Manage billing changes or cancels the current plan.</p>
      </SettingsSection>
    </SettingsShell>
  );
}
