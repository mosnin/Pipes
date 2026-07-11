"use client";

import { useEffect, useState } from "react";

/**
 * BlogReadingProgress
 *
 * A 2px indigo bar pinned to the top of the viewport that tracks how far
 * the reader has scrolled. Updates via a rAF-throttled scroll listener.
 * Respects prefers-reduced-motion implicitly because the transform reflects
 * scroll position, not time.
 */
export function BlogReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let ticking = false;
    function compute(): void {
      ticking = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      setProgress(next);
    }
    function onScroll(): void {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(compute);
    }
    compute();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="blog-reading-progress"
      className="fixed top-0 left-0 right-0 h-[2px] z-[60] pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-violet-600 origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: "transform 120ms linear",
        }}
      />
    </div>
  );
}
