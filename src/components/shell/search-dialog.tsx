"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { SearchInput } from "@/components/ui/input";
import { FOOTER_ITEMS, navGroupsFor, type NavItem } from "@/components/shell/nav-config";
import { cn } from "@/lib/utils";

export interface SearchController {
  isOpen: boolean;
  open: () => void;
  setOpen: (open: boolean) => void;
}

/** One palette for the whole chassis, opened from the bar or with ⌘K. */
export function useSearchDialog(): SearchController {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return { isOpen, open, setOpen };
}

export function SearchDialog({ controller, isAdmin }: { controller: SearchController; isAdmin: boolean }): ReactNode {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const entries = useMemo(() => {
    const all: Array<NavItem & { group?: string }> = [
      ...navGroupsFor(isAdmin).flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))),
      ...FOOTER_ITEMS
    ];
    const needle = query.trim().toLowerCase();
    return needle ? all.filter((entry) => `${entry.label} ${entry.group ?? ""}`.toLowerCase().includes(needle)) : all;
  }, [isAdmin, query]);

  const go = (href: string) => {
    controller.setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <Dialog open={controller.isOpen} onOpenChange={controller.setOpen}>
      <DialogContent size="form" showClose={false} className="overflow-hidden">
        <DialogTitle className="sr-only">Search Pipes</DialogTitle>
        <div className="p-4">
          <SearchInput
            autoFocus
            placeholder="Jump to a page"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((c) => Math.min(c + 1, entries.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (event.key === "Enter" && entries[cursor]) {
                event.preventDefault();
                go(entries[cursor].href);
              }
            }}
            onClear={() => setQuery("")}
          />
        </div>
        <ul role="listbox" aria-label="Pages" className="max-h-[360px] overflow-y-auto border-t border-hairline p-2">
          {entries.length === 0 ? (
            <li className="t-body px-4 py-6 text-ink-3">Nothing matches that.</li>
          ) : (
            entries.map((entry, index) => {
              const Icon = entry.icon;
              return (
                <li key={entry.href} role="option" aria-selected={index === cursor}>
                  <button
                    type="button"
                    onMouseEnter={() => setCursor(index)}
                    onClick={() => go(entry.href)}
                    className={cn(
                      "flex h-[36px] w-full items-center gap-4 rounded-8 px-3 text-left outline-none transition-colors duration-[var(--dur-1)]",
                      index === cursor ? "bg-selected text-ink" : "text-ink-2 hover:bg-state-hover"
                    )}
                  >
                    <Icon className="size-[16px] shrink-0 text-ink-3" strokeWidth={1.5} />
                    <span className="t-body min-w-0 flex-1 truncate">{entry.label}</span>
                    {entry.group ? <span className="t-caption shrink-0 text-ink-3">{entry.group}</span> : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
