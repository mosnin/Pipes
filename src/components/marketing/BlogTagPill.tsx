import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * BlogTagPill
 *
 * Compact tag chip used on cards and on the article header. Single visual
 * style: a thin indigo border on a near-white background. Optionally
 * renders as a button for filter chips.
 */

export interface BlogTagPillProps {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  asButton?: boolean;
  className?: string;
}

export function BlogTagPill({
  children,
  active = false,
  onClick,
  asButton = false,
  className,
}: BlogTagPillProps) {
  const base = cn(
    "inline-flex items-center h-6 px-2.5 rounded-full t-caption font-medium border transition-colors",
    active
      ? "bg-violet-600 text-white border-violet-600"
      : "bg-white text-[#3C3C43] border-black/[0.08] hover:border-violet-300 hover:text-[#111]",
    className,
  );

  if (asButton || onClick) {
    return (
      <button type="button" onClick={onClick} className={base}>
        {children}
      </button>
    );
  }
  return <span className={base}>{children}</span>;
}
