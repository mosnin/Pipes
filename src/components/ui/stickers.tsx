"use client";

/**
 * Stickers, from stick-it-up (MIT, Samiran De): hand-made vinyl decals that
 * peel on hover. Pipes uses two shapes only (a sparkle trio and a star burst),
 * no characters, and only as rare accents (docs/DESIGN.md): the greeting band,
 * the sign-in art and the celebration card.
 */
import { SparkleTrioSticker, StarBurstSticker } from "stick-it-up";
import type { CSSProperties } from "react";
import { cn as cx } from "@/lib/utils";

const ALL = {
  "sparkle-trio": SparkleTrioSticker,
  "star-burst": StarBurstSticker,
} as const;
export type StickerKind = keyof typeof ALL;

/** A sticker, slightly tilted like it was stuck on by hand. Decorative: hidden from screen readers. */
export function Sticker({ kind, size = 88, tilt = -6, peel = true, className, style }: { kind: StickerKind; size?: number; tilt?: number; peel?: boolean; className?: string; style?: CSSProperties }) {
  const S = ALL[kind];
  return (
    <span aria-hidden className={cx("pointer-events-auto inline-block select-none drop-shadow-[0_6px_10px_rgb(0_0_0/0.12)]", className)} style={{ rotate: `${tilt}deg`, ...style }}>
      <S size={size} peel={peel} />
    </span>
  );
}
