"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search, X } from "lucide-react";
import { smoothScrollToId } from "@/lib/marketing/useScrollSpy";
import type { DocsNavCategory } from "@/components/marketing/DocsSidebar";

/**
 * DocsSearchTrigger
 *
 * A button that opens a centered search dialog. The dialog filters the
 * supplied docs nav tree by query and lets the user select a section to
 * jump to. Cmd/Ctrl+K opens, Esc closes, arrow keys navigate, Enter selects.
 */

export interface DocsSearchTriggerProps {
  categories: ReadonlyArray<DocsNavCategory>;
}

type Hit = { category: string; id: string; label: string };

export function DocsSearchTrigger({ categories }: DocsSearchTriggerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Cmd/Ctrl+K to open
  useEffect(() => {
    if (typeof window === "undefined") return;
    function onKey(e: KeyboardEvent): void {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIdx(0);
    const id = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(id);
  }, [open]);

  const hits = useMemo<Hit[]>(() => {
    const all: Hit[] = [];
    for (const cat of categories) {
      for (const item of cat.items) {
        all.push({ category: cat.title, id: item.id, label: item.label });
      }
    }
    const q = query.trim().toLowerCase();
    if (q.length === 0) return all;
    return all
      .map((h) => {
        const labelLow = h.label.toLowerCase();
        const catLow = h.category.toLowerCase();
        const labelIdx = labelLow.indexOf(q);
        const catIdx = catLow.indexOf(q);
        if (labelIdx === -1 && catIdx === -1) return null;
        let score = labelIdx === -1 ? 200 + catIdx : labelIdx;
        if (labelLow.startsWith(q)) score -= 50;
        return { hit: h, score };
      })
      .filter((x): x is { hit: Hit; score: number } => x !== null)
      .sort((a, b) => a.score - b.score)
      .map((x) => x.hit);
  }, [categories, query]);

  useEffect(() => {
    if (activeIdx >= hits.length) setActiveIdx(0);
  }, [hits.length, activeIdx]);

  function close(): void {
    setOpen(false);
  }

  function pick(idx: number): void {
    const hit = hits[idx];
    if (!hit) return;
    close();
    // Defer so the dialog can unmount and not steal focus during scroll.
    window.setTimeout(() => smoothScrollToId(hit.id), 30);
  }

  function onInputKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(hits.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(activeIdx);
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search docs"
        className="inline-flex items-center gap-2 h-9 rounded-md border border-black/[0.08] bg-white px-3 t-label text-[#3C3C43] hover:border-black/[0.14] hover:bg-black/[0.02] transition-colors min-w-[200px]"
      >
        <Search size={14} aria-hidden="true" />
        <span className="flex-1 text-left">Search docs</span>
        <span className="inline-flex items-center gap-0.5 t-caption text-[#8E8E93]">
          <kbd className="rounded border border-black/[0.08] bg-[#FAFAFA] px-1 t-mono">
            ⌘
          </kbd>
          <kbd className="rounded border border-black/[0.08] bg-[#FAFAFA] px-1 t-mono">
            K
          </kbd>
        </span>
      </button>
      {mounted && open
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Search docs"
              className="fixed inset-0 z-[200] flex items-start justify-center pt-24 px-4"
            >
              <button
                type="button"
                aria-label="Close search"
                onClick={close}
                className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              />
              <div className="relative w-full max-w-xl rounded-2xl bg-white border border-black/[0.08] shadow-xl overflow-hidden">
                <div className="flex items-center gap-2 px-4 h-12 border-b border-black/[0.06]">
                  <Search size={14} aria-hidden="true" className="text-[#8E8E93]" />
                  <input
                    ref={inputRef}
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={onInputKey}
                    placeholder="Search the docs"
                    className="flex-1 h-full bg-transparent outline-none t-body text-[#111] placeholder:text-[#8E8E93]"
                  />
                  <button
                    type="button"
                    onClick={close}
                    aria-label="Close"
                    className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[#8E8E93] hover:bg-black/[0.04] hover:text-[#111]"
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto py-2">
                  {hits.length === 0 ? (
                    <p className="px-4 py-3 t-label text-[#8E8E93]">
                      No matching sections.
                    </p>
                  ) : (
                    <ul role="listbox">
                      {hits.map((hit, idx) => (
                        <li key={`${hit.category}-${hit.id}`} role="option" aria-selected={idx === activeIdx}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIdx(idx)}
                            onClick={() => pick(idx)}
                            className={[
                              "w-full text-left px-4 py-2 flex items-center gap-3",
                              idx === activeIdx ? "bg-[#EEF2FF]" : "hover:bg-black/[0.02]",
                            ].join(" ")}
                          >
                            <span className="t-label text-[#111] font-medium flex-1">
                              {hit.label}
                            </span>
                            <span className="t-caption text-[#8E8E93]">
                              {hit.category}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="px-4 h-9 border-t border-black/[0.06] flex items-center justify-between t-caption text-[#8E8E93]">
                  <span>Enter to jump</span>
                  <span>Esc to close</span>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
