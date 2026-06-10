"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { KeyRound, Send, Map } from "lucide-react";

/**
 * ProtocolAuthFlow
 *
 * Three-step visual flow:
 *   1. Generate token  ->  2. Send Bearer  ->  3. Read system.
 *
 * Arrows draw on view using stroke-dashoffset. Reduced motion shows
 * the final state immediately.
 */

interface Step {
  label: string;
  title: string;
  detail: string;
  icon: typeof KeyRound;
}

const STEPS: ReadonlyArray<Step> = [
  {
    label: "01",
    title: "Generate token",
    detail: "Mint a ptk_ token in settings. Pick the capabilities. The plaintext shows once.",
    icon: KeyRound,
  },
  {
    label: "02",
    title: "Send Bearer",
    detail: "Authorization: Bearer ptk_live_... on every request. SHA-256 hashed at rest.",
    icon: Send,
  },
  {
    label: "03",
    title: "Read your system",
    detail: "Call the MCP endpoint. The agent gets the same graph your team sees in the editor.",
    icon: Map,
  },
];

export interface ProtocolAuthFlowProps {
  className?: string;
}

function ArrowDraw({ active, reduced }: { active: boolean; reduced: boolean | null }) {
  const length = 88;
  const dash = reduced ? 0 : active ? 0 : length;
  return (
    <svg
      width="100%"
      height="20"
      viewBox="0 0 120 20"
      className="hidden md:block flex-1 mx-2"
      aria-hidden="true"
    >
      <defs>
        <marker
          id="arrow-head"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="#4F46E5" />
        </marker>
      </defs>
      <line
        x1="2"
        y1="10"
        x2="110"
        y2="10"
        stroke="rgba(0,0,0,0.08)"
        strokeWidth="1.5"
        strokeDasharray="2 3"
      />
      <motion.line
        x1="2"
        y1="10"
        x2="110"
        y2="10"
        stroke="#4F46E5"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeDasharray={length}
        animate={{ strokeDashoffset: dash }}
        initial={{ strokeDashoffset: reduced ? 0 : length }}
        transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1] }}
        markerEnd="url(#arrow-head)"
      />
    </svg>
  );
}

export function ProtocolAuthFlow({ className }: ProtocolAuthFlowProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.3 });
  const reduced = useReducedMotion();
  const active = reduced ? true : inView;

  return (
    <div
      ref={ref}
      className={["w-full", className ?? ""].join(" ")}
      data-testid="protocol-auth-flow"
    >
      <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-0">
        {STEPS.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex md:flex-1 items-stretch">
              <motion.div
                initial={reduced ? false : { opacity: 0, y: 12 }}
                animate={active ? { opacity: 1, y: 0 } : reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
                transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1], delay: idx * 0.15 }}
                className="relative flex-1 rounded-[16px] border border-black/[0.08] bg-white p-4 sm:p-5 shadow-xs"
                data-testid={`protocol-auth-step-${idx + 1}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-2 t-overline text-[#8E8E93]">
                    Step {step.label}
                  </span>
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 text-indigo-700">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                </div>
                <h3 className="t-title text-[#111]" style={{ letterSpacing: "-0.01em" }}>
                  {step.title}
                </h3>
                <p className="mt-1.5 t-label text-[#3C3C43] leading-relaxed">
                  {step.detail}
                </p>
              </motion.div>
              {idx < STEPS.length - 1 && (
                <div className="flex items-center">
                  <ArrowDraw active={active} reduced={reduced} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
