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
  Zap,
  ArrowRight,
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

// ---------------------------------------------------------------------------
// Empty State — the invitation
// ---------------------------------------------------------------------------

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      {/* Visual hint: a tiny node graph */}
      <div className="relative mb-10 select-none" aria-hidden>
        <div className="flex items-center gap-3">
          <div className="w-20 h-12 rounded-xl bg-white border border-black/[0.1] flex items-center justify-center">
            <span className="t-caption font-semibold text-[#8E8E93] uppercase tracking-wide">Input</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-black/[0.1] rounded" />
            <div className="w-8 h-0.5 bg-indigo-300 rounded" />
          </div>
          <div className="w-24 h-14 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
            <span className="t-caption font-semibold text-indigo-500 uppercase tracking-wide">Agent</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="w-8 h-0.5 bg-indigo-300 rounded" />
            <div className="w-8 h-0.5 bg-black/[0.1] rounded" />
          </div>
          <div className="w-20 h-12 rounded-xl bg-white border border-black/[0.1] flex items-center justify-center">
            <span className="t-caption font-semibold text-[#8E8E93] uppercase tracking-wide">Output</span>
          </div>
        </div>
        <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-indigo-600 flex items-center justify-center">
          <Zap className="w-3 h-3 text-white" />
        </div>
      </div>

      <h2 className="text-2xl font-bold text-[#111] mb-3 text-center">
        Draw your first system
      </h2>
      <p className="t-body text-[#3C3C43] max-w-sm text-center mb-8 leading-relaxed">
        Design it once on a canvas. Any AI agent can read it and build from it immediately.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Button variant="primary" onPress={onNew} className="h-11 px-6 t-label font-semibold">
          <Plus className="w-4 h-4" />
          Start from scratch
        </Button>
        <Link href="/templates">
          <Button variant="outline" className="h-11 px-6 t-label font-semibold">
            Browse templates
            <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      <Link href="/connect" className="mt-5 inline-flex items-center gap-1.5 px-4 py-2 t-label font-medium text-indigo-600 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 transition-colors"
            style={{ borderRadius: "8px" }}>
        <Zap className="w-3.5 h-3.5" />
        Connect a system to an agent
      </Link>
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

