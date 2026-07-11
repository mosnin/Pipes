"use client";

import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * CompareStrip
 *
 * Side-by-side panels: "Before Pipes" (a wall of mermaid text) vs
 * "After Pipes" (a typed sentence -> a structured graph). Renders as
 * two stacked panels on mobile, side by side on desktop.
 */

const BEFORE_LINES = [
  "graph TD",
  "  user[User] --> planner[Planner]",
  "  planner --> guard[Plan guard]",
  "  guard --> coder[Coder]",
  "  coder --> review[Code review]",
  "  review --> pr[Open PR]",
  "  classDef agent fill:#fff",
  "  classDef tool fill:#fef",
] as const;

const SENTENCE =
  "Planner agent reads tickets, writes a plan, hands off to a coder.";

export function CompareStrip() {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.25 });
  return (
    <div ref={ref} className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* BEFORE */}
      <motion.div
        className="overflow-hidden rounded-[20px] border border-black/[0.06] bg-white"
        initial={reduced ? false : { opacity: 0, x: -12 }}
        animate={
          reduced
            ? { opacity: 1, x: 0 }
            : inView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: -12 }
        }
        transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <div className="flex items-center justify-between border-b border-black/[0.06] px-4 py-2.5">
          <span
            className="t-overline text-[#8E8E93]"
            style={{ fontSize: 10 }}
          >
            Before
          </span>
          <span
            className="t-mono text-[#8E8E93]"
            style={{ fontSize: 10 }}
          >
            architecture.md
          </span>
        </div>
        <pre
          className="t-mono overflow-hidden bg-white px-4 py-4 text-[#3C3C43]"
          style={{ fontSize: 11.5, lineHeight: 1.7 }}
        >
          {BEFORE_LINES.join("\n")}
        </pre>
        <div className="border-t border-black/[0.06] px-4 py-2.5">
          <p
            className="t-caption text-[#8E8E93]"
            style={{ fontSize: 11 }}
          >
            You drew it. You explain it again next sprint.
          </p>
        </div>
      </motion.div>

      {/* AFTER */}
      <motion.div
        className="overflow-hidden rounded-[20px] border border-violet-200 bg-white"
        initial={reduced ? false : { opacity: 0, x: 12 }}
        animate={
          reduced
            ? { opacity: 1, x: 0 }
            : inView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: 12 }
        }
        transition={{
          duration: 0.55,
          delay: reduced ? 0 : 0.08,
          ease: [0.2, 0.8, 0.2, 1],
        }}
      >
        <div className="flex items-center justify-between border-b border-violet-100 bg-violet-50/60 px-4 py-2.5">
          <span
            className="t-overline text-violet-700"
            style={{ fontSize: 10 }}
          >
            After
          </span>
          <span
            className="t-mono text-violet-700"
            style={{ fontSize: 10 }}
          >
            sys_8a72
          </span>
        </div>
        <div className="flex flex-col gap-3 bg-white px-4 py-4">
          <div className="rounded-[8px] border border-black/[0.06] bg-[#FAFAFA] px-3 py-2">
            <p
              className="t-caption text-[#8E8E93]"
              style={{ fontSize: 10 }}
            >
              You typed
            </p>
            <p
              className="mt-0.5 t-label text-[#111]"
              style={{ fontSize: 12 }}
            >
              {SENTENCE}
            </p>
          </div>
          <svg
            viewBox="0 0 320 64"
            className="h-16 w-full"
            role="img"
            aria-label="Three nodes wired left to right."
          >
            {[
              { x: 8, label: "Planner" },
              { x: 116, label: "Guard" },
              { x: 224, label: "Coder" },
            ].map((n, i) => (
              <g key={n.label}>
                <rect
                  x={n.x}
                  y="16"
                  width="88"
                  height="32"
                  rx="6"
                  fill="white"
                  stroke="#7C3AED"
                  strokeWidth="1.25"
                />
                <text
                  x={n.x + 44}
                  y="36"
                  fontSize="11"
                  fontWeight="600"
                  fill="#111"
                  textAnchor="middle"
                >
                  {n.label}
                </text>
                {i < 2 ? (
                  <path
                    d={`M ${n.x + 88} 32 C ${n.x + 100} 32, ${n.x + 104} 32, ${n.x + 116} 32`}
                    stroke="#7C3AED"
                    strokeWidth="1.25"
                    fill="none"
                  />
                ) : null}
              </g>
            ))}
          </svg>
          <p
            className="t-caption text-violet-700"
            style={{ fontSize: 11 }}
          >
            Pipes built it. Your team and your agent read the same graph.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
