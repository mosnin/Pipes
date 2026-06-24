"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { StarterTemplate } from "@/domain/templates/catalog";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "./AnimatedCanvas";

/**
 * StarterShowcase
 *
 * Cross-fades through three real catalog starters every 5 seconds. Hovering
 * pauses rotation. Each starter renders a mini canvas that REBUILDS from
 * progress=0 to progress=1 over ~1.5s when it rotates in — so the user sees
 * the agent draw the system each time.
 */

interface StarterShowcaseProps {
  starters: ReadonlyArray<StarterTemplate>;
}

const ROTATE_MS = 5000;
const BUILD_MS = 1500;

export function StarterShowcase({ starters }: StarterShowcaseProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [buildT, setBuildT] = useState(reduced ? 1 : 0);
  const rafRef = useRef<number | null>(null);
  const buildStartRef = useRef<number>(0);

  const safeStarters = useMemo(
    () => starters.slice(0, 3),
    [starters],
  );

  // Build animation per starter.
  useEffect(() => {
    if (reduced) {
      setBuildT(1);
      return;
    }
    setBuildT(0);
    buildStartRef.current = performance.now();
    function step(now: number): void {
      const elapsed = now - buildStartRef.current;
      const t = Math.min(1, elapsed / BUILD_MS);
      setBuildT(t);
      if (t < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      }
    }
    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [index, reduced]);

  // Rotation.
  useEffect(() => {
    if (paused) return;
    if (safeStarters.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % safeStarters.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, safeStarters.length]);

  if (safeStarters.length === 0) return null;
  const current = safeStarters[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-center"
    >
      {/* TEXT SIDE */}
      <div className="flex flex-col gap-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col gap-3"
          >
            <p
              className="t-overline text-violet-700"
              style={{ fontSize: 11 }}
            >
              {current.category}
            </p>
            <h3
              className="text-[#111]"
              style={{
                fontSize: 28,
                lineHeight: 1.15,
                letterSpacing: "-0.025em",
                fontWeight: 700,
              }}
            >
              {current.title}
            </h3>
            <p className="t-body text-[#3C3C43]" style={{ fontSize: 15 }}>
              {current.description}
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              <span
                className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-2.5 py-1 t-caption font-semibold text-[#3C3C43]"
                style={{ fontSize: 11 }}
              >
                {current.nodes.length} nodes
              </span>
              <span
                className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-2.5 py-1 t-caption font-semibold text-[#3C3C43]"
                style={{ fontSize: 11 }}
              >
                {current.pipes.length} pipes
              </span>
              <span
                className="inline-flex items-center rounded-full border border-black/[0.08] bg-white px-2.5 py-1 t-caption font-semibold text-[#3C3C43] capitalize"
                style={{ fontSize: 11 }}
              >
                {current.complexity}
              </span>
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Pagination */}
        <div
          className="mt-3 flex items-center gap-2"
          role="tablist"
          aria-label="Starter showcase"
        >
          {safeStarters.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Show ${s.title}`}
              onClick={() => setIndex(i)}
              className="group flex items-center gap-1.5"
            >
              <span
                aria-hidden="true"
                className="inline-block h-1.5 rounded-full transition-all"
                style={{
                  width: i === index ? 24 : 8,
                  background:
                    i === index ? "#4F46E5" : "rgba(0,0,0,0.18)",
                }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* CANVAS SIDE */}
      <div className="relative overflow-hidden rounded-[20px] border border-black/[0.08] bg-white p-3 shadow-sm-token">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.id}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? undefined : { opacity: 0 }}
            transition={{ duration: 0.32, ease: "easeOut" }}
            className="relative aspect-[16/9] w-full"
          >
            <StarterMiniCanvas starter={current} progress={buildT} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */
/* QuoteRotator                                                               */
/* Three quotes that cross-fade every 6 seconds. Pause on hover. Lives here   */
/* because it shares the same auto-rotation pattern as StarterShowcase.       */

export interface QuoteRotatorQuote {
  title: string;
  body: string;
  attribution: string;
}

const QUOTE_ROTATE_MS = 6000;

export function QuoteRotator({
  quotes,
}: {
  quotes: ReadonlyArray<QuoteRotatorQuote>;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || quotes.length <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % quotes.length);
    }, QUOTE_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, quotes.length]);

  if (quotes.length === 0) return null;
  const current = quotes[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="flex flex-col items-center gap-8"
    >
      <div className="relative w-full">
        <AnimatePresence mode="wait">
          <motion.figure
            key={current.title}
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center gap-5 text-center"
          >
            <span
              className="t-overline text-violet-700"
              style={{ fontSize: 11 }}
            >
              {current.title}
            </span>
            <blockquote
              className="text-[#111]"
              style={{
                fontSize: 26,
                lineHeight: 1.35,
                letterSpacing: "-0.02em",
                fontWeight: 500,
                maxWidth: "60ch",
              }}
            >
              {current.body}
            </blockquote>
            <figcaption
              className="t-caption text-[#8E8E93]"
              style={{ fontSize: 12 }}
            >
              {current.attribution}
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>
      <div
        className="flex items-center gap-2"
        role="tablist"
        aria-label="Customer stories"
      >
        {quotes.map((q, i) => (
          <button
            key={q.title}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Show ${q.title}`}
            onClick={() => setIndex(i)}
            className="group flex items-center"
          >
            <span
              aria-hidden="true"
              className="inline-block h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 24 : 8,
                background: i === index ? "#4F46E5" : "rgba(0,0,0,0.18)",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}

function StarterMiniCanvas({
  starter,
  progress,
}: {
  starter: StarterTemplate;
  progress: number;
}) {
  const { nodes, edges, viewBox } = useMemo(() => {
    // Fit the starter's raw coordinates into a normalized 1200x500 viewBox.
    const xs = starter.nodes.map((n) => n.x);
    const ys = starter.nodes.map((n) => n.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const NODE_W = 160;
    const NODE_H = 56;
    const PADDING = 60;
    const targetW = 1200;
    const targetH = 500;
    const spanX = Math.max(1, maxX - minX + NODE_W);
    const spanY = Math.max(1, maxY - minY + NODE_H);
    const scaleX = (targetW - PADDING * 2) / spanX;
    const scaleY = (targetH - PADDING * 2) / spanY;
    const scale = Math.min(scaleX, scaleY, 1.0);
    const offsetX =
      (targetW - spanX * scale) / 2 - minX * scale;
    const offsetY =
      (targetH - spanY * scale) / 2 - minY * scale;
    const mappedNodes: CanvasNode[] = starter.nodes.map((n) => ({
      id: n.id,
      title: n.title,
      x: n.x * scale + offsetX,
      y: n.y * scale + offsetY,
    }));
    const mappedEdges: CanvasEdge[] = starter.pipes.map((p) => ({
      fromId: p.fromNodeId,
      toId: p.toNodeId,
    }));
    return {
      nodes: mappedNodes,
      edges: mappedEdges,
      viewBox: { w: targetW, h: targetH },
    };
  }, [starter]);

  return (
    <AnimatedCanvas
      nodes={nodes}
      edges={edges}
      progress={progress}
      nodeStart={0}
      nodeEnd={0.6}
      edgeStart={0.45}
      edgeEnd={1}
      width={viewBox.w}
      height={viewBox.h}
      nodeWidth={160}
      nodeHeight={56}
      className="h-full w-full"
      noGrid
      ariaLabel={`Mini canvas preview for ${starter.title}.`}
    />
  );
}
