import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DiffSummaryProps {
  added: number;
  removed: number;
  className?: string;
}

/** Five 8×8 cells at 2px gaps — the diffstat bar (§9.30). */
const BLOCKS = 5;

/**
 * LEDGER INSTRUMENT — DiffSummary (§9.30).
 *
 * Reused in the commit bar, branch rows, revision rows and the merge dialog, so
 * the size of a change reads identically everywhere it appears.
 *
 * `−41` uses U+2212 MINUS SIGN, not a hyphen. In `mono-seq` a hyphen is a short
 * high dash that does not optically balance the `+` above it, and this pair is
 * the most-read number in the product.
 *
 * COLOUR IS NOT THE ONLY CARRIER: the `+` and `−` glyphs are part of the value,
 * the counts are literal, and the bar is redundant with both. Roughly 8% of male
 * readers cannot separate the two hues, and for them the signs are the entire
 * message (§12.2).
 */
export function DiffSummary({
  added,
  removed,
  className,
}: DiffSummaryProps): ReactNode {
  const plus = clamp(added);
  const minus = clamp(removed);
  const unchanged = plus === 0 && minus === 0;
  const { addBlocks, delBlocks } = split(plus, minus);

  return (
    <span
      title={`${plus} additions, ${minus} deletions`}
      className={cn("inline-flex shrink-0 items-center gap-4", className)}
    >
      {unchanged ? (
        // An unchanged diff is a real answer, not an absence, so it prints a
        // value rather than collapsing (§3.5.3).
        <span className="t-mono-seq text-ink-3">±0</span>
      ) : (
        <span className="inline-flex items-center gap-3">
          {/* A zero side stays on the ink ramp: hue is reserved for a value the
              reader must decode, and "no deletions" has nothing to decode (§4.1). */}
          <span
            className={cn(
              "t-mono-seq",
              plus > 0 ? "text-positive-text" : "text-ink-3",
            )}
          >
            +{plus}
          </span>
          <span
            className={cn(
              "t-mono-seq",
              minus > 0 ? "text-critical-text" : "text-ink-3",
            )}
          >
            −{minus}
          </span>
        </span>
      )}
      <span aria-hidden="true" className="inline-flex shrink-0 items-center gap-1">
        {Array.from({ length: BLOCKS }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-[8px] rounded-2",
              index < addBlocks
                ? "bg-positive"
                : index < addBlocks + delBlocks
                  ? "bg-critical"
                  : "bg-track",
            )}
          />
        ))}
      </span>
    </span>
  );
}

/**
 * Proportional, with a floor: ANY non-zero change fills at least one block, so a
 * single deleted line can never round away to an all-green bar. The two sides
 * together always fill the five, which is what makes the bar a ratio rather than
 * an unanchored magnitude.
 */
function split(added: number, removed: number): {
  addBlocks: number;
  delBlocks: number;
} {
  if (added === 0 && removed === 0) return { addBlocks: 0, delBlocks: 0 };
  if (removed === 0) return { addBlocks: BLOCKS, delBlocks: 0 };
  if (added === 0) return { addBlocks: 0, delBlocks: BLOCKS };
  const raw = Math.round((added / (added + removed)) * BLOCKS);
  const addBlocks = Math.min(BLOCKS - 1, Math.max(1, raw));
  return { addBlocks, delBlocks: BLOCKS - addBlocks };
}

/** Garbage in — a negative or a NaN — must not paint a partial bar. */
function clamp(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
