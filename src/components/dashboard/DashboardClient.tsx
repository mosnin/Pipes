"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function TemplatePanel({ onLaunch }: { onLaunch: (templateId: string) => Promise<void> }) {
  const [templates, setTemplates] = useState<Array<{ id: string; title: string; category: string; useCase: string; complexity: string }>>([]);
  useEffect(() => { fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.data ?? [])); }, []);

  return (
    <Card>
      <h3>Recommended templates</h3>
      <div className="dashboard-list">
        {templates.slice(0, 4).map((t) => (
          <div key={t.id} className="dashboard-row">
            <span>{t.title} · {t.category} · {t.complexity}</span>
            <Button onClick={() => onLaunch(t.id)}>Use</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuickAccessCards({ recent, favorites }: { recent: LibraryRow[]; favorites: LibraryRow[] }) {
  const router = useRouter();

  return (
    <div className="grid-2">
      <Card>
        <h3>Recent systems</h3>
        {recent.length === 0
          ? <p className="muted">No recent activity yet.</p>
          : recent.map((row) => <div key={row.id} className="nav-inline"><Button variant="subtle" onClick={() => router.push(`/systems/${row.id}`)}>{row.name}</Button></div>)}
      </Card>
      <Card>
        <h3>Favorite systems</h3>
        {favorites.length === 0
          ? <p className="muted">No favorites yet.</p>
          : favorites.map((row) => <div key={row.id} className="nav-inline"><Button variant="subtle" onClick={() => router.push(`/systems/${row.id}`)}>{row.name}</Button></div>)}
      </Card>
    </div>
  );
}

export function DashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }) {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [name, setName] = useState("New System");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"active" | "archived" | "favorites" | "mine" | "shared">("active");
  const [sort, setSort] = useState<"recent_activity" | "name" | "created" | "updated">("recent_activity");
  const [selectedTag, setSelectedTag] = useState("");
  const [aiPrompt, setAiPrompt] = useState("Build a support triage system with guardrails.");
  const [importText, setImportText] = useState("");
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [actionState, setActionState] = useState<{ kind: "idle" | "error" | "success"; message?: string }>({ kind: "idle" });
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
    setActionState({ kind: "idle" });
    const res = await fetch("/api/systems", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name })
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.ok) return router.push(`/systems/${data.data.systemId}`);
    setActionState({ kind: "error", message: data.error?.message ?? "Failed to create system." });
  };

  const visibleRows = useMemo(
    () => library.rows.filter((row) => (status === "archived" ? !!row.archivedAt : !row.archivedAt)),
    [library.rows, status]
  );

  return (
    <div className="section-stack">
      <PageHeader title="System Library" subtitle="Search, organize, and return to critical systems quickly." />

      <Card>
        <div className="dashboard-toolbar" role="navigation" aria-label="Workspace navigation">
          <Link href="/settings/billing"><Button variant="subtle">Billing</Button></Link>
          <Link href="/settings/collaboration"><Button variant="subtle">Collaboration</Button></Link>
          <Link href="/onboarding"><Button variant="subtle">Onboarding</Button></Link>
        </div>
      </Card>

      <Card>
        <h3>Quick create</h3>
        <div className="form-stack">
          <div className="dashboard-row">
            <Input aria-label="New system name" value={name} onChange={(e) => setName(e.target.value)} placeholder="System name" />
            <div className="nav-inline">
              <Button onClick={createSystem} disabled={submitting}>{submitting ? "Creating…" : "Create blank"}</Button>
              <Button variant="subtle" onClick={() => router.push("/onboarding")}>Guided start</Button>
            </div>
          </div>

          <div className="dashboard-row">
            <Input value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="AI prompt" />
            <Button onClick={async () => {
              setActionState({ kind: "idle" });
              const draftRes = await fetch("/api/ai/generate-system", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ prompt: aiPrompt })
              });
              const draftData = await draftRes.json();
              if (!draftData.ok) return setActionState({ kind: "error", message: draftData.error?.message ?? "AI draft failed." });
              const commitRes = await fetch("/api/ai/generate-system", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ commit: true, draft: draftData.data })
              });
              const commitData = await commitRes.json();
              if (commitData.ok) return router.push(`/systems/${commitData.data.systemId}`);
              setActionState({ kind: "error", message: commitData.error?.message ?? "Unable to commit generated system." });
            }}>
              Generate + commit
            </Button>
          </div>

          <div className="dashboard-row">
            <Input value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste pipes_schema_v1 JSON" />
            <Button variant="subtle" onClick={async () => {
              const res = await fetch("/api/import/system", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ schema: importText, mode: "new" })
              });
              const data = await res.json();
              if (data.ok && data.data.ok) return router.push(`/systems/${data.data.systemId}`);
              setActionState({ kind: "error", message: data.error?.message ?? data.data?.errors?.[0]?.message ?? "Import failed." });
            }}>
              Import
            </Button>
          </div>
        </div>
        {actionState.kind === "error" ? <p role="alert" className="status-error">{actionState.message}</p> : null}
      </Card>

      <Card>
        <h3>Library controls</h3>
        <div className="dashboard-filters">
          <Input aria-label="Search systems" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search title, description, tags" />
          <Select aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">active</option>
            <option value="archived">archived</option>
            <option value="favorites">favorites</option>
            <option value="mine">mine</option>
            <option value="shared">shared</option>
          </Select>
          <Select aria-label="Sort systems" value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
            <option value="recent_activity">recent_activity</option>
            <option value="name">name</option>
            <option value="created">created</option>
            <option value="updated">updated</option>
          </Select>
          <Input aria-label="Filter by tag" value={selectedTag} onChange={(e) => setSelectedTag(e.target.value)} placeholder="Filter by tag" />
        </div>
        {library.availableTags.length ? <p className="muted">Known tags: {library.availableTags.join(" · ")}</p> : null}
      </Card>

      <QuickAccessCards recent={library.recent} favorites={library.favorites} />

      <TemplatePanel onLaunch={async (templateId) => {
        const res = await fetch(`/api/templates/${templateId}/instantiate`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({})
        });
        const data = await res.json();
        if (data.ok) router.push(`/systems/${data.data.systemId}`);
      }} />

      {loadingLibrary ? <EmptyState title="Loading system library" description="Retrieving systems, favorites, and tags." /> : visibleRows.length === 0 ? <EmptyState title="No systems found" description="Adjust search or filters to recover results." /> : (
        <Card>
          <h3>{status === "archived" ? "Archived systems" : "Active systems"}</h3>
          <div className="dashboard-list">
            {visibleRows.map((row) => (
              <Card key={row.id}>
                <div className="dashboard-row">
                  <div>
                    <strong>{row.name}</strong>
                    <p className="muted">{row.description || "No description"}</p>
                    <p className="muted">Tags: {row.tags.join(", ") || "none"}</p>
                  </div>
                  <div className="nav-inline">
                    <Button onClick={() => router.push(`/systems/${row.id}`)}>Open</Button>
                    <Button variant="subtle" onClick={async () => {
                      await fetch("/api/library", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "favorite", systemId: row.id, favorite: !row.favorite })
                      });
                      refreshLibrary();
                    }}>{row.favorite ? "★" : "☆"}</Button>
                    <Button variant="subtle" onClick={async () => {
                      const raw = prompt("Comma-separated tags", row.tags.join(","));
                      if (raw == null) return;
                      await fetch("/api/library", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ action: "tags", systemId: row.id, tags: raw.split(",") })
                      });
                      refreshLibrary();
                    }}>Tags</Button>
                    {!row.archivedAt
                      ? <Button variant="subtle" onClick={async () => { await fetch(`/api/systems/${row.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "archive" }) }); refreshLibrary(); }}>Archive</Button>
                      : <Button variant="subtle" onClick={async () => { await fetch(`/api/systems/${row.id}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "restore" }) }); refreshLibrary(); }}>Restore</Button>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
