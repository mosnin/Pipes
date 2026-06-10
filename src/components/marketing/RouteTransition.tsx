"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * RouteTransition
 *
 * Cross-fades the marketing surface between routes. A 220ms ease-out lift
 * (8px up, 8px down) under prefers-reduced-motion: no-preference; instant
 * swap when reduced motion is requested.
 *
 * Only the marketing shell mounts this — the app surface (editor, settings,
 * etc.) is unchanged.
 */
export interface RouteTransitionProps {
  children: ReactNode;
}

const EASE = [0.2, 0.8, 0.2, 1] as const;
const DURATION_SEC = 0.22;
const LIFT_PX = 8;

export function RouteTransition({ children }: RouteTransitionProps) {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={pathname ?? "root"}
        data-testid="route-transition"
        data-pathname={pathname ?? ""}
        initial={reduced ? false : { opacity: 0, y: LIFT_PX }}
        animate={{ opacity: 1, y: 0 }}
        exit={reduced ? undefined : { opacity: 0, y: -LIFT_PX }}
        transition={{ duration: DURATION_SEC, ease: EASE }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
