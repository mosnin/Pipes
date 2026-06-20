"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * CompareHero
 *
 * Hero panel for the /compare index. Rounded-[40px] subtle surface, with the
 * persona shaped headline and a single supporting sentence. No CTAs - the
 * cards below are the calls to action.
 */

export interface CompareHeroProps {
  comparisonCount: number;
}

export function CompareHero({ comparisonCount }: CompareHeroProps) {
  const reduced = useReducedMotion();

  return (
    <section className="px-4 sm:px-6 pt-8 sm:pt-10">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-14 sm:px-12 sm:py-20"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {/* Subtle decorative grid behind text */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.6]"
            style={{
              backgroundImage:
                "radial-gradient(60% 60% at 80% 20%, rgba(79,70,229,0.06) 0%, rgba(79,70,229,0) 70%)",
            }}
          />

          <div className="relative flex flex-col gap-5 max-w-2xl">
            <span className="t-overline text-[#8E8E93]">For staff engineers</span>
            <h1 className="t-display text-[#111]">
              Looper vs the alternatives.
            </h1>
            <p className="t-body text-[#3C3C43] max-w-xl">
              Looper is the only one where you describe the system in plain English. Here is the honest read on the other {comparisonCount}.
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
