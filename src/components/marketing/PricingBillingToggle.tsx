"use client";

// Monthly / Yearly billing toggle. A controlled segmented control that
// emits "monthly" | "yearly" to the parent so the tier grid can cross-fade
// prices. Yearly highlights "2 months free".
//
// The control itself uses a sliding indigo pill that animates with Framer
// Motion (layoutId). Reduced motion: the pill snaps to position.

import { motion, useReducedMotion } from "framer-motion";

export type BillingPeriod = "monthly" | "yearly";

interface PricingBillingToggleProps {
  value: BillingPeriod;
  onChange: (value: BillingPeriod) => void;
  className?: string;
}

const ITEMS: { id: BillingPeriod; label: string }[] = [
  { id: "monthly", label: "Monthly" },
  { id: "yearly", label: "Yearly" },
];

export function PricingBillingToggle({
  value,
  onChange,
  className,
}: PricingBillingToggleProps) {
  const reduce = useReducedMotion();

  return (
    <div
      className={[
        "inline-flex flex-col items-center gap-2",
        className ?? "",
      ].join(" ")}
    >
      <div
        role="tablist"
        aria-label="Billing period"
        className="relative inline-flex items-center rounded-full border border-black/[0.08] bg-white p-1 shadow-xs"
      >
        {ITEMS.map((item) => {
          const selected = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onChange(item.id)}
              className={[
                "relative z-10 inline-flex items-center gap-1.5 rounded-full px-4 h-9 t-label font-semibold transition-colors duration-150",
                selected ? "text-white" : "text-[#3C3C43] hover:text-[#111]",
              ].join(" ")}
            >
              {selected && (
                <motion.span
                  layoutId="pricing-toggle-pill"
                  aria-hidden="true"
                  className="absolute inset-0 rounded-full bg-[#111]"
                  transition={
                    reduce
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 420, damping: 36 }
                  }
                />
              )}
              <span className="relative">{item.label}</span>
              {item.id === "yearly" && (
                <span
                  className={[
                    "relative ml-1 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em]",
                    selected
                      ? "bg-white/15 text-white"
                      : "bg-violet-50 text-violet-700",
                  ].join(" ")}
                >
                  -2 mo
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p
        aria-live="polite"
        className="t-caption text-[#8E8E93]"
      >
        {value === "yearly"
          ? "Billed annually. Two months free."
          : "Billed monthly. Switch any time."}
      </p>
    </div>
  );
}
