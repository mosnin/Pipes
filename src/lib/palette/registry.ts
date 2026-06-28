// Shared command palette registry.
//
// The global CommandPalette lives in the app shell. Surfaces that own their
// own context (editor selection, plan drawer focus, ...) can publish their
// commands here so the palette picks them up. Publishing is reactive: a
// surface calls `publish(scope, items)` whenever its state changes, and
// listeners are notified.
//
// Scope keys deduplicate publishers — re-publishing under the same key
// replaces the previous entries. Unmounting a surface should publish an
// empty array (or call `clear(scope)`).

import type { CommandItem } from "@/components/editor/CommandPalette";

const store = new Map<string, CommandItem[]>();
const listeners = new Set<() => void>();
let cachedSnapshot: CommandItem[] | null = null;

function notify(): void {
  cachedSnapshot = null;
  for (const l of listeners) l();
}

export function publish(scope: string, items: CommandItem[]): void {
  if (items.length === 0) {
    store.delete(scope);
  } else {
    store.set(scope, items);
  }
  notify();
}

export function clear(scope: string): void {
  if (store.delete(scope)) notify();
}

export function snapshot(): CommandItem[] {
  if (cachedSnapshot !== null) return cachedSnapshot;
  const out: CommandItem[] = [];
  for (const items of store.values()) {
    for (const item of items) out.push(item);
  }
  cachedSnapshot = out;
  return cachedSnapshot;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Test-only: clear all state.
export function _resetPaletteRegistry(): void {
  store.clear();
  listeners.clear();
  cachedSnapshot = null;
}
