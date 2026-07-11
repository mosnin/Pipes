"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";
import type { GraphNode, GraphPipe } from "@/components/editor/editor_state";
import { usePinchZoom } from "./usePinchZoom";

// MobileSystemCanvas — read-only miniature canvas drawn with pure SVG.
// Pinch to zoom, drag with one finger to pan, tap a node to open the detail
// sheet. No xyflow, no heavy graph library. Mobile Safari has rough edges
// with pointer events, so we use touchend for the tap detection and only fire
// the tap when the touch did not move significantly.

const NODE_WIDTH = 160;
const NODE_HEIGHT = 56;
const NODE_RADIUS = 12;
const TAP_MOVE_THRESHOLD = 8; // px
const TAP_TIME_THRESHOLD = 350; // ms
const PAD = 64; // viewport padding when computing the fit transform
const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

export type MobileSystemCanvasProps = {
  nodes: GraphNode[];
  pipes: GraphPipe[];
  selectedNodeId?: string | null;
  onNodeTap: (nodeId: string) => void;
  onEmptyTap?: () => void;
  // Tells the parent that the canvas can be panned to focus a specific node.
  registerFocus?: (focus: (nodeId: string) => void) => void;
};

type PortMap = Map<string, string>; // portId -> nodeId

function buildPortMap(nodes: GraphNode[]): PortMap {
  const map: PortMap = new Map();
  for (const node of nodes) {
    for (const portId of node.portIds ?? []) {
      map.set(portId, node.id);
    }
  }
  return map;
}

function resolvePipe(
  pipe: GraphPipe,
  ports: PortMap,
  nodesById: Map<string, GraphNode>,
): { from: GraphNode; to: GraphNode } | null {
  const fromId = pipe.fromNodeId ?? ports.get(pipe.fromPortId);
  const toId = pipe.toNodeId ?? ports.get(pipe.toPortId);
  if (!fromId || !toId) return null;
  const from = nodesById.get(fromId);
  const to = nodesById.get(toId);
  if (!from || !to) return null;
  return { from, to };
}

// Pure helper: compute a transform that fits all nodes into the given viewport
// rectangle. Exported for the unit tests so we can verify it without rendering
// the SVG.
export function computeFitTransform(
  nodes: GraphNode[],
  viewport: { width: number; height: number },
  pad: number = PAD,
): { scale: number; translate: { x: number; y: number } } {
  if (nodes.length === 0 || viewport.width <= 0 || viewport.height <= 0) {
    return { scale: 1, translate: { x: 0, y: 0 } };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    const x = n.position.x;
    const y = n.position.y;
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + NODE_WIDTH > maxX) maxX = x + NODE_WIDTH;
    if (y + NODE_HEIGHT > maxY) maxY = y + NODE_HEIGHT;
  }
  const graphWidth = Math.max(maxX - minX, 1);
  const graphHeight = Math.max(maxY - minY, 1);
  const availableWidth = Math.max(viewport.width - pad * 2, 1);
  const availableHeight = Math.max(viewport.height - pad * 2, 1);
  const scale = Math.min(availableWidth / graphWidth, availableHeight / graphHeight, 1.5);
  // Center the graph in the viewport at the computed scale.
  const tx = (viewport.width - graphWidth * scale) / 2 - minX * scale;
  const ty = (viewport.height - graphHeight * scale) / 2 - minY * scale;
  return { scale, translate: { x: tx, y: ty } };
}

