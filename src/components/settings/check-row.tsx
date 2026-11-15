"use client";

import type { ReactNode } from "react";
import { Check } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * A designed checkbox row, as Company OS draws a capability grant: an 18px
 * box with a 1.5px strong edge, filled with the accent and a 12px check when
 * chosen. Never raw OS chrome; the whole row is the hit area.
 */
export function CheckRow({
  label,
  description,
  checked,
  onToggle,
  mono = false
}: {
  label: ReactNode;
  description?: ReactNode;
  checked: boolean;
  onToggle: () => void;
  /** Set the label in Geist Mono, for identifiers such as `systems:read`. */
  mono?: boolean;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-5 rounded-8 px-4 py-3 text-left",
        "outline-none transition-colors duration-[var(--dur-1)] ease-linear focus-ring",
        "hover:bg-state-hover active:bg-state-active"
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-4 border-[1.5px]",
          "transition-colors duration-[var(--dur-1)] ease-linear",
          checked ? "border-transparent bg-accent text-action-label" : "border-strong bg-transparent text-transparent"
        )}
      >
        <Check size={12} strokeWidth={2} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={cn(mono ? "t-mono-hash" : "t-body", "text-ink")}>{label}</span>
        {description ? <span className="t-caption text-ink-3">{description}</span> : null}
      </span>
    </button>
  );
}
