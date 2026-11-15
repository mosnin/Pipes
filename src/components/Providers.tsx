"use client";

import { ConvexProvider } from "convex/react";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { IconProvider } from "@/components/ui/icon";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getConvexReactClient } from "@/lib/convex/reactClient";
import { clientRuntimeFlags } from "@/lib/env/client";

function DataProvider({ children }: { children: ReactNode }) {
  if (clientRuntimeFlags.useMocks || !clientRuntimeFlags.hasConvex) return <>{children}</>;
  return <ConvexProvider client={getConvexReactClient()}>{children}</ConvexProvider>;
}

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion="user">
        <IconProvider>
          <TooltipProvider>
            <DataProvider>{children}</DataProvider>
          </TooltipProvider>
        </IconProvider>
      </MotionConfig>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: "!bg-overlay !border-border !text-ink !rounded-12 !shadow-elev-2 !font-sans",
            title: "!t-body-strong",
            description: "!t-caption !text-ink-2",
            actionButton: "!h-8 !rounded-8 !bg-control !px-4 !t-caption-medium !text-ink hover:!bg-selected focus-ring-canvas !outline-none"
          }
        }}
      />
    </ThemeProvider>
  );
}
