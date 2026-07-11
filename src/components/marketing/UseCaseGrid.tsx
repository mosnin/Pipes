"use client";

// Use-cases index grid. 3 columns on lg, 2 on md, 1 on mobile. Each card:
//   - persona role + company placeholder
//   - one-line outcome
//   - small visual cue (an inline SVG hint of the system shape)
//   - "Read story" link
//
// Hover: card lifts, indigo accents brighten.

import { motion, useReducedMotion } from "framer-motion";
import { TrackedLink } from "@/components/marketing/TrackedLink";

export type UseCaseCard = {
  slug: string;
  persona: string;
  role: string;
  company: string;
  outcome: string;
  templates: number;
};

interface UseCaseGridProps {
  cards: readonly UseCaseCard[];
}

// Tiny inline system motif - three nodes and two pipes. Pure SVG.
function SystemMotif() {
  return (
    <svg
      viewBox="0 0 120 36"
      aria-hidden="true"
      className="h-9 w-auto text-violet-600"
    >
      <path
        d="M 18 18 L 60 18 M 60 18 L 102 18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        fill="none"
        opacity="0.5"
      />
      <circle cx="18" cy="18" r="6" fill="white" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="60" cy="18" r="6" fill="currentColor" />
      <circle cx="102" cy="18" r="6" fill="white" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export function UseCaseGrid({ cards }: UseCaseGridProps) {
  const reduce = useReducedMotion();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card) => (
        <motion.div
          key={card.slug}
          whileHover={reduce ? undefined : { y: -2 }}
          transition={{ type: "spring", stiffness: 320, damping: 24 }}
        >
          <TrackedLink
            href={`/use-cases/${card.slug}`}
            event="use_case_viewed"
            metadata={{ source: "use_cases_index", slug: card.slug }}
            className="group block h-full"
          >
            <article className="flex h-full flex-col gap-5 rounded-3xl border border-black/[0.06] bg-white p-7 shadow-xs transition-shadow hover:shadow-md-token">
              <div className="flex items-start justify-between gap-3">
                <span className="t-overline text-[#8E8E93]">
                  {card.role}
                </span>
                <span className="t-caption text-[#8E8E93]">
                  {card.templates} {card.templates === 1 ? "starter" : "starters"}
                </span>
              </div>

              <SystemMotif />

              <div className="flex flex-col gap-2">
                <h3 className="t-h3 text-[#111] group-hover:text-violet-700 transition-colors">
                  {card.company}
                </h3>
                <p className="t-body text-[#3C3C43] leading-relaxed flex-1">
                  {card.outcome}
                </p>
              </div>

              <span className="mt-auto inline-flex items-center gap-1.5 t-label font-semibold text-violet-600 group-hover:text-violet-700 transition-colors">
                Read story
                <span aria-hidden="true">{"→"}</span>
              </span>
            </article>
          </TrackedLink>
        </motion.div>
      ))}
    </div>
  );
}
