"use client";

import { type ReactNode } from "react";
import { useNow } from "@/lib/now";
import { cn, formatDate, timeAgo } from "@/lib/utils";

export interface RelativeTimeProps {
  at: number | null | undefined;
  className?: string;
}

/**
 * LEDGER INSTRUMENT — RelativeTime (§9.26).
 *
 * Three problems this solves, in order of severity:
 *
 * 1. SSR DISAGREEMENT. A relative reading needs the clock, so a server render
 *    and a client hydration would be computed at two different instants and are
 *    free to disagree — that is a hydration error, not a rounding difference.
 *    So the clock is read from the `useNow()` store, whose server snapshot is
 *    `null`: the first paint is the ABSOLUTE date (stable, and already the value
 *    we want in the title) and the relative string takes over once the store
 *    lands. There is never a blank frame and never an empty box.
 *
 * 2. A RELATIVE STRING THAT STOPS BEING TRUE. "just now" is only true for
 *    forty-five seconds. `useNow()` re-reads on one shared 30s tick, so a ledger
 *    of two hundred rows costs ONE interval rather than two hundred timers —
 *    which is what a per-row cadence, however well tuned, actually costs.
 *
 * 3. THE EXACT TIME BEING UNREACHABLE. `dateTime` carries the machine-readable
 *    instant and `title` carries the human one, because the precise timestamp is
 *    what correlates a run with a commit.
 */
export function RelativeTime({ at, className }: RelativeTimeProps): ReactNode {
  const now = useNow();
  const valid = typeof at === "number" && Number.isFinite(at) && at > 0;

  // Absent renders an em dash at `--text-tertiary` (§3.6). A missing timestamp
  // is a fact about the record, not a reason to render nothing.
  if (!valid) {
    return <span className={cn("t-caption text-ink-3", className)}> </span>;
  }

  const ts = at as number;
  const absolute = formatDate(ts);
  return (
    <time
      dateTime={new Date(ts).toISOString()}
      title={absolute}
      // The server and the client format in their own time zones; the swap when
      // the clock lands corrects it and this keeps the intervening frame quiet.
      suppressHydrationWarning
      className={cn("t-caption whitespace-nowrap text-ink-3", className)}
    >
      {/* No clock yet is not "zero seconds ago": until the store lands this is
          the absolute date, which is a true reading of the same instant. */}
      {now === null ? absolute : timeAgo(ts, now)}
    </time>
  );
}
