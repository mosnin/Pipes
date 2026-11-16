"use client";

/**
 * Stickers, from stick-it-up (MIT, Samiran De): small hand-made vinyl decals
 * that peel on hover. Podium uses a curated handful (the pixel mascots and a
 * few shapes), never the stickers of real people or other people's
 * characters, and only as rare accents (DESIGN.md): the Home greeting, the
 * sign-in art and the "You're all set" card.
 *
 * Import stickers from here, by name, so the bundle only carries the ones
 * used (the package is large; its <Sticker name> helper pulls in all of them).
 */
import { KuroHeadphonesSticker, MochiHeadphonesSticker, MochiLaptopSticker, NoriCoffeeSticker, PipRocketSticker, SparkleTrioSticker, StarBurstSticker } from "stick-it-up";
import type { CSSProperties } from "react";
import { cn as cx } from "@/lib/utils";

const ALL = {
  "nori-coffee": NoriCoffeeSticker,
  "mochi-laptop": MochiLaptopSticker,
  "kuro-headphones": KuroHeadphonesSticker,
  "pip-rocket": PipRocketSticker,
  "mochi-headphones": MochiHeadphonesSticker,
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

/** The mascot for the time of day on Home: coffee in the morning, laptop in the afternoon, headphones at night. */
export function stickerForHour(h = new Date().getHours()): StickerKind {
  if (h < 5) return "pip-rocket";
  if (h < 12) return "nori-coffee";
  if (h < 18) return "mochi-laptop";
  return "kuro-headphones";
}
