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
