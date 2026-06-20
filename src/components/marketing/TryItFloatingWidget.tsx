"use client";

// TryItFloatingWidget
//
// Subtle bottom-right pill that opens a slim playground in a Dialog. Apple-tier,
// not Intercom-tier: a 48px circle at rest, a gentle pulse on the first page
// only, and a tooltip that says "Try it" in plain caption text. No emoji, no
// celebratory copy. The product itself is the pitch.
//
// LocalStorage:
//   pipes-try-it-collapsed-seen  -> "1" after first interaction or dismissal.
//                                    On subsequent pages the widget collapses
//                                    to 40px and skips the pulse.

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { Dialog } from "@/components/ui";
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

const SEEN_KEY = "pipes-try-it-collapsed-seen";

// The three starters in the slim playground match the /play page chips.
interface SlimStarter {
  key: string;
  label: string;
  templateId: string;
}

const SLIM_STARTERS: ReadonlyArray<SlimStarter> = [
  {
    key: "customer-support",
    label: "Customer support triage",
    templateId: "customer-support-triage",
  },
  {
    key: "code-review",
    label: "Code review",
    templateId: "code-review-assistant",
  },
  {
    key: "lead-qualifier",
    label: "Lead qualifier",
    templateId: "sales-lead-qualifier",
  },
];

