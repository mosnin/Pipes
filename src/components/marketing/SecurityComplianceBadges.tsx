"use client";

import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import type {
  ComplianceItem,
  ComplianceState,
} from "@/lib/marketing/security-data";

/**
 * SecurityComplianceBadges
 *
 * Strip of compliance posture cards. Each shows the framework name, a status
 * pill, and a one-line honest description. No certificate icons.
 */

const STATE_TONE: Record<ComplianceState, StatusBadgeTone> = {
  done: "success",
  available: "info",
  "in-progress": "warning",
  planned: "neutral",
};

export interface SecurityComplianceBadgesProps {
  items: ReadonlyArray<ComplianceItem>;
}

export function SecurityComplianceBadges({
  items,
}: SecurityComplianceBadgesProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex flex-col gap-3 rounded-2xl border border-black/[0.06] bg-white p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="t-h3 text-[#111]">{item.framework}</h3>
            <StatusBadge tone={STATE_TONE[item.state]}>
              {item.statusLabel}
            </StatusBadge>
          </div>
          <p className="t-label text-[#3C3C43] leading-relaxed">
            {item.description}
          </p>
        </article>
      ))}
    </div>
  );
}
