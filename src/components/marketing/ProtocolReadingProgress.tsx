"use client";

import { useEffect, useState } from "react";

/**
 * ProtocolReadingProgress
 *
 * A 2px indigo bar pinned to the top of the viewport that tracks how far
 * the reader has scrolled through the document body. No framer-motion.
 * Animated only via CSS transform; respects reduced motion implicitly
 * because the transform reflects scroll position, not time.
 */
export function ProtocolReadingProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const max = doc.scrollHeight - doc.clientHeight;
      const next = max > 0 ? Math.min(1, Math.max(0, doc.scrollTop / max)) : 0;
      setProgress(next);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="protocol-reading-progress"
      className="fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none"
    >
      <div
        className="h-full bg-indigo-600 origin-left"
        style={{
          transform: `scaleX(${progress})`,
          transition: "transform 120ms linear",
        }}
      />
    </div>
  );
}
