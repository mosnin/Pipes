"use client";

// React context that gates sounds by user preference.
//
// - Default off (opt-in).
// - prefers-reduced-motion always wins; play() becomes a no-op.
// - Sounds are synthesized on demand by lib/sound/effects.ts.

import { createContext, useCallback, useContext, useMemo } from "react";
import { playBuildComplete, playError, playMessage } from "@/lib/sound/effects";
import { useSoundPreference } from "@/lib/sound/useSoundPreference";

export type SoundEffect = "buildComplete" | "message" | "error";

export interface SoundContextValue {
  enabled: boolean;
  reducedMotion: boolean;
  setEnabled: (next: boolean) => void;
  play: (effect: SoundEffect) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({ children }: { children: React.ReactNode }) {
  const { enabled, setEnabled, reducedMotion } = useSoundPreference();

  const play = useCallback(
    (effect: SoundEffect): void => {
      if (!enabled) return;
      switch (effect) {
        case "buildComplete":
          playBuildComplete();
          return;
        case "message":
          playMessage();
          return;
        case "error":
          playError();
          return;
      }
    },
    [enabled],
  );

  const value = useMemo<SoundContextValue>(
    () => ({ enabled, reducedMotion, setEnabled, play }),
    [enabled, reducedMotion, setEnabled, play],
  );

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (ctx) return ctx;
  // Graceful fallback when called outside the provider (SSR shells, tests).
  // Returns a disabled, no-op context.
  return {
    enabled: false,
    reducedMotion: false,
    setEnabled: () => {},
    play: () => {},
  };
}
