"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type TouchEvent as ReactTouchEvent } from "react";

// usePinchZoom — pure hook for one-finger pan and two-finger pinch on a touch
// surface. No external dependency. Returns the current scale, translate, and
// the three touch handlers to spread onto the target element.
//
// Apply the transform on a child <g> (SVG) or <div>:
//   transform={`translate(${translate.x} ${translate.y}) scale(${scale})`}
//
// Scale is clamped between MIN_SCALE and MAX_SCALE. The transform origin is
// the touch midpoint so pinching at a corner zooms toward that corner.

export type Translate = { x: number; y: number };

export type PinchZoomState = {
  scale: number;
  translate: Translate;
};

export type PinchZoomHandlers = {
  onTouchStart: (event: ReactTouchEvent<Element>) => void;
  onTouchMove: (event: ReactTouchEvent<Element>) => void;
  onTouchEnd: (event: ReactTouchEvent<Element>) => void;
};

export type PinchZoomApi = PinchZoomState & PinchZoomHandlers & {
  setScale: (next: number) => void;
  setTranslate: (next: Translate) => void;
  reset: (next?: Partial<PinchZoomState>) => void;
};

export type PinchZoomOptions = {
  minScale?: number;
  maxScale?: number;
  initialScale?: number;
  initialTranslate?: Translate;
};

const DEFAULT_MIN_SCALE = 0.5;
const DEFAULT_MAX_SCALE = 3.0;

type Gesture =
  | { kind: "idle" }
  | { kind: "pan"; lastX: number; lastY: number }
  | {
      kind: "pinch";
      startDistance: number;
      startScale: number;
      startTranslate: Translate;
      midpoint: { x: number; y: number };
    };

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

type TouchPoint = { clientX: number; clientY: number };

function distanceBetween(a: TouchPoint, b: TouchPoint): number {
  const dx = a.clientX - b.clientX;
  const dy = a.clientY - b.clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

function midpointOf(a: TouchPoint, b: TouchPoint): { x: number; y: number } {
  return { x: (a.clientX + b.clientX) / 2, y: (a.clientY + b.clientY) / 2 };
}

export function usePinchZoom(options: PinchZoomOptions = {}): PinchZoomApi {
  const minScale = options.minScale ?? DEFAULT_MIN_SCALE;
  const maxScale = options.maxScale ?? DEFAULT_MAX_SCALE;
  const initialScale = options.initialScale ?? 1;
  // Memoize so the default object identity is stable across renders and the
  // `reset` callback dependency array does not churn.
  const initialTranslate = useMemo(
    () => options.initialTranslate ?? { x: 0, y: 0 },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options.initialTranslate?.x, options.initialTranslate?.y],
  );

  const [scale, setScaleState] = useState<number>(initialScale);
  const [translate, setTranslateState] = useState<Translate>(initialTranslate);

  const gestureRef = useRef<Gesture>({ kind: "idle" });

  // Keep latest scale/translate in a ref so the gesture handlers always see
  // fresh values without re-binding.
  const scaleRef = useRef<number>(scale);
  const translateRef = useRef<Translate>(translate);
  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);
  useEffect(() => {
    translateRef.current = translate;
  }, [translate]);

  const setScale = useCallback(
    (next: number): void => {
      setScaleState(clamp(next, minScale, maxScale));
    },
    [minScale, maxScale],
  );

  const setTranslate = useCallback((next: Translate): void => {
    setTranslateState(next);
  }, []);

  const reset = useCallback(
    (next?: Partial<PinchZoomState>): void => {
      setScaleState(clamp(next?.scale ?? initialScale, minScale, maxScale));
      setTranslateState(next?.translate ?? initialTranslate);
      gestureRef.current = { kind: "idle" };
    },
    [initialScale, initialTranslate, minScale, maxScale],
  );

  const onTouchStart = useCallback((event: ReactTouchEvent<Element>): void => {
    const touches = event.touches;
    if (touches.length === 1) {
      gestureRef.current = {
        kind: "pan",
        lastX: touches[0].clientX,
        lastY: touches[0].clientY,
      };
      return;
    }
    if (touches.length >= 2) {
      const a = touches[0];
      const b = touches[1];
      gestureRef.current = {
        kind: "pinch",
        startDistance: Math.max(distanceBetween(a, b), 0.001),
        startScale: scaleRef.current,
        startTranslate: { ...translateRef.current },
        midpoint: midpointOf(a, b),
      };
    }
  }, []);

  const onTouchMove = useCallback(
    (event: ReactTouchEvent<Element>): void => {
      const gesture = gestureRef.current;
      const touches = event.touches;

      if (gesture.kind === "pan" && touches.length === 1) {
        const t = touches[0];
        const dx = t.clientX - gesture.lastX;
        const dy = t.clientY - gesture.lastY;
        gestureRef.current = { kind: "pan", lastX: t.clientX, lastY: t.clientY };
        const tr = translateRef.current;
        const nextTranslate = { x: tr.x + dx, y: tr.y + dy };
        translateRef.current = nextTranslate;
        setTranslateState(nextTranslate);
        return;
      }

      if (gesture.kind === "pinch" && touches.length >= 2) {
        const a = touches[0];
        const b = touches[1];
        const currentDistance = Math.max(distanceBetween(a, b), 0.001);
        const ratio = currentDistance / gesture.startDistance;
        const nextScale = clamp(gesture.startScale * ratio, minScale, maxScale);
        // Pinch about the midpoint: keep the screen-space midpoint stable.
        // newTranslate = midpoint - (midpoint - oldTranslate) * (newScale/oldScale)
        const factor = nextScale / gesture.startScale;
        const mx = gesture.midpoint.x;
        const my = gesture.midpoint.y;
        const nextTranslate: Translate = {
          x: mx - (mx - gesture.startTranslate.x) * factor,
          y: my - (my - gesture.startTranslate.y) * factor,
        };
        scaleRef.current = nextScale;
        translateRef.current = nextTranslate;
        setScaleState(nextScale);
        setTranslateState(nextTranslate);
      }
    },
    [minScale, maxScale],
  );

  const onTouchEnd = useCallback((event: ReactTouchEvent<Element>): void => {
    const remaining = event.touches.length;
    if (remaining === 0) {
      gestureRef.current = { kind: "idle" };
      return;
    }
    if (remaining === 1) {
      // Pinch ended but one finger is still down: continue as a pan from that
      // finger's current position so the canvas does not jump.
      const t = event.touches[0];
      gestureRef.current = { kind: "pan", lastX: t.clientX, lastY: t.clientY };
    }
  }, []);

  return {
    scale,
    translate,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    setScale,
    setTranslate,
    reset,
  };
}
