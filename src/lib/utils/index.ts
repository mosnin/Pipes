import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string | number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric"
  }).format(new Date(dateString));
}

/**
 * The no-value marker: a lone dash in a metric tile or table cell is the glyph
 * for "no reading", not sentence punctuation (inherited from Company OS's
 * argued exception to anti-slop rule 20).
 */
export const NO_VALUE = "—";

/** "3 days ago": relative, coarse, and stable enough for SSR. `now` comes from the caller. */
export function timeAgo(ts: number | undefined, now: number): string {
  if (!ts) return NO_VALUE;
  const seconds = Math.floor((now - ts) / 1000);
  if (seconds < 45) return "just now";
  const table: [number, number, Intl.RelativeTimeFormatUnit][] = [
    [60, 1, "second"],
    [3600, 60, "minute"],
    [86400, 3600, "hour"],
    [604800, 86400, "day"],
    [2629800, 604800, "week"],
    [31557600, 2629800, "month"],
    [Infinity, 31557600, "year"]
  ];
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [limit, divisor, unit] of table) {
    if (seconds < limit) return rtf.format(-Math.floor(seconds / divisor), unit);
  }
  return NO_VALUE;
}
