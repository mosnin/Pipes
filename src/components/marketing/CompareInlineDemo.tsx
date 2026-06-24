"use client";

// CompareInlineDemo
//
// Two side-by-side panels for the /compare/[slug] page. Left runs a real
// embedded canvas and reports elapsed time. Right shows a deliberately
// static, illustrative checklist of "build it by hand" steps with an
// estimated time. The right side is NOT a real measurement — the label
// "Illustrative" makes that explicit.

import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { EmbeddedCanvas } from "@/components/marketing/EmbeddedCanvas";
import type { ReplayTickState } from "@/lib/marketing/playground-replay";

export interface CompareInlineDemoProps {
  competitor: string;
  /** Starter id to drive the Looper panel. Defaults to customer-support-triage. */
  templateId?: string;
  /** Estimated hand-build time on the competitor side, e.g. "~15 min typical". */
  estimatedManualTime?: string;
}

const MANUAL_STEPS: ReadonlyArray<string> = [
  "Write the prompt.",
  "Wait for the response.",
  "Configure each node by hand.",
  "Connect the nodes one at a time.",
  "Test the wiring and iterate.",
];

export function CompareInlineDemo({
  competitor,
  templateId = "customer-support-triage",
  estimatedManualTime = "~15 min typical",
}: CompareInlineDemoProps) {
  const reduced = useReducedMotion();
  const [elapsed, setElapsed] = useState<string | null>(null);

  function handleComplete(state: ReplayTickState) {
    const seconds = (state.elapsedMs / 1000).toFixed(1);
    setElapsed(`${seconds}s`);
  }

  return (
    <section className="px-4 sm:px-6" data-testid="compare-inline-demo">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-10 sm:px-10 sm:py-12"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-6 flex flex-col gap-1.5 max-w-2xl">
            <span className="t-overline text-[#8E8E93]">Side by side</span>
            <h2 className="t-h2 text-[#111]">One sentence vs. one hour.</h2>
            <p className="t-label text-[#3C3C43] leading-relaxed">
              The Looper canvas runs live. The right side is illustrative.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {/* Looper side */}
            <article
              className="rounded-2xl border border-violet-200 bg-white p-5 flex flex-col gap-4"
              data-testid="compare-inline-pipes"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="t-overline text-violet-600">Looper</span>
                  <h3 className="t-h3 text-[#111]">Describe. Watch.</h3>
                </div>
                {elapsed ? (
                  <span
                    className="t-mono t-caption text-[#3C3C43] rounded-md bg-violet-50 px-2 py-1"
                    data-testid="compare-inline-pipes-elapsed"
                  >
                    Built in {elapsed}
                  </span>
                ) : (
                  <span className="t-mono t-caption text-[#8E8E93]">
                    Building...
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-xl border border-black/[0.06] bg-[#FAFAFA]">
                <EmbeddedCanvas
                  templateId={templateId}
                  autoplay="onView"
                  speed={1.2}
                  aspectClassName="aspect-[16/10]"
                  onComplete={handleComplete}
                  ariaLabel="Looper building the system"
                />
              </div>
              <p className="t-caption text-[#8E8E93] leading-relaxed">
                The agent draws the nodes and pipes. You correct it in the next sentence.
              </p>
            </article>

            {/* Competitor side — deliberately static */}
            <article
              className="rounded-2xl border border-black/[0.08] bg-[#FAFAFA] p-5 flex flex-col gap-4"
              data-testid="compare-inline-competitor"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-col gap-0.5">
                  <span className="t-overline text-[#8E8E93]">{competitor}</span>
                  <h3 className="t-h3 text-[#111]">Build it by hand.</h3>
                </div>
                <span
                  className="t-mono t-caption text-[#3C3C43] rounded-md bg-white border border-black/[0.06] px-2 py-1"
                  data-testid="compare-inline-competitor-time"
                >
                  {estimatedManualTime}
                </span>
              </div>
              <ol className="flex flex-col gap-2.5">
                {MANUAL_STEPS.map((step, i) => (
                  <li
                    key={step}
                    className="flex items-start gap-3 t-label text-[#3C3C43]"
                  >
                    <span
                      aria-hidden="true"
                      className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white border border-black/[0.08] t-micro font-semibold text-[#8E8E93]"
                    >
                      {i + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <p className="t-caption text-[#8E8E93] leading-relaxed">
                Illustrative comparison. Your run will vary.
              </p>
            </article>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
