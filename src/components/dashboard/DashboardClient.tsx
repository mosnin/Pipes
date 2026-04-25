"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
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
  Activity,
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

type DashStats = {
  total: number;
  active: number;
  favorites: number;
  recentCount: number;
};

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
// Stats Bar
// ---------------------------------------------------------------------------

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Recent Activity Feed
// ---------------------------------------------------------------------------

function RecentActivity({ items }: { items: LibraryRow[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-slate-400" />
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recently Updated
        </h2>
      </div>
      <div className="flex flex-col gap-1">
        {items.slice(0, 5).map((row) => (
          <Link
            key={row.id}
            href={`/systems/${row.id}`}
            className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 group-hover:bg-slate-200 transition-colors">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <span className="flex-1 min-w-0 text-sm font-medium text-slate-700 truncate">
              {row.name}
            </span>
            <span className="shrink-0 text-[11px] text-slate-400">
              {formatRelativeDate(row.updatedAt)}
            </span>
          </Link>
        ))}
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
  const [stats, setStats] = useState<DashStats | null>(null);

  useEffect(() => {
    fetch("/api/library?status=all")
      .then((r) => r.json())
      .then((d) => {
        if (!d.ok) return;
        const rows: LibraryRow[] = d.data.rows;
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        setStats({
          total: rows.length,
          active: rows.filter((r) => !r.archivedAt).length,
          favorites: rows.filter((r) => r.favorite).length,
          recentCount: rows.filter(
            (r) => Date.now() - new Date(r.updatedAt).getTime() < sevenDays,
          ).length,
        });
      })
      .catch(() => {});
  }, []);

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
    const id = toast.loading("Creating system…");
    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "New System" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("System created", { id });
        router.push(`/systems/${data.data.systemId}`);
      } else {
        toast.error(data.error ?? "Failed to create system", { id });
      }
    } catch {
      toast.error("Failed to create system", { id });
    }
  };

  const handleImport = async (text: string) => {
    const id = toast.loading("Importing…");
    try {
      const res = await fetch("/api/import/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema: text, mode: "new" }),
      });
      const data = await res.json();
      if (data.ok && data.data.ok) {
        toast.success("System imported", { id });
        setShowImport(false);
        router.push(`/systems/${data.data.systemId}`);
      } else {
        toast.error(data.error ?? "Import failed — check JSON format", { id });
      }
    } catch {
      toast.error("Import failed", { id });
    }
  };

  const handleToggleFavorite = async (row: LibraryRow) => {
    const next = !row.favorite;
    await fetch("/api/library", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "favorite", systemId: row.id, favorite: next }),
    });
    toast.success(next ? "Added to favorites" : "Removed from favorites");
    void refreshLibrary();
  };

  const handleArchive = async (row: LibraryRow) => {
    await fetch(`/api/systems/${row.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "archive" }),
    });
    toast.success(`"${row.name}" archived`);
    void refreshLibrary();
  };

  const handleRestore = async (row: LibraryRow) => {
    await fetch(`/api/systems/${row.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    toast.success(`"${row.name}" restored`);
    void refreshLibrary();
  };

  const handleExport = async (row: LibraryRow) => {
    const res = await fetch(`/api/systems/${row.id}/export`);
    if (!res.ok) {
      toast.error("Export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`"${row.name}" exported`);
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

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total systems" value={stats.total} />
          <StatCard label="Active" value={stats.active} />
          <StatCard label="Favorites" value={stats.favorites} />
          <StatCard label="Updated this week" value={stats.recentCount} />
        </div>
      )}

      {/* ── Recent Activity ──────────────────────────────────────────────── */}
      {library.recent.length > 0 && (
        <RecentActivity items={library.recent} />
      )}

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
