"use client";

/**
 * A button whose label rolls to say what will happen next, on hover or
 * keyboard focus (touch: on tap). Adapted from microinteractions.dev
 * (Copyright (c) 2026 Juan Di Nella, MIT), on Podium's Button styles.
 */
import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { cn as cx } from "@/lib/utils";

export function TextSwapButton({ label, nextLabel, className, ...props }: Omit<ComponentProps<typeof Button>, "children"> & { label: string; nextLabel: string }) {
  return (
    <Button {...props} aria-label={props["aria-label"] ?? `${label}: ${nextLabel}`} className={cx("group/swap overflow-hidden", className)}>
      <span aria-hidden className="inline-grid [&>*]:col-start-1 [&>*]:row-start-1 [&>*]:text-center [&>*]:transition-[opacity,transform,filter] [&>*]:duration-200 [&>*]:[transition-timing-function:var(--ease-out)] motion-reduce:[&>*]:!transform-none motion-reduce:[&>*]:!filter-none">
        <span className="group-focus-visible/swap:-translate-y-[120%] group-focus-visible/swap:opacity-0 group-focus-visible/swap:blur-[4px] [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:-translate-y-[120%] [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:opacity-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:blur-[4px]">
          {label}
        </span>
        <span className="translate-y-[120%] opacity-0 blur-[4px] group-focus-visible/swap:translate-y-0 group-focus-visible/swap:opacity-100 group-focus-visible/swap:blur-none [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:translate-y-0 [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:opacity-100 [@media(hover:hover)_and_(pointer:fine)]:group-hover/swap:blur-none">
          {nextLabel}
        </span>
      </span>
    </Button>
  );
}
