"use client";

import { useSyncExternalStore } from "react";

/**
 * The clock, as an external store.
 *
 * Reading `Date.now()` during render makes a component impure and lets the
 * server and the client disagree about every age on the page — the server
 * renders "3 minutes ago", the client hydrates at "4 minutes ago", and React
 * reports a mismatch. So the clock lives outside React: one module-level
 * timestamp, one interval shared by every subscriber, and a server snapshot of
 * `null`.
 *
 * `null` is the honest first-paint value: before mount there is no clock, so
 * callers render the absolute date, an em dash, or a skeleton, and the relative
 * reading takes over once this lands. A caller that treats `null` as "now" has
 * reintroduced the bug.
 */
const TICK_MS = 30_000;

let current = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  if (timer === null) {
    current = Date.now();
    timer = setInterval(() => {
      current = Date.now();
      for (const listener of listeners) listener();
    }, TICK_MS);
  }
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  };
}

/** The cached tick. Pure by construction: it never reads the clock itself. */
function getSnapshot(): number {
  return current;
}

function getServerSnapshot(): null {
  return null;
}

export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) || null;
}
