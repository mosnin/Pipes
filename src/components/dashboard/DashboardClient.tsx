"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, EmptyState, Input, PageHeader, Select } from "@/components/ui";

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

export function DashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [name, setName] = useState("New system");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "favorites" | "mine" | "shared">("active");
  const [sort, setSort] = useState<"recent_activity" | "name" | "created" | "updated">("recent_activity");
  const [selectedTag, setSelectedTag] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refreshLibrary = useCallback(async (input?: { q?: string; tag?: string }) => {
    setLoadingLibrary(true);
    const params = new URLSearchParams({ status, sort });
    if (input?.q ?? query) params.set("q", input?.q ?? query);
    if (input?.tag ?? selectedTag) params.set("tag", input?.tag ?? selectedTag);
    const res = await fetch(`/api/library?${params.toString()}`);
    const data = await res.json();
    if (data.ok) setLibrary(data.data);
    setLoadingLibrary(false);
  }, [query, selectedTag, sort, status]);

  useEffect(() => { void refreshLibrary({ q: "", tag: "" }); }, [status, sort, refreshLibrary]);
  useEffect(() => {
    const timer = setTimeout(() => { void refreshLibrary(); }, 220);
    return () => clearTimeout(timer);
  }, [query, selectedTag, refreshLibrary]);

  const createSystem = async () => {
    setSubmitting(true);
    const res = await fetch("/api/systems", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name }) });
    const data = await res.json();
    setSubmitting(false);
    if (data.ok) return router.push(`/systems/${data.data.systemId}`);
  };

  const visibleRows = useMemo(
    () => library.rows.filter((row) => (status === "archived" ? !!row.archivedAt : !row.archivedAt)),
    [library.rows, status]
  );

  return (
    <div className="library-shell">
      <PageHeader title="Systems" subtitle="Design, review, refine, and hand off reusable architecture." />

      <Card>
        <div className="library-create-row">
          <div>
            <p className="eyebrow">PRIMARY ACTION</p>
            <h3>Create a new system</h3>
          </div>
          <div className="library-create-controls">
            <Input aria-label="New system name" value={name} onChange={(e) => setName(e.target.value)} placeholder="System name" />
            <Button onClick={createSystem} disabled={submitting}>{submitting ? "Creating…" : "Create"}</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="dashboard-filters">
          <Input aria-label="Search systems" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search systems by name, description, tags" />
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="favorites">Favorites</option>
            <option value="mine">Mine</option>
            <option value="shared">Shared</option>
          </Select>
          <Select aria-label="Sort systems" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="recent_activity">Recent activity</option>
            <option value="name">Name</option>
            <option value="created">Created</option>
            <option value="updated">Updated</option>
          </Select>
          <Input aria-label="Filter by tag" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} placeholder="Tag" />
        </div>
        {library.availableTags.length ? <p className="muted">Tags: {library.availableTags.join(" · ")}</p> : null}
      </Card>

      <div className="grid-2">
        <Card>
          <h3>Recent</h3>
          <div className="dashboard-list">
            {library.recent.slice(0, 5).map((row) => (
              <button key={row.id} className="system-mini-link" onClick={() => router.push(`/systems/${row.id}`)}>{row.name}</button>
            ))}
            {library.recent.length === 0 ? <p className="muted">No recent systems yet.</p> : null}
          </div>
        </Card>
        <Card>
          <h3>Favorites</h3>
          <div className="dashboard-list">
            {library.favorites.slice(0, 5).map((row) => (
              <button key={row.id} className="system-mini-link" onClick={() => router.push(`/systems/${row.id}`)}>{row.name}</button>
            ))}
            {library.favorites.length === 0 ? <p className="muted">No favorites yet.</p> : null}
          </div>
        </Card>
      </div>

      {loadingLibrary ? <EmptyState title="Loading systems" description="Refreshing your system library." /> : visibleRows.length === 0 ? <EmptyState title="No systems found" description="Adjust filters or create a new system." /> : (
        <Card>
          <h3>{status === "archived" ? "Archived systems" : "Active systems"}</h3>
          <div className="library-list-grid">
            {visibleRows.map((row) => (
              <article key={row.id} className="library-system-row">
                <div>
                  <strong>{row.name}</strong>
                  <p className="muted">{row.description || "No description yet."}</p>
                  <p className="muted">{row.tags.length ? row.tags.join(" · ") : "No tags"}</p>
                </div>
                <div className="nav-inline">
                  <Button onClick={() => router.push(`/systems/${row.id}`)}>Open</Button>
                  <Button variant="subtle" onClick={async () => {
                    await fetch("/api/library", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "favorite", systemId: row.id, favorite: !row.favorite }) });
                    refreshLibrary();
                  }}>{row.favorite ? "Unfavorite" : "Favorite"}</Button>
                  {!row.archivedAt ? <Button variant="subtle" onClick={async () => { await fetch(`/api/systems/${row.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive" }) }); refreshLibrary(); }}>Archive</Button> : <Button variant="subtle" onClick={async () => { await fetch(`/api/systems/${row.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restore" }) }); refreshLibrary(); }}>Restore</Button>}
                </div>
              </article>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
