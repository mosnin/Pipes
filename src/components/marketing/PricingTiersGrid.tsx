"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView, useReducedMotion } from "framer-motion";
import { TrackedLink } from "@/components/marketing/TrackedLink";
import type { BillingPeriod } from "./PricingBillingToggle";

export type PricingTier = {
  id: "starter" | "pro" | "team" | "enterprise";
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

// Counts from the previous numeric price to the new one over ~380ms.
// Falls back to static display for non-numeric values like "Custom".
function AnimatedPrice({
  price,
  reduce,
}: {
  price: string;
  reduce: boolean | null;
}) {
  const match = price.match(/^\$(\d+)$/);
  const numericValue = match ? parseInt(match[1], 10) : null;
  const [displayed, setDisplayed] = useState(numericValue ?? 0);
  const rafRef = useRef(0);
  const fromRef = useRef(numericValue ?? 0);

  useEffect(() => {
    if (numericValue === null) return;
    const from = fromRef.current;
    const to = numericValue;
    cancelAnimationFrame(rafRef.current);
    if (from === to || reduce) {
      setDisplayed(to);
      fromRef.current = to;
      return;
    }
    const start = performance.now();
    const dur = 380;
    fromRef.current = to;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [numericValue, reduce]);

  if (numericValue === null) return <>{price}</>;
  return <>${displayed}</>;
}

// Individual pricing card with scroll-triggered reveal + shine overlay.
function PricingCard({
  tier,
  period,
  index,
  reduce,
}: {
  tier: PricingTier;
  period: BillingPeriod;
  index: number;
  reduce: boolean | null;
}) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px 0px" });
  const isHighlighted = tier.highlighted;
  const price = period === "yearly" ? tier.yearlyPrice : tier.monthlyPrice;
  const periodLabel = period === "yearly" ? tier.yearlyPeriod : tier.monthlyPeriod;

  return (
    <motion.article
      ref={ref}
      initial={reduce ? false : { opacity: 0, y: 36 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{
        duration: 0.5,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1] as const,
      }}
      whileHover={reduce ? undefined : { scale: 1.012 }}
      style={{ transition: "box-shadow 200ms ease" }}
      className={[
        "pricing-card-shine",
        "relative flex flex-col rounded-3xl bg-white p-6 h-full",
        isHighlighted
          ? "border-2 border-indigo-600 shadow-lg-token"
          : "border border-black/[0.08] shadow-xs hover:shadow-lg-token",
        "transition-shadow",
      ].join(" ")}
    >
      {/* Shine sweep overlay (positioned inside to avoid clipping the badge) */}
      <div className="pricing-shine-inner" aria-hidden="true" />

      {isHighlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            data-testid="most-popular-badge"
            className="looper-badge-pulse accent-warm-bg accent-warm-text accent-warm-border inline-flex items-center rounded-full border px-3 py-1 t-micro font-semibold uppercase tracking-[0.08em] shadow-sm-token"
          >
            Most popular
          </span>
        </div>
      )}

      {/* Tier name */}
      <div className="flex items-baseline justify-between">
        <h3 className="t-h3 text-[#111]">{tier.name}</h3>
      </div>

      {/* Price — counter for numeric values, fade for period label */}
      <div className="mt-5 h-[88px] relative flex flex-col">
        <span
          className="t-display t-num text-[#111]"
          style={{ fontSize: 48, lineHeight: 1, letterSpacing: "-0.035em" }}
        >
          <AnimatedPrice price={price} reduce={reduce} />
        </span>
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={`${tier.id}-${period}`}
            initial={reduce ? false : { opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -5 }}
            transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] as const }}
            className="mt-2 t-caption text-[#8E8E93] block"
          >
            {periodLabel}
          </motion.span>
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
}

export function PricingTiersGrid({ tiers, period }: PricingTiersGridProps) {
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 items-stretch">
      {tiers.map((tier, index) => (
        <PricingCard
          key={tier.id}
          tier={tier}
          period={period}
          index={index}
          reduce={reduce}
        />
      ))}
    </div>
  );
}
