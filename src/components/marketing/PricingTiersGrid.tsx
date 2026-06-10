"use client";

// The three-tier pricing card grid. Each card is a rounded-3xl panel with a
// large price that cross-fades when the billing period flips. The Team tier
// is highlighted with an indigo border + "Most popular" badge.
//
// Hover: scale(1.01) + shadow-lg. Reduced motion gracefully disables both
// the price cross-fade and the hover lift.

import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import type { BillingPeriod } from "./PricingBillingToggle";

export type PricingTier = {
  id: "starter" | "team" | "enterprise";
  name: string;
  description: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyPeriod: string;
  yearlyPeriod: string;
  highlighted: boolean;
  ctaLabel: string;
  ctaHref: string;
  ctaEvent: string;
  ctaMeta: Record<string, string>;
  ctaTone: "primary" | "secondary";
  features: readonly string[];
};

interface PricingTiersGridProps {
  tiers: readonly PricingTier[];
  period: BillingPeriod;
}

export function PricingTiersGrid({ tiers, period }: PricingTiersGridProps) {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-3 items-stretch">
      {tiers.map((tier) => {
        const isHighlighted = tier.highlighted;
        const price = period === "yearly" ? tier.yearlyPrice : tier.monthlyPrice;
        const periodLabel =
          period === "yearly" ? tier.yearlyPeriod : tier.monthlyPeriod;

        return (
          <motion.article
            key={tier.id}
            whileHover={reduce ? undefined : { scale: 1.01 }}
            transition={{ type: "spring", stiffness: 360, damping: 26 }}
            className={[
              "relative flex flex-col rounded-3xl bg-white p-8 h-full",
              isHighlighted
                ? "border-2 border-indigo-600 shadow-lg-token"
                : "border border-black/[0.08] shadow-xs hover:shadow-lg-token",
              "transition-shadow",
            ].join(" ")}
          >
            {isHighlighted && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center rounded-full bg-indigo-600 px-3 py-1 t-micro font-semibold uppercase tracking-[0.08em] text-white shadow-sm-token">
                  Most popular
                </span>
              </div>
            )}

            {/* Tier name */}
            <div className="flex items-baseline justify-between">
              <h3 className="t-h3 text-[#111]">{tier.name}</h3>
            </div>

            {/* Price block, cross-faded */}
            <div className="mt-5 h-[88px] relative">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={`${tier.id}-${period}`}
                  initial={reduce ? false : { opacity: 0, y: 8 }}
                  animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
                  className="absolute inset-0 flex flex-col"
                >
                  <span
                    className="t-display t-num text-[#111]"
                    style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.035em" }}
                  >
                    {price}
                  </span>
                  <span className="mt-2 t-caption text-[#8E8E93]">
                    {periodLabel}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* One-line description */}
            <p className="mt-6 t-label text-[#3C3C43] leading-relaxed min-h-[2.5rem]">
              {tier.description}
            </p>

            {/* Feature checks */}
            <ul className="mt-6 flex flex-col gap-3 flex-1">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="flex items-start gap-2.5 t-label text-[#3C3C43]"
                >
                  <span
                    aria-hidden="true"
                    className="mt-[1px] inline-flex h-4 w-4 shrink-0 items-center justify-center text-indigo-600 font-semibold"
                    style={{ fontSize: 12 }}
                  >
                    {"✓"}
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            {/* CTA sticky to card bottom */}
            <div className="mt-8">
              <TrackedLink
                href={tier.ctaHref}
                event={tier.ctaEvent}
                metadata={{ ...tier.ctaMeta, period }}
                className="block w-full"
              >
                <span
                  className={[
                    "inline-flex w-full items-center justify-center gap-1.5 rounded-full h-11 px-5 t-label font-semibold transition-colors",
                    tier.ctaTone === "primary"
                      ? "bg-[#111] text-white hover:bg-indigo-700"
                      : "border border-black/[0.14] bg-white text-[#111] hover:border-black/[0.24] hover:bg-black/[0.02]",
                  ].join(" ")}
                >
                  {tier.ctaLabel}
                </span>
              </TrackedLink>
            </div>
          </motion.article>
        );
      })}
    </div>
  );
}
