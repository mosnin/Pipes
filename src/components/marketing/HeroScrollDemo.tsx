"use client";

import { useMemo, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { remap, useScrollProgress } from "@/lib/marketing/useScrollProgress";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "./AnimatedCanvas";
import { ParallaxLayer } from "./ParallaxLayer";

/**
 * HeroScrollDemo
 *
 * A scroll-driven mini product demo. The OUTER wrapper is ~300vh tall, the
 * INNER surface is sticky at 100vh. Scrolling through the outer container
 * drives `progress` from 0 to 1, and that progress feeds six beats that
 * mirror docs/magic-moment.md.
 *
 * Beats (progress windows):
 *   0.00 - 0.15  user types into the prompt input (char by char)
 *   0.15 - 0.30  the agent's plan appears as text, then a plan card slides in
 *   0.30 - 0.50  nodes appear on the canvas one by one
 *   0.50 - 0.70  edges draw between nodes
 *   0.70 - 0.90  Claude side reads the architecture back
 *   0.90 - 1.00  Open in Claude button highlights
 */

const PROMPT_SENTENCE =
  "Planner agent reads tickets, writes a plan, hands off to a coder agent that opens a PR.";

const PLAN_LINES = [
  "Read inbound tickets.",
  "Write a structured plan.",
  "Hand the plan to the coder.",
  "Open the PR.",
] as const;

const CLAUDE_LINES = [
  "Planner agent.",
  "Plan guard.",
  "Coder agent.",
  "Two pipes between them.",
] as const;

const NODES: ReadonlyArray<CanvasNode> = [
  { id: "ticket", title: "Ticket inbox", subtitle: "trigger", x: 60, y: 168 },
  { id: "planner", title: "Planner agent", subtitle: "decides", x: 290, y: 168 },
  { id: "guard", title: "Plan guard", subtitle: "policy", x: 520, y: 168 },
  { id: "coder", title: "Coder agent", subtitle: "executes", x: 750, y: 168 },
  { id: "pr", title: "Open PR", subtitle: "result", x: 980, y: 168 },
];

const EDGES: ReadonlyArray<CanvasEdge> = [
  { fromId: "ticket", toId: "planner" },
  { fromId: "planner", toId: "guard" },
  { fromId: "guard", toId: "coder" },
  { fromId: "coder", toId: "pr" },
];

export interface HeroScrollDemoProps {
  /** Optional id used by anchor links. */
  id?: string;
}

export function HeroScrollDemo({ id }: HeroScrollDemoProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const rawProgress = useScrollProgress(wrapRef);
  // If reduced motion, jump straight to the final state.
  const progress = reduced ? 1 : rawProgress;

  // Beat 0: typing.
  const typeT = remap(progress, 0.0, 0.15);
  const typedChars = Math.floor(typeT * PROMPT_SENTENCE.length);
  const typedText = PROMPT_SENTENCE.slice(0, typedChars);

  // Beat 1: plan reveal. Lines appear one by one between 0.15 and 0.30.
  const planT = remap(progress, 0.15, 0.30);
  const visiblePlanLines = Math.ceil(planT * PLAN_LINES.length);
  const planCardOpacity = remap(progress, 0.22, 0.30);

  // Beat 2 + 3: canvas progress 0..1 maps from 0.30..0.70.
  const canvasProgress = remap(progress, 0.30, 0.70);

  // Beat 4: Claude side. Lines appear between 0.70 and 0.88.
  const claudeT = remap(progress, 0.70, 0.88);
  const claudePanelOpacity = remap(progress, 0.68, 0.78);
  const visibleClaudeLines = Math.ceil(claudeT * CLAUDE_LINES.length);

  // Beat 5: Open in Claude button glow.
  const buttonGlow = remap(progress, 0.90, 1.0);

  // Map progress -> currently active beat for the timeline pip.
  const activeBeat = useMemo(() => {
    if (progress < 0.15) return 0;
    if (progress < 0.30) return 1;
    if (progress < 0.50) return 2;
    if (progress < 0.70) return 3;
    if (progress < 0.90) return 4;
    return 5;
  }, [progress]);

  return (
    <div
      id={id}
      ref={wrapRef}
      // Tall outer container drives the scroll progress.
      className="relative w-full"
      style={{ height: "300vh" }}
      data-testid="hero-scroll-demo-outer"
      aria-label="Scroll-driven Looper demo. Type a sentence, watch the canvas build, watch Claude read it back."
    >
      <div
        className="sticky top-0 flex h-screen w-full items-center justify-center px-4 sm:px-6"
        data-testid="hero-scroll-demo-sticky"
      >
        {/* Z-depth 1 — background: a soft indigo bloom locked to the section.
            No movement; pure backdrop. Sits behind everything. */}
        <ParallaxLayer
          depth={0}
          containerRef={wrapRef}
          testId="hero-depth-bg"
          className="depth-glow-indigo"
        >
          <span className="sr-only">background</span>
        </ParallaxLayer>

        {/* Z-depth 2 — mid: a faint 24px dotted grid that drifts at 0.35x
            scroll speed. Subtle parallax against the foreground. */}
        <ParallaxLayer
          depth={0.35}
          containerRef={wrapRef}
          testId="hero-depth-mid"
          className="grid-bg opacity-[0.55]"
        >
          <span className="sr-only">grid</span>
        </ParallaxLayer>

        <div
          className="relative z-[1] w-full max-w-7xl overflow-hidden rounded-[32px] border border-black/[0.08] bg-white shadow-lg-token"
          style={{ aspectRatio: "16 / 9", maxHeight: "85vh" }}
          data-testid="hero-depth-fg"
        >
          {/* Top chrome */}
          <div className="absolute left-0 right-0 top-0 z-10 flex items-center gap-2 border-b border-black/[0.06] bg-white/95 px-4 py-2.5 backdrop-blur">
            <span
              className="t-label font-semibold text-[#111]"
              style={{ fontSize: 12 }}
            >
              Looper
            </span>
            <span
              className="t-caption text-[#8E8E93]"
              style={{ fontSize: 11 }}
            >
              sys_8a72
            </span>
            <BeatTimeline active={activeBeat} />
          </div>

          {/* Body */}
          <div className="grid h-full grid-cols-1 gap-px bg-black/[0.06] pt-10 lg:grid-cols-[1.4fr_1fr]">
            {/* LEFT — input, plan, canvas */}
            <div className="flex flex-col gap-3 bg-white px-5 py-5">
              {/* Prompt input */}
              <div
                className="rounded-[10px] border border-black/[0.08] bg-[#FAFAFA] px-3.5 py-2.5"
                data-testid="prompt-input"
              >
                <p
                  className="t-caption text-[#8E8E93]"
                  style={{ fontSize: 10 }}
                >
                  Describe your system. Watch it build itself.
                </p>
                <div className="mt-1.5 flex min-h-[18px] items-center">
                  <span
                    className="t-label text-[#111]"
                    style={{ fontSize: 13 }}
                  >
                    {typedText}
                  </span>
                  <span
                    aria-hidden="true"
                    className="ml-px inline-block h-3.5 w-px bg-indigo-500"
                    style={{
                      opacity: progress < 0.16 ? 1 : 0,
                      transition: "opacity 120ms",
                    }}
                  />
                </div>
              </div>

              {/* Plan card */}
              <div
                className="rounded-[10px] border border-black/[0.08] bg-white px-3.5 py-2.5"
                data-testid="plan-card"
                style={{
                  opacity: planCardOpacity,
                  transform: `translateY(${(1 - planCardOpacity) * 6}px)`,
                  transition: reduced ? "none" : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <p
                    className="t-caption text-[#8E8E93]"
                    style={{ fontSize: 10 }}
                  >
                    Plan
                  </p>
                  <span
                    className="t-caption text-indigo-700"
                    style={{ fontSize: 10 }}
                  >
                    {visiblePlanLines} of {PLAN_LINES.length}
                  </span>
                </div>
                <ul className="mt-1.5 flex flex-col gap-1">
                  {PLAN_LINES.map((line, i) => (
                    <li
                      key={line}
                      className="flex items-center gap-2"
                      style={{
                        opacity: i < visiblePlanLines ? 1 : 0.15,
                        transition: reduced ? "none" : "opacity 200ms",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-1 w-1 rounded-full bg-indigo-500"
                      />
                      <span
                        className="t-mono text-[#3C3C43]"
                        style={{ fontSize: 11 }}
                      >
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Canvas */}
              <div className="relative flex-1 overflow-hidden rounded-[10px] border border-black/[0.08] bg-white">
                <AnimatedCanvas
                  nodes={NODES}
                  edges={EDGES}
                  progress={canvasProgress}
                  nodeStart={0}
                  nodeEnd={0.55}
                  edgeStart={0.5}
                  edgeEnd={1}
                  width={1200}
                  height={400}
                  className="h-full w-full"
                  ariaLabel="Five nodes appearing left to right with pipes drawing between them."
                />
              </div>
            </div>

            {/* RIGHT — Claude readback + connect button */}
            <div
              className="flex flex-col gap-3 bg-white px-5 py-5"
              data-testid="claude-panel"
              style={{
                opacity: claudePanelOpacity,
                transition: reduced ? "none" : undefined,
              }}
            >
              {/* Claude chrome */}
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex h-5 w-5 items-center justify-center rounded-md bg-[#0A0A0A] text-white"
                  aria-hidden="true"
                >
                  <span
                    className="t-mono font-semibold"
                    style={{ fontSize: 10 }}
                  >
                    C
                  </span>
                </span>
                <span
                  className="t-label font-semibold text-[#111]"
                  style={{ fontSize: 12 }}
                >
                  Claude
                </span>
                <span
                  className="ml-auto inline-flex items-center gap-1 rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5"
                  style={{ fontSize: 10 }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-1 w-1 rounded-full bg-indigo-500"
                  />
                  <span
                    className="t-caption font-semibold text-indigo-700"
                    style={{ fontSize: 10 }}
                  >
                    via pipes (MCP)
                  </span>
                </span>
              </div>

              <div className="rounded-[10px] border border-black/[0.08] bg-[#FAFAFA] px-3.5 py-2.5">
                <p
                  className="t-caption text-[#8E8E93]"
                  style={{ fontSize: 10 }}
                >
                  You asked Claude
                </p>
                <p
                  className="mt-1 t-label text-[#111]"
                  style={{ fontSize: 12 }}
                >
                  What is in my Looper loop?
                </p>
              </div>

              <div className="flex-1 rounded-[10px] border border-black/[0.08] bg-white px-3.5 py-2.5">
                <p
                  className="t-caption text-[#8E8E93]"
                  style={{ fontSize: 10 }}
                >
                  Claude answers
                </p>
                <ul className="mt-1.5 flex flex-col gap-1.5">
                  {CLAUDE_LINES.map((line, i) => (
                    <li
                      key={line}
                      className="flex items-center gap-2"
                      style={{
                        opacity: i < visibleClaudeLines ? 1 : 0,
                        transform: `translateY(${
                          i < visibleClaudeLines ? 0 : 4
                        }px)`,
                        transition: reduced
                          ? "none"
                          : "opacity 200ms, transform 200ms",
                      }}
                    >
                      <span
                        aria-hidden="true"
                        className="inline-block h-1 w-1 rounded-full bg-indigo-500"
                      />
                      <span
                        className="t-mono text-[#3C3C43]"
                        style={{ fontSize: 11 }}
                      >
                        {line}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Open in Claude */}
              <div
                className="rounded-[10px] border px-3.5 py-2.5"
                data-testid="connect-button"
                style={{
                  borderColor:
                    buttonGlow > 0 ? "#4F46E5" : "rgba(0,0,0,0.08)",
                  background: buttonGlow > 0 ? "#EEF2FF" : "white",
                  boxShadow:
                    buttonGlow > 0
                      ? `0 0 0 ${(buttonGlow * 6).toFixed(2)}px rgba(79,70,229,${(buttonGlow * 0.18).toFixed(2)})`
                      : "none",
                  transition: reduced ? "none" : "all 200ms",
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="t-label font-semibold text-[#111]"
                    style={{ fontSize: 12 }}
                  >
                    Open in Claude
                  </span>
                  <span
                    className="t-mono text-indigo-700"
                    style={{ fontSize: 10 }}
                  >
                    ptk_8a72...
                  </span>
                </div>
                <p
                  className="mt-1 t-caption text-[#3C3C43]"
                  style={{ fontSize: 10 }}
                >
                  One token. One graph. Hand it to any agent.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BeatTimeline({ active }: { active: number }) {
  const beats = [
    "Type",
    "Plan",
    "Draw",
    "Wire",
    "Read",
    "Hand off",
  ] as const;
  return (
    <div
      className="ml-auto hidden items-center gap-1.5 sm:flex"
      data-testid="beat-timeline"
      aria-label={`Step ${active + 1} of ${beats.length}: ${beats[active]}`}
    >
      {beats.map((label, i) => (
        <div key={label} className="flex items-center gap-1">
          <span
            aria-hidden="true"
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              background: i === active ? "#4F46E5" : "rgba(0,0,0,0.16)",
              transform: i === active ? "scale(1.4)" : "scale(1)",
              transition: "all 200ms",
            }}
          />
          <span
            className="t-caption font-semibold"
            style={{
              fontSize: 10,
              color: i === active ? "#4F46E5" : "#8E8E93",
            }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
