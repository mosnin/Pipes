"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Button,
  Card,
  Chip,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Input,
  Separator,
  Tabs,
} from "@heroui/react";
import {
  Plus,
  Search,
  MoreHorizontal,
  Star,
  Archive,
  Download,
  Edit,
  RotateCcw,
  Layers,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type LibraryRow = {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  createdBy: string;
  favorite: boolean;
  tags: string[];
  lastOpenedAt?: string;
};

type LibraryPayload = {
  rows: LibraryRow[];
  recent: LibraryRow[];
  favorites: LibraryRow[];
  availableTags: string[];
};

type TabKey = "all" | "active" | "archived" | "favorites" | "mine";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyStateView({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-100 mb-5">
        <Layers className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        No systems yet
      </h3>
      <p className="text-sm text-slate-500 max-w-xs mb-6">
        Create your first system or start from a template to get up and running
        quickly.
      </p>
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          onPress={onNew}
        >
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            New System
          </span>
        </Button>
        <Link href="/templates">
          <Button variant="outline" size="sm">
            Browse Templates
          </Button>
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// System Card
// ---------------------------------------------------------------------------

type SystemCardProps = {
  row: LibraryRow;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onExport: () => void;
  onEdit: () => void;
};

function SystemCard({
  row,
  onOpen,
  onToggleFavorite,
  onArchive,
  onRestore,
  onExport,
  onEdit,
}: SystemCardProps) {
  const updatedLabel = formatRelativeDate(row.updatedAt);

  return (
    <Card className="bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-xl">
      <Card.Header className="pb-0 pt-4 px-4">
        <div className="flex items-start justify-between gap-2 w-full">
          <div className="flex items-start gap-2 min-w-0 flex-1">
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
                {row.name}
              </h3>
              {row.archivedAt && (
                <span className="inline-block mt-0.5 text-[10px] font-medium uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  Archived
                </span>
              )}
            </div>
            {row.favorite && (
              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0 mt-0.5" />
            )}
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="System options"
                className="shrink-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg -mt-0.5 -mr-1"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <Dropdown.Popover>
              <DropdownMenu aria-label="System actions">
                <DropdownItem id="favorite" onAction={onToggleFavorite}>
                  <span className="flex items-center gap-2 text-sm">
                    <Star className="w-3.5 h-3.5" />
                    {row.favorite ? "Remove from favorites" : "Add to favorites"}
                  </span>
                </DropdownItem>
                <DropdownItem id="edit" onAction={onEdit}>
                  <span className="flex items-center gap-2 text-sm">
                    <Edit className="w-3.5 h-3.5" />
                    Edit
                  </span>
                </DropdownItem>
                <DropdownItem id="export" onAction={onExport}>
                  <span className="flex items-center gap-2 text-sm">
                    <Download className="w-3.5 h-3.5" />
                    Export
                  </span>
                </DropdownItem>
                {row.archivedAt ? (
                  <DropdownItem id="restore" onAction={onRestore}>
                    <span className="flex items-center gap-2 text-sm">
                      <RotateCcw className="w-3.5 h-3.5" />
                      Restore
                    </span>
                  </DropdownItem>
                ) : (
                  <DropdownItem id="archive" onAction={onArchive}>
                    <span className="flex items-center gap-2 text-sm text-red-600">
                      <Archive className="w-3.5 h-3.5" />
                      Archive
                    </span>
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </Card.Header>

      <Card.Content className="px-4 pt-2 pb-3">
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 min-h-[2.5rem]">
          {row.description || "No description provided."}
        </p>
        {row.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            {row.tags.slice(0, 4).map((tag) => (
              <Chip
                key={tag}
                variant="soft"
                color="default"
                size="sm"
                className="text-[11px] font-medium px-1.5"
              >
                {tag}
              </Chip>
            ))}
            {row.tags.length > 4 && (
              <Chip
                variant="soft"
                color="default"
                size="sm"
                className="text-[11px] font-medium px-1.5"
              >
                +{row.tags.length - 4}
              </Chip>
            )}
          </div>
        )}
      </Card.Content>

      <Card.Footer className="px-4 pb-3 pt-0 flex items-center justify-between gap-2">
        <span className="text-[11px] text-slate-400 shrink-0">
          Updated {updatedLabel}
        </span>
        <Button
          variant="primary"
          size="sm"
          onPress={onOpen}
          className="text-xs h-7 px-3"
        >
          Open
        </Button>
      </Card.Footer>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Import Modal (inline)
// ---------------------------------------------------------------------------

function ImportModal({
  onImport,
  onClose,
}: {
  onImport: (text: string) => Promise<void>;
  onClose: () => void;
}) {
  const [importText, setImportText] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    if (!importText.trim()) return;
    setLoading(true);
    await onImport(importText);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-1">
          Import System
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          Paste a <code className="font-mono text-xs bg-slate-100 px-1 py-0.5 rounded">pipes_schema_v1</code> JSON to import a system.
        </p>
        <textarea
          className="w-full h-40 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs font-mono text-slate-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
          placeholder='{ "pipes_schema_v1": ... }'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onPress={onClose} isDisabled={loading}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={handleImport}
            isDisabled={loading || !importText.trim()}
          >
            {loading ? "Importing..." : "Import"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

const PAGE_SIZE = 12;

const TAB_TO_STATUS: Record<TabKey, string> = {
  all: "all",
  active: "active",
  archived: "archived",
  favorites: "favorites",
  mine: "mine",
};

export function DashboardClient({
  initialLibrary,
}: {
  initialLibrary: LibraryPayload;
}) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("active");
  const [sort] = useState<"recent_activity" | "name" | "created" | "updated">(
    "recent_activity",
  );
  const [selectedTag, setSelectedTag] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);

  // ── Library fetch ────────────────────────────────────────────────────────

  const status = TAB_TO_STATUS[activeTab];

  const refreshLibrary = useCallback(
    async (input?: { q?: string; tag?: string }) => {
      setLoadingLibrary(true);
      const params = new URLSearchParams({ status, sort });
      const q = input?.q ?? query;
      const tag = input?.tag ?? selectedTag;
      if (q) params.set("q", q);
      if (tag) params.set("tag", tag);
      const res = await fetch(`/api/library?${params.toString()}`);
      const data = await res.json();
      if (data.ok) setLibrary(data.data);
      setLoadingLibrary(false);
    },
    [query, selectedTag, sort, status],
  );

  useEffect(() => {
    void refreshLibrary({ q: "", tag: "" });
    setPage(1);
  }, [activeTab, sort, refreshLibrary]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshLibrary();
      setPage(1);
    }, 220);
    return () => clearTimeout(timer);
  }, [query, selectedTag, refreshLibrary]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const createSystem = async () => {
    const res = await fetch("/api/systems", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New System" }),
    });
    const data = await res.json();
    if (data.ok) router.push(`/systems/${data.data.systemId}`);
  };

  const handleImport = async (text: string) => {
    const res = await fetch("/api/import/system", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ schema: text, mode: "new" }),
    });
    const data = await res.json();
    if (data.ok && data.data.ok) {
      setShowImport(false);
      router.push(`/systems/${data.data.systemId}`);
    }
  };

  const handleToggleFavorite = async (row: LibraryRow) => {
    await fetch("/api/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "favorite",
        systemId: row.id,
        favorite: !row.favorite,
      }),
    });
    void refreshLibrary();
  };

  const handleArchive = async (row: LibraryRow) => {
    await fetch(`/api/systems/${row.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    void refreshLibrary();
  };

  const handleRestore = async (row: LibraryRow) => {
    await fetch(`/api/systems/${row.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    void refreshLibrary();
  };

  const handleExport = async (row: LibraryRow) => {
    const res = await fetch(`/api/systems/${row.id}/export`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleEdit = (row: LibraryRow) => {
    router.push(`/systems/${row.id}`);
  };

  // ── Filtered / paginated rows ─────────────────────────────────────────

  const visibleRows = useMemo(() => {
    return library.rows.filter((row) => {
      if (activeTab === "archived") return !!row.archivedAt;
      if (activeTab === "active") return !row.archivedAt;
      return true;
    });
  }, [library.rows, activeTab]);

  const totalPages = Math.ceil(visibleRows.length / PAGE_SIZE);
  const pagedRows = visibleRows.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < visibleRows.length;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto">
      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Your Systems
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Design, version, and run your AI systems
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onPress={() => setShowImport(true)}
          >
            Import
          </Button>
          <Button
            variant="primary"
            size="sm"
            onPress={createSystem}
          >
            <span className="flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              New System
            </span>
          </Button>
        </div>
      </div>

      {/* ── Filter Toolbar ───────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
        {/* Tabs */}
        <div className="shrink-0">
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setActiveTab(key as TabKey)}
          >
            <Tabs.List>
              <Tabs.Tab id="active">Active</Tabs.Tab>
              <Tabs.Tab id="all">All</Tabs.Tab>
              <Tabs.Tab id="archived">Archived</Tabs.Tab>
              <Tabs.Tab id="favorites">Favorites</Tabs.Tab>
              <Tabs.Tab id="mine">Mine</Tabs.Tab>
            </Tabs.List>
          </Tabs>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              aria-label="Search systems"
              placeholder="Search systems..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 text-sm"
            />
          </div>

          {/* Tag filter dropdown */}
          {library.availableTags.length > 0 && (
            <Dropdown>
              <DropdownTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0 text-sm"
                >
                  {selectedTag ? (
                    <span className="flex items-center gap-1.5">
                      <Chip variant="soft" color="default" size="sm" className="text-[11px]">
                        {selectedTag}
                      </Chip>
                      <span className="text-slate-400">×</span>
                    </span>
                  ) : (
                    "Filter by tag"
                  )}
                </Button>
              </DropdownTrigger>
              <Dropdown.Popover>
                <DropdownMenu aria-label="Filter by tag">
                  {selectedTag ? (
                    <DropdownItem
                      id="__clear__"
                      onAction={() => setSelectedTag("")}
                    >
                      <span className="text-sm text-slate-500">Clear filter</span>
                    </DropdownItem>
                  ) : null}
                  {library.availableTags.map((tag) => (
                    <DropdownItem
                      key={tag}
                      id={tag}
                      onAction={() =>
                        setSelectedTag((prev) => (prev === tag ? "" : tag))
                      }
                    >
                      <span className="flex items-center gap-2 text-sm">
                        <Chip variant="soft" color="default" size="sm" className="text-[11px]">
                          {tag}
                        </Chip>
                        {selectedTag === tag && (
                          <span className="ml-auto text-indigo-500">✓</span>
                        )}
                      </span>
                    </DropdownItem>
                  ))}
                </DropdownMenu>
              </Dropdown.Popover>
            </Dropdown>
          )}
        </div>
      </div>

      <Separator className="mb-6 bg-slate-100" />

      {/* ── Grid / Empty State ───────────────────────────────────────────── */}
      {loadingLibrary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-44 rounded-xl border border-slate-100 bg-slate-50 animate-pulse"
            />
          ))}
        </div>
      ) : visibleRows.length === 0 ? (
        <EmptyStateView onNew={createSystem} />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedRows.map((row) => (
              <SystemCard
                key={row.id}
                row={row}
                onOpen={() => router.push(`/systems/${row.id}`)}
                onToggleFavorite={() => handleToggleFavorite(row)}
                onArchive={() => handleArchive(row)}
                onRestore={() => handleRestore(row)}
                onExport={() => handleExport(row)}
                onEdit={() => handleEdit(row)}
              />
            ))}
          </div>

          {/* ── Load More / Pagination ─────────────────────────────────── */}
          {(hasMore || totalPages > 1) && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <span className="text-xs text-slate-400">
                Showing {pagedRows.length} of {visibleRows.length} systems
              </span>
              {hasMore && (
                <Button
                  variant="outline"
                  size="sm"
                  onPress={() => setPage((p) => p + 1)}
                >
                  Load more
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Import Modal ─────────────────────────────────────────────────── */}
      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}
