"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Folder, Layers, Search, Star } from "lucide-react";
import {
  KbdHint,
  SearchInput,
  SegmentedControl,
  Tooltip,
} from "@/components/ui";
import { groupByCategory, nodeLibraryCatalog, rankLibraryEntries, type InsertContext } from "@/domain/templates/node_library";
import type { GraphPipe } from "@/components/editor/editor_state";
import { computeSubsystemBoundary, type Subsystem } from "@/components/editor/structure_model";

export type LeftPaneTab = "library" | "structure" | "subsystems";

const CATEGORY_STYLE: Record<string, string> = {
  "I/O":       "bg-sky-100 text-sky-700",
  "Reasoning": "bg-indigo-100 text-indigo-700",
  "Core":      "bg-emerald-100 text-emerald-700",
  "Data":      "bg-amber-100 text-amber-700",
  "Control":   "bg-orange-100 text-orange-700",
};
const CATEGORY_ABBR: Record<string, string> = {
  "I/O":       "IO",
  "Reasoning": "AI",
  "Core":      "CO",
  "Data":      "DB",
  "Control":   "CF",
};

export type LibraryEntry = (typeof nodeLibraryCatalog)[number];

export type EditorLeftPaneProps = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  rankedEntries: LibraryEntry[];
  insertContext: InsertContext | undefined;
  favorites: string[];
  recents: string[];
  subsystems: Subsystem[];
  pipes: GraphPipe[];
  nodes: Array<{ id: string; title: string; type: string }>;
  onToggleFavorite: (nodeType: string) => void;
  onInsertEntry: (entry: LibraryEntry) => void;
  onSelectSubsystem: (subsystem: Subsystem) => void;
  onSelectNode: (nodeId: string) => void;
  onOpenPalette: () => void;
};

