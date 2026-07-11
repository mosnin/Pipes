import type { ReactElement } from "react";

/**
 * EmptyTemplates
 *
 * Hand-authored line illustration for the templates empty state. Three
 * overlapping rounded rectangles suggesting a stack of cards, with a small
 * indigo accent line beneath. Stroke-only, no icons.
 */
export type EmptyTemplatesProps = {
  size?: number;
  className?: string;
};

export function EmptyTemplates({ size = 120, className }: EmptyTemplatesProps): ReactElement {
  const titleId = "illustration-empty-templates-title";
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
      <title id={titleId}>Stack of three template cards.</title>
      {/* Back card */}
      <rect x="30" y="22" width="56" height="46" rx="6" />
      {/* Middle card */}
      <rect x="36" y="32" width="56" height="46" rx="6" fill="#FFFFFF" />
      {/* Front card */}
      <rect x="42" y="42" width="56" height="46" rx="6" fill="#FFFFFF" />
      {/* Two small horizontal lines on the front card */}
      <line x1="50" y1="56" x2="78" y2="56" />
      <line x1="50" y1="64" x2="68" y2="64" />
      {/* Indigo accent line beneath the stack */}
      <line
        x1="44"
        y1="100"
        x2="76"
        y2="100"
        stroke="#4F46E5"
        strokeWidth="2"
      />
    </svg>
  );
}
