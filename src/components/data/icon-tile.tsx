import type { LucideIcon } from "@/components/ui/icon";
import type { ReactNode } from "react";
import type { SignalRole } from "@/components/ledger/status";
import { cn } from "@/lib/utils";

export interface IconTileProps {
  icon: LucideIcon;
  /** 28 dense row · 32 list row (default) · 40 card/banner · 48 empty state. */
  size?: 28 | 32 | 40 | 48;
  /**
   * `default` is neutral and carries no meaning. A role is legal only where the
   * tile ENCODES STATE — a failed run, an expiring key, a merged branch, an
   * agent identity, a conflicted document (§9.5). A tinted tile that means
   * nothing is a P1 violation.
   */
  role?: SignalRole | "default";
  className?: string;
}

/**
 * LEDGER INSTRUMENT — IconTile (§9.5).
 *
 * The leading element of list rows, quick-action cards, right-rail rows,
 * banners and empty states.
 *
 * Radius is derived, never chosen: **r ≈ 0.30 × size** (28→8, 32→10, 40→12,
 * 48→14, §5.4). That ratio reads as a superellipse without an SVG squircle, and
 * it means a new tile size derives its own radius instead of drifting away from
 * the family.
 *
 * Zero-data rendering: there isn't one — `icon` is required, because a tile with
 * no glyph is not an empty tile, it is a 32px grey square with no job. A row
 * that has no type marker renders no tile at all and lets its text start at the
 * cell edge.
 */
export function IconTile({
  icon: Icon,
  size = 32,
  role = "default",
  className,
}: IconTileProps): ReactNode {
  const glyph = GLYPH[size];
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center",
        BOX[size],
        role === "default"
          ? cn(
              "bg-muted text-muted-foreground",
              // §9.5: the ground steps one level toward the ink ONLY when the
              // tile sits inside an interactive row — `group-hover` simply never
              // matches when there is no interactive ancestor to mark itself
              // `group`, so a static tile stays put with no prop to remember.
              // The step lands on `--line-hairline`, which is the token that
              // sits exactly one rung darker than `--surface-inset` in both
              // modes; a raw hex would say the same thing untokenised.
              "transition-colors duration-150 ease-linear",
            )
          : ROLE[role],
        className,
      )}
    >
      {/* A type marker, never a control: the row's text carries the meaning and
          assistive technology reads that, not this. */}
      <Icon aria-hidden="true" size={glyph.size} strokeWidth={glyph.stroke} />
    </span>
  );
}

/* Static maps — Tailwind only ships the classes it can literally see. */

const BOX: Record<28 | 32 | 40 | 48, string> = {
  // Podium's IconTile: 8px corners at every size.
  28: "size-[28px] rounded-lg",
  32: "size-[32px] rounded-lg",
  40: "size-[40px] rounded-lg",
  48: "size-[48px] rounded-lg",
};

/** §8.1: 14px → 1.25 stroke · 16–20px → 1.5 · ≥24px → 2. */
const GLYPH: Record<28 | 32 | 40 | 48, { size: number; stroke: number }> = {
  28: { size: 14, stroke: 1.25 },
  32: { size: 16, stroke: 1.5 },
  40: { size: 20, stroke: 1.5 },
  48: { size: 24, stroke: 2 },
};

/** Ground `--{role}-wash`, glyph `--{role}-text`. Neutral has no `-text` of its
    own: it borrows the tertiary ramp (§4.3). */
const ROLE: Record<SignalRole, string> = {
  positive: "bg-positive-wash text-positive-text",
  caution: "bg-caution-wash text-caution-text",
  critical: "bg-critical-wash text-critical-text",
  agent: "bg-agent-wash text-agent-text",
  info: "bg-info-wash text-info-text",
  neutral: "bg-neutral-wash text-ink-3",
};
