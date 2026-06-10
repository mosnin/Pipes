"use client";

import type { StatusAggregate } from "@/lib/marketing/status-data";

/**
 * StatusSummaryPanel
 *
 * Top panel for the status page. Big aggregate header in display type with
 * a pulsing dot, plus a last-updated timestamp.
 */

const TONE_BG: Record<StatusAggregate["status"], string> = {
  operational: "bg-emerald-50",
  degraded: "bg-amber-50",
  down: "bg-red-50",
};

const TONE_DOT: Record<StatusAggregate["status"], string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-red-500",
};

const TONE_INK: Record<StatusAggregate["status"], string> = {
  operational: "text-emerald-800",
  degraded: "text-amber-800",
  down: "text-red-800",
};

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export interface StatusSummaryPanelProps {
  aggregate: StatusAggregate;
}

export function StatusSummaryPanel({ aggregate }: StatusSummaryPanelProps) {
  return (
    <section
      aria-label="Aggregate status"
      data-status={aggregate.status}
      className={[
        "rounded-[40px] border border-black/[0.04] px-8 py-14 sm:px-14 sm:py-20",
        TONE_BG[aggregate.status],
      ].join(" ")}
    >
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-3 w-3">
          <span
            aria-hidden="true"
            className={[
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60",
              TONE_DOT[aggregate.status],
            ].join(" ")}
          />
          <span
            aria-hidden="true"
            className={[
              "relative inline-flex h-3 w-3 rounded-full",
              TONE_DOT[aggregate.status],
            ].join(" ")}
          />
        </span>
        <span className="t-overline text-[#3C3C43]">Live status</span>
      </div>
      <h1
        className={["mt-6 max-w-3xl", TONE_INK[aggregate.status]].join(" ")}
        style={{
          fontSize: 60,
          lineHeight: 1.04,
          letterSpacing: "-0.035em",
          fontWeight: 700,
        }}
      >
        {aggregate.label}.
      </h1>
      <p className="mt-4 t-label text-[#3C3C43]">
        Last checked {formatTimestamp(aggregate.lastUpdated)}. Auto-refreshes
        with each page load.
      </p>
    </section>
  );
}
