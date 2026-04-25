"use client";

import { useEffect, useState } from "react";
import {
  Card,
  Button,
  Chip,
  Separator,
  Spinner,
} from "@heroui/react";
import { CheckCircle2, XCircle, CreditCard, ExternalLink } from "lucide-react";

type Plan = "Free" | "Pro" | "Builder";
type Status = "active" | "trialing" | "past_due" | string;

interface Entitlements {
  maxSystems: number;
  collaboration: boolean;
  versionHistory: boolean;
  aiGeneration?: boolean;
  apiAccess?: boolean;
}

interface BillingSummary {
  plan: Plan;
  status: Status;
  entitlements: Entitlements;
}

// ── helpers ────────────────────────────────────────────────────────────────

function planChipColor(plan: Plan): "default" | "accent" {
  if (plan === "Pro") return "accent";
  if (plan === "Builder") return "accent";
  return "default";
}

function statusChipColor(
  status: Status
): "success" | "warning" | "danger" | "default" {
  if (status === "active") return "success";
  if (status === "trialing") return "warning";
  if (status === "past_due") return "danger";
  return "default";
}

function statusLabel(status: Status): string {
  if (status === "active") return "Active";
  if (status === "trialing") return "Trialing";
  if (status === "past_due") return "Past Due";
  return status;
}

interface FeatureRowProps {
  label: string;
  enabled: boolean | string;
}

function FeatureRow({ label, enabled }: FeatureRowProps) {
  const isEnabled = Boolean(enabled);
  return (
    <li className="flex items-center gap-2 text-sm">
      {isEnabled ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
      ) : (
        <XCircle className="h-4 w-4 shrink-0 text-default-300" />
      )}
      <span className={isEnabled ? "text-foreground" : "text-default-400"}>
        {label}
      </span>
    </li>
  );
}

const PLAN_DETAILS: Record<
  "Pro" | "Builder",
  { price: string; features: string[] }
> = {
  Pro: {
    price: "$12 / mo",
    features: [
      "Up to 20 systems",
      "Team collaboration",
      "Version history",
      "API & MCP access",
    ],
  },
  Builder: {
    price: "$39 / mo",
    features: [
      "Unlimited systems",
      "Team collaboration",
      "Version history",
      "AI generation",
      "API & MCP access",
      "Priority support",
    ],
  },
};

// ── page ──────────────────────────────────────────────────────────────────

export default function BillingSettingsPage() {
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d) => setSummary(d.data));
  }, []);

  const startCheckout = async (plan: "Pro" | "Builder") => {
    setCheckoutLoading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.ok) window.location.href = data.data.checkoutUrl;
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.ok) window.location.href = data.data.portalUrl;
    } finally {
      setPortalLoading(false);
    }
  };

  const upgradePlans: Array<"Pro" | "Builder"> =
    summary?.plan === "Free"
      ? ["Pro", "Builder"]
      : summary?.plan === "Pro"
      ? ["Builder"]
      : [];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      {/* ── Page header ── */}
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Billing &amp; Plan</h1>
        {summary && (
          <Chip color={planChipColor(summary.plan)} variant="soft" size="sm">
            {summary.plan}
          </Chip>
        )}
      </div>

      {/* ── Loading state ── */}
      {!summary && (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      )}

      {summary && (
        <>
          {/* ── Current plan card ── */}
          <Card className="shadow-sm">
            <Card.Header className="flex items-center justify-between pb-0">
              <h2 className="text-base font-semibold">Current Plan</h2>
              <Chip
                color={statusChipColor(summary.status)}
                variant="soft"
                size="sm"
              >
                {statusLabel(summary.status)}
              </Chip>
            </Card.Header>
            <Card.Content className="pt-3">
              <p className="mb-4 text-xl font-bold">{summary.plan}</p>
              <Separator className="mb-4" />
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-foreground">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                  <span>
                    Max systems:{" "}
                    <strong>{summary.entitlements.maxSystems}</strong>
                  </span>
                </li>
                <FeatureRow
                  label="Collaboration"
                  enabled={summary.entitlements.collaboration}
                />
                <FeatureRow
                  label="Version history"
                  enabled={summary.entitlements.versionHistory}
                />
                <FeatureRow
                  label="AI generation"
                  enabled={summary.entitlements.aiGeneration ?? false}
                />
                <FeatureRow
                  label="API / MCP access"
                  enabled={summary.entitlements.apiAccess ?? false}
                />
              </ul>
            </Card.Content>
          </Card>

          {/* ── Upgrade section ── */}
          {upgradePlans.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-lg font-semibold">Upgrade your plan</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {upgradePlans.map((plan) => {
                  const details = PLAN_DETAILS[plan];
                  return (
                    <Card
                      key={plan}
                      className="shadow-sm border border-default-200"
                    >
                      <Card.Header className="pb-0">
                        <div className="flex w-full items-center justify-between">
                          <span className="font-semibold">{plan}</span>
                          <Chip
                            color={planChipColor(plan)}
                            variant="soft"
                            size="sm"
                          >
                            {details.price}
                          </Chip>
                        </div>
                      </Card.Header>
                      <Card.Content className="space-y-4 pt-3">
                        <ul className="space-y-1.5">
                          {details.features.map((f) => (
                            <li
                              key={f}
                              className="flex items-center gap-2 text-sm text-foreground"
                            >
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <Button
                          variant="primary"
                          fullWidth
                          onPress={() => startCheckout(plan)}
                        >
                          {checkoutLoading === plan && <Spinner size="sm" />}
                          Upgrade to {plan}
                        </Button>
                      </Card.Content>
                    </Card>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Billing portal ── */}
          <Card className="shadow-sm">
            <Card.Header className="pb-0">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-default-500" />
                <h2 className="text-base font-semibold">
                  Manage payment &amp; invoices
                </h2>
              </div>
            </Card.Header>
            <Card.Content className="space-y-3 pt-3">
              <p className="text-sm text-default-500">
                Update your payment method, download past invoices, or cancel
                your subscription via the billing portal.
              </p>
              <Button
                variant="outline"
                onPress={openPortal}
              >
                {portalLoading && <Spinner size="sm" />}
                <ExternalLink className="h-4 w-4" />
                Open billing portal
              </Button>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
}
