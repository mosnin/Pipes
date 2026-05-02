"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  DataTable,
  Dialog,
  EmptyState,
  HelpText,
  MetricCard,
  PageHeader,
  Spinner,
  StatusBadge,
  type DataTableColumn,
} from "@/components/ui";

type Plan = "Free" | "Pro" | "Builder";
type Status = "active" | "trialing" | "past_due" | string;

interface Entitlements {
  maxSystems: number;
  collaboration: boolean;
  versionHistory: boolean;
  aiGeneration?: boolean;
  apiAccess?: boolean;
  seatsUsed?: number;
  seatsTotal?: number;
}

interface BillingSummary {
  plan: Plan;
  status: Status;
  entitlements: Entitlements;
  nextBillingDate?: string;
  paymentMethod?: { brand: string; last4: string; expMonth?: number; expYear?: number };
  upcomingInvoice?: { amountUsd: number; periodEnd?: string };
  invoices?: Array<{
    id: string;
    number?: string;
    issuedAt: string;
    amountUsd: number;
    status: string;
    pdfUrl?: string;
  }>;
}

// ── helpers ────────────────────────────────────────────────────────────────

function statusTone(status: Status): "success" | "warning" | "danger" | "neutral" {
  if (status === "active")    return "success";
  if (status === "trialing")  return "warning";
  if (status === "past_due")  return "danger";
  return "neutral";
}

function statusLabel(status: Status): string {
  if (status === "active")   return "Active";
  if (status === "trialing") return "Trialing";
  if (status === "past_due") return "Past due";
  return status;
}

function formatDate(value?: string): string {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}

