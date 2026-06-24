"use client";

// EmbeddedCanvas
//
// A reusable inline canvas that auto-plays a build animation from a starter id.
// Used inside the pricing tier highlight, the compare detail page, and the
// template detail page. Wraps AnimatedCanvas and drives its `progress` from
// the shared playground-replay engine.
//
// Three trigger modes: onView (default), onMount, onClick.
// Optional loop, optional speed multiplier.
//
// prefers-reduced-motion: progress jumps to 1 immediately, no replay.

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import { Play } from "lucide-react";
import {
  AnimatedCanvas,
  type CanvasEdge,
  type CanvasNode,
} from "@/components/marketing/AnimatedCanvas";
import { starterTemplates, type StarterTemplate } from "@/domain/templates/catalog";
import {
  buildSyntheticFrames,
  emptyTickState,
  fixtureKeyForTemplate,
  loadFixture,
  runReplay,
  type ReplayController,
  type ReplayFrame,
  type ReplayTickState,
} from "@/lib/marketing/playground-replay";

export type EmbeddedCanvasAutoplay = "onView" | "onMount" | "onClick";

export interface EmbeddedCanvasProps {
  templateId: string;
  /** When to start the animation. Default "onView". */
  autoplay?: EmbeddedCanvasAutoplay;
  /** Loop forever with a hold between runs. Default false. */
  loop?: boolean;
  /** Playback speed multiplier. 1.0 = fixture default, 2.0 = twice as fast. */
  speed?: number;
  /** Override the AnimatedCanvas viewBox width. */
  width?: number;
  /** Override the AnimatedCanvas viewBox height. */
  height?: number;
  /** Visible aspect ratio class for the wrapper. Default aspect-[16/10]. */
  aspectClassName?: string;
  /** Hide the run button overlay for onClick mode (test-only). */
  hideRunButton?: boolean;
  /** Optional className for the outer wrapper. */
  className?: string;
  /** Called once when a single run completes. */
  onComplete?: (state: ReplayTickState) => void;
  /** Optional aria label override. */
  ariaLabel?: string;
}

interface CanvasGeometry {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewBox: { w: number; h: number };
}

const HOLD_BETWEEN_LOOPS_MS = 1200;

