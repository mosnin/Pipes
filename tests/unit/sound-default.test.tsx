import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  SOUND_STORAGE_KEY,
  useSoundPreference,
} from "@/lib/sound/useSoundPreference";

// Minimal matchMedia stub. Lets each test decide whether the user prefers
// reduced motion at hook-mount time.
function installMatchMedia(reducedMotion: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: reducedMotion,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    })),
  });
}

describe("sound default ON", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns enabled=true when the localStorage key is absent", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useSoundPreference());
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
    expect(result.current.enabled).toBe(true);
  });

  it("prefers-reduced-motion still wins over the new default", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useSoundPreference());
    // No stored preference, so the new default would be on — but reduced
    // motion forces it off and that is the politeness contract.
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.enabled).toBe(false);
  });

  it("an explicit 'false' opt-out is still honored", () => {
    installMatchMedia(false);
    window.localStorage.setItem(SOUND_STORAGE_KEY, "false");
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.enabled).toBe(false);
  });
});
