"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SignalRole } from "@/components/ledger/status";
import { cn, NO_VALUE } from "@/lib/utils";

/**
 * `neutral-mono` is the DEFAULT and the common case: progress is a quantity,
 * not a status. A signal role is legal only when the meter encodes a THRESHOLD
 * — key lifetime remaining, quota consumed, freshness against cadence (§4.6.7).
 * Document completeness and upload progress fill monochrome.
 */
export type MeterRole = SignalRole | "neutral-mono";

export interface MeterProps {
  value: number;
  /** Defaults to 100, i.e. `value` is read as a percentage. */
  max?: number;
  role?: MeterRole;
  /** `sm` 4px · `md` 6px (§9.22). */
  size?: "sm" | "md";
  label?: ReactNode;
  /** The accessible name when no visible label is drawn, or the label is not plain text. */
  ariaLabel?: string;
  /** Overrides the derived percentage readout — `12 / 23`, `4d left`. */
  readout?: ReactNode;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — Meter (§9.22).
 *
 * Linear, never a donut or a radial. Track `--track` — a fill rather than a
 * surface rung, so it is legal on every ground (§2.1).
 *
 * States, all of them designed rather than discovered:
 *   zero            an empty track with a 2px stub at the left end and a `0`
 *                   readout. Visibly present-and-zero, never a 1px sliver and
 *                   never absent.
 *   no denominator  the track fills with `--line-hairline` and the readout is an
 *                   em dash. There is no fill, because there is no fraction.
 *   over 100%       the fill clamps and a 2px `--critical-mark` cap appears at
 *                   the right end.
 *   complete        a monochrome progress meter takes `--positive-text` on its
 *                   readout, because for a completeness quantity arriving at the
 *                   denominator IS the good outcome.
 *
 * The fill animates its width once on mount and again on every value change; the
 * NUMBER never animates (§7.4). A counting readout makes a reading instrument
 * lie for the length of the animation.
 */
export function Meter({
  value,
  max = 100,
  role = "neutral-mono",
  size = "md",
  label,
  ariaLabel,
  readout,
  className,
}: MeterProps): ReactNode {
  const hasDenominator = Number.isFinite(max) && max > 0;
  const amount = Number.isFinite(value) ? value : 0;
  const ratio = hasDenominator ? amount / max : 0;
  const percent = Math.min(100, Math.max(0, ratio * 100));
  const zero = hasDenominator && amount <= 0;
  const over = hasDenominator && ratio > 1;
  const complete = hasDenominator && ratio >= 1;

  // The mount transition needs a frame at zero width to travel from; without it
  // the fill would paint at its final width and the `width` transition would
  // have nothing to interpolate. So zero is the fill's RESTING width, carried by
  // a class, and the reading is written onto the node after the commit that
  // paints it: an inline width outranks the class, React never owns the
  // property and so never resets it, and the frame at zero costs no re-render.
  // Under reduced motion globals.css clamps the duration, so it simply lands
  // (§7.5).
  const fillRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const node = fillRef.current;
    if (node) node.style.width = `${percent}%`;
  });

  const readoutNode =
    readout !== undefined && readout !== null
      ? readout
      : !hasDenominator
        ? NO_VALUE
        : zero
          ? "0"
          : `${Math.round(percent)}%`;

  const readoutTone =
    !hasDenominator || zero
      ? "text-ink-3"
      : role !== "neutral-mono"
        ? BAND_INK[role]
        : complete
          ? "text-positive-text"
          : "text-ink";

  // A bare meter draws no label row, but the zero and no-denominator states
  // always do: their whole point is a readout that says the quantity exists and
  // is nothing.
  const showLabelRow =
    label !== undefined || readout !== undefined || zero || !hasDenominator;

  return (
    <div className={cn("w-full", className)}>
      {showLabelRow ? (
        <div className="mb-2 flex items-baseline justify-between gap-4">
          <span className="t-label-caps min-w-0 truncate text-ink-3">
            {label}
          </span>
          <span className={cn("t-metric-md shrink-0 tabular", readoutTone)}>
            {readoutNode}
          </span>
        </div>
      ) : null}

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={hasDenominator ? max : undefined}
        aria-valuenow={hasDenominator ? amount : undefined}
        aria-label={
          ariaLabel ?? (typeof label === "string" ? label : undefined)
        }
        className={cn(
          "relative w-full overflow-hidden rounded-full",
          HEIGHT[size],
          hasDenominator ? "bg-track" : "bg-hairline",
        )}
      >
        {hasDenominator && !zero ? (
          <div
            ref={fillRef}
            className={cn(
              "absolute inset-y-0 left-0 w-[0%] rounded-full",
              "transition-[width] duration-[var(--dur-3)] ease-[var(--ease-out)]",
              FILL[role],
            )}
          />
        ) : null}

        {zero ? (
          // The stub is `--line-strong` rather than `--line-hairline`: hairline
          // and track are four values apart in light mode, which would make the
          // "visibly present-and-zero" mark invisible in exactly the state it
          // exists to render. It is still one of the three weights, and §2.5
          // gives threshold ticks to `--line-strong`.
          <span className="absolute inset-y-0 left-0 w-[2px] rounded-full bg-strong" />
        ) : null}

        {over ? (
          <span className="absolute inset-y-0 right-0 w-[2px] rounded-full bg-critical" />
        ) : null}
      </div>
    </div>
  );
}

