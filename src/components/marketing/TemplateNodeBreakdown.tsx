"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Box,
  Cpu,
  GitBranch,
  LogIn,
  LogOut,
  ShieldCheck,
  UserCheck,
  Wrench,
  Zap,
} from "lucide-react";

/**
 * TemplateNodeBreakdown
 *
 * Walks each node in a starter template as a numbered vertical list with
 * an indigo connector line. Uses real catalog data.
 */

export interface TemplateNodeBreakdownProps {
  nodes: ReadonlyArray<{
    id: string;
    type: string;
    title: string;
    description?: string;
  }>;
}

export function TemplateNodeBreakdown({ nodes }: TemplateNodeBreakdownProps) {
  const reduced = useReducedMotion();

  if (nodes.length === 0) return null;

  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="rounded-[32px] bg-white border border-black/[0.06] px-6 py-10 sm:px-10 sm:py-12"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="mb-8 flex flex-col gap-1.5 max-w-2xl">
            <span className="t-overline text-[#8E8E93]">Inside the starter</span>
            <h2 className="t-h2 text-[#111]">What the agent builds.</h2>
            <p className="t-label text-[#3C3C43]">
              Each node lands on the canvas, ready to edit.
            </p>
          </div>

          <ol className="flex flex-col">
            {nodes.map((node, idx) => (
              <NodeRow
                key={node.id}
                index={idx + 1}
                node={node}
                isLast={idx === nodes.length - 1}
              />
            ))}
          </ol>
        </motion.div>
      </div>
    </section>
  );
}

function NodeRow({
  index,
  node,
  isLast,
}: {
  index: number;
  node: TemplateNodeBreakdownProps["nodes"][number];
  isLast: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.li
      data-testid={`node-row-${node.id}`}
      className="relative flex items-start gap-4 pb-6 last:pb-0"
      initial={reduced ? false : { opacity: 0, x: -8 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: index * 0.04 }}
    >
      {/* Indigo connector line */}
      {!isLast && (
        <span
          aria-hidden="true"
          className="absolute left-[19px] top-10 bottom-0 w-px bg-gradient-to-b from-violet-200 to-violet-50"
        />
      )}

      {/* Number + icon */}
      <div className="flex flex-col items-center shrink-0">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-50 border border-violet-100 text-violet-700 t-label font-semibold tabular-nums">
          {index}
        </span>
      </div>

      <div className="flex-1 min-w-0 pt-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
            <NodeIcon type={node.type} />
            {node.type}
          </span>
          <h3 className="t-title text-[#111]">{node.title}</h3>
        </div>
        {node.description && (
          <p className="mt-1.5 t-label text-[#3C3C43] leading-relaxed">
            {stripParameters(node.description)}
          </p>
        )}
      </div>
    </motion.li>
  );
}

function NodeIcon({ type }: { type: string }) {
  const cls = "w-3 h-3 shrink-0";
  switch (type) {
    case "Input":
      return <LogIn className={cls} aria-hidden="true" />;
    case "Output":
      return <LogOut className={cls} aria-hidden="true" />;
    case "Agent":
      return <Cpu className={cls} aria-hidden="true" />;
    case "Tool":
      return <Wrench className={cls} aria-hidden="true" />;
    case "Trigger":
      return <Zap className={cls} aria-hidden="true" />;
    case "Decision":
      return <GitBranch className={cls} aria-hidden="true" />;
    case "Action":
      return <ArrowRight className={cls} aria-hidden="true" />;
    case "Guardrail":
      return <ShieldCheck className={cls} aria-hidden="true" />;
    case "HumanApproval":
      return <UserCheck className={cls} aria-hidden="true" />;
    default:
      return <Box className={cls} aria-hidden="true" />;
  }
}

/**
 * Replace {{parameter_name}} placeholders with a readable form so the
 * marketing copy does not leak the template variable syntax.
 */
function stripParameters(s: string): string {
  return s.replace(/\{\{\s*([a-z0-9_]+)\s*\}\}/gi, (_, name: string) => {
    return name.replace(/_/g, " ");
  });
}
