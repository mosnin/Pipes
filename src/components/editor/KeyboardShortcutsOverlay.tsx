"use client";

import { useMemo } from "react";
import { Dialog, KbdHint } from "@/components/ui";
import { comboToKeys, list, type Shortcut } from "@/lib/keyboard/registry";

export type KeyboardShortcutsOverlayProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

// Static fallback used when the registry has no entries (SSR, first render
// before any editor mounts). The real list comes from registry.list().
const FALLBACK: Shortcut[] = [];

export function KeyboardShortcutsOverlay({
  open,
  onOpenChange,
}: KeyboardShortcutsOverlayProps) {
  // Reading list() at render time is fine — the dialog only mounts when open.
  const shortcuts = useMemo<Shortcut[]>(() => {
    if (!open) return FALLBACK;
    return list();
  }, [open]);

  const grouped = useMemo(() => {
    const map = new Map<string, Shortcut[]>();
    for (const sc of shortcuts) {
      const key = sc.group || "general";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(sc);
    }
    // Sort groups alphabetically, but keep "global" first if present.
    const entries = Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "global") return -1;
      if (b[0] === "global") return 1;
      return a[0].localeCompare(b[0]);
    });
    return entries;
  }, [shortcuts]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Keyboard shortcuts"
      description="Every shortcut active in this view."
      size="md"
    >
      <div className="space-y-4">
        {grouped.length === 0 && (
          <p className="t-label text-[#8E8E93]">No shortcuts registered.</p>
        )}
        {grouped.map(([group, items]) => (
          <section key={group}>
            <p className="t-overline text-[#8E8E93] uppercase tracking-wide mb-1.5">
              {group}
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
              {items.map((sc) => (
                <div
                  key={sc.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="t-caption text-[#3C3C43] truncate">
                    {sc.label}
                  </span>
                  <KbdHint keys={comboToKeys(sc.combo)} />
                </div>
              ))}
            </div>
          </section>
        ))}
        <p className="t-micro text-[#8E8E93] pt-2 border-t border-black/[0.06]">
          Press ? again to close, or Esc.
        </p>
      </div>
    </Dialog>
  );
}
