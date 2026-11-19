"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * An on and off switch drawn from the tokens: a 32 by 18 track that fills
 * with the accent when on, and a thumb on the raised ground. The checked
 * state is carried by position and fill together, never by colour alone.
 */
export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled = false,
  className
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  /** The accessible name. */
  label: string;
  disabled?: boolean;
  className?: string;
}): ReactNode {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-[18px] w-[32px] shrink-0 items-center rounded-full p-[2px] outline-none",
        "transition-colors duration-[var(--dur-1)] ease-linear focus-ring",
        "disabled:cursor-not-allowed disabled:opacity-40",
        checked ? "bg-accent hover:bg-accent-text" : "bg-strong hover:bg-ink-4",
        className
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "block size-[14px] rounded-full bg-raised shadow-[0_1px_1px_0_rgba(0,0,0,0.12)]",
          "transition-transform duration-[var(--dur-2)] ease-[var(--ease-out)]",
          checked ? "translate-x-[14px]" : "translate-x-0"
        )}
      />
    </button>
  );
}
