"use client";

// TemplateInlineRun
//
// "Run this starter" panel for the template detail page. Larger canvas
// (auto target 800x400 viewBox) with a click-to-run overlay. After the
// run finishes, a small summary line states what was built and how long
// it took, and a link offers the signed-up version.

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EmbeddedCanvas } from "@/components/marketing/EmbeddedCanvas";
import type { ReplayTickState } from "@/lib/marketing/playground-replay";

export interface TemplateInlineRunProps {
  templateId: string;
  slug: string;
  title: string;
}

export function TemplateInlineRun({
  templateId,
  slug,
  title,
}: TemplateInlineRunProps) {
  const reduced = useReducedMotion();
  const [summary, setSummary] = useState<{
    nodes: number;
    pipes: number;
    seconds: string;
  } | null>(null);

  function handleComplete(state: ReplayTickState) {
    setSummary({
      nodes: state.nodeIds.length,
      pipes: state.pipeKeys.length,
      seconds: (state.elapsedMs / 1000).toFixed(1),
    });
  }

  return (
    <section
      className="px-4 sm:px-6 mt-12 sm:mt-16"
      data-testid="template-inline-run"
    >
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-10 sm:px-10 sm:py-12"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-6 flex flex-col gap-1.5 max-w-2xl">
            <span className="t-overline text-[#8E8E93]">Run it</span>
            <h2 className="t-h2 text-[#111]">See it build.</h2>
            <p className="t-label text-[#3C3C43] leading-relaxed">
              Click to watch {title} land on the canvas. No sign up required.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-black/[0.06] bg-[#FAFAFA]"
            style={{ maxWidth: 800 }}
          >
            <EmbeddedCanvas
              templateId={templateId}
              autoplay="onClick"
              speed={1.2}
              width={1200}
              height={600}
              aspectClassName="aspect-[2/1]"
              onComplete={handleComplete}
              ariaLabel={`${title} starter run`}
            />
          </div>

          {summary ? (
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-4"
              data-testid="template-inline-run-summary"
            >
              <p className="t-label text-[#3C3C43]">
                <span className="font-semibold text-[#111]">What you saw:</span>{" "}
                {summary.nodes} {summary.nodes === 1 ? "node" : "nodes"},{" "}
                {summary.pipes} {summary.pipes === 1 ? "pipe" : "pipes"}, built in{" "}
                {summary.seconds}s.
              </p>
              <Link
                href={`/signup?source=template_inline_run&starter=${slug}`}
                className="inline-flex items-center gap-1.5 t-label font-semibold text-indigo-600 hover:text-indigo-700"
              >
                Sign up to keep your version
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <p className="mt-6 t-caption text-[#8E8E93]">
              Read-only preview. Click the canvas to start the run.
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
