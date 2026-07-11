"use client";

// Inline card mounted next to a successful turn's build summary. Surfaces
// three follow-up affordances: Open in Claude, See diff, Revert. After eight
// seconds with no interaction the affordances fade back to the static line.
//
// The whole thing is invisible if the user is already typing the next prompt —
// the parent passes nextPromptStarted to suppress it.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, GitCompare, RotateCcw } from "lucide-react";

export type PostBuildSuccessProps = {
  // The "primary" link. Triggers OpenInClaudeButton's handler. Optional —
  // tests can omit it.
  onOpenInClaude?: () => void;
  // The "see what changed" link. Hidden for the first turn (no prior state).
  onShowDiff?: () => void;
  // The revert handler the SummaryLine already wires.
  onRevert?: () => void;
  // True after the user starts typing the next prompt; suppresses revert.
  nextPromptStarted?: boolean;
  // The fade-out window in milliseconds. Defaults to 8 s per spec.
  autoFadeMs?: number;
};

const DEFAULT_FADE_MS = 8_000;

export function PostBuildSuccess({
  onOpenInClaude,
  onShowDiff,
  onRevert,
  nextPromptStarted,
  autoFadeMs = DEFAULT_FADE_MS,
}: PostBuildSuccessProps) {
  const [faded, setFaded] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const timerRef = useRef<number | null>(null);

  // Arm the fade timer on mount. The timer is canceled the moment the user
  // hovers or clicks any affordance, and re-armed only if they leave without
  // clicking. Reduced motion users see the timer too — they just don't get
  // the animated transition.
  useEffect(() => {
    if (interacted) return;
    if (typeof window === "undefined") return;
    timerRef.current = window.setTimeout(() => setFaded(true), autoFadeMs);
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [autoFadeMs, interacted]);

  const stick = useCallback(() => {
    setInteracted(true);
    setFaded(false);
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleOpen = useCallback(() => {
    stick();
    if (onOpenInClaude) onOpenInClaude();
  }, [onOpenInClaude, stick]);

  const handleDiff = useCallback(() => {
    stick();
    if (onShowDiff) onShowDiff();
  }, [onShowDiff, stick]);

  const handleRevert = useCallback(() => {
    stick();
    if (onRevert) onRevert();
  }, [onRevert, stick]);

  return (
    <div
      className="inline-flex items-center gap-1 transition-opacity"
      style={{ transitionDuration: "180ms", opacity: faded ? 0 : 1, pointerEvents: faded ? "none" : "auto" }}
      onMouseEnter={stick}
      data-testid="post-build-success"
    >
      {onOpenInClaude ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="Open in Claude"
          className="inline-flex items-center gap-1 t-caption font-semibold text-indigo-600 hover:text-indigo-700 px-1.5 h-6 rounded-md hover:bg-indigo-50 transition-colors"
        >
          <span>Open in Claude</span>
          <ArrowRight size={12} />
        </button>
      ) : null}
      {onShowDiff ? (
        <button
          type="button"
          onClick={handleDiff}
          aria-label="See diff"
          className="inline-flex items-center gap-1 t-caption text-ink-3 hover:text-ink-1 px-1.5 h-6 rounded-md hover:bg-[var(--color-hover)] transition-colors"
        >
          <GitCompare size={12} />
          <span>See diff</span>
        </button>
      ) : null}
      {onRevert && !nextPromptStarted ? (
        <button
          type="button"
          onClick={handleRevert}
          aria-label="Revert this turn"
          className="inline-flex items-center gap-1 t-caption text-ink-3 hover:text-ink-1 px-1.5 h-6 rounded-md hover:bg-[var(--color-hover)] transition-colors"
        >
          <RotateCcw size={12} />
          <span>Revert</span>
        </button>
      ) : null}
    </div>
  );
}
