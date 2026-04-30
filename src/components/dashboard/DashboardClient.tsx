"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import {
  Plus,
  MoreHorizontal,
  Star,
  Archive,
  Download,
  Edit,
  RotateCcw,
  Layers,
  Activity,
  MessageSquare,
  AlertTriangle,
  Grid3x3,
  List,
  Upload,
  ArrowUpRight,
} from "lucide-react";
import {
  Button,
  Textarea,
  MetricCard,
  Toolbar,
  SegmentedControl,
  SearchInput,
  EmptyState,
  StatusBadge,
  DataTable,
  Dialog,
  Spinner,
  SkeletonCard,
  Badge,
} from "@/components/ui";
import type { DataTableColumn } from "@/components/ui";

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

type FilterId = "all" | "active" | "favorites" | "archived";
type ViewMode = "grid" | "list";
type SortMode = "recent" | "name" | "created";

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
  return `${Math.floor(days / 30)}mo ago`;
}

function initials(name: string): string {
  const seed = name.trim() || "U";
  const parts = seed.split(/\s+/);
  if (parts.length === 1) return seed.slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const PAGE_SIZE = 12;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// System Card (grid)
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
  return (
    <div
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="group bg-white border border-black/[0.08] rounded-[12px] p-4 cursor-pointer hover-lift hover:border-indigo-300 transition-colors flex flex-col gap-3 min-h-[152px]"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="t-label font-semibold text-[#111] truncate group-hover:text-indigo-700 transition-colors">
              {row.name}
            </h3>
            {row.favorite && (
              <Star
                size={12}
                className="text-[#3C3C43] fill-[#3C3C43] shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
          <p className="t-label text-[#8E8E93] line-clamp-2 leading-snug">
            {row.description || "No description"}
          </p>
        </div>
        <div className="flex items-start gap-1.5 shrink-0">
          {row.archivedAt && (
            <StatusBadge tone="warning">Archived</StatusBadge>
          )}
          <Dropdown>
            <DropdownTrigger>
              <button
                type="button"
                aria-label="System options"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8E8E93] hover:text-[#111] hover:bg-[#F5F5F7] transition-colors opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal size={14} />
              </button>
            </DropdownTrigger>
            <Dropdown.Popover>
              <DropdownMenu aria-label="System actions">
                <DropdownItem id="fav" onAction={onToggleFavorite}>
                  <span className="flex items-center gap-2 t-label">
                    <Star size={14} />
                    {row.favorite ? "Unfavorite" : "Favorite"}
                  </span>
                </DropdownItem>
                <DropdownItem id="edit" onAction={onEdit}>
                  <span className="flex items-center gap-2 t-label">
                    <Edit size={14} />
                    Open in editor
                  </span>
                </DropdownItem>
                <DropdownItem id="export" onAction={onExport}>
                  <span className="flex items-center gap-2 t-label">
                    <Download size={14} />
                    Export
                  </span>
                </DropdownItem>
                {row.archivedAt ? (
                  <DropdownItem id="restore" onAction={onRestore}>
                    <span className="flex items-center gap-2 t-label">
                      <RotateCcw size={14} />
                      Restore
                    </span>
                  </DropdownItem>
                ) : (
                  <DropdownItem id="archive" onAction={onArchive}>
                    <span className="flex items-center gap-2 t-label text-[#991B1B]">
                      <Archive size={14} />
                      Archive
                    </span>
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown.Popover>
          </Dropdown>
        </div>
      </div>

      {row.tags.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {row.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone="neutral">
              {tag}
            </Badge>
          ))}
          {row.tags.length > 3 && (
            <Badge tone="neutral">+{row.tags.length - 3}</Badge>
          )}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="t-caption text-[#8E8E93]">
          Updated {formatRelativeDate(row.updatedAt)}
        </span>
        <span
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F5F5F7] text-[#3C3C43] t-caption font-semibold"
          title={row.createdBy}
          aria-label={`Owner ${row.createdBy}`}
        >
          {initials(row.createdBy)}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard
// ---------------------------------------------------------------------------

export function DashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [view, setView] = useState<ViewMode>("grid");
  const [sort, setSort] = useState<SortMode>("recent");
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);
  const [page, setPage] = useState(1);

  const refreshLibrary = useCallback(
    async (q?: string) => {
      setLoading(true);
      const params = new URLSearchParams({ status: "all", sort: "recent_activity" });
      if (q ?? query) params.set("q", q ?? query);
      const res = await fetch(`/api/library?${params}`);
      const data = await res.json();
      if (data.ok) setLibrary(data.data);
      setLoading(false);
    },
    [query],
  );

  useEffect(() => {
    void refreshLibrary("");
    setPage(1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshLibrary();
      setPage(1);
    }, 220);
    return () => clearTimeout(t);
  }, [query, refreshLibrary]);

  const createSystem = async () => {
    const id = toast.loading("Creating system...");
    try {
      const res = await fetch("/api/systems", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Untitled System" }),
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

  const handleImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    const id = toast.loading("Importing...");
    try {
      const res = await fetch("/api/import/system", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ schema: importText, mode: "new" }),
      });
      const data = await res.json();
      if (data.ok && data.data.ok) {
        toast.success("System imported", { id });
        setShowImport(false);
        setImportText("");
        router.push(`/systems/${data.data.systemId}`);
      } else {
        toast.error(data.error ?? "Import failed", { id });
      }
    } catch {
      toast.error("Import failed", { id });
    } finally {
      setImporting(false);
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
    toast.success(`${row.name} archived`);
    void refreshLibrary();
  };

  const handleRestore = async (row: LibraryRow) => {
    await fetch(`/api/systems/${row.id}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "restore" }),
    });
    toast.success(`${row.name} restored`);
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
    toast.success(`${row.name} exported`);
  };

  // Stats — compute against a stable "now" that ticks once a minute so memo stays pure
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(i);
  }, []);

  const stats = useMemo(() => {
    const total = library.rows.length;
    const archived = library.rows.filter((r) => r.archivedAt).length;
    const active = total - archived;
    const favorites = library.rows.filter((r) => r.favorite && !r.archivedAt).length;
    const activeThisWeek = library.rows.filter((r) => {
      if (r.archivedAt) return false;
      const ts = new Date(r.updatedAt).getTime();
      return now - ts < ONE_WEEK_MS;
    }).length;
    return { total, active, archived, favorites, activeThisWeek };
  }, [library.rows, now]);

  // Visible rows by filter + sort
  const visibleRows = useMemo(() => {
    let rows = library.rows.slice();
    if (filter === "active") rows = rows.filter((r) => !r.archivedAt);
    else if (filter === "favorites") rows = rows.filter((r) => r.favorite && !r.archivedAt);
    else if (filter === "archived") rows = rows.filter((r) => !!r.archivedAt);
    // "all" passes through

    rows.sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "created")
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      // recent
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
    return rows;
  }, [library.rows, filter, sort]);

  const pagedRows = visibleRows.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < visibleRows.length;

  // List view columns
  const listColumns: DataTableColumn<LibraryRow>[] = [
    {
      key: "name",
      header: "Name",
      render: (row) => (
        <div className="flex items-center gap-2 min-w-0">
          {row.favorite && (
            <Star size={12} className="text-[#3C3C43] fill-[#3C3C43] shrink-0" />
          )}
          <span className="t-label font-medium text-[#111] truncate">{row.name}</span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (row) =>
        row.archivedAt ? (
          <StatusBadge tone="warning">Archived</StatusBadge>
        ) : (
          <span className="t-caption text-[#8E8E93]">--</span>
        ),
    },
    {
      key: "tags",
      header: "Tags",
      render: (row) =>
        row.tags.length === 0 ? (
          <span className="t-caption text-[#C7C7CC]">--</span>
        ) : (
          <div className="flex gap-1 flex-wrap">
            {row.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="neutral">
                {tag}
              </Badge>
            ))}
            {row.tags.length > 3 && <Badge tone="neutral">+{row.tags.length - 3}</Badge>}
          </div>
        ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      width: "140px",
      render: (row) => (
        <span className="t-label text-[#3C3C43]">{formatRelativeDate(row.updatedAt)}</span>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      width: "140px",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#F5F5F7] text-[#3C3C43] t-caption font-semibold">
            {initials(row.createdBy)}
          </span>
          <span className="t-label text-[#3C3C43] truncate">{row.createdBy}</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "48px",
      align: "right",
      render: (row) => (
        <Dropdown>
          <DropdownTrigger>
            <button
              type="button"
              aria-label="System options"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center justify-center w-7 h-7 rounded-md text-[#8E8E93] hover:text-[#111] hover:bg-[#F5F5F7] transition-colors"
            >
              <MoreHorizontal size={14} />
            </button>
          </DropdownTrigger>
          <Dropdown.Popover>
            <DropdownMenu aria-label="System actions">
              <DropdownItem id="fav" onAction={() => handleToggleFavorite(row)}>
                <span className="flex items-center gap-2 t-label">
                  <Star size={14} />
                  {row.favorite ? "Unfavorite" : "Favorite"}
                </span>
              </DropdownItem>
              <DropdownItem
                id="edit"
                onAction={() => router.push(`/systems/${row.id}`)}
              >
                <span className="flex items-center gap-2 t-label">
                  <Edit size={14} />
                  Open in editor
                </span>
              </DropdownItem>
              <DropdownItem id="export" onAction={() => handleExport(row)}>
                <span className="flex items-center gap-2 t-label">
                  <Download size={14} />
                  Export
                </span>
              </DropdownItem>
              {row.archivedAt ? (
                <DropdownItem id="restore" onAction={() => handleRestore(row)}>
                  <span className="flex items-center gap-2 t-label">
                    <RotateCcw size={14} />
                    Restore
                  </span>
                </DropdownItem>
              ) : (
                <DropdownItem id="archive" onAction={() => handleArchive(row)}>
                  <span className="flex items-center gap-2 t-label text-[#991B1B]">
                    <Archive size={14} />
                    Archive
                  </span>
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown.Popover>
        </Dropdown>
      ),
    },
  ];

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Total systems"
          value={stats.total}
          icon={<Layers size={16} />}
          footer={`${stats.active} active`}
        />
        <MetricCard
          label="Active this week"
          value={stats.activeThisWeek}
          icon={<Activity size={16} />}
          footer="Updated in last 7 days"
        />
        <MetricCard
          label="Favorites"
          value={stats.favorites}
          icon={<Star size={16} />}
          footer="Pinned for quick access"
        />
        <MetricCard
          label="Archived"
          value={stats.archived}
          icon={<AlertTriangle size={16} />}
          footer="Hidden from default view"
        />
      </div>

      {/* Toolbar */}
      <div className="bg-white border border-black/[0.08] rounded-[12px] overflow-hidden">
        <Toolbar
          left={
            <div className="flex items-center gap-3 min-w-0">
              <SegmentedControl
                size="sm"
                value={filter}
                onChange={(id) => {
                  setFilter(id as FilterId);
                  setPage(1);
                }}
                items={[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "favorites", label: "Favorites" },
                  { id: "archived", label: "Archived" },
                ]}
              />
              <div className="w-56 hidden md:block">
                <SearchInput
                  value={query}
                  onChange={setQuery}
                  placeholder="Search systems"
                />
              </div>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortMode)}
                aria-label="Sort"
                className="h-9 rounded-lg border border-black/[0.08] bg-white px-2.5 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="recent">Recent</option>
                <option value="name">Name</option>
                <option value="created">Created</option>
              </select>
              <SegmentedControl
                size="sm"
                value={view}
                onChange={(id) => setView(id as ViewMode)}
                items={[
                  { id: "grid", label: "Grid" },
                  { id: "list", label: "List" },
                ]}
              />
              <Button
                variant="outline"
                size="sm"
                onPress={() => setShowImport(true)}
              >
                <Upload size={14} />
                Import
              </Button>
              <Button variant="primary" size="sm" onPress={createSystem}>
                <Plus size={14} />
                New System
              </Button>
            </div>
          }
        />

        {/* Mobile-only search row */}
        <div className="md:hidden p-3 border-b border-black/[0.06]">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search systems"
          />
        </div>

        {/* Content */}
        <div className="p-4">
          {loading && library.rows.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-12">
              <Spinner size="md" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </div>
          ) : visibleRows.length === 0 ? (
            library.rows.length === 0 && !query && filter !== "archived" ? (
              <div className="grid-bg min-h-[70vh] flex items-center justify-center rounded-[12px]">
                <div className="flex flex-col items-center text-center gap-4 max-w-md px-6">
                  <h2 className="t-h2 text-[#111]">Start your first system</h2>
                  <p className="t-body text-[#3C3C43]">
                    Pipes treats every node the same. You decide what each one is.
                  </p>
                  <div className="flex flex-col items-center gap-3 mt-2">
                    <Button variant="primary" size="md" onPress={createSystem}>
                      <Plus size={14} />
                      New system
                    </Button>
                    <button
                      type="button"
                      onClick={() => router.push("/templates")}
                      className="t-label text-[#3C3C43] hover:text-indigo-700 transition-colors"
                    >
                      or start from a template
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title={
                  query
                    ? `No systems match "${query}"`
                    : filter === "archived"
                      ? "Nothing archived"
                      : filter === "favorites"
                        ? "No favorites yet"
                        : "No systems yet"
                }
                description={
                  query
                    ? "Try a different search or clear the filter."
                    : filter === "archived"
                      ? "Archived systems live here. They are hidden from the default view."
                      : filter === "favorites"
                        ? "Favorite systems for quick access from the toolbar."
                        : "Start fresh, import a schema, or grab a template."
                }
                action={
                  query ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onPress={() => setQuery("")}
                    >
                      Clear search
                    </Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onPress={() => setShowImport(true)}
                      >
                        <Upload size={14} />
                        Import schema
                      </Button>
                      <Button variant="primary" size="sm" onPress={createSystem}>
                        <Plus size={14} />
                        New System
                      </Button>
                    </div>
                  )
                }
              />
            )
          ) : view === "grid" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {pagedRows.map((row) => (
                  <SystemCard
                    key={row.id}
                    row={row}
                    onOpen={() => router.push(`/systems/${row.id}`)}
                    onToggleFavorite={() => handleToggleFavorite(row)}
                    onArchive={() => handleArchive(row)}
                    onRestore={() => handleRestore(row)}
                    onExport={() => handleExport(row)}
                    onEdit={() => router.push(`/systems/${row.id}`)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setPage((p) => p + 1)}
                  >
                    Load more
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              )}
            </>
          ) : (
            <>
              <DataTable
                columns={listColumns}
                rows={pagedRows}
                onRowClick={(row) => router.push(`/systems/${row.id}`)}
                dense
              />
              {hasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => setPage((p) => p + 1)}
                  >
                    Load more
                    <ArrowUpRight size={14} />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Import dialog */}
      <Dialog
        open={showImport}
        onOpenChange={(o) => {
          setShowImport(o);
          if (!o) setImportText("");
        }}
        title="Import system"
        description="Paste a pipes_schema_v1 JSON document. A new system will be created with its contents."
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setShowImport(false)}
              isDisabled={importing}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={handleImport}
              isDisabled={importing || !importText.trim()}
            >
              {importing ? <Spinner size="xs" /> : <Upload size={14} />}
              {importing ? "Importing..." : "Import"}
            </Button>
          </>
        }
      >
        <Textarea
          aria-label="Schema JSON"
          rows={10}
          placeholder='{ "pipes_schema_v1": { ... } }'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="font-mono"
        />
        <p className="t-caption text-[#8E8E93] mt-2 inline-flex items-center gap-1.5">
          <MessageSquare size={12} />
          Validation runs after import. Errors will be shown in the editor.
        </p>
      </Dialog>
    </div>
  );
}
