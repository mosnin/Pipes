"use client";

import { useEffect, useState } from "react";
import {
  CardShell,
  CardHeader,
  CardBody,
  MetricCard,
  PageHeader,
  Spinner,
  StatusBadge,
} from "@/components/ui";

interface BillingData {
  plan: string;
  entitlements: {
    maxSystems: number;
    collaboration: boolean;
    versionHistory: boolean;
    aiGeneration?: boolean;
    apiAccess?: boolean;
  };
}

export default function OperationsPage() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/billing/status");
        const data = await res.json();
        if (data.ok) setBilling(data.data);
      } catch {
        // best-effort
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const ent = billing?.entitlements;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Operations"
        subtitle="Workspace execution limits and runtime configuration."
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <MetricCard
              label="System limit"
              value={ent?.maxSystems === -1 ? "Unlimited" : (ent?.maxSystems ?? "--")}
              footer={`Plan: ${billing?.plan ?? "Free"}`}
            />
            <MetricCard
              label="Collaboration"
              value={ent?.collaboration ? "Enabled" : "Disabled"}
              footer="Multi-member workspaces"
            />
            <MetricCard
              label="Version history"
              value={ent?.versionHistory ? "Enabled" : "Disabled"}
              footer="Per-system snapshots"
            />
          </div>

          <CardShell>
            <CardHeader>Runtime capabilities</CardHeader>
            <CardBody>
              <div className="flex flex-col divide-y divide-black/[0.06]">
                {[
                  {
                    label: "AI generation",
                    description: "Generate loop nodes and structure from natural language",
                    enabled: !!ent?.aiGeneration,
                  },
                  {
                    label: "API access",
                    description: "MCP tokens and programmatic access to your loops",
                    enabled: !!ent?.apiAccess,
                  },
                  {
                    label: "Collaboration",
                    description: "Invite team members and manage roles",
                    enabled: !!ent?.collaboration,
                  },
                  {
                    label: "Version history",
                    description: "Snapshot and restore previous versions of any loop",
                    enabled: !!ent?.versionHistory,
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className="t-label font-medium text-[#111]">{item.label}</p>
                      <p className="t-caption text-[#8E8E93]">{item.description}</p>
                    </div>
                    <StatusBadge tone={item.enabled ? "success" : "neutral"}>
                      {item.enabled ? "Enabled" : "Not included"}
                    </StatusBadge>
                  </div>
                ))}
              </div>
            </CardBody>
          </CardShell>

          <CardShell>
            <CardHeader>Platform limits</CardHeader>
            <CardBody>
              <p className="t-caption text-[#8E8E93] mb-4">
                These are fixed platform defaults that apply to all workspaces. They are not configurable per workspace.
              </p>
              <div className="flex flex-col divide-y divide-black/[0.06]">
                {[
                  { label: "Node execution timeout", value: "60 seconds" },
                  { label: "Max concurrent runs per loop", value: "10" },
                  { label: "Webhook retry attempts", value: "3" },
                  { label: "MCP request timeout", value: "30 seconds" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-4 py-3">
                    <p className="t-label text-[#111]">{item.label}</p>
                    <p className="t-label font-mono text-[#3C3C43]">{item.value}</p>
                  </div>
                ))}
              </div>
            </CardBody>
          </CardShell>
        </>
      )}
    </div>
  );
}
