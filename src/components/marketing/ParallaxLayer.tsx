"use client";

import type { ReactNode, RefObject } from "react";
import { useReducedMotion } from "framer-motion";
import { useScrollProgress } from "@/lib/marketing/useScrollProgress";
import { cn } from "@/lib/utils";

/**
 * ParallaxLayer
 *
 * A typed primitive that translates its children at a fraction of the scroll
 * progress of a referenced container. Used to compose Apple-style Z-depth in
 * hero scenes:
 *
 *   <section ref={ref}>
 *     <ParallaxLayer depth={0} containerRef={ref}>  background</ParallaxLayer>
 *     <ParallaxLayer depth={0.35} containerRef={ref}>mid grid </ParallaxLayer>
 *     foreground content (no parallax)
 *   </section>
 *
 * depth = 0 means the layer is locked to the container (no movement). depth =
 * 1 means it translates one screen-eighth (80px) upward as the container is
 * scrolled through. Animations are transform-only (translate3d) for 60fps.
 *
 * prefers-reduced-motion disables the translation entirely; the layer renders
 * at its rest position.
 */
export interface ParallaxLayerProps {
  /**
   * Movement factor. 0 = no movement, 1 = full scroll speed (80px upward
   * over the full scroll range of the container).
   */
  depth: number;
  /** Ref to the SCROLL container — typically the outer tall wrapper. */
  containerRef: RefObject<HTMLElement | null>;
  /** Optional additional classes — merged onto the absolutely-positioned layer. */
  className?: string;
  /** Children rendered inside the absolutely-positioned layer. */
  children: ReactNode;
  /**
   * Optional test id forwarded to the layer root, useful for asserting the
   * presence and order of stacked layers.
   */
  testId?: string;
}

/** Maximum upward translation at depth=1 across the full scroll range. */
const MAX_PARALLAX_PX = 80;

export function ParallaxLayer({
  depth,
  containerRef,
  className,
  children,
  testId,
}: ParallaxLayerProps) {
  const progress = useScrollProgress(containerRef);
  const reduced = useReducedMotion();
  const offset = reduced ? 0 : progress * depth * -MAX_PARALLAX_PX;
  return (
    <div
      data-testid={testId}
      data-parallax-depth={depth}
      className={cn("pointer-events-none absolute inset-0", className)}
      style={{
        transform: `translate3d(0, ${offset.toFixed(2)}px, 0)`,
        willChange: "transform",
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}
