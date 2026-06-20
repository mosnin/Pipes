"use client";

// Shown inline when a free-tier user tries to create a private loop
// or hits their public loop limit (3). Renders as a framed card with
// an upgrade CTA. Used in the dashboard empty state and loop creation flow.

import { Lock, Zap } from "lucide-react";
import Link from "next/link";

interface LoopUpgradeGateProps {
  reason: "private_loops" | "loop_limit" | "marketplace_selling" | "mcp_write";
  current?: number;
  limit?: number;
}

const REASON_COPY: Record<LoopUpgradeGateProps["reason"], { title: string; body: string }> = {
  private_loops: {
    title: "Private loops require Pro",
    body: "Free plan loops are public. Upgrade to Pro to keep loops private and share only with invited collaborators.",
  },
  loop_limit: {
    title: "You have reached the free limit",
    body: "Free plan includes 3 public loops. Upgrade to Pro for unlimited private and public loops.",
  },
  marketplace_selling: {
    title: "Selling loops requires Pro",
    body: "Publish loops to the marketplace and earn on every install. Available on the Pro plan and above.",
  },
  mcp_write: {
    title: "MCP write access requires Pro",
    body: "Agents can read your loop on the free plan. Upgrade to Pro to let agents write to the canvas via the Loop API.",
  },
};

export function LoopUpgradeGate({ reason, current, limit }: LoopUpgradeGateProps) {
  const copy = REASON_COPY[reason];
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-start gap-4">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Lock size={14} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="t-label font-semibold text-indigo-900">{copy.title}</p>
        {(current !== undefined && limit !== undefined) && (
          <p className="t-caption text-indigo-700 mt-0.5">{current} / {limit} used</p>
        )}
        <p className="t-caption text-indigo-700/80 mt-1 leading-relaxed">{copy.body}</p>
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-indigo-600 text-white t-caption font-semibold hover:bg-indigo-700 transition-colors"
        >
          <Zap size={11} aria-hidden />
          Upgrade to Pro
        </Link>
      </div>
    </div>
  );
}
