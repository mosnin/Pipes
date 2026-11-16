"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { DataTable, TBody, TD, TH, THead, TR, Table, CellStack, TableFooter, type Density } from "@/components/data/table";
import { PageShell } from "@/components/layouts/archetypes";
import { RelativeTime } from "@/components/ledger/relative-time";
import { Button, IconButton } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupedList, GroupedRow } from "@/components/ui/grouped-list";
import {
  Archive,
  Clock,
  FileInput,
  Hash,
  MoreHorizontal,
  PencilLine,
  Plus,
  RotateCcw,
  Sparkles,
  Star,
  Tag,
  Workflow
} from "@/components/ui/icon";
import { Field, Input, SearchInput, Textarea } from "@/components/ui/input";
import { PageHeader, SectionHeading, Toolbar } from "@/components/ui/page-header";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/toast";
import { apiErrorMessage } from "@/components/shell/api-error";
import { PlanNote } from "@/components/shell/plan-note";
import { useBillingStatus } from "@/components/shell/use-billing-status";
import { cn } from "@/lib/utils";

type LibraryRow = { id: string; name: string; description: string; createdAt: string; updatedAt: string; archivedAt?: string; createdBy: string; favorite: boolean; tags: string[]; lastOpenedAt?: string };
type LibraryPayload = { rows: LibraryRow[]; recent: LibraryRow[]; favorites: LibraryRow[]; availableTags: string[] };
type Template = { id: string; title: string; category: string; useCase: string; complexity: string };
type Status = "active" | "favorites" | "archived";
type SortKey = "recent_activity" | "name" | "created" | "updated";
type CreateMode = "blank" | "ai" | "import" | null;

const SORTS: Array<{ value: SortKey; label: string }> = [
  { value: "recent_activity", label: "Recent activity" },
  { value: "updated", label: "Last updated" },
  { value: "created", label: "Date created" },
  { value: "name", label: "Name" }
];

async function postJson<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return res.json();
}

const ts = (value?: string) => (value ? new Date(value).getTime() : undefined);

