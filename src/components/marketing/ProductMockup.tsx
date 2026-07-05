"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ProductMockup
 *
 * A static, always-visible product preview that shows the Pipes UI in a
 * browser-chrome frame. No scroll-driven animation — the UI is immediately
 * readable on page load, the way Linear, Figma, and Vercel present theirs.
 *
 * Five nodes connected by four edges, the inspector panel open on "Planner",
 * and the Claude MCP side panel showing a live readback.
 */

const NODES = [
  { id: "ticket", x: 48, y: 168, title: "Ticket inbox", sub: "trigger", color: "#7C3AED" },
  { id: "planner", x: 246, y: 168, title: "Planner agent", sub: "decides", color: "#4F46E5", selected: true },
  { id: "guard", x: 444, y: 168, title: "Plan guard", sub: "policy", color: "#0891B2" },
  { id: "coder", x: 642, y: 168, title: "Coder agent", sub: "executes", color: "#059669" },
  { id: "pr", x: 840, y: 168, title: "Open PR", sub: "result", color: "#D97706" },
] as const;

const EDGES = [
  { from: { x: 168, y: 188 }, to: { x: 246, y: 188 } },
  { from: { x: 366, y: 188 }, to: { x: 444, y: 188 } },
  { from: { x: 564, y: 188 }, to: { x: 642, y: 188 } },
  { from: { x: 762, y: 188 }, to: { x: 840, y: 188 } },
] as const;

const PLAN_LINES = [
  "Read inbound tickets.",
  "Write a structured plan.",
  "Hand the plan to the coder.",
  "Open the PR.",
] as const;

const CLAUDE_LINES = [
  "Your loop has 5 nodes.",
  "Planner agent decides.",
  "Guard validates the plan.",
  "Coder opens the PR.",
] as const;