export interface MeterSegment {
  count: number;
  role: MeterRole;
}

export interface SegmentMeterProps {
  /** Ordered; the counts that do not add up to `total` render as untouched. */
  segments: MeterSegment[];
  total: number;
  className?: string;
}

/**
 * The coverage instrument (§9.22 segmented variant) — the registry's three-state
 * reading: essential-and-committed, committed, untouched.
 *
 * It has to stay legible across the real cardinalities, which run from six
 * departments to twenty-three document kinds, so it changes construction rather
 * than just shrinking:
 *
 *   ≤ 10 cells   discrete segments at 4px gaps. Each cell is one countable
 *                thing, and you can count them.
 *   > 10 cells   proportional bands inside one continuous track, separated by
 *                1px `--surface-raised` notches. Past ten, discrete cells turn
 *                into a comb and the eye stops reading a quantity.
 *
 * Zero-data rendering: with no denominator the bar draws at `--line-hairline`
 * with no fill — the instrument is present and reads nothing, which is not the
 * same as reading zero. With a denominator and no coverage, every cell sits at
 * `--track`: that IS zero, and it is legible as zero.
 */
export function SegmentMeter({
  segments,
  total,
  className,
}: SegmentMeterProps): ReactNode {
  const size = Number.isFinite(total) ? Math.max(0, Math.trunc(total)) : 0;

  const counted = segments.map((segment) => ({
    role: segment.role,
    count: Number.isFinite(segment.count)
      ? Math.max(0, Math.trunc(segment.count))
      : 0,
  }));
  const filled = Math.min(
    size,
    counted.reduce((sum, segment) => sum + segment.count, 0),
  );
  const label = `${filled} of ${size} covered`;

  if (size === 0) {
    return (
      <div
        role="img"
        aria-label="no coverage data"
        className={cn("h-[6px] w-full rounded-full bg-hairline", className)}
      />
    );
  }

  if (size <= DISCRETE_MAX) {
    // Walk the segments into one cell per unit; anything left over is untouched.
    const cells: (MeterRole | null)[] = [];
    for (const segment of counted) {
      for (let i = 0; i < segment.count && cells.length < size; i += 1) {
        cells.push(segment.role);
      }
    }
    while (cells.length < size) cells.push(null);

    return (
      <div
        role="img"
        aria-label={label}
        className={cn("flex w-full items-center gap-1", className)}
      >
        {cells.map((cellRole, index) => (
          <span
            key={index}
            className={cn(
              "h-[6px] flex-1 rounded-2",
              cellRole ? FILL[cellRole] : "bg-track",
            )}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "flex h-[6px] w-full overflow-hidden rounded-full bg-track",
        // The notch at each band boundary, per §9.22. It is drawn on the leading
        // edge of every band after the first, so the run of track at the end of
        // the bar is never fenced off from the untouched remainder it is part of.
        "[&>*+*]:border-l [&>*+*]:border-raised",
        className,
      )}
    >
      {counted.map((segment, index) =>
        segment.count > 0 ? (
          <span
            key={index}
            className={FILL[segment.role]}
            style={{
              width: `${(Math.min(segment.count, size) / size) * 100}%`,
            }}
          />
        ) : null,
      )}
    </div>
  );
}

/** Past ten cells a discrete meter reads as a comb rather than a quantity. */
const DISCRETE_MAX = 10;

const HEIGHT: Record<"sm" | "md", string> = {
  sm: "h-[4px]",
  md: "h-[6px]",
};

/** Monochrome for a quantity; the role MARK — the graphical value — for a band. */
const FILL: Record<MeterRole, string> = {
  "neutral-mono": "bg-ink",
  positive: "bg-positive",
  caution: "bg-caution",
  critical: "bg-critical",
  agent: "bg-agent",
  info: "bg-info",
  neutral: "bg-neutral",
};

/** The readout takes the band's AA-legible ink, never the mark. */
const BAND_INK: Record<SignalRole, string> = {
  positive: "text-positive-text",
  caution: "text-caution-text",
  critical: "text-critical-text",
  agent: "text-agent-text",
  info: "text-info-text",
  neutral: "text-ink-3",
};