function formatUsd(value?: number): string {
  if (value == null) return "-";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const PLAN_DETAILS: Record<"Pro" | "Builder", { price: string; features: string[] }> = {
  Pro: {
    price: "$12 / mo",
    features: ["Up to 20 systems", "Team collaboration", "Version history", "API & MCP access"],
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
  const [planDialogOpen, setPlanDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  useEffect(() => {
    fetch("/api/billing/status")
      .then((r) => r.json())
      .then((d: { data?: BillingSummary }) => setSummary(d.data ?? null));
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
      if (data.ok) {
        window.location.href = data.data.checkoutUrl;
      } else {
        toast.error(data.error ?? "Checkout failed - please try again");
      }
    } finally {
      setCheckoutLoading(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        window.location.href = data.data.portalUrl;
      } else {
        toast.error(data.error ?? "Could not open billing portal");
      }
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

  const seatsUsed  = summary?.entitlements.seatsUsed  ?? 1;
  const seatsTotal = summary?.entitlements.seatsTotal ?? summary?.entitlements.maxSystems ?? 1;

  const invoiceColumns: DataTableColumn<NonNullable<BillingSummary["invoices"]>[number]>[] = [
    {
      key: "number",
      header: "Invoice",
      render: (row) => (
        <span className="t-mono text-[12px] text-[#111]">{row.number ?? row.id}</span>
      ),
    },
    {
      key: "issuedAt",
      header: "Date",
      render: (row) => (
        <span className="t-label text-[#3C3C43]">{formatDate(row.issuedAt)}</span>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      align: "right",
      render: (row) => (
        <span className="t-label t-num text-[#111]">{formatUsd(row.amountUsd)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge tone={row.status === "paid" ? "success" : row.status === "open" ? "warning" : "neutral"}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      width: "100px",
      render: (row) =>
        row.pdfUrl ? (
          <a
            href={row.pdfUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 t-label text-indigo-600 hover:text-indigo-700"
          >
            <FileText size={13} />
            PDF
          </a>
        ) : (
          <span className="t-caption text-[#C7C7CC]">-</span>
        ),
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspace"
        subtitle="Plan, billing, and workspace defaults."
        actions={
          summary && (
            <Button
              variant="outline"
              isDisabled={portalLoading}
              onPress={openPortal}
              className="flex items-center gap-1.5"
            >
              {portalLoading ? <Spinner size="sm" /> : <ExternalLink size={14} />}
              Billing portal
            </Button>
          )
        }
      />

      {summary == null ? (
        <CardShell>
          <CardBody>
            <div className="flex items-center justify-center py-12">
              <Spinner size="md" />
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <>
          {/* ── Plan summary metrics ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MetricCard
              label="Plan"
              value={summary.plan}
              icon={<Sparkles size={14} />}
              footer={
                <div className="mt-1">
                  <StatusBadge tone={statusTone(summary.status)} pulse={summary.status === "active"}>
                    {statusLabel(summary.status)}
                  </StatusBadge>
                </div>
              }
            />
            <MetricCard
              label="Seats"
              value={`${seatsUsed} / ${seatsTotal}`}
              icon={<Users size={14} />}
              footer={`${Math.max(0, seatsTotal - seatsUsed)} available`}
            />
            <MetricCard
              label="Systems limit"
              value={summary.entitlements.maxSystems}
              icon={<FileText size={14} />}
              footer="Per workspace cap"
            />
            <MetricCard
              label="Next bill"
              value={formatDate(summary.nextBillingDate)}
              icon={<CreditCard size={14} />}
              footer={summary.upcomingInvoice ? formatUsd(summary.upcomingInvoice.amountUsd) : "No upcoming charge"}
            />
          </div>

          {/* ── Plan card ── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="t-title text-[#111]">Current plan</h2>
                  <p className="mt-1 t-caption text-[#8E8E93]">
                    Entitlements granted by your subscription.
                  </p>
                </div>
                {upgradePlans.length > 0 && (
                  <Button variant="primary" onPress={() => setPlanDialogOpen(true)}>
                    Change plan
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5">
                <FeatureRow
                  label={`Up to ${summary.entitlements.maxSystems} systems`}
                  enabled
                />
                <FeatureRow label="Collaboration" enabled={summary.entitlements.collaboration} />
                <FeatureRow label="Version history" enabled={summary.entitlements.versionHistory} />
                <FeatureRow label="AI generation" enabled={summary.entitlements.aiGeneration ?? false} />
                <FeatureRow label="API and MCP access" enabled={summary.entitlements.apiAccess ?? false} />
              </ul>
            </CardBody>
          </CardShell>

          {/* ── Upcoming invoice ── */}
          <CardShell>
            <CardHeader bordered>
              <h2 className="t-title text-[#111]">Upcoming invoice</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Preview of the next charge to your account.
              </p>
            </CardHeader>
            <CardBody>
              {summary.upcomingInvoice ? (
                <div className="flex items-baseline justify-between">
                  <div>
                    <div className="t-h2 t-num text-[#111]">
                      {formatUsd(summary.upcomingInvoice.amountUsd)}
                    </div>
                    <div className="t-caption text-[#8E8E93] mt-0.5">
                      Due {formatDate(summary.upcomingInvoice.periodEnd ?? summary.nextBillingDate)}
                    </div>
                  </div>
                  <StatusBadge tone="info">Scheduled</StatusBadge>
                </div>
              ) : (
                <HelpText>No upcoming charge.</HelpText>
              )}
            </CardBody>
          </CardShell>

          {/* ── Payment method ── */}
          <CardShell>
            <CardHeader bordered>
              <h2 className="t-title text-[#111]">Payment method</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Card on file for recurring charges.
              </p>
            </CardHeader>
            <CardBody>
              {summary.paymentMethod ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-7 rounded-md border border-[var(--color-line)] bg-[#F5F5F7] t-mono text-[10px] text-[#3C3C43] uppercase">
                      {summary.paymentMethod.brand}
                    </span>
                    <div>
                      <div className="t-label text-[#111]">
                        Ending in {summary.paymentMethod.last4}
                      </div>
                      {summary.paymentMethod.expMonth != null && summary.paymentMethod.expYear != null && (
                        <div className="t-caption text-[#8E8E93]">
                          Expires {String(summary.paymentMethod.expMonth).padStart(2, "0")}/{summary.paymentMethod.expYear}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <HelpText>No payment method on file.</HelpText>
              )}
            </CardBody>
            <CardFooter>
              <HelpText>Update via the billing portal.</HelpText>
              <Button variant="outline" isDisabled={portalLoading} onPress={openPortal}>
                {portalLoading ? <Spinner size="sm" /> : null}
                Manage
              </Button>
            </CardFooter>
          </CardShell>

          {/* ── Invoices ── */}
          <CardShell>
            <CardHeader bordered>
              <h2 className="t-title text-[#111]">Invoice history</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Download past statements for accounting.
              </p>
            </CardHeader>
            {summary.invoices && summary.invoices.length > 0 ? (
              <DataTable columns={invoiceColumns} rows={summary.invoices} />
            ) : (
              <CardBody>
                <EmptyState
                  title="No invoices yet"
                  description="Once your first billing cycle closes, invoices will appear here."
                />
              </CardBody>
            )}
          </CardShell>

          {/* ── Danger zone ── */}
          <CardShell className="border-[#FCA5A5]">
            <CardHeader bordered className="border-b-[#FCA5A5]/40">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#DC2626]" />
                <h2 className="t-title text-[#991B1B]">Danger zone</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Cancelling stops billing at the end of the current period and downgrades the workspace.
              </p>
            </CardHeader>
            <CardBody>
              <div className="flex items-center justify-between">
                <div>
                  <div className="t-label font-medium text-[#111]">Cancel subscription</div>
                  <HelpText>You can resubscribe at any time.</HelpText>
                </div>
                <Button
                  variant="danger-soft"
                  onPress={() => setCancelDialogOpen(true)}
                >
                  Cancel subscription
                </Button>
              </div>
            </CardBody>
          </CardShell>
        </>
      )}

      {/* ── Change plan dialog ── */}
      <Dialog
        open={planDialogOpen}
        onOpenChange={setPlanDialogOpen}
        title="Change plan"
        description="Pick the plan that fits your workspace today. Upgrade is immediate."
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-1">
          {upgradePlans.map((plan) => {
            const details = PLAN_DETAILS[plan];
            return (
              <div
                key={plan}
                className="border border-[var(--color-line)] rounded-[var(--radius-card)] p-4 flex flex-col gap-3"
              >
                <div className="flex items-center justify-between">
                  <span className="t-title text-[#111]">{plan}</span>
                  <span className="t-label font-semibold text-[#111]">{details.price}</span>
                </div>
                <ul className="space-y-1.5">
                  {details.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 t-label text-[#3C3C43]">
                      <CheckCircle2 size={14} className="text-[#059669] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="primary"
                  fullWidth
                  isDisabled={checkoutLoading != null}
                  onPress={() => startCheckout(plan)}
                  className="flex items-center justify-center gap-1.5"
                >
                  {checkoutLoading === plan && <Spinner size="sm" />}
                  Upgrade to {plan}
                </Button>
              </div>
            );
          })}
        </div>
      </Dialog>

      {/* ── Cancel dialog ── */}
      <Dialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        title="Cancel subscription?"
        description="Your workspace will continue until the end of the current billing period, then revert to Free."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onPress={() => setCancelDialogOpen(false)}>
              Keep plan
            </Button>
            <Button
              variant="danger"
              onPress={() => {
                setCancelDialogOpen(false);
                void openPortal();
              }}
            >
              Continue in portal
            </Button>
          </>
        }
      >
        <HelpText>
          For compliance, cancellations are completed in the secure billing portal.
        </HelpText>
      </Dialog>
    </div>
  );
}

// ── helpers UI ─────────────────────────────────────────────────────────────

function FeatureRow({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <li className="flex items-center gap-2 t-label">
      {enabled ? (
        <CheckCircle2 size={14} className="text-[#059669] shrink-0" />
      ) : (
        <XCircle size={14} className="text-[#C7C7CC] shrink-0" />
      )}
      <span className={enabled ? "text-[#111]" : "text-[#8E8E93]"}>{label}</span>
    </li>
  );
}
