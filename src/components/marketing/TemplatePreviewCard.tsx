"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui";
import { AnimatedCanvas, type CanvasEdge, type CanvasNode } from "@/components/marketing/AnimatedCanvas";
import { TrackedLink } from "@/components/marketing/TrackedLink";

/**
 * TemplatePreviewCard
 *
 * Refined template card that plays a 1.4s AnimatedCanvas build on hover
 * or focus. Holds its final state once played. Respects reduced motion
 * by jumping straight to the final state.
 */

export interface TemplatePreviewCardCatalog {
  nodes: ReadonlyArray<{ id: string; title: string; x: number; y: number; type: string }>;
  pipes: ReadonlyArray<{ fromNodeId: string; toNodeId: string }>;
}

export interface TemplatePreviewCardProps {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  useCase: string;
  complexity: string;
  preview: string;
  catalog?: TemplatePreviewCardCatalog | null;
}

const PLAY_DURATION_MS = 1400;

export function TemplatePreviewCard(props: TemplatePreviewCardProps) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState<number>(reduced ? 1 : 0);
  const [played, setPlayed] = useState<boolean>(false);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  // Normalise catalog data into AnimatedCanvas inputs.
  const { nodes, edges, viewBox } = useMemo(() => {
    return buildCanvasGeometry(props.catalog);
  }, [props.catalog]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  function start() {
    if (reduced) {
      setProgress(1);
      setPlayed(true);
      return;
    }
    // If already played, replay from start
    setPlayed(false);
    startRef.current = null;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const tick = (t: number) => {
      if (startRef.current == null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / PLAY_DURATION_MS);
      setProgress(p);
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setPlayed(true);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function stop() {
    // Hold the final state when the cursor leaves - the canvas should not reset.
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
  }

  const tone = complexityTone(props.complexity);
  const complexityLabel =
    props.complexity.charAt(0).toUpperCase() + props.complexity.slice(1);

  return (
    <motion.article
      data-testid={`template-card-${props.slug}`}
      onMouseEnter={start}
      onMouseLeave={stop}
      onFocus={start}
      onBlur={stop}
      tabIndex={-1}
      className="group relative flex h-full flex-col rounded-3xl border border-black/[0.06] bg-white overflow-hidden"
      initial={false}
      whileHover={reduced ? undefined : { y: -3 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
    >
      {/* Canvas preview region */}
      <div
        data-testid={`template-card-canvas-${props.slug}`}
        data-progress={progress.toFixed(3)}
        data-played={played ? "true" : "false"}
        className="relative h-32 sm:h-36 w-full border-b border-black/[0.04] bg-[#FAFAFA] overflow-hidden"
      >
        {nodes.length > 0 ? (
          <AnimatedCanvas
            nodes={nodes}
            edges={edges}
            progress={progress}
            width={viewBox.w}
            height={viewBox.h}
            nodeWidth={120}
            nodeHeight={36}
            ariaLabel={`Preview of ${props.title}`}
            className="absolute inset-0 h-full w-full"
            noGrid
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="t-caption text-[#C7C7CC] font-mono">{props.preview}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <TrackedLink
        href={`/templates/${props.slug}`}
        event="template_detail_viewed"
        metadata={{ source: "templates_index", templateId: props.id }}
        className="flex flex-1 flex-col gap-3 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded-3xl"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="t-title text-[#111] leading-snug">{props.title}</h3>
          <StatusBadge tone={tone}>{complexityLabel}</StatusBadge>
        </div>

        <p className="t-label text-[#3C3C43] leading-relaxed line-clamp-2">
          {props.description}
        </p>

        <div className="mt-1 flex flex-wrap gap-1.5">
          <Pill>{props.category}</Pill>
          <Pill subtle>{props.useCase}</Pill>
        </div>

        <div className="mt-auto pt-3 border-t border-black/[0.04] flex items-center justify-between">
          <span className="t-caption text-[#8E8E93] font-mono">{props.preview}</span>
          <span className="inline-flex items-center gap-1 t-label font-semibold text-violet-600 group-hover:text-violet-700 transition-colors">
            Details
            <ArrowRight size={12} aria-hidden="true" />
          </span>
        </div>
      </TrackedLink>
    </motion.article>
  );
}

function Pill({ children, subtle = false }: { children: React.ReactNode; subtle?: boolean }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-md px-1.5 py-0.5 t-caption",
        subtle
          ? "bg-[#FAFAFA] border border-black/[0.04] text-[#3C3C43]"
          : "bg-white border border-black/[0.08] text-[#111] font-medium",
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function complexityTone(c: string): StatusBadgeTone {
  if (c === "simple") return "success";
  if (c === "advanced") return "warning";
  return "info";
}

/**
 * Take a catalog's node positions (which use the full editor canvas dimensions,
 * up to ~1400x500) and squash them into a compact preview area.
 */
function buildCanvasGeometry(catalog: TemplatePreviewCardCatalog | null | undefined): {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewBox: { w: number; h: number };
} {
  if (!catalog || catalog.nodes.length === 0) {
    return { nodes: [], edges: [], viewBox: { w: 480, h: 144 } };
  }

  const xs = catalog.nodes.map((n) => n.x);
  const ys = catalog.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + 160; // include node width
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + 56; // include node height

  const sourceW = Math.max(1, maxX - minX);
  const sourceH = Math.max(1, maxY - minY);

  const viewBoxW = 480;
  const viewBoxH = 144;

  // Padding inside the viewBox.
  const padX = 12;
  const padY = 14;
  const targetW = viewBoxW - padX * 2;
  const targetH = viewBoxH - padY * 2;

  const scaleX = targetW / sourceW;
  const scaleY = targetH / sourceH;

  const nodes: CanvasNode[] = catalog.nodes.map((n) => ({
    id: n.id,
    title: n.title.length > 14 ? `${n.title.slice(0, 13)}.` : n.title,
    x: padX + (n.x - minX) * scaleX,
    y: padY + (n.y - minY) * scaleY,
  }));

  const edges: CanvasEdge[] = catalog.pipes.map((p) => ({
    fromId: p.fromNodeId,
    toId: p.toNodeId,
  }));

  return { nodes, edges, viewBox: { w: viewBoxW, h: viewBoxH } };
}