export function MobileSystemCanvas({
  nodes,
  pipes,
  selectedNodeId,
  onNodeTap,
  onEmptyTap,
  registerFocus,
}: MobileSystemCanvasProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const { scale, translate, onTouchStart, onTouchMove, onTouchEnd, reset } = usePinchZoom({
    minScale: 0.4,
    maxScale: 3.0,
    initialScale: 1,
    initialTranslate: { x: 0, y: 0 },
  });

  // Measure the SVG container so we can fit the graph on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;
    const measure = (): void => {
      const rect = el.getBoundingClientRect();
      setViewport({ width: rect.width, height: rect.height });
    };
    measure();
    if (typeof ResizeObserver === "function") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Detect prefers-reduced-motion so we can skip transitions on the transform.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = (): void => setReducedMotion(mq.matches);
    update();
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    return undefined;
  }, []);

  // Once the viewport is known and the node set is non-empty, fit the graph.
  // We only do this on the first measurement to respect any user pan/zoom
  // that has happened since.
  const fittedRef = useRef<boolean>(false);
  useEffect(() => {
    if (fittedRef.current) return;
    if (viewport.width === 0 || viewport.height === 0) return;
    if (nodes.length === 0) return;
    const fit = computeFitTransform(nodes, viewport);
    reset({ scale: fit.scale, translate: fit.translate });
    fittedRef.current = true;
  }, [viewport, nodes, reset]);

  // Pan to a specific node — used when the user taps a "Connects to" row in
  // the bottom sheet.
  const focusNode = useCallback(
    (nodeId: string): void => {
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const s = scale;
      const cx = viewport.width / 2 - (node.position.x + NODE_WIDTH / 2) * s;
      const cy = viewport.height / 2 - (node.position.y + NODE_HEIGHT / 2) * s;
      reset({ scale: s, translate: { x: cx, y: cy } });
    },
    [nodes, scale, viewport, reset],
  );

  useEffect(() => {
    if (registerFocus) registerFocus(focusNode);
  }, [registerFocus, focusNode]);

  const nodesById = useMemo(() => new Map(nodes.map((n) => [n.id, n] as const)), [nodes]);
  const portMap = useMemo(() => buildPortMap(nodes), [nodes]);
  const resolvedPipes = useMemo(() => {
    return pipes
      .map((p) => resolvePipe(p, portMap, nodesById))
      .filter((value): value is { from: GraphNode; to: GraphNode } => value !== null);
  }, [pipes, portMap, nodesById]);

  // Tap detection state — recorded on touchstart, checked on touchend.
  const tapStartRef = useRef<{ x: number; y: number; time: number; touches: number } | null>(null);

  const handleSurfaceTouchStart = useCallback(
    (event: ReactTouchEvent<SVGSVGElement>): void => {
      if (event.touches.length === 1) {
        const t = event.touches[0];
        tapStartRef.current = { x: t.clientX, y: t.clientY, time: Date.now(), touches: 1 };
      } else {
        // Multi-touch immediately disqualifies as a tap (it's a pinch).
        tapStartRef.current = null;
      }
      onTouchStart(event);
    },
    [onTouchStart],
  );

  const handleSurfaceTouchMove = useCallback(
    (event: ReactTouchEvent<SVGSVGElement>): void => {
      if (event.touches.length >= 2) {
        tapStartRef.current = null;
      } else if (tapStartRef.current && event.touches.length === 1) {
        const t = event.touches[0];
        const dx = t.clientX - tapStartRef.current.x;
        const dy = t.clientY - tapStartRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > TAP_MOVE_THRESHOLD) {
          tapStartRef.current = null;
        }
      }
      onTouchMove(event);
    },
    [onTouchMove],
  );

  const handleNodeTouchEnd = useCallback(
    (nodeId: string) =>
      (event: ReactTouchEvent<SVGGElement>): void => {
        const start = tapStartRef.current;
        if (start && Date.now() - start.time < TAP_TIME_THRESHOLD) {
          event.stopPropagation();
          onNodeTap(nodeId);
        }
        tapStartRef.current = null;
        onTouchEnd(event);
      },
    [onNodeTap, onTouchEnd],
  );

  const handleSurfaceTouchEnd = useCallback(
    (event: ReactTouchEvent<SVGSVGElement>): void => {
      const start = tapStartRef.current;
      if (start && Date.now() - start.time < TAP_TIME_THRESHOLD && onEmptyTap) {
        onEmptyTap();
      }
      tapStartRef.current = null;
      onTouchEnd(event);
    },
    [onEmptyTap, onTouchEnd],
  );

  // Allow keyboard-driven tap for accessibility (axe / screen readers).
  const handleNodeKeyDown = useCallback(
    (nodeId: string) =>
      (event: React.KeyboardEvent<SVGGElement>): void => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onNodeTap(nodeId);
        }
      },
    [onNodeTap],
  );

  const transform = `translate(${translate.x} ${translate.y}) scale(${scale})`;
  const transition = reducedMotion ? "none" : "transform 120ms ease-out";

  return (
    <div
      ref={containerRef}
      data-testid="mobile-system-canvas"
      className="relative w-full h-full bg-[#FAFAFA] overflow-hidden touch-none select-none"
      style={{ touchAction: "none" }}
    >
      <svg
        role="img"
        aria-label="System canvas"
        width="100%"
        height="100%"
        onTouchStart={handleSurfaceTouchStart}
        onTouchMove={handleSurfaceTouchMove}
        onTouchEnd={handleSurfaceTouchEnd}
      >
        {/* Background dot grid for visual continuity with desktop. */}
        <defs>
          <pattern id="mobile-canvas-grid" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(0,0,0,0.06)" />
          </pattern>
          <marker id="mobile-canvas-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#8E8E93" />
          </marker>
        </defs>
        <rect width="100%" height="100%" fill="url(#mobile-canvas-grid)" />
        <g transform={transform} style={{ transition }}>
          {/* Connections rendered first so nodes render on top. */}
          {resolvedPipes.map(({ from, to }, i) => {
            const x1 = from.position.x + NODE_WIDTH;
            const y1 = from.position.y + NODE_HEIGHT / 2;
            const x2 = to.position.x;
            const y2 = to.position.y + NODE_HEIGHT / 2;
            const mx = (x1 + x2) / 2;
            const d = `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
            return (
              <path
                key={`pipe-${i}`}
                d={d}
                stroke="#8E8E93"
                strokeWidth={1.5}
                fill="none"
                markerEnd="url(#mobile-canvas-arrow)"
              />
            );
          })}
          {nodes.map((node) => {
            const isSelected = node.id === selectedNodeId;
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`Open node ${node.title}`}
                data-node-id={node.id}
                onTouchEnd={handleNodeTouchEnd(node.id)}
                onClick={(e) => {
                  // Click is used by jsdom-based tests and keyboard activation;
                  // touch is preferred on real devices but click stays as a
                  // safe fallback.
                  e.stopPropagation();
                  onNodeTap(node.id);
                }}
                onKeyDown={handleNodeKeyDown(node.id)}
                style={{ cursor: "pointer" }}
              >
                <rect
                  x={node.position.x}
                  y={node.position.y}
                  width={NODE_WIDTH}
                  height={NODE_HEIGHT}
                  rx={NODE_RADIUS}
                  fill="#FFFFFF"
                  stroke={isSelected ? "#4F46E5" : "rgba(0,0,0,0.12)"}
                  strokeWidth={isSelected ? 2 : 1}
                />
                {/* Accent dot signals interactivity. */}
                <circle
                  cx={node.position.x + 12}
                  cy={node.position.y + NODE_HEIGHT / 2}
                  r={3}
                  fill="#4F46E5"
                />
                <text
                  x={node.position.x + 24}
                  y={node.position.y + NODE_HEIGHT / 2 + 4}
                  fontSize={13}
                  fontWeight={600}
                  fill="#111"
                  style={{ pointerEvents: "none" }}
                >
                  {node.title.length > 18 ? `${node.title.slice(0, 17)}...` : node.title}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
