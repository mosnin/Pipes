"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CirclePlay, Workflow, type LucideIcon } from "@/components/ui/icon";
import { SearchInput } from "@/components/ui/input";
import { FOOTER_ITEMS, navGroupsFor, type NavItem } from "@/components/shell/nav-config";
import { STATUS_LABEL } from "@/components/runs/run-format";
import type { RunStatus } from "@/domain/runs/types";
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

type SearchResults = {
  workflows: Array<{ id: string; name: string }>;
  runs: Array<{ id: string; workflowName: string; status: RunStatus }>;
};

type GroupName = "Workflows" | "Runs" | "Pages";

interface Entry {
  key: string;
  href: string;
  label: string;
  meta?: string;
  icon: LucideIcon;
  group: GroupName;
}

const SEARCH_DEBOUNCE_MS = 160;

/** Workflows and runs from the server, matched as you type; a stale reply never overwrites a newer one. */
function useRemoteResults(open: boolean, query: string): { results: SearchResults | null; loading: boolean } {
  const [state, setState] = useState<{ q: string; results: SearchResults } | null>(null);
  const [loading, setLoading] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    if (!open) return;
    const ticket = ++latest.current;
    const q = query.trim();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { cache: "no-store" })
        .then((res) => res.json())
        .then((json) => {
          if (ticket !== latest.current) return;
          if (json?.ok) setState({ q, results: json.data as SearchResults });
        })
        .catch(() => undefined)
        .finally(() => {
          if (ticket === latest.current) setLoading(false);
        });
    }, q ? SEARCH_DEBOUNCE_MS : 0);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  return { results: state?.results ?? null, loading };
}

export function SearchDialog({ controller, isAdmin }: { controller: SearchController; isAdmin: boolean }): ReactNode {
  const router = useRouter();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const { results, loading } = useRemoteResults(controller.isOpen, query);

  const entries = useMemo<Entry[]>(() => {
    const needle = query.trim().toLowerCase();
    const pages: Array<NavItem & { section?: string }> = [
      ...navGroupsFor(isAdmin).flatMap((group) => group.items.map((item) => ({ ...item, section: group.label }))),
      ...FOOTER_ITEMS
    ];
    const pageEntries: Entry[] = pages
      .filter((page) => !needle || `${page.label} ${page.section ?? ""}`.toLowerCase().includes(needle))
      .map((page) => ({ key: `page:${page.href}`, href: page.href, label: page.label, meta: page.section, icon: page.icon, group: "Pages" }));
    const workflowEntries: Entry[] = (results?.workflows ?? []).map((w) => ({
      key: `workflow:${w.id}`,
      href: `/systems/${w.id}`,
      label: w.name,
      icon: Workflow,
      group: "Workflows"
    }));
    const runEntries: Entry[] = (results?.runs ?? []).map((r) => ({
      key: `run:${r.id}`,
      href: `/runs/${r.id}`,
      label: r.workflowName,
      meta: STATUS_LABEL[r.status] ?? r.status,
      icon: CirclePlay,
      group: "Runs"
    }));
    return [...workflowEntries, ...runEntries, ...pageEntries];
  }, [isAdmin, query, results]);

  const activeIndex = Math.min(cursor, Math.max(entries.length - 1, 0));
  const active = entries[activeIndex];

  useEffect(() => {
    if (!controller.isOpen) return;
    document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, controller.isOpen, listId]);

  const go = (href: string) => {
    controller.setOpen(false);
    setQuery("");
    setCursor(0);
    router.push(href);
  };

  const groups: Array<{ name: GroupName; items: Array<{ entry: Entry; index: number }> }> = [];
  entries.forEach((entry, index) => {
    const last = groups[groups.length - 1];
    if (last?.name === entry.group) last.items.push({ entry, index });
    else groups.push({ name: entry.group, items: [{ entry, index }] });
  });

  return (
    <Dialog
      open={controller.isOpen}
      onOpenChange={(open) => {
        controller.setOpen(open);
        if (!open) setCursor(0);
      }}
    >
      <DialogContent size="form" showClose={false} className="overflow-hidden">
        <DialogTitle className="sr-only">Search Pipes</DialogTitle>
        <div className="p-2">
          <SearchInput
            autoFocus
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={active ? `${listId}-${activeIndex}` : undefined}
            aria-label="Search workflows, runs and pages"
            placeholder="Search workflows, runs and pages"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor(Math.min(activeIndex + 1, entries.length - 1));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor(Math.max(activeIndex - 1, 0));
              } else if (event.key === "Enter" && active) {
                event.preventDefault();
                go(active.href);
              }
            }}
            onClear={() => {
              setQuery("");
              setCursor(0);
            }}
          />
        </div>
        <div id={listId} role="listbox" aria-label="Results" className="max-h-[420px] overflow-y-auto border-t border-hairline p-1">
          {entries.length === 0 ? (
            <p className="t-body px-2 py-4 text-ink-3">{loading ? "Searching" : "Nothing matches that."}</p>
          ) : (
            groups.map((group) => (
              <div key={group.name} role="group" aria-labelledby={`${listId}-${group.name}`} className="pb-1 last:pb-0">
                <p id={`${listId}-${group.name}`} className="t-caption-medium px-1.5 pt-1.5 pb-1 text-ink-3">
                  {group.name}
                </p>
                {group.items.map(({ entry, index }) => {
                  const Icon = entry.icon;
                  const selected = index === activeIndex;
                  return (
                    <div
                      key={entry.key}
                      id={`${listId}-${index}`}
                      role="option"
                      aria-selected={selected}
                      tabIndex={-1}
                      onMouseEnter={() => setCursor(index)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => go(entry.href)}
                      className={cn(
                        "flex h-[36px] w-full cursor-pointer items-center gap-2 rounded-8 px-1.5 text-left outline-none transition-colors duration-[var(--dur-1)]",
                        selected ? "bg-selected text-ink" : "text-ink-2 hover:bg-state-hover"
                      )}
                    >
                      <Icon className="size-[16px] shrink-0 text-ink-3" strokeWidth={1.5} />
                      <span className="t-body min-w-0 flex-1 truncate">{entry.label}</span>
                      {entry.meta ? (
                        <span className="t-caption max-w-[45%] shrink-0 truncate text-ink-3">{entry.meta}</span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