export function EditorLeftPane({
  collapsed,
  onToggleCollapsed,
  query,
  onQueryChange,
  rankedEntries,
  favorites,
  recents,
  subsystems,
  pipes,
  nodes,
  onToggleFavorite,
  onInsertEntry,
  onSelectSubsystem,
  onSelectNode,
  onOpenPalette,
}: EditorLeftPaneProps) {
  const [tab, setTab] = useState<LeftPaneTab>("library");

  if (collapsed) {
    return (
      <aside className="w-10 border-r border-black/[0.08] bg-white flex flex-col items-center py-2 gap-2">
        <Tooltip content="Expand sidebar" side="right">
          <button
            onClick={onToggleCollapsed}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Open library palette" side="right">
          <button
            onClick={onOpenPalette}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Library"
          >
            <Search size={16} />
          </button>
        </Tooltip>
      </aside>
    );
  }

  const grouped = groupByCategory(rankedEntries);
  const favEntries = nodeLibraryCatalog.filter((entry) => favorites.includes(entry.nodeType));
  const recentEntries = recents
    .map((id) => nodeLibraryCatalog.find((entry) => entry.nodeType === id))
    .filter((entry): entry is LibraryEntry => Boolean(entry));

  const renderEntry = (entry: LibraryEntry) => (
    <button
      key={entry.nodeType}
      onClick={() => onInsertEntry(entry)}
      className="w-full group/entry flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.04] text-left"
    >
      <span
        className={`inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-bold shrink-0 ${
          CATEGORY_STYLE[entry.category] ?? "bg-gray-100 text-gray-600"
        }`}
      >
        {CATEGORY_ABBR[entry.category] ?? entry.category.slice(0, 2).toUpperCase()}
      </span>
      <span className="t-label text-[#111] flex-1 truncate">{entry.name}</span>
      <span
        className="opacity-0 group-hover/entry:opacity-100 transition-opacity shrink-0 p-0.5"
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite(entry.nodeType);
        }}
        role="button"
        aria-label={favorites.includes(entry.nodeType) ? "Unfavorite" : "Favorite"}
      >
        {favorites.includes(entry.nodeType) ? (
          <Star className="fill-amber-400 text-amber-400" size={12} />
        ) : (
          <Star size={12} className="text-[#C7C7CC]" />
        )}
      </span>
    </button>
  );

  return (
    <aside className="w-[240px] shrink-0 border-r border-black/[0.08] bg-white flex flex-col">
      <div className="p-2 border-b border-black/[0.06] flex items-center gap-1">
        <SegmentedControl
          size="sm"
          value={tab}
          onChange={(id) => setTab(id as LeftPaneTab)}
          items={[
            { id: "library", label: "Library" },
            { id: "structure", label: "Tree" },
            { id: "subsystems", label: "Groups" },
          ]}
          className="flex-1"
        />
        <Tooltip content="Collapse sidebar" side="bottom">
          <button
            onClick={onToggleCollapsed}
            className="w-7 h-7 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43] shrink-0"
            aria-label="Collapse sidebar"
          >
            <ChevronLeft size={14} />
          </button>
        </Tooltip>
      </div>

      {tab === "library" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pt-2 pb-3 space-y-3">
          <SearchInput
            value={query}
            onChange={onQueryChange}
            placeholder="Search nodes"
            kbd="K"
          />
          {favEntries.length > 0 && (
            <div>
              <p className="t-overline text-[#8E8E93] px-2 mb-1 flex items-center gap-1">
                <Star size={10} /> Favorites
              </p>
              <div className="space-y-0.5">{favEntries.slice(0, 5).map(renderEntry)}</div>
            </div>
          )}
          {recentEntries.length > 0 && (
            <div>
              <p className="t-overline text-[#8E8E93] px-2 mb-1">Recent</p>
              <div className="space-y-0.5">{recentEntries.slice(0, 5).map(renderEntry)}</div>
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.category}>
              <p className="t-overline text-[#8E8E93] px-2 mb-1">{group.category}</p>
              <div className="space-y-0.5">{group.entries.map(renderEntry)}</div>
            </div>
          ))}
          <p className="t-caption text-[#8E8E93] px-2 pt-2 border-t border-black/[0.04] inline-flex items-center gap-1">
            Tip: <KbdHint keys={["Cmd", "K"]} /> to open palette
          </p>
        </div>
      )}

      {tab === "structure" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pt-2 pb-3">
          {nodes.length === 0 ? (
            <p className="t-caption text-[#8E8E93] px-2 py-4 text-center">
              Add a node to see the structure tree.
            </p>
          ) : (
            <div className="space-y-0.5">
              {nodes.map((node) => (
                <button
                  key={node.id}
                  onClick={() => onSelectNode(node.id)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.04] text-left"
                >
                  <Layers size={12} className="text-[#8E8E93] shrink-0" />
                  <span className="t-label text-[#111] truncate flex-1">{node.title}</span>
                  <span className="t-caption text-[#8E8E93] shrink-0">{node.type}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "subsystems" && (
        <div className="flex-1 overflow-y-auto scrollbar-thin px-2 pt-2 pb-3">
          {subsystems.length === 0 ? (
            <p className="t-caption text-[#8E8E93] px-2 py-4 text-center">
              Select 2+ nodes and group them to create a subsystem.
            </p>
          ) : (
            <div className="space-y-0.5">
              {subsystems.map((subsystem) => {
                const boundary = computeSubsystemBoundary(subsystem, pipes);
                return (
                  <button
                    key={subsystem.id}
                    onClick={() => onSelectSubsystem(subsystem)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.04] text-left"
                  >
                    <Folder size={12} className="text-[#8E8E93] shrink-0" />
                    <span className="t-label text-[#111] truncate flex-1">{subsystem.name}</span>
                    <span className="t-caption text-[#8E8E93] shrink-0">
                      {subsystem.nodeIds.length} . {boundary.inboundNodeIds.length}/{boundary.outboundNodeIds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
