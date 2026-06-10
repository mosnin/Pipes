"use client";

import { useMemo } from "react";
import { ChangelogEntry } from "@/components/marketing/ChangelogEntry";
import type { ChangelogEntry as ChangelogEntryData } from "@/lib/marketing/changelog-data";

/**
 * ChangelogTimeline
 *
 * Vertical timeline with year markers that stick to the top of the column as
 * the user scrolls past entries. Entries are grouped under their year header.
 * Sticky positioning uses position:sticky on the year header.
 */

interface YearGroup {
  year: string;
  entries: ReadonlyArray<ChangelogEntryData>;
}

function groupByYear(
  entries: ReadonlyArray<ChangelogEntryData>,
): ReadonlyArray<YearGroup> {
  const map = new Map<string, ChangelogEntryData[]>();
  for (const entry of entries) {
    const year = entry.date.slice(0, 4);
    const bucket = map.get(year);
    if (bucket == null) {
      map.set(year, [entry]);
    } else {
      bucket.push(entry);
    }
  }
  // Newest year first; entries inside each year preserve incoming order.
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, list]) => ({ year, entries: list }));
}

export interface ChangelogTimelineProps {
  entries: ReadonlyArray<ChangelogEntryData>;
}

export function ChangelogTimeline({ entries }: ChangelogTimelineProps) {
  const grouped = useMemo(() => groupByYear(entries), [entries]);

  return (
    <div data-testid="changelog-timeline" className="flex flex-col gap-12">
      {grouped.map((group) => (
        <section
          key={group.year}
          aria-label={`Releases in ${group.year}`}
          className="flex flex-col gap-6"
        >
          <div
            data-testid="changelog-year-marker"
            className="sticky top-20 z-20 -mx-2 flex items-center gap-3 bg-white/85 px-2 py-2 backdrop-blur"
          >
            <h2
              className="text-[#111]"
              style={{
                fontSize: 28,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                fontWeight: 700,
              }}
            >
              {group.year}
            </h2>
            <span className="t-caption text-[#8E8E93]">
              {group.entries.length}{" "}
              {group.entries.length === 1 ? "release" : "releases"}
            </span>
            <div className="ml-2 h-px flex-1 bg-black/[0.06]" />
          </div>
          <div className="flex flex-col gap-6">
            {group.entries.map((entry) => (
              <ChangelogEntry key={entry.anchor} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
