"use client";

import { useMemo, useState } from "react";
import { smoothScrollToId } from "@/lib/marketing/useScrollSpy";

export interface DocsNavItem {
  id: string;
  label: string;
}

export interface DocsNavCategory {
  title: string;
  items: ReadonlyArray<DocsNavItem>;
}

export interface DocsSidebarProps {
  categories: ReadonlyArray<DocsNavCategory>;
  activeId: string | null;
  searchable?: boolean;
}

/**
 * DocsSidebar
 *
 * Vertical, categorized navigation tree. Active link tracking is driven by the
 * parent (scrollspy result is passed in via `activeId`). When `searchable` is
 * true, an inline search input filters categories by label substring.
 *
 * Keyboard:
 *  - Arrow Up / Arrow Down move focus between visible items.
 *  - Enter or click activates a link, smooth-scrolling to its target.
 *  - Items are real <a href="#id"> elements so right-click "copy link" works.
 */

export function DocsSidebar({
  categories,
  activeId,
  searchable = true,
}: DocsSidebarProps) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo<ReadonlyArray<DocsNavCategory>>(() => {
    if (q.length === 0) return categories;
    const out: DocsNavCategory[] = [];
    for (const cat of categories) {
      const items = cat.items.filter(
        (it) =>
          it.label.toLowerCase().includes(q) ||
          cat.title.toLowerCase().includes(q),
      );
      if (items.length > 0) {
        out.push({ title: cat.title, items });
      }
    }
    return out;
  }, [categories, q]);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, id: string): void {
    e.preventDefault();
    smoothScrollToId(id);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLDivElement>): void {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const links = e.currentTarget.querySelectorAll<HTMLAnchorElement>(
      "a[data-docs-nav-link]",
    );
    if (links.length === 0) return;
    const arr = Array.from(links);
    const current = document.activeElement;
    const idx = arr.findIndex((l) => l === current);
    e.preventDefault();
    const nextIdx =
      e.key === "ArrowDown"
        ? Math.min(arr.length - 1, idx + 1)
        : Math.max(0, idx - 1);
    arr[nextIdx]?.focus();
  }

  return (
    <nav
      aria-label="Docs navigation"
      className="flex flex-col gap-5"
      onKeyDown={onKeyDown}
    >
      {searchable ? (
        <div className="relative">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter sections"
            aria-label="Filter docs sections"
            className="w-full h-9 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] placeholder:text-[#8E8E93] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
      ) : null}
      <div className="flex flex-col gap-5">
        {filtered.length === 0 ? (
          <p className="t-caption text-[#8E8E93] px-2">No matches.</p>
        ) : null}
        {filtered.map((cat) => (
          <div key={cat.title} className="flex flex-col gap-0.5">
            <h4 className="t-overline text-[#8E8E93] mb-1.5 px-2">
              {cat.title}
            </h4>
            {cat.items.map((item) => {
              const isActive = activeId === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  data-docs-nav-link
                  data-active={isActive ? "true" : "false"}
                  onClick={(e) => handleClick(e, item.id)}
                  className={[
                    "relative pl-3 pr-2 py-1.5 rounded-md t-label transition-colors",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
                    isActive
                      ? "text-[#4F46E5] bg-[#EEF2FF] font-medium"
                      : "text-[#3C3C43] hover:text-[#111] hover:bg-black/[0.04]",
                  ].join(" ")}
                >
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 top-1.5 bottom-1.5 w-[2px] rounded-full bg-[#4F46E5]"
                    />
                  ) : null}
                  {item.label}
                </a>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}
