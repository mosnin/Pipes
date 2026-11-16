"use client";

import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { IconProvider } from "@/components/ui/icon";
import { TooltipProvider } from "@/components/ui/tooltip";

export function Providers({ children }: { children: ReactNode }): ReactNode {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MotionConfig reducedMotion="user">
        <IconProvider>
          <TooltipProvider>
            {children}
          </TooltipProvider>
        </IconProvider>
      </MotionConfig>
      <Toaster
        position="bottom-right"
        toastOptions={{
          classNames: {
            // Podium's toast: a card pill with the float shadow, the action a black pill.
            toast: "!bg-card !border-border !text-foreground !rounded-[22px] !shadow-float !font-sans",
            title: "!text-[14px] !font-medium",
            description: "!text-[13px] !text-muted-foreground",
            actionButton: "!h-7 !rounded-full !bg-primary !px-3 !text-[12px] !font-medium !text-primary-foreground hover:!opacity-90"
          }
        }}
      />
    </ThemeProvider>
  );
}
