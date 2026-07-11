"use client";

import { useRef, type ReactNode } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  Layers,
  Zap,
  GitBranch,
  Users,
  Shield,
  History,
} from "lucide-react";

interface Feature {
  stat: string;
  statLabel: string;
  icon: ReactNode;
  title: string;
  body: string;
  accent: string;
  accentBg: string;
}

const FEATURES: ReadonlyArray<Feature> = [
  {
    stat: "27",
    statLabel: "node types",
    icon: <Layers size={18} />,
    title: "Every loop shape covered",
    body: "Planner, coder, evaluator, router — every primitive you need to wire any agent loop.",
    accent: "#7C3AED",
    accentBg: "rgba(124,58,237,0.06)",
  },
  {
    stat: "11",
    statLabel: "MCP tools",
    icon: <Zap size={18} />,
    title: "Full agent API, one endpoint",
    body: "List, read, mutate, propose — any Claude or LangGraph agent reads your loop live through MCP.",
    accent: "#4F46E5",
    accentBg: "rgba(79,70,229,0.06)",
  },
  {
    stat: "∞",
    statLabel: "iterations",
    icon: <GitBranch size={18} />,
    title: "Drag, describe, refine",
    body: "Move a node and the agent adapts. Cmd-Z undoes the whole conversation turn.",
    accent: "#0891B2",
    accentBg: "rgba(8,145,178,0.06)",
  },
  {
    stat: "1",
    statLabel: "shared graph",
    icon: <Users size={18} />,
    title: "Same map, humans and agents",
    body: "Your team reviews the canvas your agents read. One source of truth, zero translation.",
    accent: "#059669",
    accentBg: "rgba(5,150,105,0.06)",
  },
  {
    stat: "11",
    statLabel: "capability scopes",
    icon: <Shield size={18} />,
    title: "Scoped tokens, per agent",
    body: "Grant a coder agent write access and nothing else. Scopes are enforced at the API layer.",
    accent: "#D97706",
    accentBg: "rgba(217,119,6,0.06)",
  },
  {
    stat: "∞",
    statLabel: "versions",
    icon: <History size={18} />,
    title: "Every turn is a commit",
    body: "Diff a system the way you diff a service. Roll back any step that went wrong.",
    accent: "#DC2626",
    accentBg: "rgba(220,38,38,0.06)",
  },
];

export interface FeatureGridProps {
  eyebrow?: string;
  title?: string;
}

export function FeatureGrid({
  eyebrow = "Built for builders",
  title = "Six reasons builders don't go back.",
}: FeatureGridProps) {
  return (
    <section className="px-4 sm:px-6">
      <div className="mx-auto max-w-7xl py-24 sm:py-32">
        <div className="mb-14 max-w-2xl">
          <p className="t-overline text-violet-700">
            {eyebrow}
          </p>
          <h2
            className="mt-3 text-[#111]"
            style={{
              fontSize: 40,
              lineHeight: 1.08,
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
  const inView = useInView(ref, { once: true, amount: 0.25 });

  return (
    <motion.div
      ref={ref}
      className="feature-tile group relative flex flex-col gap-0 overflow-hidden rounded-[20px] bg-white"
      style={{ "--tile-accent": feature.accent, boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(124,58,237,0.05)" } as React.CSSProperties}
      initial={reduced ? false : { opacity: 0, y: 24 }}
      animate={
        reduced
          ? { opacity: 1, y: 0 }
          : inView
            ? { opacity: 1, y: 0 }
            : { opacity: 0, y: 24 }
      }
      transition={{
        duration: 0.55,
        delay: reduced ? 0 : (index % 3) * 0.08,
        ease: [0.2, 0.8, 0.2, 1],
      }}
    >
      {/* Gradient accent header */}
      <div
        className="relative flex items-end justify-between px-5 pt-5 pb-4"
        style={{ background: feature.accentBg }}
      >
        {/* Large stat number */}
        <div>
          <span
            className="t-num block text-[#111]"
            style={{
              fontSize: 52,
              lineHeight: 1.0,
              letterSpacing: "-0.04em",
              fontWeight: 700,
            }}
          >
            {feature.stat}
          </span>
          <span
            className="t-caption"
            style={{ color: feature.accent, fontWeight: 600, fontSize: 11 }}
          >
            {feature.statLabel}
          </span>
        </div>
        {/* Icon chip */}
        <div
          className="flex h-9 w-9 items-center justify-center rounded-[10px] mb-1"
          style={{
            background: "white",
            color: feature.accent,
            boxShadow: `0 0 0 1px ${feature.accent}22, 0 2px 8px ${feature.accent}18`,
          }}
        >
          {feature.icon}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-2 px-5 py-4">
        <h3
          className="text-[#111]"
          style={{
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.25,
          }}
        >
          {feature.title}
        </h3>
        <p className="t-label text-[#3C3C43]" style={{ fontSize: 14, lineHeight: 1.55 }}>
          {feature.body}
        </p>
      </div>

      {/* Animated bottom accent line */}
      <div
        className="h-[2px] w-0 transition-all duration-300 ease-out group-hover:w-full"
        style={{ background: `linear-gradient(90deg, ${feature.accent}, transparent)` }}
      />
    </motion.div>
  );
}
