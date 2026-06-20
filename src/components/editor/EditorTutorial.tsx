"use client";

// First-run editor coaching. Three subtle pills, dismissible individually,
// pinned to the regions of the editor they describe. Each pill writes its
// own per-pill flag to localStorage; once all three are dismissed the
// global "looper-tutorial-seen" flag flips so we never show again.
//
// Steve Jobs note: the pills do not teach. They name. Each pill is a single
// verb-led sentence pointing at the place where the user can act. They
// dismiss the moment the user takes the action they describe.

import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import {
  getTutorialPillSeen,
  setTutorialPillSeen,
  setTutorialSeen,
} from "@/lib/feedback/storage";

export type EditorTutorialProps = {
  // Bumped by the parent on the user's first interaction with each surface.
  // When `promptStarted` flips true we dismiss pill 1.
  promptStarted: boolean;
  // True when the user has opened or interacted with the left rail.
  leftPaneOpened: boolean;
  // True when the user has interacted with the Open in Claude button or the
  // Agent View panel. Either signals that pill 2's job is done.
  agentViewSeen: boolean;
};

type PillId = "1" | "2" | "3";

type PillSpec = {
  id: PillId;
  text: string;
  // Position style for the pill itself.
  style: React.CSSProperties;
  // Where the small arrow points, relative to the pill body. The pill is a
  // small rounded card; the arrow is a tiny triangle on one of four edges.
  arrow: "down" | "up" | "left" | "right";
};

const PILLS: ReadonlyArray<PillSpec> = [
  {
    id: "1",
    // Just above the conversation drawer. The drawer pins to bottom-center,
    // so this pill sits centered, slightly above it.
    text: "Type a sentence. The agent draws it.",
    style: { left: "50%", bottom: 96, transform: "translateX(-50%)" },
    arrow: "down",
  },
  {
    id: "2",
    // Topbar Agent View / Open in Claude lives at the top-right.
    text: "Once you've built it, hand it to Claude in one click.",
    style: { right: 24, top: 12 },
    arrow: "up",
  },
  {
    id: "3",
    // The left rail toggle is a 48 px column on the left of the editor.
    text: "All the tools are here when you want to fine-tune.",
    style: { left: 64, top: 120 },
    arrow: "left",
  },
];

export function EditorTutorial({ promptStarted, leftPaneOpened, agentViewSeen }: EditorTutorialProps) {
  // Per-pill dismissal state. Initialized from localStorage on mount; null
  // means we have not yet hydrated (the SSR / first-paint path).
  const [seen, setSeen] = useState<Record<PillId, boolean> | null>(null);
  // Mounted is used to delay the fade-in by one frame so the CSS transition
  // catches.
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSeen({
      "1": getTutorialPillSeen("1"),
      "2": getTutorialPillSeen("2"),
      "3": getTutorialPillSeen("3"),
    });
    const id = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  const dismissPill = useCallback((pill: PillId) => {
    setTutorialPillSeen(pill);
    setSeen((prev) => {
      const base: Record<PillId, boolean> = prev ?? { "1": false, "2": false, "3": false };
      const next = { ...base, [pill]: true };
      if (next["1"] && next["2"] && next["3"]) setTutorialSeen();
      return next;
    });
  }, []);

  // Auto-dismiss pill 1 the moment the user starts typing.
  useEffect(() => {
    if (!seen) return;
    if (promptStarted && !seen["1"]) dismissPill("1");
  }, [promptStarted, seen, dismissPill]);

  // Auto-dismiss pill 2 once the user touches the agent surface.
  useEffect(() => {
    if (!seen) return;
    if (agentViewSeen && !seen["2"]) dismissPill("2");
  }, [agentViewSeen, seen, dismissPill]);

  // Auto-dismiss pill 3 once the user opens the left rail.
  useEffect(() => {
    if (!seen) return;
    if (leftPaneOpened && !seen["3"]) dismissPill("3");
  }, [leftPaneOpened, seen, dismissPill]);

  // Honor reduced motion: skip the fade-in animation entirely.
  const reduceMotion = useMemo(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  if (!seen) return null;
  if (seen["1"] && seen["2"] && seen["3"]) return null;

  return (
    <div className="absolute inset-0 z-30 pointer-events-none" aria-hidden={false}>
      {PILLS.map((pill) => {
        if (seen[pill.id]) return null;
        return (
          <Pill
            key={pill.id}
            text={pill.text}
            style={pill.style}
            arrow={pill.arrow}
            visible={mounted || reduceMotion}
            reduceMotion={reduceMotion}
            onDismiss={() => dismissPill(pill.id)}
          />
        );
      })}
    </div>
  );
}

function Pill({
  text,
  style,
  arrow,
  visible,
  reduceMotion,
  onDismiss,
}: {
  text: string;
  style: React.CSSProperties;
  arrow: "down" | "up" | "left" | "right";
  visible: boolean;
  reduceMotion: boolean;
  onDismiss: () => void;
}) {
  const transition = reduceMotion ? undefined : "opacity 200ms ease, transform 200ms ease";
  const transform =
    style.transform ??
    (visible ? undefined : "translateY(2px)");

  return (
    <div
      role="status"
      className="absolute pointer-events-auto surface-muted border border-black/[0.08] shadow-xs rounded-full pl-3 pr-1.5 py-1.5 flex items-center gap-2 max-w-xs"
      style={{
        ...style,
        transform,
        opacity: visible ? 1 : 0,
        transition,
      }}
    >
      <Arrow direction={arrow} />
      <p className="t-caption text-[#3C3C43] whitespace-nowrap">{text}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss tip"
        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[#8E8E93] hover:text-[#111] hover:bg-black/[0.06] transition-colors"
      >
        <X size={11} />
      </button>
    </div>
  );
}

function Arrow({ direction }: { direction: "down" | "up" | "left" | "right" }) {
  // Tiny triangle drawn with CSS borders. Sized to match the pill height.
  const base: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };
  if (direction === "down") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: "50%",
          bottom: -6,
          transform: "translateX(-50%)",
          borderWidth: "6px 5px 0 5px",
          borderColor: "var(--color-surface-muted, #F5F5F7) transparent transparent transparent",
        }}
      />
    );
  }
  if (direction === "up") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          left: "50%",
          top: -6,
          transform: "translateX(-50%)",
          borderWidth: "0 5px 6px 5px",
          borderColor: "transparent transparent var(--color-surface-muted, #F5F5F7) transparent",
        }}
      />
    );
  }
  if (direction === "left") {
    return (
      <span
        aria-hidden
        style={{
          ...base,
          top: "50%",
          left: -6,
          transform: "translateY(-50%)",
          borderWidth: "5px 6px 5px 0",
          borderColor: "transparent var(--color-surface-muted, #F5F5F7) transparent transparent",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      style={{
        ...base,
        top: "50%",
        right: -6,
        transform: "translateY(-50%)",
        borderWidth: "5px 0 5px 6px",
        borderColor: "transparent transparent transparent var(--color-surface-muted, #F5F5F7)",
      }}
    />
  );
}
