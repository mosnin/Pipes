"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ConversationInput, type ConversationInputHandle } from "@/components/editor/ConversationInput";
import { STARTER_CHIPS } from "@/components/editor/ConversationDrawer";
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
  Upload,
  Trash2,
  Copy,
  Tag,
  X,
  Bot,
  ArrowRight,
} from "lucide-react";
import {
  Button,
  Input,
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
import { EmptyCanvas } from "@/components/illustrations";
import { MentalModelCard } from "@/components/MentalModelCard";
import { MobileGate } from "@/components/mobile/MobileGate";
import { MobileDashboard } from "@/components/mobile/MobileDashboard";

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

// Six starters for the dashboard hero. Three come from the drawer (the same
// three a brand-new editor sees) plus three more pulled from the existing
// 14-template catalog and rewritten as natural sentences.
const DASHBOARD_STARTERS: Array<{ id: string; label: string; prompt: string }> = [
  ...STARTER_CHIPS,
  {
    id: "multi-agent-handoff",
    label: "Planner to coder",
    prompt:
      "A planner agent reads inbound tickets and writes a plan. A guard reviews the plan against policy. A coder agent runs the approved plan and opens a PR.",
  },
  {
    id: "document-qa-system",
    label: "Document QA",
    prompt:
      "A user asks a question. A retriever pulls matching chunks from the docs index. An answering agent writes a grounded answer. A citation formatter attaches inline citations and the response goes back to the user.",
  },
  {
    id: "data-extraction-pipeline",
    label: "Data extraction",
    prompt:
      "A user uploads a document. OCR runs on it. A field extractor pulls structured fields. A schema validator checks the record. Valid records land in storage; failures land in a dead-letter queue.",
  },
];

// ---------------------------------------------------------------------------
// System Card (grid)
// ---------------------------------------------------------------------------

type SystemCardProps = {
  row: LibraryRow;
  onOpen: () => void;
  onToggleFavorite: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onExport: () => void;
  onEdit: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onManageTags: () => void;
};

function SystemCard({
  row,
  onOpen,
  onToggleFavorite,
  onArchive,
  onRestore,
  onDelete,
  onExport,
  onEdit,
  onRename,
  onDuplicate,
  onManageTags,
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
                <DropdownItem id="rename" onAction={onRename}>
                  <span className="flex items-center gap-2 t-label">
                    <Edit size={14} />
                    Rename
                  </span>
                </DropdownItem>
                <DropdownItem id="duplicate" onAction={onDuplicate}>
                  <span className="flex items-center gap-2 t-label">
                    <Copy size={14} />
                    Duplicate
                  </span>
                </DropdownItem>
                <DropdownItem id="tags" onAction={onManageTags}>
                  <span className="flex items-center gap-2 t-label">
                    <Tag size={14} />
                    Manage tags
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
                  <>
                    <DropdownItem id="restore" onAction={onRestore}>
                      <span className="flex items-center gap-2 t-label">
                        <RotateCcw size={14} />
                        Restore
                      </span>
                    </DropdownItem>
                    <DropdownItem id="delete" onAction={onDelete}>
                      <span className="flex items-center gap-2 t-label text-[#991B1B]">
                        <Trash2 size={14} />
                        Delete permanently
                      </span>
                    </DropdownItem>
                  </>
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
  return (
    <MobileGate mobile={<MobileDashboard initialLibrary={initialLibrary} />}>
      <DesktopDashboardClient initialLibrary={initialLibrary} />
    </MobileGate>
  );
}

function DesktopDashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }) {
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
  const [myListings, setMyListings] = useState<Array<{ id: string; title: string; price: number; systemId: string; createdAt: string }>>([]);
  const [deleteTarget, setDeleteTarget] = useState<LibraryRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [renameTarget, setRenameTarget] = useState<LibraryRow | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [tagTarget, setTagTarget] = useState<LibraryRow | null>(null);
  const [tagDraft, setTagDraft] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [savingTags, setSavingTags] = useState(false);

  const refreshListings = useCallback(async () => {
    try {
      const res = await fetch("/api/marketplace/listings");
      const data = await res.json();
      if (data.ok && Array.isArray(data.data)) setMyListings(data.data);
    } catch {
      // non-critical; silently skip
    }
  }, []);

  const refreshLibrary = useCallback(
    async (q?: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ status: "all", sort: "recent_activity" });
        if (q ?? query) params.set("q", q ?? query);
        const res = await fetch(`/api/library?${params}`);
        const data = await res.json();
        if (data.ok) setLibrary(data.data);
        else toast.error(data.error ?? "Could not load your systems.");
      } catch {
        toast.error("Could not load your systems. Check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [query],
  );

  const [buildUsage, setBuildUsage] = useState<{ used: number; limit: number; plan: string } | null>(null);

  useEffect(() => {
    void refreshLibrary("");
    void refreshListings();
    setPage(1);
    fetch("/api/billing/usage")
      .then((r) => r.json())
      .then((body) => { if (body.ok) setBuildUsage(body.data as { used: number; limit: number; plan: string }); })
      .catch(() => {});
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
        router.push(`/systems/${data.data.systemId}?rename=1`);
      } else {
        toast.error(data.error ?? "Failed to create system", { id });
      }
    } catch {
      toast.error("Failed to create system", { id });
    }
  };

  // Hero prompt state. The dashboard hero is the first half of beat 1 of the
  // magic moment: a prompt input, no canvas, the agent has not been mentioned.
  const [heroPrompt, setHeroPrompt] = useState("");
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const heroInputRef = useRef<ConversationInputHandle>(null);

  const startSystemFromPrompt = useCallback(
    async (prompt: string) => {
      const text = prompt.trim();
      if (!text) return;
      if (heroSubmitting) return;
      setHeroSubmitting(true);
      const id = toast.loading("Creating system...");
      try {
        const words = text.split(/\s+/).filter(Boolean);
        const systemName = words.slice(0, 6).join(" ").slice(0, 48) || "New Loop";
        const res = await fetch("/api/systems", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: systemName }),
        });
        const data = await res.json();
        if (data.ok) {
          toast.success("Building...", { id });
          router.push(`/systems/${data.data.systemId}?prompt=${encodeURIComponent(text)}`);
        } else {
          toast.error(data.error ?? "Failed to create system", { id });
        }
      } catch {
        toast.error("Failed to create system", { id });
      } finally {
        setHeroSubmitting(false);
      }
    },
    [heroSubmitting, router],
  );

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
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "favorite", systemId: row.id, favorite: next }),
      });
      if (!res.ok) throw new Error();
      toast.success(next ? "Added to favorites" : "Removed from favorites");
      void refreshLibrary();
    } catch {
      toast.error("Failed to update favorites");
    }
  };

  const handleArchive = async (row: LibraryRow) => {
    try {
      const res = await fetch(`/api/systems/${row.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "archive" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${row.name} archived`);
      void refreshLibrary();
    } catch {
      toast.error(`Failed to archive ${row.name}`);
    }
  };

  const handleRestore = async (row: LibraryRow) => {
    try {
      const res = await fetch(`/api/systems/${row.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${row.name} restored`);
      void refreshLibrary();
    } catch {
      toast.error(`Failed to restore ${row.name}`);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/systems/${deleteTarget.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "delete" }),
      });
      if (!res.ok) throw new Error();
      toast.success(`${deleteTarget.name} deleted permanently`);
      setDeleteTarget(null);
      void refreshLibrary();
    } catch {
      toast.error(`Failed to delete ${deleteTarget.name}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleDuplicate = async (row: LibraryRow) => {
    const id = toast.loading(`Duplicating ${row.name}...`);
    try {
      const res = await fetch(`/api/systems/${row.id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "duplicate" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
      toast.success(`${row.name} duplicated`, { id });
      void refreshLibrary();
    } catch {
      toast.error(`Failed to duplicate ${row.name}`, { id });
    }
  };

  const handleRenameConfirmed = async () => {
    if (!renameTarget || !renameDraft.trim()) return;
    setRenaming(true);
    try {
      const res = await fetch(`/api/systems/${renameTarget.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: renameDraft.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Renamed");
      setRenameTarget(null);
      void refreshLibrary();
    } catch {
      toast.error("Failed to rename");
    } finally {
      setRenaming(false);
    }
  };

  const openManageTags = (row: LibraryRow) => {
    setTagTarget(row);
    setTagDraft([...row.tags]);
    setTagInput("");
  };

  const handleTagsConfirmed = async () => {
    if (!tagTarget) return;
    setSavingTags(true);
    try {
      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "tags", systemId: tagTarget.id, tags: tagDraft }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tags updated");
      setTagTarget(null);
      void refreshLibrary();
    } catch {
      toast.error("Failed to update tags");
    } finally {
      setSavingTags(false);
    }
  };

  const addTag = (tag: string) => {
    const t = tag.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 32);
    if (t && !tagDraft.includes(t)) setTagDraft((prev) => [...prev, t]);
    setTagInput("");
  };

  const removeTag = (tag: string) => setTagDraft((prev) => prev.filter((t) => t !== tag));

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
                id="rename"
                onAction={() => { setRenameTarget(row); setRenameDraft(row.name); }}
              >
                <span className="flex items-center gap-2 t-label">
                  <Edit size={14} />
                  Rename
                </span>
              </DropdownItem>
              <DropdownItem id="duplicate" onAction={() => handleDuplicate(row)}>
                <span className="flex items-center gap-2 t-label">
                  <Copy size={14} />
                  Duplicate
                </span>
              </DropdownItem>
              <DropdownItem id="tags" onAction={() => openManageTags(row)}>
                <span className="flex items-center gap-2 t-label">
                  <Tag size={14} />
                  Manage tags
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
                <>
                  <DropdownItem id="restore" onAction={() => handleRestore(row)}>
                    <span className="flex items-center gap-2 t-label">
                      <RotateCcw size={14} />
                      Restore
                    </span>
                  </DropdownItem>
                  <DropdownItem id="delete" onAction={() => setDeleteTarget(row)}>
                    <span className="flex items-center gap-2 t-label text-[#991B1B]">
                      <Trash2 size={14} />
                      Delete permanently
                    </span>
                  </DropdownItem>
                </>
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

  const isEmptyWorkspace = library.rows.length === 0 && !query && filter === "all" && !loading;

  if (isEmptyWorkspace) {
    return (
      <>
        <div className="grid-bg min-h-[75vh] flex items-center justify-center rounded-[16px] border border-black/[0.06]">
          <div className="flex flex-col items-center text-center gap-6 w-full max-w-[660px] px-6">
            <div className="flex flex-col gap-2">
              <h2 className="t-h2 text-[#111]">Your workspace is empty.</h2>
              <p className="t-body text-[#3C3C43]">Describe your first loop and watch it appear on the canvas.</p>
            </div>
            <div className="w-full">
              <ConversationInput
                ref={heroInputRef}
                value={heroPrompt}
                onChange={setHeroPrompt}
                onSend={() => void startSystemFromPrompt(heroPrompt)}
                onStop={() => {}}
                isRunning={heroSubmitting}
                hasError={false}
                placeholderHint={heroSubmitting ? "building" : "idle"}
                size="hero"
                placeholder="Describe your first loop."
              />
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {DASHBOARD_STARTERS.map((chip) => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => {
                    setHeroPrompt(chip.prompt);
                    heroInputRef.current?.focus();
                  }}
                  className="t-label text-[#3C3C43] hover:text-[#111] bg-white border border-black/[0.08] hover:border-black/[0.16] rounded-full px-3 h-8 transition-colors"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 t-caption text-[#8E8E93]">
              <button
                type="button"
                onClick={() => router.push("/templates")}
                className="hover:text-indigo-700 transition-colors"
              >
                or start from a template
              </button>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={createSystem}
                className="hover:text-indigo-700 transition-colors"
              >
                Start blank
              </button>
            </div>
            <Link
              href="/settings/tokens"
              className="inline-flex items-center gap-1.5 t-caption text-[#8E8E93] hover:text-indigo-600 transition-colors border border-black/[0.06] hover:border-indigo-200 rounded-full px-3 py-1.5 bg-white/60"
            >
              <Bot size={11} className="shrink-0" aria-hidden />
              Connect to any AI agent via MCP
              <ArrowRight size={11} className="shrink-0" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Import dialog (accessible even from zero state) */}
        <Dialog
          open={showImport}
          onOpenChange={(o) => {
            setShowImport(o);
            if (!o) setImportText("");
          }}
          title="Import loop"
          description="Paste a looper_schema_v1 JSON document. A new loop will be created with its contents."
          size="md"
          footer={
            <>
              <Button variant="ghost" size="sm" onPress={() => setShowImport(false)} isDisabled={importing}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onPress={handleImport} isDisabled={importing || !importText.trim()}>
                {importing ? <Spinner size="xs" /> : <Upload size={14} />}
                {importing ? "Importing..." : "Import"}
              </Button>
            </>
          }
        >
          <Textarea
            aria-label="Schema JSON"
            rows={10}
            placeholder='{ "looper_schema_v1": { ... } }'
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            className="font-mono"
          />
          <p className="t-caption text-[#8E8E93] mt-2">
            Validation runs after import. Errors will be shown in the editor.
          </p>
        </Dialog>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* One-shot mental model card. Fires once per browser on first dashboard
          mount. Manages its own SSR-safe localStorage gate and never re-shows. */}
      <MentalModelCard />
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard
          label="Total systems"
          value={stats.total}
          footer={`${stats.active} active`}
        />
        <MetricCard
          label="Active this week"
          value={stats.activeThisWeek}
          footer="Updated in last 7 days"
        />
        <MetricCard
          label="Favorites"
          value={stats.favorites}
          footer="Pinned for quick access"
        />
        <MetricCard
          label="Archived"
          value={stats.archived}
          footer="Hidden from default view"
        />
        {buildUsage && (
          <Link href="/settings/billing" className="block group">
            <MetricCard
              label="Builds this month"
              value={buildUsage.limit === Number.POSITIVE_INFINITY || buildUsage.plan !== "Free" ? buildUsage.used : `${buildUsage.used} / ${buildUsage.limit}`}
              footer={
                buildUsage.plan === "Free" ? (
                  <span
                    className={
                      buildUsage.used >= buildUsage.limit
                        ? "text-red-600 font-medium"
                        : buildUsage.used >= buildUsage.limit * 0.8
                        ? "text-amber-600 font-medium"
                        : undefined
                    }
                  >
                    {buildUsage.used >= buildUsage.limit
                      ? "Limit reached — upgrade"
                      : `${buildUsage.limit - buildUsage.used} remaining`}
                  </span>
                ) : (
                  "Unlimited on " + buildUsage.plan
                )
              }
              className="group-hover:border-indigo-200 transition-colors h-full"
            />
          </Link>
        )}
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
            <EmptyState
              illustration={<EmptyCanvas size={96} />}
              title={
                query
                  ? `No loops match "${query}"`
                  : filter === "archived"
                    ? "Nothing archived"
                    : filter === "favorites"
                      ? "No favorites yet"
                      : "No loops yet"
              }
              description={
                query
                  ? "Try a different search or clear the filter."
                  : filter === "archived"
                    ? "Archived loops live here. They are hidden from the default view."
                    : filter === "favorites"
                      ? "Favorite loops for quick access from the toolbar."
                      : "Describe your loop. Watch it appear on the canvas."
              }
              action={
                query ? (
                  <Button variant="ghost" size="sm" onPress={() => setQuery("")}>
                    Clear search
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onPress={() => setShowImport(true)}>
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
                    onDelete={() => setDeleteTarget(row)}
                    onExport={() => handleExport(row)}
                    onEdit={() => router.push(`/systems/${row.id}`)}
                    onRename={() => { setRenameTarget(row); setRenameDraft(row.name); }}
                    onDuplicate={() => handleDuplicate(row)}
                    onManageTags={() => openManageTags(row)}
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
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Published to marketplace */}
      {myListings.length > 0 && (
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-indigo-50/40 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="t-label font-semibold text-indigo-900">Published to marketplace</h2>
            <a href="/marketplace" className="t-caption text-indigo-600 hover:text-indigo-700 hover:underline">
              Browse marketplace →
            </a>
          </div>
          <div className="flex flex-col gap-2">
            {myListings.map((listing) => (
              <div key={listing.id} className="flex items-center justify-between gap-3 bg-white rounded-xl border border-indigo-100 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="t-label font-medium text-[#111] truncate">{listing.title}</p>
                  <p className="t-caption text-[#8E8E93]">
                    {listing.price === 0 ? "Free" : `$${listing.price}/mo`} · Under review
                  </p>
                </div>
                <a
                  href={`/systems/${listing.systemId}`}
                  className="t-caption text-indigo-600 hover:text-indigo-700 shrink-0"
                >
                  Edit loop →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rename dialog */}
      <Dialog
        open={!!renameTarget}
        onOpenChange={(o) => { if (!o) setRenameTarget(null); }}
        title="Rename loop"
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setRenameTarget(null)} isDisabled={renaming}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={handleRenameConfirmed}
              isDisabled={renaming || !renameDraft.trim() || renameDraft.trim() === renameTarget?.name}
            >
              {renaming ? <Spinner size="xs" /> : null}
              {renaming ? "Saving..." : "Save"}
            </Button>
          </>
        }
      >
        <Input
          aria-label="New name"
          value={renameDraft}
          onChange={(e) => setRenameDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleRenameConfirmed(); }}
          autoFocus
        />
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete permanently?"
        description={`This will permanently delete "${deleteTarget?.name ?? ""}" and all its nodes, pipes, and version history. This cannot be undone.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setDeleteTarget(null)} isDisabled={deleting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onPress={handleDeleteConfirmed}
              isDisabled={deleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {deleting ? <Spinner size="xs" /> : <Trash2 size={14} />}
              {deleting ? "Deleting..." : "Delete permanently"}
            </Button>
          </>
        }
      >
        <p className="t-caption text-[#8E8E93]">
          To recover the system later, restore it first before deleting.
        </p>
      </Dialog>

      {/* Manage tags dialog */}
      <Dialog
        open={!!tagTarget}
        onOpenChange={(o) => { if (!o) setTagTarget(null); }}
        title="Manage tags"
        description={`Add or remove tags for "${tagTarget?.name ?? ""}".`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" size="sm" onPress={() => setTagTarget(null)} isDisabled={savingTags}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onPress={handleTagsConfirmed} isDisabled={savingTags}>
              {savingTags ? <Spinner size="sm" /> : null}
              {savingTags ? "Saving..." : "Save tags"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          {/* Current tags */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px]">
            {tagDraft.length === 0 ? (
              <p className="t-caption text-[#C7C7CC] italic">No tags yet — add one below.</p>
            ) : (
              tagDraft.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-200 t-caption text-indigo-700"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="hover:text-red-600 transition-colors"
                    aria-label={`Remove tag ${tag}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))
            )}
          </div>
          {/* Available tags from workspace */}
          {library.availableTags.filter((t) => !tagDraft.includes(t)).length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="t-caption text-[#8E8E93]">Existing tags in your workspace:</p>
              <div className="flex flex-wrap gap-1.5">
                {library.availableTags
                  .filter((t) => !tagDraft.includes(t))
                  .map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-black/[0.08] t-caption text-[#3C3C43] hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={10} />
                      {tag}
                    </button>
                  ))}
              </div>
            </div>
          )}
          {/* New tag input */}
          <div className="flex gap-2">
            <Input
              aria-label="New tag"
              placeholder="Type a new tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === ",") {
                  e.preventDefault();
                  addTag(tagInput);
                }
              }}
              className="flex-1"
            />
            <Button
              variant="outline"
              size="sm"
              onPress={() => addTag(tagInput)}
              isDisabled={!tagInput.trim()}
            >
              Add
            </Button>
          </div>
          <p className="t-caption text-[#C7C7CC]">Press Enter or comma to add. Tags are lowercase.</p>
        </div>
      </Dialog>

      {/* Import dialog */}
      <Dialog
        open={showImport}
        onOpenChange={(o) => {
          setShowImport(o);
          if (!o) setImportText("");
        }}
        title="Import loop"
        description="Paste a looper_schema_v1 JSON document. A new loop will be created with its contents."
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
          placeholder='{ "looper_schema_v1": { ... } }'
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          className="font-mono"
        />
        <p className="t-caption text-[#8E8E93] mt-2">
          Validation runs after import. Errors will be shown in the editor.
        </p>
      </Dialog>
    </div>
  );
}
