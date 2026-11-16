"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { IconProvider } from "@/components/ui/icon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SweepProvider } from "@/lib/sweep";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion="user">
        <IconProvider>
          <TooltipProvider>
            <SweepProvider>{children}</SweepProvider>
          </TooltipProvider>
        </IconProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
