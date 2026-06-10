"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Search } from "lucide-react";
import { KbdHint } from "@/components/ui";
import { comboToKeys } from "@/lib/keyboard/registry";

export type CommandSection = "actions" | "navigation" | "system" | "help";

export type CommandItem = {
  id: string;
  label: string;
  section: CommandSection;
  aliases?: string[];
  combo?: string;
  hint?: string;
  run: () => void;
};

export type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  scopeLabel?: string;
};

const SECTION_LABEL: Record<CommandSection, string> = {
  actions: "Actions",
  navigation: "Navigation",
  system: "System",
  help: "Help",
};

const SECTION_ORDER: CommandSection[] = ["actions", "navigation", "system", "help"];

function rankItems(items: CommandItem[], query: string): CommandItem[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return items;
  const matches: Array<{ item: CommandItem; score: number }> = [];
  for (const item of items) {
    const haystack = [
      item.label,
      SECTION_LABEL[item.section],
      ...(item.aliases ?? []),
    ]
      .join(" ")
      .toLowerCase();
    const idx = haystack.indexOf(q);
    if (idx === -1) continue;
    // Prefer label-prefix matches.
    const labelLow = item.label.toLowerCase();
    let score = idx;
    if (labelLow.startsWith(q)) score -= 50;
    if (labelLow.includes(q)) score -= 10;
    matches.push({ item, score });
  }
  matches.sort((a, b) => a.score - b.score);
  return matches.map((m) => m.item);
}

export function CommandPalette({
  open,
  onOpenChange,
  items,
  scopeLabel,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
      // Autofocus the input. Defer to next tick so the portal mounts first.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const ranked = useMemo(() => rankItems(items, query), [items, query]);

  // Build flat ordered display, grouped by section but flat for index nav.
  const ordered = useMemo(() => {
    const out: CommandItem[] = [];
    for (const sec of SECTION_ORDER) {
      for (const item of ranked) if (item.section === sec) out.push(item);
    }
    return out;
  }, [ranked]);

  useEffect(() => {
    if (activeIndex >= ordered.length) setActiveIndex(0);
  }, [ordered.length, activeIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onOpenChange(false);
        return;
      }
      if (ordered.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % ordered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + ordered.length) % ordered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const sel = ordered[Math.min(activeIndex, ordered.length - 1)];
        if (sel) {
          onOpenChange(false);
          // Run after close so any focus side-effects from the handler win.
          setTimeout(() => sel.run(), 0);
        }
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, ordered, activeIndex, onOpenChange]);

  if (!mounted || !open) return null;

  // Group into sections in render order. We tag each item with its absolute
  // index so the active highlight stays in sync with the ordered keyboard
  // navigation list. Doing the tagging here keeps render pure (no mutable
  // variable assignment during render).
  const grouped = (() => {
    let runningIndex = -1;
    return SECTION_ORDER.map((sec) => {
      const items = ordered.filter((it) => it.section === sec);
      const tagged = items.map((item) => {
        runningIndex += 1;
        return { item, index: runningIndex };
      });
      return { section: sec, items: tagged };
    }).filter((g) => g.items.length > 0);
  })();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-24 px-4"
      onClick={() => onOpenChange(false)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="w-full max-w-xl bg-white rounded-2xl shadow-xl-token overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-black/[0.06]">
          <Search size={14} className="text-[#8E8E93] shrink-0" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Type a command..."
            aria-label="Command search"
            data-testid="command-palette-input"
            className="flex-1 bg-transparent outline-none t-label text-[#111] placeholder:text-[#8E8E93]"
          />
          <span className="t-micro text-[#8E8E93]">Esc</span>
        </div>
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto py-1"
          role="listbox"
          aria-label="Commands"
        >
          {grouped.length === 0 && (
            <p className="px-4 py-6 t-caption text-[#8E8E93] text-center">
              No commands match.
            </p>
          )}
          {grouped.map((group) => (
            <div key={group.section} className="py-1">
              <p className="px-3 pt-2 pb-1 t-overline text-[#8E8E93] uppercase tracking-wide">
                {SECTION_LABEL[group.section]}
              </p>
              {group.items.map(({ item, index }) => {
                const isActive = index === activeIndex;
                return (
                  <button
                    type="button"
                    key={item.id}
                    role="option"
                    aria-selected={isActive}
                    data-testid={`command-item-${item.id}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      onOpenChange(false);
                      setTimeout(() => item.run(), 0);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-colors ${
                      isActive ? "bg-indigo-50" : "hover:bg-black/[0.03]"
                    }`}
                  >
                    <span
                      className={`flex-1 t-label truncate ${
                        isActive ? "text-indigo-700" : "text-[#111]"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.hint && (
                      <span className="t-micro text-[#8E8E93] truncate">
                        {item.hint}
                      </span>
                    )}
                    {item.combo && (
                      <KbdHint keys={comboToKeys(item.combo)} />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between px-3 py-2 border-t border-black/[0.06] bg-[#FAFAFA]">
          <span className="t-micro text-[#8E8E93]">
            {scopeLabel ? `Scope: ${scopeLabel}` : "Scope: global"}
          </span>
          <span className="t-micro text-[#8E8E93]">
            Enter to run, Esc to close
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
