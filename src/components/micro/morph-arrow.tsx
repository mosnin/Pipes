"use client";

/**
 * A chevron that grows a shaft and becomes an arrow when its link is hovered
 * or focused. Put `group/arrow` on the link. Adapted from microinteractions.dev
 * (chevron morph, Copyright (c) 2026 Juan Di Nella, MIT).
 */
import { cn as cx } from "@/lib/utils";

export function MorphArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cx("size-3.5 shrink-0 overflow-visible fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]", className)}>
      <path
        d="M10 7L15 12L10 17"
        className="transition-transform duration-200 [transition-timing-function:var(--ease-out)] group-focus-visible/arrow:translate-x-[2px] motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/arrow:translate-x-[2px]"
      />
      <path
        d="M8 12H16"
        className="origin-left scale-x-50 opacity-0 transition-[opacity,transform] duration-200 [transition-timing-function:var(--ease-out)] [transform-box:fill-box] group-focus-visible/arrow:scale-x-100 group-focus-visible/arrow:opacity-100 motion-reduce:transition-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/arrow:scale-x-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/arrow:opacity-100"
      />
    </svg>
  );
}