export function DashboardClient({ initialLibrary }: { initialLibrary: LibraryPayload }): ReactNode {
  const router = useRouter();
  const [library, setLibrary] = useState<LibraryPayload>(initialLibrary);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status>("active");
  const [sort, setSort] = useState<SortKey>("recent_activity");
  const [selectedTag, setSelectedTag] = useState("");
  const [density, setDensity] = useState<Density>("comfortable");
  const [loading, setLoading] = useState(false);
  const [createMode, setCreateMode] = useState<CreateMode>(null);
  const [tagTarget, setTagTarget] = useState<LibraryRow | null>(null);
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [renameTarget, setRenameTarget] = useState<LibraryRow | null>(null);
  const billing = useBillingStatus();
  const toast = useToast();
  // Unknown until the plan loads: leave AI drafting open and let the server answer.
  const aiAllowed = billing ? billing.entitlements.aiGeneration : true;

  const refreshLibrary = useCallback(async (input?: { q?: string; tag?: string }) => {
    setLoading(true);
    const params = new URLSearchParams({ status, sort });
    const q = input?.q ?? query;
    const tag = input?.tag ?? selectedTag;
    if (q) params.set("q", q);
    if (tag) params.set("tag", tag);
    const res = await fetch(`/api/library?${params.toString()}`);
    const data = await res.json();
    if (data.ok) setLibrary(data.data);
    setLoading(false);
  }, [query, selectedTag, sort, status]);

  useEffect(() => { void refreshLibrary(); }, [status, sort]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = setTimeout(() => { void refreshLibrary(); }, 220);
    return () => clearTimeout(timer);
  }, [query, selectedTag]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetch("/api/templates").then((r) => r.json()).then((d) => setTemplates(d.data ?? [])).catch(() => setTemplates([]));
  }, []);

  const rows = useMemo(() => library.rows.filter((row) => (status === "archived" ? !!row.archivedAt : !row.archivedAt)), [library.rows, status]);
  const filtering = query.trim().length > 0 || selectedTag !== "";
  const emptyVariant = loading || rows.length > 0 ? null : filtering || status !== "active" ? "filtered" : "never";

  const toggleFavorite = async (row: LibraryRow) => {
    const data = await postJson("/api/library", { action: "favorite", systemId: row.id, favorite: !row.favorite }).catch(() => null);
    if (!data?.ok) toast(apiErrorMessage(data, "That favorite did not save. Try again."));
    void refreshLibrary();
  };
  const setArchived = async (row: LibraryRow, archived: boolean) => {
    const data = await postJson(`/api/systems/${row.id}`, { action: archived ? "archive" : "restore" }).catch(() => null);
    if (!data?.ok) toast(apiErrorMessage(data, archived ? "The workflow could not be archived." : "The workflow could not be restored."));
    void refreshLibrary();
  };
  const launchTemplate = async (templateId: string) => {
    const data = await postJson(`/api/templates/${templateId}/instantiate`, {}).catch(() => null);
    if (data?.ok) router.push(`/systems/${data.data.systemId}`);
    else toast(apiErrorMessage(data, "That template could not be opened."));
  };
  const clearFilters = () => {
    setQuery("");
    setSelectedTag("");
    setStatus("active");
  };

  return (
    <PageShell measure="page">
      <PageHeader
        title="Workflows"
        description="Every workflow your team and agents follow, versioned and ready to open."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => setCreateMode("import")}>
              <FileInput />
              Import
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setCreateMode("ai")}>
              <Sparkles />
              Draft with AI
            </Button>
            <Button variant="primary" size="sm" onClick={() => setCreateMode("blank")}>
              <Plus />
              New workflow
            </Button>
          </>
        }
      />

      <Toolbar className="mb-6 flex-wrap">
        <SearchInput
          aria-label="Filter workflows"
          placeholder="Filter by name, description or tag"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClear={() => setQuery("")}
          className="max-w-[320px]"
        />
        <Segmented<Status>
          label="Which workflows"
          size="sm"
          value={status}
          onValueChange={setStatus}
          options={[
            { value: "active", label: "Active" },
            { value: "favorites", label: "Favorites" },
            { value: "archived", label: "Archived" }
          ]}
        />
        {library.availableTags.length > 0 ? (
          <Select
            size="sm"
            value={selectedTag || "__all"}
            onValueChange={(value) => setSelectedTag(value === "__all" ? "" : value)}
            options={[{ value: "__all", label: "All tags" }, ...library.availableTags.map((tag) => ({ value: tag, label: tag }))]}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-3">
          <Select size="sm" value={sort} onValueChange={(value) => setSort(value as SortKey)} options={SORTS} />
          <Segmented<Density>
            className="hidden lg:flex"
            label="Row density"
            size="sm"
            value={density}
            onValueChange={setDensity}
            options={[
              { value: "comfortable", label: "Comfortable" },
              { value: "compact", label: "Compact" }
            ]}
          />
        </div>
      </Toolbar>

      <SystemsMobileList rows={rows} loading={loading} emptyVariant={emptyVariant} onClear={clearFilters} onNew={() => setCreateMode("blank")} />

      <div className="hidden lg:block">
        <DataTable density={density}>
          <Table aria-label="Workflows" className="min-w-[880px] table-fixed">
            <colgroup>
              <col className="w-[56px]" />
              <col />
              <col className="w-[220px]" />
              <col className="w-[160px]" />
              <col className="w-[132px]" />
            </colgroup>
            <THead>
              <TR>
                <TH>
                  <span className="sr-only">Favorite</span>
                </TH>
                <TH icon={Workflow}>Workflow</TH>
                <TH icon={Tag}>Tags</TH>
                <TH icon={Clock}>Updated</TH>
                <TH>
                  <span className="sr-only">Actions</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 4 }, (_, index) => (
                  <TR key={index}>
                    <TD><Skeleton className="size-[16px] rounded-4" /></TD>
                    <TD><Skeleton className="h-[12px] w-[40%]" /></TD>
                    <TD><Skeleton className="h-[12px] w-[60%]" /></TD>
                    <TD><Skeleton className="h-[12px] w-[50%]" /></TD>
                    <TD />
                  </TR>
                ))
              ) : emptyVariant ? (
                <TR>
                  <TD colSpan={5} className="p-0">
                    <div className="flex min-h-[240px] items-center justify-center">
                      <SystemsEmpty variant={emptyVariant} onClear={clearFilters} onNew={() => setCreateMode("blank")} />
                    </div>
                  </TD>
                </TR>
              ) : (
                rows.map((row) => (
                  <TR key={row.id} disabled={!!row.archivedAt}>
                    <TD>
                      <IconButton label={row.favorite ? "Remove from favorites" : "Add to favorites"} size="sm" onClick={() => toggleFavorite(row)}>
                        <Star weight={row.favorite ? "fill" : "regular"} className={cn("size-[16px]", row.favorite ? "text-ink" : "text-ink-4")} />
                      </IconButton>
                    </TD>
                    <TD>
                      <Link href={`/systems/${row.id}`} data-row-link="" className="focus-ring-canvas block min-w-0 rounded-4 outline-none">
                        <CellStack title={row.name} meta={row.description || "No description yet"} />
                      </Link>
                    </TD>
                    <TD>
                      <TagList tags={row.tags} />
                    </TD>
                    <TD>
                      <RelativeTime at={ts(row.updatedAt)} />
                    </TD>
                    <TD className="text-right">
                      <RowActions row={row} onRename={() => setRenameTarget(row)} onTags={() => setTagTarget(row)} onArchive={(archived) => setArchived(row, archived)} />
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
          {!emptyVariant && rows.length > 0 ? <TableFooter count={rows.length} noun="workflow" /> : null}
        </DataTable>
      </div>

      <section aria-labelledby="templates-heading" className="mt-9 flex flex-col gap-4">
        <SectionHeading
          action={
            <Button asChild variant="ghost" size="sm">
              <Link href="/templates">All templates</Link>
            </Button>
          }
        >
          <span id="templates-heading">Start from a template</span>
        </SectionHeading>
        {templates === null ? (
          <Skeleton className="h-[224px] w-full rounded-12" />
        ) : (
          <GroupedList empty="No templates are available yet">
            {templates.slice(0, 4).map((template) => (
              <GroupedRow
                key={template.id}
                title={template.title}
                subtitle={`${template.category} · ${template.complexity}`}
                trailing={
                  <Button variant="secondary" size="sm" onClick={() => launchTemplate(template.id)}>
                    Use template
                  </Button>
                }
              />
            ))}
          </GroupedList>
        )}
      </section>

      <CreateSystemDialog
        mode={createMode}
        aiAllowed={aiAllowed}
        plan={billing?.plan}
        onClose={() => setCreateMode(null)}
        onCreated={(systemId) => router.push(`/systems/${systemId}`)}
      />
      <RenameDialog
        row={renameTarget}
        onClose={() => setRenameTarget(null)}
        onSaved={(name) => {
          setRenameTarget(null);
          toast(`Renamed to ${name}`);
          void refreshLibrary();
        }}
      />
      <TagsDialog row={tagTarget} onClose={() => setTagTarget(null)} onSaved={() => { setTagTarget(null); void refreshLibrary(); }} />
    </PageShell>
  );
}

function TagList({ tags }: { tags: string[] }): ReactNode {
  if (tags.length === 0) return <span className="t-caption text-ink-3">No tags</span>;
  return (
    <span className="flex min-w-0 flex-wrap gap-2">
      {tags.slice(0, 3).map((tag) => (
        <span key={tag} className="t-mono-micro inline-flex h-[20px] items-center rounded-6 bg-inset px-2 text-ink-2">
          {tag}
        </span>
      ))}
      {tags.length > 3 ? <span className="t-caption text-ink-3">+{tags.length - 3}</span> : null}
    </span>
  );
}

function RowActions({ row, onRename, onTags, onArchive }: { row: LibraryRow; onRename: () => void; onTags: () => void; onArchive: (archived: boolean) => void }): ReactNode {
  return (
    <span className="inline-flex items-center gap-2">
      <Button asChild variant="secondary" size="xs">
        <Link href={`/systems/${row.id}`}>Open</Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <IconButton label={`More actions for ${row.name}`} size="sm">
            <MoreHorizontal className="size-[16px]" />
          </IconButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuItem onSelect={onRename}>
            <PencilLine />
            Rename
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={onTags}>
            <Hash />
            Edit tags
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {row.archivedAt ? (
            <DropdownMenuItem onSelect={() => onArchive(false)}>
              <RotateCcw />
              Restore
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => onArchive(true)}>
              <Archive />
              Archive
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </span>
  );
}

function SystemsEmpty({ variant, onClear, onNew }: { variant: "never" | "filtered"; onClear: () => void; onNew: () => void }): ReactNode {
  if (variant === "never") {
    return (
      <EmptyState
        className="py-9"
        icon={Workflow}
        variant="never"
        title="No workflows yet"
        body="A workflow is what your agents follow: steps, tools, approvals and loops, saved with every version."
        action={
          <Button variant="primary" size="md" onClick={onNew}>
            <Plus />
            Create your first workflow
          </Button>
        }
      />
    );
  }
  return (
    <EmptyState
      className="py-9"
      variant="filtered"
      title="No workflows match these filters"
      body="Try a different search, tag or view."
      action={
        <Button variant="secondary" size="md" onClick={onClear}>
          Clear filters
        </Button>
      }
    />
  );
}

function SystemsMobileList({
  rows,
  loading,
  emptyVariant,
  onClear,
  onNew
}: {
  rows: LibraryRow[];
  loading: boolean;
  emptyVariant: "never" | "filtered" | null;
  onClear: () => void;
  onNew: () => void;
}): ReactNode {
  return (
    <section aria-label="Workflows" className="overflow-hidden rounded-10 border border-border bg-raised lg:hidden">
      {loading && rows.length === 0 ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }, (_, index) => (
            <li key={index} className="flex flex-col gap-2 p-6">
              <Skeleton className="h-[13px] w-[55%]" />
              <Skeleton className="h-[11px] w-[72%]" />
            </li>
          ))}
        </ul>
      ) : emptyVariant ? (
        <div className="flex min-h-[280px] items-center justify-center p-6">
          <SystemsEmpty variant={emptyVariant} onClear={onClear} onNew={onNew} />
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id}>
              <Link href={`/systems/${row.id}`} className="focus-ring-canvas flex flex-col gap-3 p-6 transition-colors hover:bg-inset focus-visible:outline-none">
                <span className="flex min-w-0 items-center gap-3">
                  {row.favorite ? <Star weight="fill" className="size-[14px] shrink-0 text-ink" aria-label="Favorite" /> : null}
                  <span className="t-body-strong min-w-0 flex-1 truncate text-ink">{row.name}</span>
                  <RelativeTime at={ts(row.updatedAt)} className="shrink-0" />
                </span>
                <span className="t-caption line-clamp-2 text-ink-3">{row.description || "No description yet"}</span>
                {row.tags.length ? <TagList tags={row.tags} /> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const CREATE_COPY: Record<Exclude<CreateMode, null>, { title: string; description: string; action: string }> = {
  blank: { title: "New workflow", description: "Start from an empty canvas. You can add steps, tools and approvals next.", action: "Create workflow" },
  ai: { title: "Draft a workflow with AI", description: "Describe the workflow. Pipes drafts the steps and opens it for you to review and edit.", action: "Draft and open" },
  import: { title: "Import a workflow", description: "Paste a pipes_schema_v1 document exported from Pipes or written by an agent.", action: "Import workflow" }
};

function CreateSystemDialog({
  mode,
  aiAllowed,
  plan,
  onClose,
  onCreated
}: {
  mode: CreateMode;
  aiAllowed: boolean;
  plan?: string;
  onClose: () => void;
  onCreated: (systemId: string) => void;
}): ReactNode {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [schema, setSchema] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mode) return;
    setError(null);
    setBusy(false);
  }, [mode]);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "blank") {
        const data = await postJson("/api/systems", { name: name.trim() || "Untitled workflow" });
        if (data.ok) return onCreated(data.data.systemId);
        setError(apiErrorMessage(data, "The workflow could not be created."));
      } else if (mode === "ai") {
        const draft = await postJson("/api/ai/generate-system", { prompt });
        if (!draft.ok) {
          setError(apiErrorMessage(draft, "The draft could not be generated."));
          return;
        }
        const committed = await postJson("/api/ai/generate-system", { commit: true, draft: draft.data });
        if (committed.ok) return onCreated(committed.data.systemId);
        setError(apiErrorMessage(committed, "The draft could not be saved."));
      } else if (mode === "import") {
        const data = await postJson("/api/import/system", { schema, mode: "new" });
        if (data.ok && data.data.ok) return onCreated(data.data.systemId);
        setError(data.data?.diagnostics?.[0]?.message ?? apiErrorMessage(data, "That document is not a valid pipes_schema_v1 workflow."));
      }
    } finally {
      setBusy(false);
    }
  };

  const copy = mode ? CREATE_COPY[mode] : null;
  const aiBlocked = mode === "ai" && !aiAllowed;
  const canSubmit = mode === "blank" || (mode === "ai" && aiAllowed && prompt.trim().length > 0) || (mode === "import" && schema.trim().length > 0);

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="form">
        {copy ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (canSubmit && !busy) void submit();
            }}
          >
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            <DialogBody className="flex flex-col gap-5">
              {mode === "blank" ? (
                <Field label="Name" htmlFor="new-system-name">
                  <Input id="new-system-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Customer refund review" />
                </Field>
              ) : null}
              {aiBlocked ? (
                <PlanNote title="Drafting with AI is on the Builder plan">
                  {plan ? `This workspace is on the ${plan} plan. ` : null}You can still start blank, import a schema or use a template.
                </PlanNote>
              ) : null}
              {mode === "ai" ? (
                <Field label="What should this workflow do?" htmlFor="ai-prompt" hint="Mention the steps, tools, approvals and when it should loop or stop.">
                  <Textarea id="ai-prompt" autoFocus={!aiBlocked} disabled={aiBlocked} rows={5} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Triage incoming support tickets, draft a reply, and ask a person to approve refunds over $100." />
                </Field>
              ) : null}
              {mode === "import" ? (
                <Field label="Schema" htmlFor="import-schema">
                  <Textarea id="import-schema" autoFocus rows={8} className="t-mono-hash" value={schema} onChange={(e) => setSchema(e.target.value)} placeholder='{ "version": "pipes_schema_v1", ... }' />
                </Field>
              ) : null}
              {error ? (
                <p role="alert" className="t-caption text-critical-text">
                  {error}
                </p>
              ) : null}
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="secondary" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={!canSubmit || busy}>
                {busy ? "Working" : copy.action}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function TagsDialog({ row, onClose, onSaved }: { row: LibraryRow | null; onClose: () => void; onSaved: () => void }): ReactNode {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setValue(row?.tags.join(", ") ?? "");
    setError(null);
  }, [row]);
  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="form">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!row) return;
            const data = await postJson("/api/library", { action: "tags", systemId: row.id, tags: value.split(",").map((t) => t.trim()).filter(Boolean) }).catch(() => null);
            if (data?.ok) return onSaved();
            setError(apiErrorMessage(data, "The tags did not save. Try again."));
          }}
        >
          <DialogHeader>
            <DialogTitle>Edit tags</DialogTitle>
            <DialogDescription>{row ? `Tags help you find ${row.name} later. Separate them with commas.` : null}</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            <Field label="Tags" htmlFor="workflow-tags">
              <Input id="workflow-tags" autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder="support, refunds" />
            </Field>
            {error ? (
              <p role="alert" className="t-caption text-critical-text">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save tags
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RenameDialog({ row, onClose, onSaved }: { row: LibraryRow | null; onClose: () => void; onSaved: (name: string) => void }): ReactNode {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(row?.name ?? "");
    setDescription(row?.description ?? "");
    setError(null);
    setBusy(false);
  }, [row]);

  const trimmed = name.trim();

  return (
    <Dialog open={row !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="form">
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            if (!row || !trimmed || busy) return;
            setBusy(true);
            setError(null);
            const data = await postJson(`/api/systems/${row.id}`, { action: "rename", name: trimmed, description: description.trim() }).catch(() => null);
            if (data?.ok) return onSaved(trimmed);
            setError(apiErrorMessage(data, "The workflow could not be renamed."));
            setBusy(false);
          }}
        >
          <DialogHeader>
            <DialogTitle>Rename workflow</DialogTitle>
            <DialogDescription>The name and description show on the dashboard, in runs and to agents reading it.</DialogDescription>
          </DialogHeader>
          <DialogBody className="flex flex-col gap-5">
            <Field label="Name" htmlFor="rename-workflow-name">
              <Input id="rename-workflow-name" autoFocus value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Description" htmlFor="rename-workflow-description" hint="Optional. One line on what it does.">
              <Textarea id="rename-workflow-description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
            {error ? (
              <p role="alert" className="t-caption text-critical-text">
                {error}
              </p>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!trimmed || busy}>
              {busy ? "Saving" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
