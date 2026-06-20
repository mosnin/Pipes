"use client";

import { useMemo } from "react";

/**
 * AnimatedCanvas
 *
 * A pure-SVG canvas where nodes appear and edges draw based on a single
 * `progress: number (0..1)` prop. No external state, no animation loops:
 * the parent owns the progress.
 *
 * Nodes appear in `nodes` order, evenly spaced across `nodeStart..nodeEnd`.
 * Edges draw in `pipes` order, evenly spaced across `edgeStart..edgeEnd`.
 * Each node arrival uses a 0.10 progress window; edge draw uses 0.12.
 */

export interface CanvasNode {
  id: string;
  title: string;
  subtitle?: string;
  x: number;
  y: number;
}

export interface CanvasEdge {
  fromId: string;
  toId: string;
}

export interface AnimatedCanvasProps {
  nodes: ReadonlyArray<CanvasNode>;
  edges: ReadonlyArray<CanvasEdge>;
  /** Scroll/animation progress through the canvas, 0..1. */
  progress: number;
  /** Progress at which the first node starts arriving. Default 0. */
  nodeStart?: number;
  /** Progress at which the last node finishes arriving. Default 0.55. */
  nodeEnd?: number;
  /** Progress at which the first edge starts drawing. Default 0.5. */
  edgeStart?: number;
  /** Progress at which the last edge finishes drawing. Default 1. */
  edgeEnd?: number;
  /** SVG viewBox width. Default 1200. */
  width?: number;
  /** SVG viewBox height. Default 400. */
  height?: number;
  /** Node width in viewBox units. */
  nodeWidth?: number;
  /** Node height in viewBox units. */
  nodeHeight?: number;
  /** Accessible label. */
  ariaLabel?: string;
  /** Optional className for the SVG. */
  className?: string;
  /** Hide the grid background. */
  noGrid?: boolean;
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function AnimatedCanvas({
  nodes,
  edges,
  progress,
  nodeStart = 0,
  nodeEnd = 0.55,
  edgeStart = 0.5,
  edgeEnd = 1,
  width = 1200,
  height = 400,
  nodeWidth = 160,
  nodeHeight = 56,
  ariaLabel,
  className,
  noGrid = false,
}: AnimatedCanvasProps) {
  const nodeById = useMemo(() => {
    const map = new Map<string, CanvasNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  // Pre-compute appearance windows for each node and edge.
  const nodeWindows = useMemo(() => {
    if (nodes.length === 0) return [];
    const span = Math.max(0.0001, nodeEnd - nodeStart);
    const step = nodes.length === 1 ? 0 : span / nodes.length;
    return nodes.map((_, i) => {
      const start = nodeStart + step * i;
      return { start, end: start + Math.max(0.08, step) };
    });
  }, [nodes, nodeStart, nodeEnd]);

  const edgeWindows = useMemo(() => {
    if (edges.length === 0) return [];
    const span = Math.max(0.0001, edgeEnd - edgeStart);
    const step = edges.length === 1 ? span : span / edges.length;
    return edges.map((_, i) => {
      const start = edgeStart + step * i;
      return { start, end: start + Math.max(0.1, step) };
    });
  }, [edges, edgeStart, edgeEnd]);

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className={className}
      role="img"
      aria-label={
        ariaLabel ??
        "Looper canvas. Nodes appear and connections draw between them as you scroll."
      }
      data-testid="animated-canvas"
    >
      <defs>
        <pattern
          id="ac-grid"
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <path
            d="M 24 0 L 0 0 0 24"
            fill="none"
            stroke="rgba(0,0,0,0.05)"
            strokeWidth="1"
          />
        </pattern>
      </defs>

      {!noGrid && <rect width={width} height={height} fill="url(#ac-grid)" />}

      {/* Edges. Drawn first so nodes overlap them. */}
      {edges.map((edge, i) => {
        const a = nodeById.get(edge.fromId);
        const b = nodeById.get(edge.toId);
        if (!a || !b) return null;
        const win = edgeWindows[i] ?? { start: 0, end: 1 };
        const localT = clamp01(
          (progress - win.start) / Math.max(0.0001, win.end - win.start),
        );
        const t = easeOut(localT);
        // Both endpoints must be at least visible for the edge to render.
        const nodeVisible = (idx: number): number => {
          const nw = nodeWindows[idx] ?? { start: 0, end: 1 };
          const lt = clamp01(
            (progress - nw.start) / Math.max(0.0001, nw.end - nw.start),
          );
          return easeOut(lt);
        };
        const fromIdx = nodes.findIndex((n) => n.id === edge.fromId);
        const toIdx = nodes.findIndex((n) => n.id === edge.toId);
        const gating = Math.min(nodeVisible(fromIdx), nodeVisible(toIdx));
        if (gating < 0.4) return null;

        const x1 = a.x + nodeWidth;
        const y1 = a.y + nodeHeight / 2;
        const x2 = b.x;
        const y2 = b.y + nodeHeight / 2;
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.4);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        // Approximate path length for dasharray. Curve length ~ chord + 10%.
        const chord = Math.hypot(x2 - x1, y2 - y1);
        const len = chord * 1.1;
        return (
          <g
            key={`${edge.fromId}-${edge.toId}-${i}`}
            data-testid={`edge-${edge.fromId}-${edge.toId}`}
            data-progress={t.toFixed(3)}
          >
            <path
              d={d}
              stroke="#4F46E5"
              strokeWidth={1.75}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={len}
              strokeDashoffset={len * (1 - t)}
              opacity={t > 0 ? 1 : 0}
            />
          </g>
        );
      })}

      {/* Nodes. */}
      {nodes.map((node, i) => {
        const win = nodeWindows[i] ?? { start: 0, end: 1 };
        const localT = clamp01(
          (progress - win.start) / Math.max(0.0001, win.end - win.start),
        );
        const t = easeOut(localT);
        const scale = 0.92 + 0.08 * t;
        const opacity = t;
        const cx = node.x + nodeWidth / 2;
        const cy = node.y + nodeHeight / 2;
        return (
          <g
            key={node.id}
            data-testid={`node-${node.id}`}
            data-progress={t.toFixed(3)}
            opacity={opacity}
            transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}
          >
            <rect
              x={node.x}
              y={node.y}
              width={nodeWidth}
              height={nodeHeight}
              rx={10}
              fill="white"
              stroke="#4F46E5"
              strokeWidth={1.25}
            />
            <circle
              cx={node.x + 14}
              cy={node.y + nodeHeight / 2}
              r={3.5}
              fill="#4F46E5"
            />
            <text
              x={node.x + 26}
              y={node.y + nodeHeight / 2 - 4}
              fontSize={12}
              fontWeight={600}
              fill="#111"
            >
              {node.title}
            </text>
            {node.subtitle ? (
              <text
                x={node.x + 26}
                y={node.y + nodeHeight / 2 + 12}
                fontSize={10}
                fill="#8E8E93"
              >
                {node.subtitle}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
