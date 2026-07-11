"use client";

import { useSyncExternalStore } from "react";
import type { CommandItem } from "@/components/editor/CommandPalette";
import { snapshot, subscribe } from "@/lib/palette/registry";

const SERVER_SNAPSHOT: CommandItem[] = [];
function getServerSnapshot(): CommandItem[] {
  return SERVER_SNAPSHOT;
}

export function useDynamicPaletteItems(): CommandItem[] {
  return useSyncExternalStore(subscribe, snapshot, getServerSnapshot);
}
