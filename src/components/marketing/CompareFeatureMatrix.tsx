"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, ChevronDown, Minus, X } from "lucide-react";

/**
 * CompareFeatureMatrix
 *
 * Long-form feature-by-feature comparison with two value columns and a
 * sticky header. Each row reveals an optional "why this matters" subline
 * when expanded.
 */

export type FeatureValue = true | false | string;

export interface FeatureRow {
  id: string;
  feature: string;
  pipes: FeatureValue;
  competitor: FeatureValue;
  /** Optional rationale that explains why this row matters. */
  why?: string;
}

export interface CompareFeatureMatrixProps {
  competitor: string;
  rows: ReadonlyArray<FeatureRow>;
}

export function CompareFeatureMatrix({
  competitor,
  rows,
}: CompareFeatureMatrixProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduced = useReducedMotion();

  const toggle = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <section
      data-testid="compare-feature-matrix"
      className="px-4 sm:px-6"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-col gap-1.5 max-w-2xl">
          <span className="t-overline text-[#8E8E93]">Feature by feature</span>
          <h2 className="t-h2 text-[#111]">
            Where each one earns its place.
          </h2>
          <p className="t-label text-[#3C3C43]">
            Click any row to see why the gap matters.
          </p>
        </div>

        <div className="rounded-3xl border border-black/[0.06] bg-white overflow-hidden">
          {/* Sticky header */}
          <div
            data-testid="matrix-header"
            className="sticky top-0 z-10 grid grid-cols-12 bg-white/95 backdrop-blur-md border-b border-black/[0.06]"
          >
            <div className="col-span-6 sm:col-span-6 px-5 py-4 t-overline text-[#8E8E93]">
              Feature
            </div>
            <div className="col-span-3 px-5 py-4 t-overline text-[#111] flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#111] text-white text-[10px] font-bold">
                P
              </span>
              Pipes
            </div>
            <div className="col-span-3 px-5 py-4 t-overline text-[#8E8E93] flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#F5F5F7] border border-black/[0.06] text-[#111] text-[10px] font-bold">
                {initialOf(competitor)}
              </span>
              <span className="truncate">{competitor}</span>
            </div>
          </div>

          {/* Rows */}
          <ul className="flex flex-col">
            {rows.map((row) => {
              const open = openId === row.id;
              return (
                <li
                  key={row.id}
                  data-testid={`matrix-row-${row.id}`}
                  className="border-b border-black/[0.04] last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggle(row.id)}
                    aria-expanded={open}
                    className="w-full grid grid-cols-12 items-center text-left transition-colors hover:bg-[#FAFAFA] focus:outline-none focus-visible:bg-[#FAFAFA]"
                  >
                    <div className="col-span-6 px-5 py-4 flex items-center gap-2">
                      <ChevronDown
                        size={14}
                        aria-hidden="true"
                        className="shrink-0 text-[#C7C7CC] transition-transform"
                        style={{
                          transform: open ? "rotate(0deg)" : "rotate(-90deg)",
                        }}
                      />
                      <span className="t-label font-medium text-[#111]">
                        {row.feature}
                      </span>
                    </div>
                    <div className="col-span-3 px-5 py-4">
                      <FeatureCell value={row.pipes} accent />
                    </div>
                    <div className="col-span-3 px-5 py-4">
                      <FeatureCell value={row.competitor} />
                    </div>
                  </button>

                  <AnimatePresence initial={false}>
                    {open && row.why && (
                      <motion.div
                        key="why"
                        initial={reduced ? false : { height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={reduced ? { opacity: 0 } : { height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
                        className="overflow-hidden bg-[#FAFAFA]"
                      >
                        <div className="px-5 py-3 pl-12 flex items-start gap-3">
                          <span className="t-overline text-[#8E8E93] shrink-0 pt-0.5">
                            Why
                          </span>
                          <p className="t-label text-[#3C3C43] leading-relaxed">
                            {row.why}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function FeatureCell({
  value,
  accent = false,
}: {
  value: FeatureValue;
  accent?: boolean;
}) {
  if (value === true) {
    return (
      <span
        className={[
          "inline-flex items-center gap-1.5 t-label font-medium",
          accent ? "text-[#065F46]" : "text-[#065F46]",
        ].join(" ")}
      >
        <Check size={14} className="shrink-0" aria-hidden="true" />
        Yes
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex items-center gap-1.5 t-label text-[#8E8E93]">
        <X size={14} className="shrink-0" aria-hidden="true" />
        No
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 t-label text-[#3C3C43]">
      <Minus size={14} className="shrink-0 text-[#C7C7CC]" aria-hidden="true" />
      <span className="truncate">{value}</span>
    </span>
  );
}

function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase() || "?";
}
