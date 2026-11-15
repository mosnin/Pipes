import type { LucideIcon } from "@/components/ui/icon";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn, NO_VALUE } from "@/lib/utils";

/**
 * LEDGER INSTRUMENT — StatStrip (§9.7). The signature component.
 *
 * ONE raised container whose cells are divided by 1px rules — never four
 * separately-shadowed boxes with gaps between them (§5.7). The cells are not
 * addressable objects; the STRIP is. That is the whole reason the rules live
 * here on the container rather than on the cell: the divider belongs to the
 * thing being divided.
 *
 * Each cell can draw two rules and starts with neither:
 *   `::before` — the VERTICAL rule on its left edge, inset 16px top and bottom
 *                so it never touches the container's edge.
 *   `::after`  — the HORIZONTAL seam on its top edge, full bleed, which is what
 *                the vertical rule becomes when the strip wraps.
 *
 * Which of the two is showing is decided per breakpoint, from the container, by
 * position — 1-up below 720, 2×2 to 1200, 4-up above. The gaps never come back.
 * Overrides sit in later media blocks at equal selector specificity, so the
 * cascade resolves them by source order rather than by a specificity accident.
 *
 * Zero-data rendering: the strip always draws. A blank gauge is information, so
 * a strip whose cells are all empty renders at full geometry with `—` values
 * (§11.2) — it never collapses, and it never hides.
 */
export interface StatStripProps extends ComponentProps<"div"> {
  /**
   * A full-bleed section rather than a bordered object: the reference's stats
   * row sits between the page's own dividers with no box of its own.
   */
  flush?: boolean;
}

