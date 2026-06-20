"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MetricCard } from "@/components/ui";

/**
 * CompareDetailHero
 *
 * Hero for /compare/[slug]. Looper vs X treatment with two big paired
 * monograms and a 3-metric strip pulled from the live matrix data.
 */

export interface CompareDetailHeroProps {
  competitor: string;
  summary: string;
  pipesWins: number;
  shared: number;
  competitorWins: number;
}

export function CompareDetailHero({
  competitor,
  summary,
  pipesWins,
  shared,
  competitorWins,
}: CompareDetailHeroProps) {
  const reduced = useReducedMotion();
  const initial = competitor.trim().charAt(0).toUpperCase() || "?";

  return (
    <section className="px-4 sm:px-6 pt-6 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-12 sm:px-12 sm:py-16"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.7]"
            style={{
              backgroundImage:
                "radial-gradient(50% 60% at 90% 20%, rgba(79,70,229,0.05) 0%, rgba(79,70,229,0) 70%)",
            }}
          />

          <div className="relative flex flex-col gap-8">
            <div className="flex flex-col gap-6 max-w-3xl">
              {/* Paired big monograms */}
              <div className="flex items-center gap-4">
                <BigMonogram letter="P" tone="ink" label="Looper" />
                <span className="t-overline text-[#8E8E93]">vs</span>
                <BigMonogram letter={initial} tone="muted" label={competitor} />
              </div>

              <h1 className="t-display text-[#111]">
                Looper vs {competitor}.
              </h1>
              <p className="t-body text-[#3C3C43] max-w-xl">
                {summary}
              </p>
            </div>

            {/* Three metric cards from real matrix data */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl">
              <MetricCard
                label="Looper wins"
                value={pipesWins}
                delta={`+${pipesWins}`}
                deltaTone="up"
                footer="Capabilities only Looper ships"
              />
              <MetricCard
                label="Shared"
                value={shared}
                footer="Both products provide"
              />
              <MetricCard
                label={`${competitor} wins`}
                value={competitorWins}
                footer={competitorWins > 0 ? `Where ${competitor} leads today` : "None"}
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function BigMonogram({
  letter,
  tone,
  label,
}: {
  letter: string;
  tone: "ink" | "muted";
  label: string;
}) {
  if (tone === "ink") {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-[#111] text-white t-h2 font-bold">
          {letter}
        </span>
        <span className="t-caption text-[#3C3C43] font-medium">{label}</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl bg-white border border-black/[0.08] text-[#111] t-h2 font-bold">
        {letter}
      </span>
      <span className="t-caption text-[#3C3C43] font-medium truncate max-w-[5rem]">
        {label}
      </span>
    </div>
  );
}
