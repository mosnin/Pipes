"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusPill, type SignalRole } from "@/components/ledger/status";
import { SettingsSection, SettingsShell } from "@/components/settings/SettingsShell";
import { FactList, sentenceCase } from "@/components/settings/fact-list";
import { apiErrorMessage } from "@/components/shell/api-error";
import type { BillingStatus } from "@/components/shell/use-billing-status";
import { getEntitlements, type Entitlements } from "@/domain/templates/plans";
import { cn } from "@/lib/utils";
import { MorphArrow } from "@/components/micro/morph-arrow";

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
  { key: "simulation", label: "Simulation" },
  { key: "apiMcpAccess", label: "REST and MCP access" },
  { key: "aiGeneration", label: "AI generation" }
];

type Notice = { role: "positive" | "neutral" | "critical"; title: string; body?: string };

/** What the billing provider (or demo mode) sent you back with, said in words. */
function returnNotice(params: URLSearchParams): Notice | null {
  const plan = params.get("plan");
  if (params.get("mockBilling") === "success") {
    return { role: "positive", title: `You're on the ${plan ?? "new"} plan`, body: "This is a demo deployment, so no payment was taken. The plan applies right away." };
  }
  if (params.get("mockBilling") === "portal") {
    return { role: "neutral", title: "There is no billing portal in demo mode", body: "On a deployment with billing set up, this opens your invoices and payment details." };
  }
  if (params.get("status") === "success") {
    return { role: "positive", title: "Payment received", body: "Your new plan applies as soon as the billing provider confirms it, usually within a minute. Refresh if it hasn't changed yet." };
  }
  if (params.get("status") === "cancel") {
    return { role: "neutral", title: "Checkout cancelled", body: "Nothing was charged and your plan is unchanged." };
  }
  return null;
}

export default function BillingSettingsPage() {
  return (
    <Suspense fallback={null}>
      <BillingSettings />
    </Suspense>
  );
}

function BillingSettings() {
  const params = useSearchParams();
  const [summary, setSummary] = useState<BillingStatus | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"Pro" | "Builder" | "portal" | null>(null);
  const notice = returnNotice(new URLSearchParams(params.toString()));

  useEffect(() => {
    fetch("/api/billing/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => (d?.ok ? setSummary(d.data) : setLoadError(apiErrorMessage(d, "The plan could not be loaded."))))
      .catch(() => setLoadError("Pipes could not be reached. Check your connection and try again."));
  }, []);

  const unconfigured = summary?.billingMode === "unconfigured";

  const go = async (key: "Pro" | "Builder" | "portal") => {
    setBusy(key);
    setActionError(null);
    try {
      const res = await fetch(key === "portal" ? "/api/billing/portal" : "/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: key === "portal" ? undefined : JSON.stringify({ plan: key })
      });
      const data = await res.json().catch(() => null);
      const url = key === "portal" ? data?.data?.portalUrl : data?.data?.checkoutUrl;
      if (data?.ok && url) {
        window.location.href = url;
        return;
      }
      setActionError(apiErrorMessage(data, key === "portal" ? "The billing portal could not be opened." : "Checkout could not be started."));
    } catch {
      setActionError("Pipes could not be reached. Check your connection and try again.");
    }
    setBusy(null);
  };

  const entitlements: Entitlements | null = summary?.entitlements ?? null;

  return (
    <SettingsShell
      title="Billing"
      description={summary ? `${summary.plan} plan, and the limits it sets for this workspace.` : "The workspace plan and the limits it sets."}
      meta={
        summary ? (
          <StatusPill role={STATUS_ROLE[summary.status] ?? "neutral"}>{sentenceCase(summary.status)}</StatusPill>
        ) : loadError ? null : (
          <Skeleton className="h-[20px] w-[64px] rounded-8" />
        )
      }
      actions={
        <>
          <Button asChild variant="ghost" size="sm">
            <Link href="/settings/usage" className="group/arrow">
              View usage
              <MorphArrow />
            </Link>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => go("portal")} disabled={!summary || unconfigured} loading={busy === "portal"}>
            Manage billing
          </Button>
        </>
      }
    >
      {notice ? (
        <div role="status">
          <Banner role={notice.role} title={notice.title}>
            {notice.body}
          </Banner>
        </div>
      ) : null}
      {unconfigured ? (
        <Banner role="caution" title="Billing isn't set up on this deployment">
          Upgrades and the billing portal need a payment provider, and this deployment has none configured. Your workspace keeps its current plan.
        </Banner>
      ) : null}
      {loadError ? (
        <Banner role="critical" title="The plan could not be loaded">
          {loadError}
        </Banner>
      ) : null}
      {actionError ? (
        <div role="alert">
          <Banner role="critical" title="That didn't go through">
            {actionError}
          </Banner>
        </div>
      ) : null}

      <SettingsSection title="Plan limits">
        <Card aria-live="polite">
          {!entitlements ? (
            <div className="flex flex-col gap-3 p-4">
              <Skeleton className="h-[14px] w-[240px]" />
              <Skeleton className="h-[14px] w-[200px]" />
              <Skeleton className="h-[14px] w-[220px]" />
            </div>
          ) : (
            <FactList
              facts={[
                { label: "Workflows", value: <span className="tabular">Up to {entitlements.maxSystems}</span> },
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
        <ol className="grid gap-3 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const limits = getEntitlements(plan);
            const current = summary?.plan === plan;
            return (
              <li
                key={plan}
                className={cn("flex flex-col gap-4 rounded-12 border bg-raised p-5", current ? "border-strong" : "border-border")}
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="t-title-3 text-ink">{plan}</span>
                    {current ? <StatusPill role="info">Current</StatusPill> : null}
                  </div>
                  <span className="t-caption tabular text-ink-2">Up to {limits.maxSystems} workflows</span>
                </div>
                <ul className="flex flex-col gap-1">
                  {FEATURES.filter((feature) => limits[feature.key]).map((feature) => (
                    <li key={feature.key} className="t-caption text-ink-2">
                      {feature.label}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto">
                  {plan === "Free" || current ? null : (
                    <Button variant="primary" size="sm" onClick={() => go(plan)} disabled={!summary || unconfigured} loading={busy === plan}>
                      Upgrade to {plan}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
        <p className="t-caption mt-3 text-ink-3">
          {summary?.billingMode === "mock"
            ? "This is a demo deployment: upgrading applies the plan at once and takes no payment."
            : "Checkout and invoices open in the billing provider. Manage billing changes or cancels the current plan."}
        </p>
      </SettingsSection>
    </SettingsShell>
  );
}
