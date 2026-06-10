import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, renderHook, screen } from "@testing-library/react";
import { SoundProvider, useSound } from "@/lib/sound/SoundProvider";
import {
  SOUND_STORAGE_KEY,
  useSoundPreference,
} from "@/lib/sound/useSoundPreference";

type MqlSubscribers = Set<(event: MediaQueryListEvent) => void>;

function installMatchMedia(initialReducedMotion: boolean): {
  setReducedMotion: (next: boolean) => void;
} {
  let matches = initialReducedMotion;
  const subscribers: MqlSubscribers = new Set();

  const factory = (query: string): MediaQueryList => {
    const mql = {
      matches,
      media: query,
      onchange: null,
      addEventListener: (type: string, listener: EventListener) => {
        if (type === "change") subscribers.add(listener as never);
      },
      removeEventListener: (type: string, listener: EventListener) => {
        if (type === "change") subscribers.delete(listener as never);
      },
      addListener: (listener: EventListener) => {
        subscribers.add(listener as never);
      },
      removeListener: (listener: EventListener) => {
        subscribers.delete(listener as never);
      },
      dispatchEvent: () => true,
    };
    return mql as unknown as MediaQueryList;
  };

  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn(factory),
  });

  return {
    setReducedMotion(next: boolean) {
      matches = next;
      // Re-mock so subsequent reads reflect the new value.
      Object.defineProperty(window, "matchMedia", {
        configurable: true,
        writable: true,
        value: vi.fn(factory),
      });
      const event = { matches, media: "(prefers-reduced-motion: reduce)" } as MediaQueryListEvent;
      subscribers.forEach((sub) => sub(event));
    },
  };
}

describe("useSoundPreference", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it("defaults to enabled when no preference is stored", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.enabled).toBe(true);
  });

  it("respects a previously-stored false preference", () => {
    installMatchMedia(false);
    window.localStorage.setItem(SOUND_STORAGE_KEY, "false");
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.enabled).toBe(false);
  });

  it("respects a previously-stored true preference", () => {
    installMatchMedia(false);
    window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.enabled).toBe(true);
  });

  it("forces disabled when prefers-reduced-motion is reduce, even with no stored preference", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.enabled).toBe(false);
  });

  it("forces disabled when prefers-reduced-motion is reduce, even if stored true", () => {
    installMatchMedia(true);
    window.localStorage.setItem(SOUND_STORAGE_KEY, "true");
    const { result } = renderHook(() => useSoundPreference());
    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.enabled).toBe(false);
  });

  it("persists setEnabled(false) and surfaces it as disabled", () => {
    installMatchMedia(false);
    const { result } = renderHook(() => useSoundPreference());
    act(() => {
      result.current.setEnabled(false);
    });
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe("false");
    expect(result.current.enabled).toBe(false);
  });

  it("setEnabled is a no-op under prefers-reduced-motion", () => {
    installMatchMedia(true);
    const { result } = renderHook(() => useSoundPreference());
    act(() => {
      result.current.setEnabled(true);
    });
    // No write to storage and no flip to enabled.
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBeNull();
    expect(result.current.enabled).toBe(false);
  });
});

describe("SoundProvider", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("exposes a context where play() is a no-op when disabled", () => {
    installMatchMedia(false);
    // Explicitly opt out so we exercise the disabled path.
    window.localStorage.setItem(SOUND_STORAGE_KEY, "false");

    let captured: ReturnType<typeof useSound> | null = null;
    function Probe() {
      captured = useSound();
      return null;
    }

    render(
      <SoundProvider>
        <Probe />
      </SoundProvider>,
    );

    expect(captured).not.toBeNull();
    expect(captured!.enabled).toBe(false);
    // Should not throw, even with no AudioContext available in jsdom.
    expect(() => captured!.play("buildComplete")).not.toThrow();
  });

  it("flips enabled false after setEnabled(false) and persists", () => {
    installMatchMedia(false);

    let captured: ReturnType<typeof useSound> | null = null;
    function Probe() {
      captured = useSound();
      return <span data-testid="enabled">{String(captured.enabled)}</span>;
    }

    render(
      <SoundProvider>
        <Probe />
      </SoundProvider>,
    );

    act(() => {
      captured!.setEnabled(false);
    });
    expect(window.localStorage.getItem(SOUND_STORAGE_KEY)).toBe("false");
    expect(screen.getByTestId("enabled").textContent).toBe("false");
  });

  it("falls back to a no-op shape when useSound is called outside a provider", () => {
    installMatchMedia(false);

    let captured: ReturnType<typeof useSound> | null = null;
    function Probe() {
      captured = useSound();
      return null;
    }

    render(<Probe />);
    expect(captured!.enabled).toBe(false);
    expect(() => captured!.play("message")).not.toThrow();
  });
});
