"use client";

import { useEffect, useRef, useState, type RefObject } from "react";

/**
 * useScrollProgress
 *
 * Returns a number in [0, 1] describing how far the user has scrolled
 * THROUGH a referenced element. The element must be TALLER than the viewport
 * for this to be meaningful — typical pattern is to wrap a sticky inner
 * surface in a taller outer container, ref this hook to the outer container,
 * and drive animations off the returned progress.
 *
 * 0 means the element's top edge has just reached the viewport top.
 * 1 means the element's bottom edge has just reached the viewport bottom.
 *
 * Listens to scroll + resize with a single rAF-batched listener.
 */
export function useScrollProgress<T extends HTMLElement>(
  ref: RefObject<T | null>,
): number {
  const [progress, setProgress] = useState(0);
  const ticking = useRef(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof window === "undefined") return;

    function compute(): void {
      ticking.current = false;
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // Total scrollable distance through the element:
      //   from rect.top == 0 to (rect.top + rect.height - viewport) == 0
      //   which is rect.height - viewport scroll pixels.
      const total = Math.max(1, rect.height - viewport);
      const scrolled = -rect.top;
      const next = Math.min(1, Math.max(0, scrolled / total));
      setProgress(next);
    }

    function onScroll(): void {
      if (ticking.current) return;
      ticking.current = true;
      window.requestAnimationFrame(compute);
    }

    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref]);

  return progress;
}

/** Linearly remap `t` from input range [a, b] into output [0, 1], clamped. */
export function remap(t: number, a: number, b: number): number {
  if (b === a) return t >= b ? 1 : 0;
  const v = (t - a) / (b - a);
  return Math.min(1, Math.max(0, v));
}

/** Returns true once and only after first read; safe for SSR. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
