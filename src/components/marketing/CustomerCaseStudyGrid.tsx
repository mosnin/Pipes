"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { CaseStudy } from "@/lib/marketing/customers-data";

/**
 * CustomerCaseStudyGrid
 *
 * Filterable grid of customer case studies. Category chips above the grid;
 * 2-column grid of cards below. Each card has a category chip, persona role,
 * company, the outcome metric in display type, a one-line story, and a link
 * to the matching /use-cases/[slug] when it exists.
 */

const CATEGORIES = [
  "All",
  "Engineering",
  "Support",
  "Sales",
  "Data",
  "Operations",
] as const;

type Category = (typeof CATEGORIES)[number];

export interface CustomerCaseStudyGridProps {
  studies: ReadonlyArray<CaseStudy>;
}

export function CustomerCaseStudyGrid({ studies }: CustomerCaseStudyGridProps) {
  const [active, setActive] = useState<Category>("All");
  const reduce = useReducedMotion();

  const filtered = useMemo(() => {
    if (active === "All") return studies;
    return studies.filter((s) => s.category === active);
  }, [active, studies]);

  return (
    <div>
      <div
        role="tablist"
        aria-label="Filter case studies by category"
        className="mb-10 flex flex-wrap items-center gap-2"
      >
        {CATEGORIES.map((cat) => {
          const selected = cat === active;
          return (
            <button
              key={cat}
              role="tab"
              type="button"
              aria-selected={selected}
              data-testid={`case-study-filter-${cat.toLowerCase()}`}
              onClick={() => setActive(cat)}
              className={[
                "inline-flex h-11 items-center rounded-full border px-4 t-label font-medium transition-colors",
                selected
                  ? "border-[#111] bg-[#111] text-white"
                  : "border-black/[0.08] bg-white text-[#3C3C43] hover:border-black/[0.16] hover:text-[#111]",
              ].join(" ")}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="t-body text-[#8E8E93]">
          No case studies in this category yet. Pick another.
        </p>
      ) : (
        <div
          data-testid="case-study-grid"
          className="grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {filtered.map((study) => {
            const href =
              study.useCaseSlug != null
                ? `/use-cases/${study.useCaseSlug}`
                : `/customers#${study.slug}`;
            return (
              <motion.article
                key={study.slug}
                data-testid="case-study-card"
                id={study.slug}
                whileHover={reduce ? undefined : { y: -2 }}
                transition={{ type: "spring", stiffness: 320, damping: 24 }}
                className="group flex flex-col gap-6 rounded-3xl border border-black/[0.06] bg-white p-8 shadow-xs transition-shadow hover:shadow-md-token"
              >
                <div className="flex items-center justify-between">
                  <span
                    data-testid="case-study-category"
                    className="inline-flex items-center rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 t-caption font-semibold text-violet-700"
                  >
                    <span className="uppercase tracking-[0.08em]">
                      {study.category}
                    </span>
                  </span>
                  <span className="t-overline text-[#8E8E93]">
                    {study.role}
                  </span>
                </div>

                <div className="flex flex-col gap-3">
                  <h3 className="t-h2 text-[#111]">{study.company}</h3>
                  <p
                    className="text-[#111]"
                    style={{
                      fontSize: 28,
                      lineHeight: 1.15,
                      letterSpacing: "-0.025em",
                      fontWeight: 600,
                    }}
                  >
                    {study.outcome}
                  </p>
                  <p className="t-body text-[#3C3C43] leading-relaxed">
                    {study.story}
                  </p>
                </div>

                <div className="mt-auto flex items-center justify-between border-t border-black/[0.06] pt-5">
                  <span className="t-label text-[#3C3C43]">
                    {study.persona}, {study.role}
                  </span>
                  <Link
                    href={href}
                    className="inline-flex items-center gap-1.5 t-label font-semibold text-violet-600 transition-colors hover:text-violet-800"
                  >
                    Read story
                    <span aria-hidden="true">{"→"}</span>
                  </Link>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
    </div>
  );
}
