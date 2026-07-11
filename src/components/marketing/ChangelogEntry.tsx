"use client";

import { useState } from "react";
import { Check, ArrowUpRight, Wrench, Link as LinkIcon } from "lucide-react";
import type { ChangelogEntry as ChangelogEntryData } from "@/lib/marketing/changelog-data";

/**
 * ChangelogEntry
 *
 * One changelog entry: version pill, date, title, categorized changes
 * (Shipped / Improved / Fixed) and a permalink that copies to clipboard on
 * click. ASCII glyphs only via lucide.
 */

const KIND_CONFIG = {
  shipped: {
    label: "Shipped",
    icon: Check,
    badge: "border-emerald-100 bg-emerald-50 text-emerald-800",
    iconColor: "text-emerald-700",
  },
  improved: {
    label: "Improved",
    icon: ArrowUpRight,
    badge: "border-violet-100 bg-violet-50 text-violet-700",
    iconColor: "text-violet-700",
  },
  fixed: {
    label: "Fixed",
    icon: Wrench,
    badge: "border-amber-100 bg-amber-50 text-amber-800",
    iconColor: "text-amber-700",
  },
} as const;

function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export interface ChangelogEntryProps {
  entry: ChangelogEntryData;
}

export function ChangelogEntry({ entry }: ChangelogEntryProps) {
  const [copied, setCopied] = useState(false);
  const grouped = {
    shipped: entry.changes.filter((c) => c.kind === "shipped"),
    improved: entry.changes.filter((c) => c.kind === "improved"),
    fixed: entry.changes.filter((c) => c.kind === "fixed"),
  };

  function copyLink() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/changelog#${entry.anchor}`;
    void navigator.clipboard?.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article
      id={entry.anchor}
      data-testid="changelog-entry"
      data-version={entry.version}
      data-date={entry.date}
      className="group relative rounded-3xl border border-black/[0.06] bg-white p-8 shadow-xs sm:p-10"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className="inline-flex items-center rounded-full border border-black/[0.08] bg-[#FAFAFA] px-2.5 py-1 t-caption font-mono font-semibold text-[#111]">
          {entry.version}
        </span>
        <span className="t-caption text-[#8E8E93]">
          {formatDate(entry.date)}
        </span>
        <button
          type="button"
          onClick={copyLink}
          className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-full border border-transparent px-3 t-caption text-[#8E8E93] opacity-0 transition-all hover:border-black/[0.08] hover:text-[#111] focus:opacity-100 group-hover:opacity-100"
          aria-label={`Copy permalink to ${entry.version}`}
        >
          <LinkIcon size={12} aria-hidden="true" />
          {copied ? "Copied" : "Copy link"}
        </button>
      </header>

      <h3 className="mt-4 t-h2 text-[#111]">{entry.title}</h3>
      <p className="mt-3 t-body text-[#3C3C43] leading-relaxed">
        {entry.summary}
      </p>

      <div className="mt-7 flex flex-col gap-5 border-t border-black/[0.06] pt-7">
        {(["shipped", "improved", "fixed"] as const).map((kind) => {
          const items = grouped[kind];
          if (items.length === 0) return null;
          const cfg = KIND_CONFIG[kind];
          const Icon = cfg.icon;
          return (
            <div key={kind} className="flex flex-col gap-2">
              <span
                className={[
                  "inline-flex w-fit items-center rounded-full border px-2.5 py-0.5 t-caption font-semibold uppercase tracking-[0.08em]",
                  cfg.badge,
                ].join(" ")}
              >
                {cfg.label}
              </span>
              <ul className="mt-1 flex flex-col gap-1.5">
                {items.map((item, i) => (
                  <li
                    key={`${kind}-${i}`}
                    className="flex items-start gap-2.5 t-label text-[#111]"
                  >
                    <span
                      aria-hidden="true"
                      className={["mt-0.5 shrink-0", cfg.iconColor].join(" ")}
                    >
                      <Icon size={14} />
                    </span>
                    <span className="leading-relaxed">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </article>
  );
}