export function TryItFloatingWidget() {
  const reduced = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [seenBefore, setSeenBefore] = useState<boolean>(false);
  const [hovered, setHovered] = useState(false);

  // Read the "seen before" flag once on mount. Default to true on the server
  // so the initial render matches; refine after mount.
  useEffect(() => {
    try {
      const seen = window.localStorage.getItem(SEEN_KEY) === "1";
      setSeenBefore(seen);
    } catch {
      // localStorage may be unavailable; treat as not seen.
      setSeenBefore(false);
    }
  }, []);

  const markSeen = useCallback(() => {
    setSeenBefore(true);
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // ignore
    }
  }, []);

  const handleOpen = useCallback(() => {
    markSeen();
    setOpen(true);
  }, [markSeen]);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  // Size shrinks once user has interacted on a previous page.
  const collapsedSize = seenBefore ? 40 : 48;
  const shouldPulse = !seenBefore && !reduced;

  return (
    <>
      {/* Collapsed pill — fixed bottom-right */}
      <div
        className="fixed bottom-6 right-6 z-40 pointer-events-none"
        data-testid="try-it-floating-root"
      >
        <div className="relative inline-flex items-center pointer-events-auto">
          {/* Tooltip on hover — sits to the left */}
          {hovered ? (
            <span
              role="tooltip"
              className="absolute right-full mr-3 whitespace-nowrap rounded-md bg-white text-[#111] t-caption px-2.5 py-1 shadow-sm-token border border-black/[0.06]"
              data-testid="try-it-tooltip"
            >
              Try it
            </span>
          ) : null}

          <motion.button
            type="button"
            onClick={handleOpen}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onFocus={() => setHovered(true)}
            onBlur={() => setHovered(false)}
            aria-label="Try Looper in a slim playground"
            data-testid="try-it-trigger"
            data-seen={seenBefore ? "1" : "0"}
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg-token outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
            style={{ width: collapsedSize, height: collapsedSize }}
            initial={false}
            animate={
              shouldPulse
                ? { scale: [1, 1.04, 1] }
                : { scale: 1 }
            }
            transition={
              shouldPulse
                ? {
                    duration: 1.6,
                    repeat: Infinity,
                    repeatDelay: 1.4,
                    ease: "easeInOut",
                  }
                : { duration: 0 }
            }
            whileHover={reduced ? undefined : { scale: 1.08 }}
          >
            <TryItGlyph />
          </motion.button>
        </div>
      </div>

      {/* Expanded slim playground */}
      <Dialog
        open={open}
        onOpenChange={(next) => (next ? handleOpen() : handleClose())}
        title="Describe a system in one sentence"
        description="Pick a starter. Looper draws it on the canvas in seconds."
        size="lg"
      >
        <SlimPlayground onClose={handleClose} />
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// The 10x10 glyph — three nodes wired left to right
// ---------------------------------------------------------------------------

function TryItGlyph() {
  return (
    <svg
      viewBox="0 0 10 10"
      width="18"
      height="18"
      aria-hidden="true"
      fill="none"
    >
      <line x1="2.5" y1="5" x2="5" y2="5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
      <line x1="5" y1="5" x2="7.5" y2="5" stroke="currentColor" strokeWidth="0.6" strokeLinecap="round" />
      <circle cx="2" cy="5" r="1.1" fill="currentColor" />
      <circle cx="5" cy="5" r="1.1" fill="currentColor" />
      <circle cx="8" cy="5" r="1.1" fill="currentColor" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The slim playground — input row, three chips, embedded canvas
// ---------------------------------------------------------------------------

interface SlimPlaygroundProps {
  onClose: () => void;
}

function SlimPlayground({ onClose }: SlimPlaygroundProps) {
  const reduced = useReducedMotion();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [tick, setTick] = useState<ReplayTickState>(() => emptyTickState());
  const controllerRef = useRef<ReplayController | null>(null);
  const isMountedRef = useRef<boolean>(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      controllerRef.current?.cancel();
    };
  }, []);

  const activeStarter = useMemo<SlimStarter | null>(
    () => SLIM_STARTERS.find((s) => s.key === activeKey) ?? null,
    [activeKey],
  );
  const activeTemplate = useMemo<StarterTemplate | null>(
    () =>
      activeStarter
        ? starterTemplates.find((t) => t.id === activeStarter.templateId) ?? null
        : null,
    [activeStarter],
  );

  const geometry = useMemo(() => buildSlimGeometry(activeTemplate), [activeTemplate]);

  const runStarter = useCallback(
    async (starter: SlimStarter) => {
      controllerRef.current?.cancel();
      setActiveKey(starter.key);
      setTick(emptyTickState());

      const template = starterTemplates.find((t) => t.id === starter.templateId);
      if (!template) return;

      if (reduced) {
        setTick({
          progress: 1,
          nodeIds: template.nodes.map((n) => n.id),
          pipeKeys: template.pipes.map((p) => `${p.fromNodeId}->${p.toNodeId}`),
          status: undefined,
          done: true,
          elapsedMs: 0,
        });
        return;
      }

      const fixtureKey = fixtureKeyForTemplate(template.id);
      let frames: ReplayFrame[] | null = fixtureKey
        ? await loadFixture(fixtureKey)
        : null;
      if (!frames) frames = buildSyntheticFrames(template);

      if (!isMountedRef.current) return;

      controllerRef.current = runReplay({
        frames,
        onTick: (state) => {
          if (!isMountedRef.current) return;
          setTick(state);
        },
      });
    },
    [reduced],
  );

  const reset = useCallback(() => {
    controllerRef.current?.cancel();
    setActiveKey(null);
    setTick(emptyTickState());
  }, []);

  const isRunning = activeStarter !== null && !tick.done;
  const isDone = activeStarter !== null && tick.done;

  return (
    <div className="flex flex-col gap-4" data-testid="try-it-slim-playground">
      {/* Close affordance — duplicates Esc/backdrop close so the X is visible */}
      <div className="flex items-center justify-end -mt-1">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          data-testid="try-it-close"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#3C3C43] hover:bg-black/[0.04]"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Read-only prompt input */}
      <div className="flex items-center gap-2 rounded-xl border border-black/[0.08] bg-white px-3 h-11">
        <span className="t-caption text-[#8E8E93] shrink-0">Prompt</span>
        <input
          type="text"
          readOnly
          value={activeStarter?.label ?? ""}
          placeholder="Describe a system in one sentence..."
          aria-label="Slim playground prompt"
          className="flex-1 bg-transparent outline-none border-0 t-label text-[#111] placeholder:text-[#8E8E93]"
        />
      </div>

      {/* Three starter chips */}
      <div
        className="flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Starter prompts"
      >
        {SLIM_STARTERS.map((s) => {
          const isActive = activeStarter?.key === s.key;
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => void runStarter(s)}
              disabled={isRunning && !isActive}
              data-testid={`try-it-chip-${s.key}`}
              className={[
                "inline-flex items-center rounded-full px-3.5 h-8 t-caption font-medium border transition-colors",
                isActive
                  ? "bg-indigo-600 border-indigo-600 text-white"
                  : "bg-white border-black/[0.08] text-[#3C3C43] hover:border-black/[0.16] hover:text-[#111]",
                isRunning && !isActive ? "opacity-50 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {/* Canvas area */}
      <div
        className="relative rounded-2xl border border-black/[0.06] bg-[#FAFAFA] overflow-hidden"
        data-testid="try-it-canvas-wrap"
      >
        <div className="aspect-[16/10] w-full">
          {geometry.nodes.length > 0 ? (
            <AnimatedCanvas
              nodes={geometry.nodes}
              edges={geometry.edges}
              progress={tick.progress}
              width={geometry.viewBox.w}
              height={geometry.viewBox.h}
              nodeWidth={140}
              nodeHeight={44}
              ariaLabel="Slim playground canvas"
              className="h-full w-full"
              noGrid
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-center px-6">
              <p className="t-label text-[#8E8E93]">
                Pick a starter. The canvas comes alive in under three seconds.
              </p>
            </div>
          )}
        </div>
        {tick.status && !tick.done ? (
          <div className="pointer-events-none absolute bottom-2 left-2 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2 py-0.5 t-micro text-[#3C3C43] shadow-sm-token">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            {tick.status}
          </div>
        ) : null}
      </div>

      {/* After-build row */}
      {isDone ? (
        <div className="flex items-center justify-between gap-3" data-testid="try-it-after-build">
          <Link
            href="/signup?source=floating_try_it"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-md bg-[#111] px-3 h-9 t-label font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Sign up to keep this
            <ArrowRight size={12} aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={reset}
            data-testid="try-it-reset"
            className="inline-flex items-center rounded-md border border-black/[0.08] bg-white px-3 h-9 t-label font-medium text-[#3C3C43] hover:border-black/[0.16] hover:text-[#111]"
          >
            Try another
          </button>
        </div>
      ) : (
        <p className="t-caption text-[#8E8E93]">
          Read-only preview. Sign up to keep your work.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Geometry helper — slim version sized for the 760px dialog
// ---------------------------------------------------------------------------

function buildSlimGeometry(
  template: StarterTemplate | null,
): { nodes: CanvasNode[]; edges: CanvasEdge[]; viewBox: { w: number; h: number } } {
  const viewBoxW = 1100;
  const viewBoxH = 500;
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

  const padX = 50;
  const padY = 50;
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
