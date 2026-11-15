import * as SeparatorPrimitive from "@radix-ui/react-separator";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SeparatorProps {
  orientation?: "horizontal" | "vertical";
  className?: string;
}

/**
 * LEDGER INSTRUMENT — Separator (§9.38).
 *
 * Always `--line-hairline`: a separator divides content INSIDE a container, and
 * a container's own edge is `--line-border`. Using the same weight for both is
 * the P3 violation that flattens a card into a stack of boxes (§2.5).
 *
 * Horizontal runs full-bleed inside whatever contains it. Vertical is the rule
 * that divides stat-strip cells and toolbar clusters — 18px tall with 12px
 * margins — which is how cells are separated inside ONE elevated container
 * rather than as four separately shadowed boxes (§5.7).
 *
 * `decorative` by default: these rules are visual grouping, so they are hidden
 * from the accessibility tree rather than announced as a semantic break.
 */
export function Separator({
  orientation = "horizontal",
  className,
}: SeparatorProps): ReactNode {
  return (
    <SeparatorPrimitive.Root
      decorative
      orientation={orientation}
      className={cn(
        // A hairline is exactly 1px and never scales (§5.5).
        "shrink-0 bg-hairline",
        orientation === "horizontal" ? "h-px w-full" : "mx-5 h-[18px] w-px",
        className,
      )}
    />
  );
}
