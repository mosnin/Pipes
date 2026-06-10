"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, RefreshCw } from "lucide-react";
import { Button, StatusBadge, type StatusBadgeTone } from "@/components/ui";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "@/components/marketing/AnimatedCanvas";
import { TrackedLink } from "@/components/marketing/TrackedLink";

/**
 * TemplateDetailHero
 *
 * Hero for /templates/[slug]. Left column has the title, description,
 * category pills and a CTA. Right column hosts a large AnimatedCanvas
 * that auto-plays once on first view and can be replayed via a button.
 */

export interface TemplateDetailHeroProps {
  slug: string;
  templateId: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: string;
  catalog: {
    nodes: ReadonlyArray<{ id: string; title: string; x: number; y: number; type: string }>;
    pipes: ReadonlyArray<{ fromNodeId: string; toNodeId: string }>;
  } | null;
}

const PLAY_DURATION_MS = 1800;

export function TemplateDetailHero(props: TemplateDetailHeroProps) {
  const reduced = useReducedMotion();
  const tone = complexityTone(props.complexity);
  const complexityLabel =
    props.complexity.charAt(0).toUpperCase() + props.complexity.slice(1);

  const { nodes, edges, viewBox } = buildCanvasGeometry(props.catalog);
  const [progress, setProgress] = useState<number>(reduced ? 1 : 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);
  const playedRef = useRef<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const play = useCallback(() => {
    if (reduced) {
      setProgress(1);
      return;
    }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    startRef.current = null;
    setProgress(0);
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / PLAY_DURATION_MS);
      setProgress(p);
      if (p < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [reduced]);

  // Auto-play once on first view.
  useEffect(() => {
    if (playedRef.current) return;
    if (reduced) {
      setProgress(1);
      playedRef.current = true;
      return;
    }
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !playedRef.current) {
            playedRef.current = true;
            play();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [play, reduced]);

  return (
    <section className="px-4 sm:px-6 pt-6 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="relative overflow-hidden rounded-[40px] surface-subtle border border-black/[0.04] px-6 py-12 sm:px-12 sm:py-16"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left: text + CTA */}
            <div className="lg:col-span-5 flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge tone={tone}>{complexityLabel}</StatusBadge>
                <span className="inline-flex items-center rounded-md border border-black/[0.06] bg-white px-1.5 py-0.5 t-caption text-[#3C3C43]">
                  {props.category}
                </span>
              </div>
              <h1 className="t-display text-[#111]">{props.title}</h1>
              <p className="t-body text-[#3C3C43] leading-relaxed max-w-md">
                {props.description}
              </p>
              <div className="t-label text-[#8E8E93] italic max-w-md">
                For when {lowerFirst(props.useCase)}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <TrackedLink
                  href={`/signup?source=template-${props.slug}`}
                  event="public_template_instantiate_clicked"
                  metadata={{ templateId: props.templateId, source: "template_detail_hero" }}
                >
                  <Button variant="primary">
                    Use this starter
                    <ArrowRight size={14} className="ml-1.5" aria-hidden="true" />
                  </Button>
                </TrackedLink>
              </div>
            </div>

            {/* Right: animated canvas */}
            <div className="lg:col-span-7">
              <div
                ref={containerRef}
                data-testid="template-hero-canvas"
                data-progress={progress.toFixed(3)}
                className="relative rounded-3xl border border-black/[0.06] bg-white overflow-hidden shadow-sm-token"
              >
                <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-[#FF5F57]" aria-hidden="true" />
                  <span className="h-2 w-2 rounded-full bg-[#FEBC2E]" aria-hidden="true" />
                  <span className="h-2 w-2 rounded-full bg-[#28C840]" aria-hidden="true" />
                </div>

                <button
                  type="button"
                  onClick={play}
                  className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 rounded-full border border-black/[0.06] bg-white/95 backdrop-blur px-2.5 py-1 t-caption text-[#3C3C43] hover:text-[#111] transition-colors"
                  aria-label="Replay build"
                >
                  <RefreshCw size={11} aria-hidden="true" />
                  Replay
                </button>

                <div className="aspect-[16/10] w-full">
                  {nodes.length > 0 ? (
                    <AnimatedCanvas
                      nodes={nodes}
                      edges={edges}
                      progress={progress}
                      width={viewBox.w}
                      height={viewBox.h}
                      nodeWidth={150}
                      nodeHeight={48}
                      ariaLabel={`${props.title} system canvas`}
                      className="h-full w-full"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="t-caption text-[#C7C7CC] font-mono">
                        Preview unavailable
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function complexityTone(c: string): StatusBadgeTone {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "info";
}

function lowerFirst(s: string): string {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

function buildCanvasGeometry(
  catalog: TemplateDetailHeroProps["catalog"],
): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewBox: { w: number; h: number };
} {
  if (!catalog || catalog.nodes.length === 0) {
    return { nodes: [], edges: [], viewBox: { w: 1200, h: 500 } };
  }
  const xs = catalog.nodes.map((n) => n.x);
  const ys = catalog.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + 160;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + 56;
  const sourceW = Math.max(1, maxX - minX);
  const sourceH = Math.max(1, maxY - minY);

  const viewBoxW = 1200;
  const viewBoxH = 500;
  const padX = 60;
  const padY = 60;
  const targetW = viewBoxW - padX * 2;
  const targetH = viewBoxH - padY * 2;
  const scaleX = targetW / sourceW;
  const scaleY = targetH / sourceH;

  const nodes: CanvasNode[] = catalog.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    subtitle: n.type === "Node" ? undefined : n.type,
    x: padX + (n.x - minX) * scaleX,
    y: padY + (n.y - minY) * scaleY,
  }));
  const edges: CanvasEdge[] = catalog.pipes.map((p) => ({
    fromId: p.fromNodeId,
    toId: p.toNodeId,
  }));
  return { nodes, edges, viewBox: { w: viewBoxW, h: viewBoxH } };
}