export function ProductMockup() {
  const reduced = useReducedMotion();

  return (
    <section
      id="product-preview"
      className="px-4 sm:px-6"
      aria-label="Pipes product preview"
    >
      <div className="mx-auto max-w-7xl pb-8 pt-4">
        {/* Section label */}
        <div className="mb-8 text-center">
          <p
            className="t-overline text-violet-700"
            style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}
          >
            See how it works
          </p>
        </div>

        {/* Browser chrome frame */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
          className="relative overflow-hidden rounded-[20px] border border-black/[0.07] bg-white"
          style={{
            boxShadow: "0 2px 8px rgba(0,0,0,0.04), 0 16px 64px rgba(124,58,237,0.10), 0 40px 80px rgba(0,0,0,0.06)",
          }}
        >
          {/* Browser toolbar */}
          <div
            className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-3"
            style={{ background: "#FAFAFA" }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#FF5F57" }} />
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#FEBC2E" }} />
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: "#28C840" }} />
            </div>
            {/* URL bar */}
            <div
              className="flex flex-1 items-center gap-2 rounded-md px-3 py-1.5 mx-2"
              style={{ background: "#F0F0F5", maxWidth: 360 }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12 6.48 2 12 2z" stroke="#8E8E93" strokeWidth="1.5" />
                <path d="M2 12h20M12 2c-2.76 3.45-4 6.93-4 10s1.24 6.55 4 10M12 2c2.76 3.45 4 6.93 4 10s-1.24 6.55-4 10" stroke="#8E8E93" strokeWidth="1.5" />
              </svg>
              <span style={{ fontSize: 11, color: "#3C3C43" }}>app.pipes.dev/systems/sys_8a72</span>
            </div>
            {/* App header actions */}
            <div className="ml-auto flex items-center gap-2">
              <span
                className="rounded-md px-3 py-1"
                style={{ background: "#7C3AED", color: "white", fontSize: 11, fontWeight: 600 }}
              >
                Save checkpoint
              </span>
              <span
                className="rounded-md px-3 py-1"
                style={{ background: "#F0F0F5", color: "#111", fontSize: 11, fontWeight: 600 }}
              >
                Share
              </span>
            </div>
          </div>

          {/* App body */}
          <div className="grid" style={{ gridTemplateColumns: "220px 1fr 280px", height: 440 }}>

            {/* LEFT — Inspector panel */}
            <div
              className="flex flex-col border-r border-black/[0.06]"
              style={{ background: "#FAFAFA" }}
            >
              <div className="border-b border-black/[0.06] px-4 py-3">
                <p style={{ fontSize: 10, fontWeight: 700, color: "#8E8E93", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Inspector
                </p>
              </div>
              <div className="flex flex-col gap-4 px-4 py-4">
                {/* Node type pill */}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#8E8E93", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Node type
                  </p>
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2"
                    style={{ background: "#EEF2FF", border: "1px solid rgba(79,70,229,0.2)" }}
                  >
                    <span
                      className="inline-block rounded"
                      style={{ width: 8, height: 8, background: "#4F46E5", flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 11, fontWeight: 600, color: "#4F46E5" }}>LLM Agent</span>
                  </div>
                </div>

                {/* Description field */}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#8E8E93", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Description
                  </p>
                  <div
                    className="rounded-lg px-3 py-2.5"
                    style={{ background: "white", border: "1.5px solid #4F46E5", fontSize: 11, color: "#111", lineHeight: 1.4 }}
                  >
                    Reads inbound tickets and writes a structured plan for the coder agent.
                  </div>
                </div>

                {/* Config */}
                <div>
                  <p style={{ fontSize: 9, fontWeight: 600, color: "#8E8E93", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                    Model
                  </p>
                  <div
                    className="rounded-lg px-3 py-2"
                    style={{ background: "white", border: "1px solid rgba(0,0,0,0.08)", fontSize: 11, color: "#3C3C43" }}
                  >
                    claude-3-5-sonnet
                  </div>
                </div>

                {/* Save button */}
                <button
                  type="button"
                  className="mt-2 w-full rounded-lg py-2 text-center"
                  style={{ background: "#4F46E5", color: "white", fontSize: 11, fontWeight: 600 }}
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  Apply changes
                </button>
              </div>

              {/* Comment thread */}
              <div className="mt-auto border-t border-black/[0.06] px-4 py-3">
                <p style={{ fontSize: 9, fontWeight: 600, color: "#8E8E93", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Comments
                </p>
                <div className="flex items-start gap-2">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white"
                    style={{ background: "#7C3AED", fontSize: 8, fontWeight: 700 }}
                  >
                    AK
                  </span>
                  <p style={{ fontSize: 10, color: "#3C3C43", lineHeight: 1.4 }}>
                    Should this gate on confidence score?
                  </p>
                </div>
              </div>
            </div>

            {/* CENTER — Canvas */}
            <div
              className="relative overflow-hidden"
              style={{ background: "#F8F7FC" }}
            >
              {/* Dot grid */}
              <svg
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <defs>
                  <pattern id="pm-dots" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="12" cy="12" r="0.9" fill="rgba(0,0,0,0.08)" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#pm-dots)" />
              </svg>

              {/* Canvas toolbar */}
              <div
                className="absolute left-3 top-3 flex flex-col items-center gap-1 rounded-xl border border-black/[0.07] p-1.5"
                style={{ background: "white", boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
              >
                {["↖", "⬜", "○", "↗"].map((icon, i) => (
                  <button
                    key={i}
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-xs"
                    style={{ background: i === 0 ? "#F0EFFE" : "transparent", color: i === 0 ? "#7C3AED" : "#8E8E93" }}
                  >
                    {icon}
                  </button>
                ))}
              </div>

              {/* Nodes + edges as SVG */}
              <svg
                viewBox="0 0 1060 380"
                className="absolute inset-0 h-full w-full"
                aria-label="Agent loop canvas: five nodes connected by pipes"
              >
                {/* Edges */}
                {EDGES.map((e, i) => (
                  <g key={i}>
                    <line
                      x1={e.from.x} y1={e.from.y}
                      x2={e.to.x} y2={e.to.y}
                      stroke="#E5E5EA"
                      strokeWidth="2"
                    />
                    {/* Arrow head */}
                    <polygon
                      points={`${e.to.x},${e.to.y - 5} ${e.to.x + 10},${e.to.y} ${e.to.x},${e.to.y + 5}`}
                      fill="#D1D1D6"
                    />
                  </g>
                ))}

                {/* Nodes */}
                {NODES.map((n) => (
                  <g key={n.id}>
                    {/* Selection ring */}
                    {"selected" in n && n.selected && (
                      <rect
                        x={n.x - 3} y={n.y - 23}
                        width={126} height={46}
                        rx={13}
                        fill="none"
                        stroke="#4F46E5"
                        strokeWidth="2"
                        opacity="0.5"
                      />
                    )}
                    {/* Card */}
                    <rect
                      x={n.x} y={n.y - 20}
                      width={120} height={40}
                      rx={10}
                      fill="white"
                      stroke={"selected" in n && n.selected ? "#4F46E5" : "rgba(0,0,0,0.08)"}
                      strokeWidth={"selected" in n && n.selected ? 1.5 : 1}
                      filter="drop-shadow(0 2px 6px rgba(0,0,0,0.05))"
                    />
                    {/* Color bar */}
                    <rect x={n.x} y={n.y - 20} width={4} height={40} rx={2} fill={n.color} />
                    {/* Title */}
                    <text
                      x={n.x + 14} y={n.y - 4}
                      fontSize="10" fontWeight="700" fill="#111"
                      fontFamily="system-ui"
                    >
                      {n.title}
                    </text>
                    {/* Subtitle */}
                    <text
                      x={n.x + 14} y={n.y + 10}
                      fontSize="9" fill="#8E8E93"
                      fontFamily="system-ui"
                    >
                      {n.sub}
                    </text>
                  </g>
                ))}
              </svg>

              {/* Prompt input at bottom */}
              <div
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-80 rounded-2xl border border-violet-200 px-4 py-3"
                style={{
                  background: "white",
                  boxShadow: "0 4px 24px rgba(124,58,237,0.12), 0 0 0 3px rgba(124,58,237,0.08)",
                }}
              >
                <p style={{ fontSize: 11, color: "#3C3C43" }}>
                  Planner agent reads tickets, writes a plan, hands off to a coder agent that opens a PR.
                </p>
                <div className="mt-2 flex items-center justify-between">
                  <span style={{ fontSize: 10, color: "#8E8E93" }}>Describe a change or ask a question…</span>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-hidden="true"
                    className="flex h-6 w-6 items-center justify-center rounded-full"
                    style={{ background: "#7C3AED" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT — Claude MCP panel */}
            <div
              className="flex flex-col border-l border-black/[0.06]"
              style={{ background: "white" }}
            >
              {/* Panel header */}
              <div
                className="flex items-center gap-2 border-b border-black/[0.06] px-4 py-3"
                style={{ background: "#FAFAFA" }}
              >
                <span
                  className="flex h-5 w-5 items-center justify-center rounded-md text-white"
                  style={{ background: "#0A0A0A", fontSize: 10, fontWeight: 700 }}
                >
                  C
                </span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Claude</span>
                <span
                  className="ml-auto flex items-center gap-1 rounded-full px-2 py-0.5"
                  style={{ background: "#F5F3FF", border: "1px solid rgba(124,58,237,0.2)", fontSize: 10, color: "#7C3AED", fontWeight: 600 }}
                >
                  <span
                    className="inline-block rounded-full"
                    style={{ width: 5, height: 5, background: "#7C3AED" }}
                  />
                  via MCP
                </span>
              </div>

              {/* Chat messages */}
              <div className="flex flex-col gap-3 overflow-hidden px-4 py-4" style={{ flex: 1 }}>
                {/* User prompt */}
                <div
                  className="self-end rounded-2xl rounded-br-sm px-3 py-2"
                  style={{ background: "#F5F3FF", border: "1px solid rgba(124,58,237,0.15)", maxWidth: "85%" }}
                >
                  <p style={{ fontSize: 11, color: "#3C3C43", lineHeight: 1.4 }}>
                    What is in my Pipes loop?
                  </p>
                </div>

                {/* Claude response */}
                <div
                  className="rounded-2xl rounded-bl-sm px-3 py-2.5"
                  style={{ background: "#F8F7FC", border: "1px solid rgba(0,0,0,0.06)", maxWidth: "95%" }}
                >
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#7C3AED", marginBottom: 6 }}>
                    Read via MCP
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {CLAUDE_LINES.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="inline-block rounded-full"
                          style={{ width: 5, height: 5, background: "#7C3AED", flexShrink: 0 }}
                        />
                        <span style={{ fontSize: 11, color: "#3C3C43", lineHeight: 1.3 }}>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan card */}
                <div
                  className="rounded-2xl rounded-bl-sm px-3 py-2.5"
                  style={{ background: "white", border: "1px solid rgba(79,70,229,0.2)", maxWidth: "95%" }}
                >
                  <p style={{ fontSize: 10, fontWeight: 600, color: "#4F46E5", marginBottom: 6 }}>
                    Suggested plan
                  </p>
                  <div className="flex flex-col gap-1">
                    {PLAN_LINES.map((line, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span
                          className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-white"
                          style={{ background: "#4F46E5", fontSize: 7, fontWeight: 700 }}
                        >
                          {i + 1}
                        </span>
                        <span style={{ fontSize: 10, color: "#3C3C43" }}>{line}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Token info footer */}
              <div
                className="border-t border-black/[0.06] px-4 py-3"
                style={{ background: "#FAFAFA" }}
              >
                <div className="flex items-center justify-between">
                  <span style={{ fontSize: 10, fontWeight: 600, color: "#8E8E93" }}>Token</span>
                  <span style={{ fontSize: 10, color: "#7C3AED", fontFamily: "monospace" }}>ptk_8a72••••</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ background: "#F5F3FF", fontSize: 9, fontWeight: 600, color: "#7C3AED" }}
                  >
                    graph:read
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ background: "#F5F3FF", fontSize: 9, fontWeight: 600, color: "#7C3AED" }}
                  >
                    schema:read
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5"
                    style={{ background: "#F0F0F5", fontSize: 9, color: "#8E8E93" }}
                  >
                    +9 more
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Caption below */}
        <p className="mt-5 text-center" style={{ fontSize: 12, color: "#8E8E93" }}>
          Type a sentence. Your agent builds the loop. Claude reads it live via MCP.
        </p>
      </div>
    </section>
  );
}
