import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Podium's dots, not badges: blue for new, orange for needs-you, a pulsing green for live. */
export function Dot({ tone = "accent", label }: { tone?: "accent" | "warn" | "live"; label?: string }): ReactNode {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn("inline-block size-[7px] shrink-0 rounded-full", tone === "accent" && "bg-accent", tone === "warn" && "bg-queued", tone === "live" && "live-dot bg-floor")}
    />
  );
}
