import type { ReactElement } from "react";

/**
 * NotFound404
 *
 * Hand-authored line illustration for the 404 page. Two small rounded-rectangle
 * "nodes" each labeled "4" sit on either end of a horizontal pipe with a gap
 * in the middle. The gap is the broken pipe. Indigo accent reserved for the
 * two short dashes that mark the break.
 */
export type NotFound404Props = {
  size?: number;
  className?: string;
};

export function NotFound404({ size = 120, className }: NotFound404Props): ReactElement {
  const titleId = "illustration-not-found-title";
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
      <title id={titleId}>Broken pipe illustration for not found.</title>
      {/* Left node */}
      <rect x="12" y="48" width="32" height="24" rx="4" />
      <text
        x="28"
        y="65"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        4
      </text>
      {/* Right node */}
      <rect x="76" y="48" width="32" height="24" rx="4" />
      <text
        x="92"
        y="65"
        textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="12"
        fontWeight="600"
        fill="currentColor"
        stroke="none"
      >
        4
      </text>
      {/* Pipe segment from left node toward the gap */}
      <line x1="44" y1="60" x2="54" y2="60" />
      {/* Pipe segment from gap to right node */}
      <line x1="66" y1="60" x2="76" y2="60" />
      {/* Indigo break marks at the gap */}
      <line x1="55" y1="55" x2="58" y2="65" stroke="#4F46E5" />
      <line x1="62" y1="55" x2="65" y2="65" stroke="#4F46E5" />
    </svg>
  );
}