export function EmbeddedCanvas({
  templateId,
  autoplay = "onView",
  loop = false,
  speed = 1,
  width,
  height,
  aspectClassName = "aspect-[16/10]",
  hideRunButton = false,
  className,
  onComplete,
  ariaLabel,
}: EmbeddedCanvasProps) {
  const reduced = useReducedMotion();
  const template = useMemo<StarterTemplate | null>(
    () => starterTemplates.find((t) => t.id === templateId) ?? null,
    [templateId],
  );
  const geometry = useMemo<CanvasGeometry>(
    () => buildGeometry(template, width, height),
    [template, width, height],
  );

  const [tick, setTick] = useState<ReplayTickState>(() => {
    // Reduced-motion: render the final frame immediately.
    const base = emptyTickState();
    return reduced ? { ...base, progress: 1, done: true } : base;
  });
  const [hasUserStarted, setHasUserStarted] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<ReplayController | null>(null);
  const loopTimerRef = useRef<number | null>(null);
  const isMountedRef = useRef<boolean>(false);
  // Self-reference holder so the loop scheduler can restart without forming
  // a forward declaration of `start` (which the linter flags).
  const startRef = useRef<() => Promise<void>>(async () => {});

  // -- the run -----------------------------------------------------------

  const start = useCallback(async () => {
    if (reduced) {
      const finished: ReplayTickState = {
        progress: 1,
        nodeIds: template ? template.nodes.map((n) => n.id) : [],
        pipeKeys: template
          ? template.pipes.map((p) => `${p.fromNodeId}->${p.toNodeId}`)
          : [],
        status: undefined,
        done: true,
        elapsedMs: 0,
      };
      setTick(finished);
      onComplete?.(finished);
      return;
    }
    if (!template) return;

    // Tear down any prior run.
    controllerRef.current?.cancel();
    if (loopTimerRef.current !== null) {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }

    setTick(emptyTickState());

    const fixtureKey = fixtureKeyForTemplate(template.id);
    let frames: ReplayFrame[] | null = fixtureKey
      ? await loadFixture(fixtureKey)
      : null;
    if (!frames) frames = buildSyntheticFrames(template);

    if (!isMountedRef.current) return;

    controllerRef.current = runReplay({
      frames,
      speed,
      onTick: (state) => {
        if (!isMountedRef.current) return;
        setTick(state);
        if (state.done) {
          onComplete?.(state);
          if (loop) {
            loopTimerRef.current = window.setTimeout(() => {
              loopTimerRef.current = null;
              void startRef.current();
            }, HOLD_BETWEEN_LOOPS_MS);
          }
        }
      },
    });
  }, [loop, onComplete, reduced, speed, template]);

  // Keep the ref pointing at the latest `start` so the loop restarter can
  // call it without referencing `start` ahead of its declaration.
  useEffect(() => {
    startRef.current = start;
  }, [start]);

  // -- lifecycle ---------------------------------------------------------

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.cancel();
      if (loopTimerRef.current !== null) {
        window.clearTimeout(loopTimerRef.current);
      }
    };
  }, []);

  // onMount: fire start once after mount.
  useEffect(() => {
    if (autoplay !== "onMount") return;
    void start();
  }, [autoplay, start]);

  // onView: IntersectionObserver, runs once when 30% visible.
  useEffect(() => {
    if (autoplay !== "onView") return;
    const el = containerRef.current;
    if (!el) return;
    let started = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            void start();
            observer.disconnect();
          }
        }
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [autoplay, start]);

  // onClick handler
  const handleRun = useCallback(() => {
    setHasUserStarted(true);
    void start();
  }, [start]);

  const showRunOverlay =
    autoplay === "onClick" && !hasUserStarted && !hideRunButton && !reduced;

  // Show a tiny status row only while the build is running.
  const statusLabel = tick.status && !tick.done ? tick.status : null;

  return (
    <div
      ref={containerRef}
      className={["relative w-full overflow-hidden", className ?? ""].join(" ")}
      data-testid="embedded-canvas"
      data-template-id={templateId}
      data-progress={tick.progress.toFixed(3)}
      data-done={tick.done ? "1" : "0"}
    >
      <div className={aspectClassName}>
        {geometry.nodes.length > 0 ? (
          <AnimatedCanvas
            nodes={geometry.nodes}
            edges={geometry.edges}
            progress={tick.progress}
            width={geometry.viewBox.w}
            height={geometry.viewBox.h}
            nodeWidth={140}
            nodeHeight={44}
            ariaLabel={ariaLabel ?? `${template?.title ?? templateId} build animation`}
            className="h-full w-full"
            noGrid
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="t-caption text-[#C7C7CC] font-mono">
              Preview unavailable
            </span>
          </div>
        )}
      </div>

      {statusLabel ? (
        <div
          className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 t-micro text-[#3C3C43] shadow-sm-token"
          data-testid="embedded-canvas-status"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse" />
          {statusLabel}
        </div>
      ) : null}

      {showRunOverlay ? (
        <button
          type="button"
          onClick={handleRun}
          data-testid="embedded-canvas-run"
          className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-sm transition-colors hover:bg-white/85"
          aria-label="Run this starter"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-[#111] text-white px-4 py-2 t-label font-semibold shadow-md">
            <Play size={14} aria-hidden="true" />
            Run this starter
          </span>
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry — same layout strategy as TemplateDetailHero, kept local so
// EmbeddedCanvas stands alone.
// ---------------------------------------------------------------------------

function buildGeometry(
  template: StarterTemplate | null,
  widthOverride: number | undefined,
  heightOverride: number | undefined,
): CanvasGeometry {
  const viewBoxW = widthOverride ?? 1200;
  const viewBoxH = heightOverride ?? 500;
  if (!template || template.nodes.length === 0) {
    return { nodes: [], edges: [], viewBox: { w: viewBoxW, h: viewBoxH } };
  }
  const xs = template.nodes.map((n) => n.x);
  const ys = template.nodes.map((n) => n.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs) + 160;
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys) + 56;
  const sourceW = Math.max(1, maxX - minX);
  const sourceH = Math.max(1, maxY - minY);

  const padX = 60;
  const padY = 60;
  const targetW = viewBoxW - padX * 2;
  const targetH = viewBoxH - padY * 2;
  const scaleX = targetW / sourceW;
  const scaleY = targetH / sourceH;

  const nodes: CanvasNode[] = template.nodes.map((n) => ({
    id: n.id,
    title: n.title,
    x: padX + (n.x - minX) * scaleX,
    y: padY + (n.y - minY) * scaleY,
  }));
  const edges: CanvasEdge[] = template.pipes.map((p) => ({
    fromId: p.fromNodeId,
    toId: p.toNodeId,
  }));
  return { nodes, edges, viewBox: { w: viewBoxW, h: viewBoxH } };
}
