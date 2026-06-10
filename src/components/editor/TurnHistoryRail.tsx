"use client";

// A thin vertical rail rendered on the LEFT edge of the conversation drawer.
// Each completed agent turn is a numbered dot connected by a hairline. Click a
// dot to jump back to that turn's post-state. Hover for the prompt preview.
//
// Hidden when there is only one turn — a single dot is noise.

import { useState } from "react";

export type TurnRailEntry = {
  turnId: string;
  index: number;
  prompt: string;
  // When the user reverts past this turn with a new prompt, future turns are
  // marked stale and rendered as dashed outlines.
  stale?: boolean;
};

export type TurnHistoryRailProps = {
  turns: TurnRailEntry[];
  activeTurnId?: string;
  onJumpToTurn: (turnId: string) => void;
};

export function TurnHistoryRail({
  turns,
  activeTurnId,
  onJumpToTurn,
}: TurnHistoryRailProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (turns.length <= 1) return null;

  return (
    <div
      className="absolute left-2 top-3 bottom-3 z-10 flex flex-col items-center justify-start gap-0 pointer-events-auto"
      aria-label="Turn history"
      role="navigation"
    >
      {turns.map((turn, idx) => {
        const isActive = turn.turnId === activeTurnId;
        const isLast = idx === turns.length - 1;
        const preview = turn.prompt.slice(0, 80);
        return (
          <div key={turn.turnId} className="relative flex flex-col items-center">
            <button
              type="button"
              onClick={() => onJumpToTurn(turn.turnId)}
              onMouseEnter={() => setHoveredId(turn.turnId)}
              onMouseLeave={() => setHoveredId((cur) => (cur === turn.turnId ? null : cur))}
              onFocus={() => setHoveredId(turn.turnId)}
              onBlur={() => setHoveredId((cur) => (cur === turn.turnId ? null : cur))}
              aria-label={`Jump to turn ${turn.index}`}
              aria-current={isActive ? "step" : undefined}
              className={[
                "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                isActive
                  ? "bg-indigo-600 text-white border border-indigo-600"
                  : turn.stale
                    ? "bg-white text-[#8E8E93] border border-dashed border-black/[0.18] hover:border-black/[0.32]"
                    : "bg-white text-[#3C3C43] border border-black/[0.16] hover:border-black/[0.32]",
              ].join(" ")}
              style={{ transitionDuration: "120ms" }}
            >
              {turn.index}
            </button>
            {!isLast ? (
              <span
                aria-hidden
                className={[
                  "block w-px h-4 my-0.5",
                  turn.stale ? "bg-black/[0.08]" : "bg-black/[0.12]",
                ].join(" ")}
              />
            ) : null}
            {hoveredId === turn.turnId && preview.length > 0 ? (
              <span
                role="tooltip"
                className="absolute left-7 top-0 bg-[#111] text-white t-caption px-2 py-1 rounded-md shadow-md-token whitespace-nowrap max-w-[220px] truncate"
              >
                {preview}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
