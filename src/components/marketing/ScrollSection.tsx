"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * ScrollSection
 *
 * Apple-style rounded surface primitive. Wraps content in a large rounded
 * panel (default 40px radius) and fades + lifts the inner content with a
 * stagger when its top edge enters the viewport. Respects
 * prefers-reduced-motion (instant render when set).
 */

export interface ScrollSectionProps {
  children: ReactNode;
  /** Tone controls the surface background. */
  tone?: "subtle" | "white" | "indigo" | "inverse" | "accent";
  /** Border radius in pixels. Defaults to 40. */
  radius?: number;
  /** Container className for outer padding wrapper. */
  className?: string;
  /** Inner padding. Defaults to py-32 on desktop. */
  innerClassName?: string;
  /** Accessible region label. */
  ariaLabel?: string;
  /** Optional id (for in-page anchors). */
  id?: string;
}

const TONE_CLASSES: Record<NonNullable<ScrollSectionProps["tone"]>, string> = {
  subtle: "bg-[#FAFAFA] text-[#111]",
  white: "bg-white text-[#111]",
  indigo: "bg-indigo-50 text-[#111]",
  inverse: "bg-[#0A0A0A] text-white",
  accent: "bg-indigo-600 text-white",
};

export function ScrollSection({
  children,
  tone = "subtle",
  radius = 40,
  className,
  innerClassName,
  ariaLabel,
  id,
}: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.2 });

  return (
    <section
      id={id}
      aria-label={ariaLabel}
      className={["px-4 sm:px-6", className ?? ""].join(" ")}
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          ref={ref}
          className={[
            "relative overflow-hidden",
            TONE_CLASSES[tone],
            innerClassName ?? "px-6 py-24 sm:px-12 sm:py-32",
          ].join(" ")}
          style={{ borderRadius: radius }}
          initial={reduced ? false : { opacity: 0, y: 24 }}
          animate={
            reduced
              ? { opacity: 1, y: 0 }
              : inView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 24 }
          }
          transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * RevealStack
 *
 * Vertically staggers children with a 60ms gap between siblings.
 * Use this inside a ScrollSection for the inner text reveal.
 */
export function RevealStack({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.3 });

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduced ? false : "hidden"}
      animate={reduced ? "show" : inView ? "show" : "hidden"}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.08,
            delayChildren: delay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealItem({
  children,
  className,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "p" | "h2" | "h3" | "li" | "span";
}) {
  const Tag = motion[as] as typeof motion.div;
  return (
    <Tag
      className={className}
      variants={{
        hidden: { opacity: 0, y: 14 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
        },
      }}
    >
      {children}
    </Tag>
  );
}
