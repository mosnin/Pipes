"use client";

// Hook for reading + setting the user's sound preference.
//
// Storage key: pipes-sound-on (string "true"/"false").
// Default: true. The localStorage key tracks the user's explicit choice;
// when it is absent we treat sound as on.
// prefers-reduced-motion always wins: if the user prefers reduced motion,
// `enabled` is reported as false and `setEnabled` is a no-op.

import { useCallback, useEffect, useState } from "react";

export const SOUND_STORAGE_KEY = "pipes-sound-on";

function readPersistedPreference(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem(SOUND_STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
  } catch {
    return true;
  }
}

function readReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export interface SoundPreference {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
  reducedMotion: boolean;
}

export function useSoundPreference(): SoundPreference {
  // Initial state mirrors readPersistedPreference. The default is true so
  // the first render after hydration reads "on" when no explicit choice
  // has been stored. The mount effect below still re-reads on the client
  // to pick up any race between SSR and hydration.
  const [persisted, setPersisted] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  // Read initial values once on mount. SSR-safe.
  useEffect(() => {
    setPersisted(readPersistedPreference());
    setReducedMotion(readReducedMotion());
  }, []);

  // Subscribe to reduced-motion changes so the toggle can react live.
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (event: MediaQueryListEvent): void => {
      setReducedMotion(event.matches);
    };
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handler);
      return () => mql.removeEventListener("change", handler);
    }
    // Older Safari fallback.
    mql.addListener(handler);
    return () => mql.removeListener(handler);
  }, []);

  const setEnabled = useCallback((next: boolean): void => {
    if (readReducedMotion()) {
      // Reduced motion always wins — no-op.
      return;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SOUND_STORAGE_KEY, next ? "true" : "false");
      } catch {
        /* noop */
      }
    }
    setPersisted(next);
  }, []);

  const enabled = !reducedMotion && persisted;

  return { enabled, setEnabled, reducedMotion };
}
