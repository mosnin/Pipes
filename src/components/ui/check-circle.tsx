import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Podium's filled blue check that pops and draws its stroke; a dashed circle while not done. */
export function CheckCircle({ done = true, className }: { done?: boolean; className?: string }): ReactNode {
  return done ? (
    <svg viewBox="0 0 22 22" className={cn("t-check size-[20px] shrink-0 drop-shadow-[0_1px_1.5px_rgb(0_0_0/0.12)]", className)} aria-hidden>
      <circle cx="11" cy="11" r="10.5" fill="white" />
      <circle cx="11" cy="11" r="8.6" fill="var(--accent)" />
      <path d="M7.2 11.3l2.5 2.4 5-5.2" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 20 20" className={cn("size-[18px] shrink-0 text-faint", className)} aria-hidden>
      <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2.6 2.6" />
    </svg>
  );
}
