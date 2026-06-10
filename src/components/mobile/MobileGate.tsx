"use client";

import type { ReactNode } from "react";
import { useViewport } from "@/lib/useViewport";

// MobileGate: explicit branch between desktop and mobile renderings. We chose
// desktop-first for the editor. This component makes that decision visible
// instead of letting a broken layout speak for us.
//
// The hook returns isMobile=false during SSR and on the first client paint,
// so the desktop branch always renders first. After the viewport is measured,
// the swap may happen client-side. That is intentional and avoids hydration
// mismatches because the swap is the entire subtree, not an attribute diff.

export type MobileGateProps = {
  children: ReactNode;
  mobile: ReactNode;
  breakpoint?: number;
};

export function MobileGate({ children, mobile, breakpoint }: MobileGateProps) {
  const { isMobile } = useViewport(breakpoint);
  if (isMobile) return <>{mobile}</>;
  return <>{children}</>;
}
