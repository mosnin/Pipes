"use client";

import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { TrackedLink } from "@/components/marketing/TrackedLink";

/**
 * CompareCard
 *
 * Refined card for the /compare grid. Hosts paired monograms, a one-line
 * "where they differ" sentence, a small visual hint, and a tracked link
 * into the detail page. Scales up 1% on hover and lifts the shadow.
 */

export interface CompareCardProps {
  slug: string;
  title: string;
  competitor: string;
  summary: string;
  difference: string;
  differenceCount: number;
}

export function CompareCard({
  slug,
  title,
  competitor,
  summary,
  difference,
  differenceCount,
}: CompareCardProps) {
  const reduced = useReducedMotion();

  return (
    <TrackedLink
      href={`/compare/${slug}`}
      event="comparison_page_viewed"
      metadata={{ source: "compare_index", slug }}
      className="block h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded-3xl"
    >
      <motion.article
        data-testid={`compare-card-${slug}`}
        className="group relative flex h-full flex-col gap-5 rounded-3xl border border-black/[0.06] bg-white p-6 overflow-hidden"
        initial={false}
        whileHover={reduced ? undefined : { scale: 1.01, y: -2 }}
        whileTap={reduced ? undefined : { scale: 0.995 }}
        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
        style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
      >
        {/* Paired monograms */}
        <header className="flex items-center gap-3">
          <Monogram letter="P" tone="ink" />
          <span className="t-caption uppercase tracking-[0.08em] text-[#8E8E93]">
            vs
          </span>
          <Monogram letter={initialOf(competitor)} tone="muted" />
        </header>

        {/* Title and summary */}
        <div className="flex flex-col gap-2">
          <h3 className="t-h3 text-[#111]">{title}</h3>
          <p className="t-label text-[#3C3C43] leading-relaxed line-clamp-2">
            {summary}
          </p>
        </div>

        {/* Visual hint - two stacked rails. Pipes rail is filled, competitor rail is empty */}
        <div
          aria-hidden="true"
          className="flex flex-col gap-1.5 mt-1"
        >
          <div className="flex items-center gap-2">
            <span className="t-caption font-medium text-[#111] w-14">Pipes</span>
            <div className="relative flex-1 h-1.5 rounded-full bg-[#F5F5F7] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-violet-600"
                style={{ width: "92%" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="t-caption text-[#8E8E93] w-14 truncate">{competitor}</span>
            <div className="relative flex-1 h-1.5 rounded-full bg-[#F5F5F7] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-[#C7C7CC]"
                style={{ width: "38%" }}
              />
            </div>
          </div>
        </div>

        {/* Where they differ */}
        <div className="flex flex-col gap-1.5">
          <span className="t-overline text-[#8E8E93]">Where they differ</span>
          <p className="t-label text-[#111] leading-relaxed">{difference}</p>
        </div>

        <footer className="mt-auto flex items-center justify-between pt-2 border-t border-black/[0.06]">
          <span className="t-caption text-[#8E8E93]">
            {differenceCount} key {differenceCount === 1 ? "difference" : "differences"}
          </span>
          <span className="inline-flex items-center gap-1 t-label font-semibold text-violet-600 group-hover:text-violet-700 transition-colors">
            Read the comparison
            <ArrowRight size={14} aria-hidden="true" />
          </span>
        </footer>
      </motion.article>
    </TrackedLink>
  );
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function Monogram({ letter, tone }: { letter: string; tone: "ink" | "muted" }) {
  if (tone === "ink") {
    return (
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#111] text-white t-label font-bold">
        {letter}
      </span>
    );
  }
  return (
    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7] border border-black/[0.06] text-[#111] t-label font-bold">
      {letter}
    </span>
  );
}
