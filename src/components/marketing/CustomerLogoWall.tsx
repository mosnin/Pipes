"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { CustomerLogo } from "@/lib/marketing/customers-data";

/**
 * CustomerLogoWall
 *
 * Renders enterprise-feeling company names as Geist wordmarks with varied
 * weights, sizes, casings, and tracking. No stock SVG. Hover lifts each logo
 * 1 px and brightens the ink from secondary to primary.
 */

const WEIGHT_CLASS: Record<CustomerLogo["weight"], string> = {
  regular: "font-normal",
  medium: "font-medium",
  semibold: "font-semibold",
  bold: "font-bold",
};

const SIZE_CLASS: Record<CustomerLogo["size"], string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
};

const TRACKING_CLASS: Record<NonNullable<CustomerLogo["tracking"]>, string> = {
  tight: "tracking-tight",
  normal: "tracking-normal",
  wide: "tracking-[0.18em]",
};

function renderName(name: string, c: CustomerLogo["case"]): string {
  if (c === "upper") return name.toUpperCase();
  if (c === "lower") return name.toLowerCase();
  return name;
}

export interface CustomerLogoWallProps {
  logos: ReadonlyArray<CustomerLogo>;
}

export function CustomerLogoWall({ logos }: CustomerLogoWallProps) {
  const reduce = useReducedMotion();
  return (
    <div
      aria-label="Customer logos"
      className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4"
    >
      {logos.map((logo, idx) => {
        const trackingClass =
          logo.tracking != null ? TRACKING_CLASS[logo.tracking] : "";
        return (
          <motion.div
            key={`${logo.name}-${idx}`}
            data-testid="customer-logo"
            className={[
              "group flex h-20 items-center justify-center rounded-2xl",
              "border border-black/[0.04] bg-white px-4 transition-shadow",
              "hover:shadow-md-token",
            ].join(" ")}
            whileHover={reduce ? undefined : { y: -1 }}
            transition={{ type: "spring", stiffness: 320, damping: 24 }}
          >
            <span
              className={[
                "select-none text-[#8E8E93] transition-colors group-hover:text-[#111]",
                WEIGHT_CLASS[logo.weight],
                SIZE_CLASS[logo.size],
                trackingClass,
              ].join(" ")}
              style={{ fontFamily: "var(--font-sans)" }}
            >
              {renderName(logo.name, logo.case)}
            </span>
          </motion.div>
        );
      })}
    </div>
  );
}
