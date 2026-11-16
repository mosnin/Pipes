import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface DailyPoint {
  /** `YYYY-MM-DD` */
  day: string;
  value: number;
}

const fmt = (n: number) => n.toLocaleString("en-US");

/**
 * A month of daily counts as plain bars: one column per day, heights against
 * the month's busiest day, the scale's top value on the left and the first,
 * middle and last day under the axis. Built from tokens, no chart library.
 *
 * Zero days draw nothing above the baseline, so a quiet day reads as a gap
 * rather than as a short bar. A visually hidden table carries the same
 * figures for screen readers.
 */
export function DailyBars({ points, noun, className }: { points: DailyPoint[]; noun: string; className?: string }): ReactNode {
  const max = Math.max(0, ...points.map((p) => p.value));
  const ticks = points.length > 0 ? [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]] : [];
  const dayOf = (day: string) => String(Number(day.slice(8, 10)));

  return (
    <figure className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-stretch gap-4">
        <div aria-hidden="true" className="t-mono-micro flex w-[40px] shrink-0 flex-col justify-between text-right tabular text-ink-3">
          <span>{fmt(max)}</span>
          <span>0</span>
        </div>
        <div aria-hidden="true" className="relative flex h-[160px] min-w-0 flex-1 items-end gap-[2px] border-b border-strong">
          <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-hairline" />
          {points.map((p) => {
            const height = max > 0 ? (p.value / max) * 100 : 0;
            return (
              <div key={p.day} className="group relative flex h-full min-w-0 flex-1 items-end" title={`${p.day}: ${fmt(p.value)} ${noun}`}>
                {p.value > 0 ? (
                  <span
                    className="block w-full rounded-t-2 bg-accent transition-colors duration-[var(--dur-1)] ease-linear group-hover:bg-accent-text"
                    style={{ height: `max(${height}%, 2px)` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div aria-hidden="true" className="t-mono-micro flex justify-between ps-[56px] tabular text-ink-3">
        {ticks.map((p, index) => (
          <span key={`${p.day}-${index}`}>{dayOf(p.day)}</span>
        ))}
      </div>
      <table className="sr-only">
        <caption>{`Daily ${noun}`}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{noun}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.day}>
              <td>{p.day}</td>
              <td>{p.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
