"use client";

import { useEffect, useState } from "react";

/**
 * useScrollSpy
 *
 * Tracks which heading element is currently considered active based on
 * scroll position. Uses IntersectionObserver to watch all provided element
 * ids; the active id is the first one whose top edge has crossed the
 * viewport's sticky-offset threshold.
 *
 * Returns the id string of the active heading, or null when no heading has
 * yet entered the threshold.
 *
 * @param ids ordered list of element ids in document order
 * @param topOffset px from the top of the viewport considered the trigger line
 *   (defaults to 96px to clear a sticky header)
 */
export function useScrollSpy(
  ids: ReadonlyArray<string>,
  topOffset: number = 96,
): string | null {
  const [activeId, setActiveId] = useState<string | null>(
    ids.length > 0 ? ids[0] : null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (ids.length === 0) return;

    function computeActive(): void {
      // Pick the id whose element's top is closest to (but not past) the
      // trigger line at topOffset. If the user is above the first heading,
      // fall back to the first id. If past all, take the last.
      let bestId: string | null = null;
      let bestTop = -Infinity;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top - topOffset <= 0 && rect.top > bestTop) {
          bestTop = rect.top;
          bestId = id;
        }
      }
      if (bestId === null) {
        // No heading has crossed yet — use the first that exists.
        for (const id of ids) {
          if (document.getElementById(id)) {
            bestId = id;
            break;
          }
        }
      }
      setActiveId((prev) => (prev === bestId ? prev : bestId));
    }

    let ticking = false;
    function onScroll(): void {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        computeActive();
      });
    }

    computeActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids, topOffset]);

  return activeId;
}

/**
 * smoothScrollToId
 *
 * Scrolls the given anchor into view, honoring the sticky offset, and
 * respects prefers-reduced-motion.
 */
export function smoothScrollToId(id: string, topOffset: number = 80): void {
  if (typeof window === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  const reduce =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const rect = el.getBoundingClientRect();
  const target = window.scrollY + rect.top - topOffset;
  window.scrollTo({
    top: Math.max(0, target),
    behavior: reduce ? "auto" : "smooth",
  });
  // Update the URL hash without triggering a jump.
  if (window.history && typeof window.history.replaceState === "function") {
    window.history.replaceState(null, "", `#${id}`);
  }
}
