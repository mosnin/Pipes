"use client";

import {
  KeyRound,
  Lock,
  ScrollText,
  Shield,
  GaugeCircle,
  MapPin,
  History,
  Building2,
  Database,
} from "lucide-react";
import type { ControlCategory, SecurityControl } from "@/lib/marketing/security-data";

/**
 * SecurityControlGrid
 *
 * 3-column grid of security control cards. Each card carries one control
 * with a category chip, an icon picked from the category, a title, a body
 * paragraph, and an evidence line at the bottom in monospace.
 */

const ICON_BY_ID: Record<string, typeof KeyRound> = {
  authentication: KeyRound,
  encryption: Lock,
  "audit-log": ScrollText,
  isolation: Shield,
  "rate-limits": GaugeCircle,
  "data-residency": MapPin,
  "disaster-recovery": History,
  "vendor-management": Building2,
  "customer-data-controls": Database,
};

const CATEGORY_CHIP: Record<ControlCategory, string> = {
  Authentication: "border-indigo-100 bg-indigo-50 text-indigo-700",
  Encryption: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Audit: "border-amber-100 bg-amber-50 text-amber-800",
  Isolation: "border-blue-100 bg-blue-50 text-blue-700",
  Reliability: "border-violet-100 bg-violet-50 text-violet-700",
  Data: "border-rose-100 bg-rose-50 text-rose-700",
};

export interface SecurityControlGridProps {
  controls: ReadonlyArray<SecurityControl>;
}

export function SecurityControlGrid({ controls }: SecurityControlGridProps) {
  return (
    <div
      data-testid="security-control-grid"
      className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3"
    >
      {controls.map((control) => {
        const Icon = ICON_BY_ID[control.id] ?? Shield;
        return (
          <article
            key={control.id}
            data-testid="security-control-card"
            data-control-id={control.id}
            className="flex h-full flex-col gap-4 rounded-3xl border border-black/[0.06] bg-white p-7"
          >
            <div className="flex items-center justify-between">
              <span
                aria-hidden="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FAFAFA] text-[#111]"
              >
                <Icon size={18} />
              </span>
              <span
                className={[
                  "inline-flex items-center rounded-full border px-2.5 py-1 t-caption font-semibold",
                  CATEGORY_CHIP[control.category],
                ].join(" ")}
              >
                <span className="uppercase tracking-[0.08em]">
                  {control.category}
                </span>
              </span>
            </div>
            <h3 className="t-h3 text-[#111]">{control.title}</h3>
            <p className="t-label text-[#3C3C43] leading-relaxed">
              {control.body}
            </p>
            <p className="mt-auto border-t border-black/[0.06] pt-4 t-caption font-mono text-[#8E8E93]">
              {control.evidence}
            </p>
          </article>
        );
      })}
    </div>
  );
}
