import { Clock, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { BlogAuthor } from "@/lib/blog/types";

/**
 * BlogAuthorBlock
 *
 * Byline with author initials avatar, name, role, reading time, and date.
 * Used on the article header and (in a compact form) on cards.
 */

export interface BlogAuthorBlockProps {
  author: BlogAuthor;
  date: string;
  readingTimeMin: number;
  compact?: boolean;
  className?: string;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function BlogAuthorBlock({
  author,
  date,
  readingTimeMin,
  compact = false,
  className,
}: BlogAuthorBlockProps) {
  const initials = initialsOf(author.name);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 t-caption text-[#8E8E93]", className)}>
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white t-micro font-semibold"
        >
          {initials}
        </span>
        <span className="text-[#3C3C43] font-medium">{author.name}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{formatDate(date)}</span>
        <span aria-hidden="true">&middot;</span>
        <span>{readingTimeMin} min</span>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white t-label font-semibold"
      >
        {initials}
      </span>
      <div className="flex flex-col">
        <span className="t-label font-semibold text-[#111]">{author.name}</span>
        <span className="t-caption text-[#8E8E93]">{author.role}</span>
      </div>
      <div className="hidden sm:flex items-center gap-3 ml-3 pl-3 border-l border-black/[0.08]">
        <span className="inline-flex items-center gap-1.5 t-caption text-[#3C3C43]">
          <Calendar size={12} aria-hidden="true" />
          {formatDate(date)}
        </span>
        <span className="inline-flex items-center gap-1.5 t-caption text-[#3C3C43]">
          <Clock size={12} aria-hidden="true" />
          {readingTimeMin} min read
        </span>
      </div>
    </div>
  );
}
