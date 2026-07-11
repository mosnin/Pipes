"use client";

import { useEffect, useState } from "react";

// Viewport hook. SSR-safe by design: the initial width is 0 so `isMobile`
// always renders as false on the server and on the first client paint. The
// resize listener then sets the real width on mount, which can flip the value
// without causing a hydration mismatch (the only DOM diff is content inside
// the gate, not attribute-level markup React reconciles against SSR output).
//
// Default breakpoint is 768 px (the tablet/phone boundary used elsewhere in
// the codebase via Tailwind `md:`). The decision to treat <768 as mobile is
// deliberate: the editor canvas needs real estate, not a coat-hanger.

export type Viewport = { isMobile: boolean; width: number };

export function useViewport(breakpoint: number = 768): Viewport {
  const [width, setWidth] = useState<number>(0);

  useEffect(() => {
    const update = (): void => {
      setWidth(window.innerWidth);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return { isMobile: width > 0 && width < breakpoint, width };
}

// useIsTouch: true when the primary pointer is coarse (no precise mouse).
// This lets us separate "small viewport, has mouse" (a docked laptop window)
// from "phone or tablet". The mobile UI keys on both: narrow viewport AND
// touch-only. SSR-safe: returns false until the effect runs.
export function useIsTouch(): boolean {
  const [touch, setTouch] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const coarse = window.matchMedia("(pointer: coarse)");
    const noHover = window.matchMedia("(hover: none)");
    const evaluate = (): void => {
      setTouch(coarse.matches || noHover.matches);
    };
    evaluate();
    const onCoarse = (): void => evaluate();
    const onHover = (): void => evaluate();
    // addEventListener for MediaQueryList is the modern API; older Safari uses
    // addListener. Wrap both so jsdom and real browsers both work.
    if (typeof coarse.addEventListener === "function") {
      coarse.addEventListener("change", onCoarse);
      noHover.addEventListener("change", onHover);
      return () => {
        coarse.removeEventListener("change", onCoarse);
        noHover.removeEventListener("change", onHover);
      };
    }
    return undefined;
  }, []);

  return touch;
}

// useIsMobileExperience: combine viewport + touch. The mobile experience is
// for narrow viewports on touch devices. A 700px-wide laptop window keeps the
// desktop UI because the user has a mouse.
export function useIsMobileExperience(breakpoint: number = 768): boolean {
  const { isMobile } = useViewport(breakpoint);
  const touch = useIsTouch();
  return isMobile && touch;
}
