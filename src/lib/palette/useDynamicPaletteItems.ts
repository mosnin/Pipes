"use client";

import { useSyncExternalStore } from "react";
import type { CommandItem } from "@/components/editor/CommandPalette";
import { snapshot, subscribe } from "@/lib/palette/registry";

function getServerSnapshot(): CommandItem[] {
  return [];
}

export function useDynamicPaletteItems(): CommandItem[] {
  return useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}
