"use client";

// Wordmark — the single source of truth for the "Looper" brand mark.
//
// Renders "Looper" with a typographic accent: the second "o" carries a small
// indigo dot above it, evoking the loop metaphor. Implemented as an HTML
// overlay. A short white sliver hides the native counter of the "o" glyph;
// the indigo circle is then painted on top.
//
// Three sizes are supported:
//   - sm — used in the app sidebar
//   - md — default
//   - lg — used in the marketing navbar + footer
//
// Accessibility: the full word "Looper" is rendered as real text, so screen
// readers and SEO crawlers see it unchanged. The dot overlay carries
// aria-hidden so AT does not double-announce it.

import type { CSSProperties } from "react";

export type WordmarkSize = "sm" | "md" | "lg";

type Config = {
  fontSize: string;
  // Vertical position of the indigo dot from the wordmark baseline (px).
  dotTop: number;
  // Horizontal center of the indigo dot, measured from the wordmark left
  // edge as a multiple of fontSize. Tuned to sit over the second "o".
  dotLeftRatio: number;
  // Diameter of the indigo dot (px).
  dotSize: number;
  // Width of the white sliver that hides the glyph counter (px).
  hideWidth: number;
  // Height of the white sliver that hides the glyph counter (px).
  hideHeight: number;
};

const CONFIGS: Record<WordmarkSize, Config> = {
  sm: { fontSize: "17px", dotTop: 2, dotLeftRatio: 0.55, dotSize: 4, hideWidth: 5, hideHeight: 4 },
  md: { fontSize: "20px", dotTop: 2, dotLeftRatio: 0.55, dotSize: 5, hideWidth: 6, hideHeight: 5 },
  lg: { fontSize: "24px", dotTop: 2, dotLeftRatio: 0.55, dotSize: 6, hideWidth: 7, hideHeight: 6 },
};

export type WordmarkProps = {
  size?: WordmarkSize;
  // Optional override for the wordmark color (defaults to #111).
  color?: string;
  // Optional override for the indigo accent color (defaults to indigo-600).
  accent?: string;
  // Optional background color of the "dot cover" sliver. Defaults to white.
  // Pass the surface color when used over a non-white background.
  cover?: string;
  className?: string;
};

export function Wordmark({
  size = "md",
  color = "#111",
  accent = "#7C3AED",
  cover = "#FFFFFF",
  className,
}: WordmarkProps) {
  const config = CONFIGS[size];

  const root: CSSProperties = {
    position: "relative",
    display: "inline-block",
    fontWeight: 700,
    letterSpacing: "-0.04em",
    fontSize: config.fontSize,
    lineHeight: 1,
    color,
  };

  const cover_style: CSSProperties = {
    position: "absolute",
    left: `${config.dotLeftRatio}em`,
    top: `${config.dotTop - 1}px`,
    width: `${config.hideWidth}px`,
    height: `${config.hideHeight}px`,
    backgroundColor: cover,
    transform: "translateX(-50%)",
    pointerEvents: "none",
  };

  const dot: CSSProperties = {
    position: "absolute",
    left: `${config.dotLeftRatio}em`,
    top: `${config.dotTop}px`,
    width: `${config.dotSize}px`,
    height: `${config.dotSize}px`,
    borderRadius: "9999px",
    backgroundColor: accent,
    transform: "translateX(-50%)",
    pointerEvents: "none",
  };

  return (
    <span className={className} style={root} data-testid="wordmark">
      Looper
      <span aria-hidden="true" style={cover_style} data-testid="wordmark-cover" />
      <span aria-hidden="true" style={dot} data-testid="wordmark-dot" />
    </span>
  );
}
