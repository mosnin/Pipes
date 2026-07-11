"use client";

// Topbar pill showing this month's agent build usage for free-tier users.
// Reads /api/billing/usage once on mount. Hidden for paid plans. Click routes
// to the billing settings page.

import Link from "next/link";
import { useEffect, useState } from "react";
import { Tooltip } from "@/components/ui";

export type UsageBadgeData = {
  used: number;
  limit: number;
  plan: string;
};

type FetchState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; data: UsageBadgeData }
  | { kind: "error" };

const PAID_PLANS = new Set(["Pro", "Builder", "Enterprise"]);

// Exposed so tests can drive the badge with synthesized data without a fetch.
export type UsageBadgeProps = {
  initialData?: UsageBadgeData;
  fetchUrl?: string;
};

export function UsageBadge({ initialData, fetchUrl = "/api/billing/usage" }: UsageBadgeProps = {}) {
  const [state, setState] = useState<FetchState>(
    initialData ? { kind: "ready", data: initialData } : { kind: "idle" },
  );

  useEffect(() => {
    if (initialData) return;
    if (state.kind !== "idle") return;
    if (typeof window === "undefined") return;
    let cancelled = false;
    setState({ kind: "loading" });
    fetch(fetchUrl)
      .then(async (res) => {
        const body = (await res.json()) as { ok?: boolean; data?: UsageBadgeData };
        if (cancelled) return;
        if (!res.ok || !body.ok || !body.data) {
          setState({ kind: "error" });
          return;
        }
        setState({ kind: "ready", data: body.data });
      })
      .catch(() => {
        if (!cancelled) setState({ kind: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [fetchUrl, initialData, state.kind]);

  if (state.kind !== "ready") return null;
  const { used, limit, plan } = state.data;
  if (PAID_PLANS.has(plan)) return null;
  if (!Number.isFinite(limit) || limit <= 0) return null;

  const ratio = used / limit;
  const overLimit = used >= limit;
  const nearLimit = !overLimit && ratio >= 0.8;

  const label = overLimit
    ? `${used} / ${limit} builds — upgrade`
    : `${used} / ${limit} builds`;

  const className = overLimit
    ? "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100"
    : nearLimit
      ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
      : "bg-white text-[#3C3C43] border border-black/[0.08] hover:border-black/[0.16]";

  return (
    <Tooltip content="Resets on the 1st of next month.">
      <Link
        href="/settings/billing"
        aria-label={`Agent build usage: ${label}`}
        data-testid="usage-badge"
        className={[
          "inline-flex items-center h-7 px-2.5 rounded-full t-caption font-medium transition-colors",
          className,
        ].join(" ")}
      >
        {label}
      </Link>
    </Tooltip>
  );
}