export function StatStrip({
  className,
  flush = false,
  children,
  ...props
}: StatStripProps): ReactNode {
  return (
    <div
      className={cn(
        STRIP,
        !flush && "rounded-12 border border-border",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

const STRIP = cn(
  "grid grid-cols-1 min-[720px]:grid-cols-2 min-[1200px]:grid-cols-4",
  "overflow-hidden bg-raised",
  // Every cell is the positioning context for its own two rules.
  "[&>*]:relative",
  "[&>*]:before:pointer-events-none [&>*]:before:absolute [&>*]:before:left-0 [&>*]:before:inset-y-0 [&>*]:before:hidden [&>*]:before:w-px [&>*]:before:bg-border [&>*]:before:content-['']",
  "[&>*]:after:pointer-events-none [&>*]:after:absolute [&>*]:after:inset-x-0 [&>*]:after:top-0 [&>*]:after:hidden [&>*]:after:h-px [&>*]:after:bg-border [&>*]:after:content-['']",
  // 1-up — every cell after the first is separated by the horizontal seam.
  "[&>*:not(:first-child)]:after:block",
  // 2×2 — cell 2 joins row 1, so it drops its seam and takes a vertical rule;
  // everything from cell 3 on keeps the seam it already has.
  "min-[720px]:[&>*:nth-child(2)]:after:hidden",
  "min-[720px]:[&>*:nth-child(even)]:before:block",
  // 4-up — cells 3 and 4 join row 1 too; the vertical rule now runs everywhere
  // except the first cell of each row of four.
  "min-[1200px]:[&>*:nth-child(3)]:after:hidden",
  "min-[1200px]:[&>*:nth-child(4)]:after:hidden",
  "min-[1200px]:[&>*:not(:nth-child(4n+1))]:before:block",
);

export interface StatCellDelta {
  /**
   * The period-over-period change as a PERCENTAGE: `12.4` renders `▲ 12.4%`.
   * `suffix` carries the period it is measured against, not the unit.
   */
  value: number;
  suffix?: string;
  polarity?: "up-good" | "down-good";
}

export interface StatCellProps {
  label: string;
  /**
   * A number abbreviates and gets its exact figure in a title (see `Delta`'s
   * sibling note below). `null`/`undefined` is the designed empty: `—`.
   */
  value: ReactNode;
  icon?: LucideIcon;
  delta?: StatCellDelta;
  /** A 72×28 sparkline, sitting to the right of the value on its baseline. */
  chart?: ReactNode;
  /** Where the reading is defined: the label becomes a link to it. */
  href?: string;
  className?: string;
}

/**
 * A cell of the strip, the reference's stats card. It is deliberately not
 * interactive and it never lifts: you cannot click a reading on an instrument.
 *
 * Anatomy, padding 16px, 12px between rows:
 *   1. 14px icon + a 13px tracked label, 6px gap, in secondary.
 *   2. the value at 24px medium, with the bar sparkline on its right.
 *   3. the delta: caret, figure, and the period in tertiary.
 *
 * Zero-data rendering (§11.2): value `—` in tertiary at full `metric-xl` size,
 * the chart slot replaced by a 1px dashed hairline across the full 72px at the
 * vertical centre — NEVER a flat line at the baseline, which would falsely read
 * as a measured zero — and the delta row reading `no prior period`.
 */
export function StatCell({
  label,
  value,
  icon: Icon,
  delta,
  chart,
  href,
  className,
}: StatCellProps): ReactNode {
  const empty = value === null || value === undefined || value === "";
  const metric = typeof value === "number" ? formatMetric(value) : null;

  return (
    <div className={cn("flex min-h-[120px] flex-col gap-5 p-7", className)}>
      <div className="flex items-center gap-3 text-ink-2">
        {Icon ? (
          <Icon
            aria-hidden="true"
            size={14}
            strokeWidth={1.5}
            className="shrink-0"
          />
        ) : null}
        {href ? (
          <Link
            href={href}
            className="focus-ring-canvas t-stat-label min-w-0 truncate rounded-4 underline-offset-4 outline-none hover:underline"
          >
            {label}
          </Link>
        ) : (
          <span className="t-stat-label min-w-0 truncate">{label}</span>
        )}
      </div>

      {/* items-end sits the sparkline on the value's baseline rather than
          centring it against the value's line box. */}
      <div className="flex items-end justify-between gap-6">
        {empty ? (
          <span className="t-metric-stat text-ink-3">{NO_VALUE}</span>
        ) : metric ? (
          <span
            className="t-metric-stat min-w-0 truncate text-ink"
            // Tabular figures are wide enough that an unabbreviated
            // 7-digit value overflows a 4-up strip at 1200px. The exact figure
            // is never lost — it is one hover away.
            title={metric.abbreviated ? metric.exact : undefined}
          >
            {metric.display}
          </span>
        ) : (
          <span className="t-metric-stat min-w-0 truncate text-ink">
            {value}
          </span>
        )}

        {chart ? (
          <div className="shrink-0">{chart}</div>
        ) : empty ? (
          <div
            aria-hidden="true"
            className="flex h-[28px] w-[72px] shrink-0 items-center"
          >
            <span className="w-full border-t border-dashed border-hairline" />
          </div>
        ) : null}
      </div>

      <div className="-mt-2">
        {delta ? (
          <Delta {...delta} />
        ) : empty ? (
          <span className="t-micro text-ink-3">no prior period</span>
        ) : null}
      </div>
    </div>
  );
}

export interface DeltaProps extends StatCellDelta {
  className?: string;
}

/**
 * LEDGER INSTRUMENT — Delta (§9.7, §12.2).
 *
 * `polarity` is the whole point. For every cost metric — and
 * `tokens_per_accepted_receipt` is this product's headline economics figure — a
 * DOWNWARD arrow is the positive one. Hardcoding ▲ = good renders the
 * discipline backwards, in green.
 *
 * The arrow is drawn, not typed: it is an 8px SVG mark rather than a character,
 * because §3.4 gives text exactly one role class and there is no 8px text role.
 * It is also the second, non-colour carrier of direction (§12.2) — the delta
 * stays readable in greyscale and to a red-green dichromat.
 *
 * Zero renders neutral with no arrow at all: a change of zero has no direction,
 * and drawing one would be a lie in the shape of a triangle.
 */
export function Delta({
  value,
  suffix,
  polarity = "up-good",
  className,
}: DeltaProps): ReactNode {
  const change = Number.isFinite(value) ? value : 0;
  const zero = change === 0;
  const up = change > 0;
  const good = polarity === "down-good" ? change < 0 : change > 0;
  const tone = zero
    ? "text-ink-3"
    : good
      ? "text-positive-text"
      : "text-critical-text";

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      {zero ? (
        // The glyph slot is held open so the numerals of a row of cells still
        // start on the same x, whether or not each one has a direction.
        <span aria-hidden="true" className="w-[10px] shrink-0" />
      ) : (
        <DeltaArrow direction={up ? "up" : "down"} className={tone} />
      )}
      <span className={cn("t-micro tabular", tone)}>
        {formatDeltaMagnitude(Math.abs(change))}%
      </span>
      <span className="sr-only">{zero ? "no change" : up ? "up" : "down"}</span>
      {suffix ? (
        <span className="t-micro ml-1 text-ink-3">{suffix}</span>
      ) : null}
    </span>
  );
}

function DeltaArrow({
  direction,
  className,
}: {
  direction: "up" | "down";
  className?: string;
}): ReactNode {
  return (
    // The reference's caret: a 10px filled triangle beside the figure.
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="currentColor"
      className={cn("shrink-0", className)}
    >
      <path
        d={
          direction === "up"
            ? "M5 1.5 L9 7.5 L1 7.5 Z"
            : "M5 8.5 L1 2.5 L9 2.5 Z"
        }
      />
    </svg>
  );
}

/** One decimal, and never a trailing `.0` — `12.4` and `8`, not `12.4` and `8.0`. */
function formatDeltaMagnitude(magnitude: number): string {
  const fixed = magnitude.toFixed(1);
  return fixed.endsWith(".0") ? fixed.slice(0, -2) : fixed;
}

/**
 * §9.7's abbreviation rule: at five significant digits or more the value
 * abbreviates and keeps its exact figure in a title. The locale is pinned so
 * the server and the client format the same string and hydration does not
 * mismatch on a grouping separator.
 */
function formatMetric(value: number): {
  display: string;
  exact: string;
  abbreviated: boolean;
} {
  if (!Number.isFinite(value)) {
    return { display: NO_VALUE, exact: NO_VALUE, abbreviated: false };
  }
  const exact = value.toLocaleString("en-US");
  const magnitude = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  for (const [i, step] of ABBREVIATIONS.entries()) {
    if (magnitude < step.limit) continue;
    const text = formatDeltaMagnitude(magnitude / step.divisor);
    // 999_999 would otherwise print as `1000k`: the rounding has crossed into
    // the next unit, so print it there instead.
    const bigger = text === "1000" ? ABBREVIATIONS[i - 1] : undefined;
    if (bigger) {
      return {
        display: `${sign}${formatDeltaMagnitude(magnitude / bigger.divisor)}${bigger.unit}`,
        exact,
        abbreviated: true,
      };
    }
    return { display: `${sign}${text}${step.unit}`, exact, abbreviated: true };
  }
  return { display: exact, exact, abbreviated: false };
}

/**
 * Ordered largest-first. `1e4` is the five-significant-digit boundary, and the
 * `k` step divides by a thousand rather than by its own limit — the threshold
 * and the scale are two different numbers.
 */
const ABBREVIATIONS = [
  { limit: 1e9, divisor: 1e9, unit: "B" },
  { limit: 1e6, divisor: 1e6, unit: "M" },
  { limit: 1e4, divisor: 1e3, unit: "k" },
] as const;
