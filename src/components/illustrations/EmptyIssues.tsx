import type { ReactElement } from "react";

/**
 * EmptyIssues
 *
 * Hand-authored line illustration for the admin issues empty state. A simple
 * geometric checkmark inside a circle. Indigo accent reserved for the
 * checkmark itself.
 */
export type EmptyIssuesProps = {
  size?: number;
  className?: string;
};

export function EmptyIssues({ size = 120, className }: EmptyIssuesProps): ReactElement {
  const titleId = "illustration-empty-issues-title";
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
      <title id={titleId}>Checkmark inside a circle indicating no open issues.</title>
      {/* Outer circle */}
      <circle cx="60" cy="60" r="36" />
      {/* Indigo checkmark */}
      <polyline
        points="44,62 56,74 78,50"
        stroke="#4F46E5"
        strokeWidth="2"
      />
    </svg>
  );
}
