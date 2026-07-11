import type { ReactElement } from "react";

/**
 * EmptyCanvas
 *
 * Hand-authored line illustration for the dashboard empty state. Three
 * connected nodes with a single indigo accent dot on the center node and a
 * faint dashed focus ring around it. Stroke-only, no clip art, no icons.
 */
export type EmptyCanvasProps = {
  size?: number;
  className?: string;
};

export function EmptyCanvas({ size = 120, className }: EmptyCanvasProps): ReactElement {
  const titleId = "illustration-empty-canvas-title";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-labelledby={titleId}
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title id={titleId}>Empty canvas illustration with three connected nodes.</title>
      {/* Dashed focus ring around the center node */}
      <circle
        cx="60"
        cy="60"
        r="44"
        stroke="#4F46E5"
        strokeOpacity="0.3"
        strokeDasharray="2 4"
      />
      {/* Node 1 (top) */}
      <rect x="40" y="14" width="40" height="20" rx="4" />
      {/* Node 2 (center) */}
      <rect x="34" y="50" width="52" height="20" rx="4" />
      {/* Indigo accent dot inside center node */}
      <circle cx="44" cy="60" r="2" fill="#4F46E5" stroke="none" />
      {/* Node 3 (bottom) */}
      <rect x="40" y="86" width="40" height="20" rx="4" />
      {/* Connecting lines */}
      <line x1="60" y1="34" x2="60" y2="50" />
      <line x1="60" y1="70" x2="60" y2="86" />
    </svg>
  );
}
