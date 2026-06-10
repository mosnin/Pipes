"use client";

import { useState } from "react";
import { Boxes, ChevronLeft, ChevronRight, Folder, Layers, Plus } from "lucide-react";
import {
  Button,
  SegmentedControl,
  Tooltip,
} from "@/components/ui";
import { type InsertContext, nodeLibraryCatalog } from "@/domain/templates/node_library";
import type { GraphPipe } from "@/components/editor/editor_state";
import { computeSubsystemBoundary, type Subsystem } from "@/components/editor/structure_model";

export type LeftPaneTab = "library" | "structure" | "subsystems";

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
  subsystems,
  pipes,
  nodes,
  recents,
  onInsertEntry,
  onSelectSubsystem,
  onSelectNode,
}: EditorLeftPaneProps) {
  const [tab, setTab] = useState<LeftPaneTab>("library");

  if (collapsed) {
    return (
      <aside className="w-12 border-r border-black/[0.08] bg-white flex flex-col items-center py-2 gap-2">
        <Tooltip content="Expand sidebar" side="right">
          <button
            onClick={onToggleCollapsed}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Add node" side="right">
          <button
            onClick={() => {
              onToggleCollapsed();
              const fallback = nodeLibraryCatalog[0];
              if (fallback) onInsertEntry(fallback);
            }}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Add node"
          >
            <Plus size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Structure" side="right">
          <button
            onClick={onToggleCollapsed}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Structure"
          >
            <Layers size={16} />
          </button>
        </Tooltip>
        <Tooltip content="Subsystems" side="right">
          <button
            onClick={onToggleCollapsed}
            className="w-8 h-8 inline-flex items-center justify-center rounded-md hover:bg-black/[0.04] text-[#3C3C43]"
            aria-label="Subsystems"
          >
            <Boxes size={16} />
          </button>
        </Tooltip>
      </aside>
    );
  }

  // Recents are titled-node memories — the user's recently created node titles
  const recentTitles = recents
    .map((id) => {
      const node = nodes.find((n) => n.id === id);
      return node ? { id: node.id, title: node.title } : undefined;
    })
    .filter((entry): entry is { id: string; title: string } => Boolean(entry))
    .slice(0, 6);

  const addNode = () => {
    const fallback = nodeLibraryCatalog[0];
    if (fallback) onInsertEntry(fallback);
  };

  return (
    <aside className="w-[260px] shrink-0 border-r border-black/[0.08] bg-white flex flex-col">
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
        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 pt-4 pb-3 space-y-4">
          <Button
            variant="primary"
            size="md"
            onClick={addNode}
            className="w-full justify-center font-semibold"
          >
            <Plus size={14} /> Add node
          </Button>
          {recentTitles.length > 0 && (
            <div className="space-y-1">
              <p className="t-overline text-[#8E8E93] px-1">Recents</p>
              <div className="space-y-0.5">
                {recentTitles.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onSelectNode(entry.id)}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-black/[0.04] text-left"
                  >
                    <Layers size={12} className="text-[#8E8E93] shrink-0" />
                    <span className="t-label text-[#111] flex-1 truncate">{entry.title}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
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