function SystemCard({ row, onOpen, onToggleFavorite, onArchive, onRestore, onExport, onEdit }: SystemCardProps) {
  return (
    <Card
      className="bg-white border border-black/[0.08] hover:border-indigo-300 transition-colors duration-150 cursor-pointer group"
      style={{ borderRadius: "12px" }}
      onClick={onOpen}
    >
      {/* Visual canvas preview area */}
      <div className="h-28 bg-[#F5F5F7] flex items-center justify-center overflow-hidden relative"
           style={{ borderRadius: "12px 12px 0 0", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="flex items-center gap-2 opacity-40 group-hover:opacity-70 transition-opacity">
          <div className="w-12 h-8 rounded-lg bg-white border border-black/[0.12]" />
          <div className="w-4 h-0.5 bg-black/[0.15] rounded" />
          <div className="w-14 h-9 rounded-lg bg-indigo-50 border border-indigo-200" />
          <div className="w-4 h-0.5 bg-black/[0.15] rounded" />
          <div className="w-12 h-8 rounded-lg bg-white border border-black/[0.12]" />
        </div>
        {row.archivedAt && (
          <div className="absolute top-2 left-2 t-caption font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
            Archived
          </div>
        )}
        {row.favorite && (
          <Star className="absolute top-2 right-2 w-3.5 h-3.5 text-amber-400 fill-amber-400" />
        )}
      </div>

      <Card.Content className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="t-label font-semibold text-[#111] leading-tight truncate group-hover:text-indigo-600 transition-colors">
              {row.name}
            </h3>
            <p className="t-caption text-[#8E8E93] mt-0.5 line-clamp-1">
              {row.description || "No description"}
            </p>
          </div>
          <Dropdown>
            <DropdownTrigger>
              <Button
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label="Options"
                className="shrink-0 text-[#C7C7CC] hover:text-[#3C3C43] hover:bg-black/[0.04] rounded-lg -mr-1"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownTrigger>
            <Dropdown.Popover>
              <DropdownMenu aria-label="System actions">
                <DropdownItem id="fav" onAction={onToggleFavorite}>
                  <span className="flex items-center gap-2 t-label">
                    <Star className="w-3.5 h-3.5" />
                    {row.favorite ? "Unfavorite" : "Favorite"}
                  </span>
                </DropdownItem>
                <DropdownItem id="edit" onAction={onEdit}>
                  <span className="flex items-center gap-2 t-label"><Edit className="w-3.5 h-3.5" />Edit</span>
                </DropdownItem>
                <DropdownItem id="export" onAction={onExport}>
                  <span className="flex items-center gap-2 t-label"><Download className="w-3.5 h-3.5" />Export</span>
                </DropdownItem>
                {row.archivedAt ? (
                  <DropdownItem id="restore" onAction={onRestore}>
                    <span className="flex items-center gap-2 t-label"><RotateCcw className="w-3.5 h-3.5" />Restore</span>
                  </DropdownItem>
                ) : (
                  <DropdownItem id="archive" onAction={onArchive}>
                    <span className="flex items-center gap-2 t-label text-red-600"><Archive className="w-3.5 h-3.5" />Archive</span>
                  </DropdownItem>
                )}
              </DropdownMenu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <div className="flex items-center justify-between mt-2.5">
          {row.tags.length > 0 ? (
            <div className="flex gap-1 flex-wrap">
              {row.tags.slice(0, 2).map((tag) => (
                <Chip key={tag} variant="soft" color="default" size="sm" className="t-caption px-1.5">
                  {tag}
                </Chip>
              ))}
              {row.tags.length > 2 && (
                <Chip variant="soft" color="default" size="sm" className="t-caption px-1.5">
                  +{row.tags.length - 2}
                </Chip>
              )}
            </div>
          ) : (
            <span />
          )}
          <span className="t-caption text-[#8E8E93] shrink-0">
            {formatRelativeDate(row.updatedAt)}
          </span>
        </div>
      </Card.Content>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Import Modal
// ---------------------------------------------------------------------------

function ImportModal({ onImport, onClose }: { onImport: (text: string) => Promise<void>; onClose: () => void }) {
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
      <div className="bg-white w-full max-w-lg mx-4 p-6" style={{ borderRadius: "16px" }}>
        <h2 className="t-title text-[#111] mb-1">Import System</h2>
        <p className="t-label text-[#3C3C43] mb-4">
          Paste a <code className="font-mono t-caption bg-[#F5F5F7] px-1 py-0.5 rounded">pipes_schema_v1</code> JSON.
        </p>
        <textarea
          className="w-full h-40 border border-black/[0.08] bg-[#F5F5F7] p-3 t-caption font-mono text-[#111] resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
          style={{ borderRadius: "8px" }}
          placeholder='{ "pipes_schema_v1": ... }'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
        />
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button variant="ghost" size="sm" onPress={onClose} isDisabled={loading}>Cancel</Button>
          <Button variant="primary" size="sm" onPress={handleImport} isDisabled={loading || !importText.trim()}>
            {loading ? "Importing…" : "Import"}
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

export function DashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [query, setQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [page, setPage] = useState(1);

  const refreshLibrary = useCallback(async (q?: string) => {
    setLoading(true);
    const params = new URLSearchParams({ status: "all", sort: "recent_activity" });
    if (q ?? query) params.set("q", q ?? query);
    const res = await fetch(`/api/library?${params}`);
    const data = await res.json();
    if (data.ok) setLibrary(data.data);
    setLoading(false);
  }, [query]);

  useEffect(() => { void refreshLibrary(""); setPage(1); }, []);

  useEffect(() => {
    const t = setTimeout(() => { void refreshLibrary(); setPage(1); }, 220);
    return () => clearTimeout(t);
  }, [query, refreshLibrary]);

  const createSystem = async () => {
    const id = toast.loading("Creating system…");
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
        toast.error(data.error ?? "Import failed", { id });
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
    if (!res.ok) { toast.error("Export failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${row.name.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`"${row.name}" exported`);
  };

  const visibleRows = useMemo(() => {
    return library.rows.filter((row) => showArchived ? !!row.archivedAt : !row.archivedAt);
  }, [library.rows, showArchived]);

  const pagedRows = visibleRows.slice(0, page * PAGE_SIZE);
  const hasMore = page * PAGE_SIZE < visibleRows.length;
  const isEmpty = !loading && visibleRows.length === 0 && !query && !showArchived;

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {isEmpty ? (
        <EmptyState onNew={createSystem} />
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-[#111]">Your Systems</h1>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onPress={() => setShowImport(true)}>Import</Button>
              <Button variant="primary" size="sm" onPress={createSystem}>
                <Plus className="w-4 h-4" />
                New System
              </Button>
            </div>
          </div>

          {/* Search + archive toggle */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
              <Input
                aria-label="Search systems"
                placeholder="Search…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-8 h-9 text-sm"
              />
            </div>
            <button
              onClick={() => { setShowArchived((v) => !v); setPage(1); }}
              className={`t-caption font-medium px-3 py-1.5 rounded-lg transition-colors ${showArchived ? "bg-amber-50 text-amber-700 border border-amber-200" : "text-[#8E8E93] hover:text-[#3C3C43] hover:bg-black/[0.04]"}`}
            >
              {showArchived ? "← Back to active" : "Show archived"}
            </button>
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-48 border border-black/[0.06] bg-[#F5F5F7] animate-pulse" style={{ borderRadius: "12px" }} />
              ))}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="t-label font-medium text-[#3C3C43] mb-1">
                {query ? `No systems matching "${query}"` : "Nothing here yet"}
              </p>
              {query && (
                <button onClick={() => setQuery("")} className="t-caption text-indigo-600 hover:underline mt-1">
                  Clear search
                </button>
              )}
            </div>
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
                    onEdit={() => router.push(`/systems/${row.id}`)}
                  />
                ))}
              </div>
              {hasMore && (
                <div className="flex justify-center mt-8">
                  <Button variant="outline" size="sm" onPress={() => setPage((p) => p + 1)}>
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}
    </div>
  );
}
