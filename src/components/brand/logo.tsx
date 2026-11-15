import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * A single pipe that turns back on itself: a run that loops. Same solid,
 * monochrome geometry as the Company OS identity it shares a design language
 * with; currentColor keeps it legible on every surface.
 */
export function Mark({
  className,
  size = 18,
}: {
  className?: string;
  size?: number;
}): ReactNode {
  return (
    <svg
      viewBox="0 0 224 224"
      width={size}
      height={size}
      fill="currentColor"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      <path d="M0 0h224v224H72v-40h112V40H40v112h104v40H0Z" />
    </svg>
  );
}

/** The lowercase lockup uses the dedicated, regular-weight brand type role. */
export function Wordmark({ className }: { className?: string }): ReactNode {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-4 text-ink",
        className,
      )}
    >
      <Mark size={24} />
      <span className="t-brand whitespace-nowrap">pipes</span>
    </span>
  );
}
