"use client";

// Long-form story section primitive used inside use-case detail pages.
// Wraps a section with a title, optional eyebrow, and a stagger-fade-up
// reveal on scroll. Children are responsible for their own layout.
//
// Reduced motion: section appears immediately with no animation.

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

interface UseCaseStorySectionProps {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function UseCaseStorySection({
  eyebrow,
  title,
  children,
  className,
  id,
}: UseCaseStorySectionProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const reduce = useReducedMotion() ?? false;

  const headerVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  } as const;

  const bodyVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  } as const;

  return (
    <section
      ref={ref}
      id={id}
      className={["mx-auto max-w-5xl", className ?? ""].join(" ")}
      data-testid="use-case-story-section"
    >
      <motion.header
        initial={reduce ? "visible" : "hidden"}
        animate={inView || reduce ? "visible" : "hidden"}
        variants={headerVariants}
        transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
        className="flex flex-col gap-3"
      >
        {eyebrow != null && (
          <span className="t-overline text-violet-700">{eyebrow}</span>
        )}
        <h2
          className="t-h1 text-[#111] max-w-3xl"
          style={{ fontSize: 36, letterSpacing: "-0.03em" }}
        >
          {title}
        </h2>
      </motion.header>
      <motion.div
        initial={reduce ? "visible" : "hidden"}
        animate={inView || reduce ? "visible" : "hidden"}
        variants={bodyVariants}
        transition={{ duration: 0.45, delay: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className="mt-8"
      >
        {children}
      </motion.div>
    </section>
  );
}
