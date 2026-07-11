// Wordmark — the single source of truth for the "Pipes" brand mark.
//
// "Pipes" carries its own accent: the dot of the "i". We paint just the "i"
// in the violet accent so the tittle reads as a signal flowing through the
// pipe — the whole brand idea in one glyph. No overlays, no per-font tuning;
// it scales to any size and stays crisp in light and dark.
//
// Accessibility: the full word renders as real text, so screen readers and
// crawlers see "Pipes" unchanged.

import type { CSSProperties } from "react";

export type WordmarkSize = "sm" | "md" | "lg";

const FONT_SIZE: Record<WordmarkSize, string> = {
  sm: "17px",
  md: "20px",
  lg: "24px",
};

export type WordmarkProps = {
  size?: WordmarkSize;
  /** Wordmark color (defaults to primary ink). */
  color?: string;
  /** Accent color for the "i" (defaults to violet-600). */
  accent?: string;
  className?: string;
};

export function Wordmark({
  size = "md",
  color = "var(--color-ink-1)",
  accent = "#7C3AED",
  className,
}: WordmarkProps) {
  const root: CSSProperties = {
    display: "inline-block",
    fontWeight: 700,
    letterSpacing: "-0.045em",
    fontSize: FONT_SIZE[size],
    lineHeight: 1,
    color,
  };

  return (
    <span className={className} style={root} data-testid="wordmark">
      P<span style={{ color: accent }}>i</span>pes
    </span>
  );
}
