"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { SWRConfig, type SWRConfiguration } from "swr";
import { IconProvider } from "@/components/ui/icon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SweepProvider } from "@/lib/sweep";
import { fetcher } from "@/lib/swr";

/**
 * One data-fetching policy for every client read: identical requests within
 * two seconds share one fetch, a returning tab re-reads, and polling pauses
 * while the tab is hidden or offline.
 */
const SWR_CONFIG: SWRConfiguration = {
  fetcher,
  dedupingInterval: 2000,
  revalidateOnFocus: true,
  refreshWhenHidden: false,
  refreshWhenOffline: false
};

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SWRConfig value={SWR_CONFIG}>
        <MotionConfig reducedMotion="user">
          <IconProvider>
            <TooltipProvider>
              <SweepProvider>{children}</SweepProvider>
            </TooltipProvider>
          </IconProvider>
        </MotionConfig>
      </SWRConfig>
    </ThemeProvider>
  );
}
