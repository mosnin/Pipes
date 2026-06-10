"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * FeatureGrid
 *
 * 2x3 grid of feature tiles. Each tile has a short title, a one-sentence
 * proof line, and a small hand-coded SVG diagram that lifts on hover.
 */

interface Feature {
  title: string;
  body: string;
  visual: ReactNode;
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    title: "Typed nodes",
    body: "Every node carries a contract. The agent picks the right type for the job.",
    visual: <TypedNodeViz />,
  },
  {
    title: "Typed pipes",
    body: "Ports refuse what they cannot read. Bad wiring fails at draw time, not in prod.",
    visual: <TypedPipeViz />,
  },
  {
    title: "Correct it in conversation",
    body: "Drag a node and the agent yields. Cmd-Z undoes the whole turn.",
    visual: <CorrectViz />,
  },
  {
    title: "One graph for humans and agents",
    body: "Your team reviews the same map any Claude reads through MCP.",
    visual: <SharedGraphViz />,
  },
  {
    title: "Scoped tokens",
    body: "Eleven capabilities. Per token. Hand a coder agent write access and nothing else.",
    visual: <TokenViz />,
  },
  {
    title: "Versions you can read",
    body: "Every turn is a commit. Diff a system the way you diff a service.",
    visual: <VersionsViz />,
  },
];

export interface FeatureGridProps {
  eyebrow?: string;
  title?: string;
}

export function FeatureGrid({
  eyebrow = "Built for builders",
  title = "Six things you stop doing the day you switch.",
}: FeatureGridProps) {
  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto max-w-7xl py-24 sm:py-32">
        <div className="mb-12 max-w-2xl">
          <p
            className="t-overline text-indigo-700"
            style={{ fontSize: 11 }}
          >
            {eyebrow}
          </p>
          <h2
            className="mt-3 text-[#111]"
            style={{
              fontSize: 40,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              fontWeight: 700,
            }}
          >
            {title}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <FeatureTile key={f.title} feature={f} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureTile({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const inView = useInView(ref, { once: true, amount: 0.3 });
  return (
    <motion.div
      ref={ref}
      className="group relative flex flex-col gap-5 overflow-hidden rounded-[24px] border border-black/[0.06] bg-white p-6 transition-shadow duration-200 hover:shadow-md-token"
      initial={reduced ? false : { opacity: 0, y: 18 }}
      animate={
        reduced
          ? { opacity: 1, y: 0 }
          : inView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 18 }
      }
      transition={{
        duration: 0.5,
        delay: reduced ? 0 : (index % 3) * 0.06,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      <div className="relative h-32 overflow-hidden rounded-[12px] bg-[#FAFAFA]">
        <div className="absolute inset-0 transition-transform duration-300 group-hover:scale-[1.04]">
          {feature.visual}
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <h3
          className="t-title text-[#111]"
          style={{ fontSize: 18, letterSpacing: "-0.015em" }}
        >
          {feature.title}
        </h3>
        <p className="t-label text-[#3C3C43]" style={{ fontSize: 14 }}>
          {feature.body}
        </p>
      </div>
    </motion.div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* Hand-coded SVG illustrations. No external assets. Each is purely structural. */

function TypedNodeViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="A node with two typed ports."
    >
      <rect
        x="60"
        y="36"
        width="120"
        height="56"
        rx="10"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.5"
      />
      <circle cx="60" cy="64" r="4" fill="#4F46E5" />
      <circle cx="180" cy="64" r="4" fill="#4F46E5" />
      <text
        x="120"
        y="62"
        fontSize="11"
        fontWeight="600"
        fill="#111"
        textAnchor="middle"
      >
        Planner agent
      </text>
      <text
        x="120"
        y="76"
        fontSize="9"
        fill="#8E8E93"
        textAnchor="middle"
      >
        Ticket : Plan
      </text>
    </svg>
  );
}

function TypedPipeViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="Two nodes connected by a typed pipe."
    >
      <rect
        x="20"
        y="48"
        width="64"
        height="32"
        rx="6"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.25"
      />
      <rect
        x="156"
        y="48"
        width="64"
        height="32"
        rx="6"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.25"
      />
      <path
        d="M 84 64 C 110 64, 130 64, 156 64"
        stroke="#4F46E5"
        strokeWidth="1.5"
        fill="none"
      />
      <rect
        x="105"
        y="52"
        width="30"
        height="14"
        rx="4"
        fill="#EEF2FF"
        stroke="#4F46E5"
        strokeWidth="0.75"
      />
      <text
        x="120"
        y="62"
        fontSize="8"
        fontWeight="600"
        fill="#4F46E5"
        textAnchor="middle"
      >
        Plan
      </text>
    </svg>
  );
}

function CorrectViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="A node being dragged to a new position."
    >
      <rect
        x="48"
        y="74"
        width="60"
        height="30"
        rx="6"
        fill="white"
        stroke="rgba(79,70,229,0.3)"
        strokeDasharray="3 3"
        strokeWidth="1"
      />
      <rect
        x="120"
        y="32"
        width="60"
        height="30"
        rx="6"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.5"
      />
      <text
        x="150"
        y="51"
        fontSize="10"
        fontWeight="600"
        fill="#111"
        textAnchor="middle"
      >
        Coder
      </text>
      <path
        d="M 78 89 C 95 89, 110 70, 122 50"
        stroke="#4F46E5"
        strokeWidth="1.25"
        fill="none"
        strokeDasharray="2 3"
        opacity="0.6"
      />
      <circle cx="180" cy="48" r="3" fill="#4F46E5" />
    </svg>
  );
}

function SharedGraphViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="One graph read by team members and an agent."
    >
      <rect
        x="80"
        y="44"
        width="80"
        height="40"
        rx="8"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.25"
      />
      <text
        x="120"
        y="68"
        fontSize="10"
        fontWeight="600"
        fill="#111"
        textAnchor="middle"
      >
        Graph
      </text>
      {[28, 52, 76].map((x, i) => (
        <circle
          key={`team-${i}`}
          cx={x}
          cy="108"
          r="6"
          fill="#111"
          stroke="white"
          strokeWidth="1.5"
        />
      ))}
      <rect
        x="180"
        y="100"
        width="36"
        height="16"
        rx="3"
        fill="#0A0A0A"
      />
      <text
        x="198"
        y="111"
        fontSize="8"
        fontWeight="600"
        fill="white"
        textAnchor="middle"
      >
        Claude
      </text>
      <path
        d="M 52 102 C 80 90, 100 86, 120 84"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1"
        fill="none"
      />
      <path
        d="M 198 100 C 180 92, 160 88, 140 84"
        stroke="rgba(0,0,0,0.16)"
        strokeWidth="1"
        fill="none"
      />
    </svg>
  );
}

function TokenViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="A scoped token with capability chips."
    >
      <rect
        x="20"
        y="42"
        width="120"
        height="44"
        rx="8"
        fill="white"
        stroke="#4F46E5"
        strokeWidth="1.25"
      />
      <text
        x="32"
        y="58"
        fontSize="8"
        fill="#8E8E93"
      >
        token
      </text>
      <text
        x="32"
        y="74"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fontWeight="600"
        fill="#111"
      >
        ptk_8a72_X9...
      </text>
      {["graph:write", "systems:read", "schema:read"].map((cap, i) => (
        <g key={cap}>
          <rect
            x="156"
            y={42 + i * 16}
            width="64"
            height="12"
            rx="3"
            fill="#EEF2FF"
            stroke="#4F46E5"
            strokeWidth="0.5"
          />
          <text
            x="188"
            y={51 + i * 16}
            fontSize="7"
            fontWeight="600"
            fill="#4F46E5"
            textAnchor="middle"
            fontFamily="ui-monospace, monospace"
          >
            {cap}
          </text>
        </g>
      ))}
    </svg>
  );
}

function VersionsViz() {
  return (
    <svg
      viewBox="0 0 240 128"
      className="h-full w-full"
      role="img"
      aria-label="A vertical timeline of system versions."
    >
      <line
        x1="40"
        y1="18"
        x2="40"
        y2="110"
        stroke="rgba(0,0,0,0.12)"
        strokeWidth="1"
      />
      {[26, 56, 86].map((y, i) => (
        <g key={`v-${i}`}>
          <circle
            cx="40"
            cy={y}
            r="4"
            fill={i === 0 ? "#4F46E5" : "white"}
            stroke="#4F46E5"
            strokeWidth="1.25"
          />
          <rect
            x="56"
            y={y - 9}
            width="160"
            height="18"
            rx="4"
            fill="white"
            stroke="rgba(0,0,0,0.08)"
            strokeWidth="0.75"
          />
          <text
            x="64"
            y={y + 3}
            fontSize="9"
            fontWeight="600"
            fill="#111"
          >
            {i === 0
              ? "v0.4 — added plan guard"
              : i === 1
                ? "v0.3 — coder agent"
                : "v0.2 — planner agent"}
          </text>
        </g>
      ))}
    </svg>
  );
}
