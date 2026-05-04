"use client";

// A subtle footer toggle. Off by default; reads + writes the same preference
// the editor uses (pipes-sound-on in localStorage). Hidden when the user has
// prefers-reduced-motion: reduce.

import { useSound } from "@/lib/sound/SoundProvider";

export function SoundFooterToggle() {
  const { enabled, setEnabled, reducedMotion } = useSound();

  if (reducedMotion) {
    return (
      <span className="t-caption text-[#8E8E93]" aria-live="polite">
        Sound respects reduced motion
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEnabled(!enabled)}
      aria-pressed={enabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-2.5 py-1 t-caption text-[#3C3C43] hover:text-[#111] hover:border-black/[0.16] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <span
        aria-hidden="true"
        className={[
          "inline-block h-1.5 w-1.5 rounded-full transition-colors",
          enabled ? "bg-indigo-600" : "bg-[#C7C7CC]",
        ].join(" ")}
      />
      Sound {enabled ? "on" : "off"}
    </button>
  );
}
