import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import type { TouchEvent as ReactTouchEvent } from "react";
import { usePinchZoom } from "@/components/mobile/usePinchZoom";

// Build a minimal React-style synthetic touch event with the shape the hook
// actually reads (touches[i].clientX/clientY). jsdom's TouchEvent constructor
// is missing in many environments, so we hand-roll.
type FakeTouch = { clientX: number; clientY: number };

function makeEvent(touches: FakeTouch[]): ReactTouchEvent<Element> {
  return { touches } as unknown as ReactTouchEvent<Element>;
}

describe("usePinchZoom", () => {
  it("starts at the initial scale and translate", () => {
    const { result } = renderHook(() => usePinchZoom());
    expect(result.current.scale).toBe(1);
    expect(result.current.translate).toEqual({ x: 0, y: 0 });
  });

  it("pans on one-finger drag", () => {
    const { result } = renderHook(() => usePinchZoom());
    act(() => {
      result.current.onTouchStart(makeEvent([{ clientX: 100, clientY: 100 }]));
    });
    act(() => {
      result.current.onTouchMove(makeEvent([{ clientX: 130, clientY: 150 }]));
    });
    expect(result.current.translate).toEqual({ x: 30, y: 50 });
    act(() => {
      result.current.onTouchEnd(makeEvent([]));
    });
  });

  it("zooms on two-finger pinch and stays clamped", () => {
    const { result } = renderHook(() => usePinchZoom({ minScale: 0.5, maxScale: 3.0 }));
    act(() => {
      result.current.onTouchStart(
        makeEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      );
    });
    // Spread fingers apart, doubling the distance.
    act(() => {
      result.current.onTouchMove(
        makeEvent([
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ]),
      );
    });
    expect(result.current.scale).toBeGreaterThan(1.5);
    expect(result.current.scale).toBeLessThanOrEqual(3.0);

    // Crush them together to test the lower clamp.
    act(() => {
      result.current.onTouchStart(
        makeEvent([
          { clientX: 50, clientY: 100 },
          { clientX: 250, clientY: 100 },
        ]),
      );
    });
    act(() => {
      result.current.onTouchMove(
        makeEvent([
          { clientX: 149, clientY: 100 },
          { clientX: 151, clientY: 100 },
        ]),
      );
    });
    expect(result.current.scale).toBeGreaterThanOrEqual(0.5);
  });

  it("clamps via reset and exposes setScale", () => {
    const { result } = renderHook(() => usePinchZoom({ minScale: 0.5, maxScale: 2.0 }));
    act(() => {
      result.current.setScale(10);
    });
    expect(result.current.scale).toBe(2.0);
    act(() => {
      result.current.setScale(0.1);
    });
    expect(result.current.scale).toBe(0.5);
    act(() => {
      result.current.reset({ scale: 1.2, translate: { x: 5, y: 6 } });
    });
    expect(result.current.scale).toBe(1.2);
    expect(result.current.translate).toEqual({ x: 5, y: 6 });
  });

  it("transitions from pinch to pan when one finger lifts", () => {
    const { result } = renderHook(() => usePinchZoom());
    act(() => {
      result.current.onTouchStart(
        makeEvent([
          { clientX: 100, clientY: 100 },
          { clientX: 200, clientY: 100 },
        ]),
      );
    });
    act(() => {
      result.current.onTouchEnd(makeEvent([{ clientX: 100, clientY: 100 }]));
    });
    // After one finger remains, panning should now work without re-starting.
    act(() => {
      result.current.onTouchMove(makeEvent([{ clientX: 120, clientY: 110 }]));
    });
    expect(result.current.translate.x).not.toBe(0);
    expect(result.current.translate.y).not.toBe(0);
  });
});
