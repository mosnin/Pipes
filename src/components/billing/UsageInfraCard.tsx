"use client";

import { useEffect, useState } from "react";
import { CardShell, CardHeader, CardBody, HelpText, Spinner, StatusBadge } from "@/components/ui";

type MeterRow = { meter: string; label: string; unitPriceUsd: number; units: number; costUsd: number };
type Settlement = { id: string; resourceId: string; amountUsd: number; payer: string; scheme: string; createdAt: string };
type UsageSummary = { usage: MeterRow[]; settlements: Settlement[]; totalSettledUsd: number };

function usd(n: number): string {
  return `$${n.toFixed(n < 1 ? 3 : 2)}`;
}

// Usage + x402 settlements for the workspace. The visible read side of the
// metering infrastructure: per-meter unit totals and the payments that settled.
export function UsageInfraCard() {
  const [data, setData] = useState<UsageSummary | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/usage/summary")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((d: { data?: UsageSummary }) => {
        if (!d.data) throw new Error("no_data");
        setData(d.data);
      })
      .catch(() => setError(true));
  }, []);

  return (
    <CardShell>
      <CardHeader bordered>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="t-title text-[#111]">Usage and metered payments</h2>
            <p className="mt-1 t-caption text-[#8E8E93]">
              Metered activity and x402 settlements for this workspace.
            </p>
          </div>
          <StatusBadge tone="info">x402</StatusBadge>
        </div>
      </CardHeader>
      <CardBody>
        {error ? (
          <HelpText>Usage data is unavailable right now.</HelpText>
        ) : data == null ? (
          <div className="flex items-center justify-center py-8">
            <Spinner size="sm" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-xl border border-black/[0.06]">
              <table className="w-full text-left">
                <thead className="bg-[#FAFAFA]">
                  <tr>
                    <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold">Meter</th>
                    <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold text-right">Units</th>
                    <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold text-right">Rate</th>
                    <th className="px-4 py-2 t-overline text-[#8E8E93] font-semibold text-right">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.usage.map((m) => (
                    <tr key={m.meter} className="border-t border-black/[0.04] last:border-b">
                      <td className="px-4 py-2 t-label text-[#111]">{m.label}</td>
                      <td className="px-4 py-2 t-label t-num text-[#3C3C43] text-right">{m.units}</td>
                      <td className="px-4 py-2 t-caption text-[#8E8E93] text-right">{usd(m.unitPriceUsd)}</td>
                      <td className="px-4 py-2 t-label t-num text-[#111] text-right">{usd(m.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between">
              <span className="t-caption text-[#8E8E93]">
                {data.settlements.length} settled {data.settlements.length === 1 ? "payment" : "payments"} via x402
              </span>
              <span className="t-label font-semibold text-[#111]">
                {usd(data.totalSettledUsd)} settled
              </span>
            </div>
          </div>
        )}
      </CardBody>
    </CardShell>
  );
}
