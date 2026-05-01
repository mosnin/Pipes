"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Plus, RefreshCw } from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  DataTable,
  Dialog,
  EmptyState,
  HelpText,
  Input,
  MetricCard,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Select,
  SkeletonCard,
  Spinner,
  StatusBadge,
  Textarea,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@/components/ui";

type IssueRow = {
  id: string;
  category?: string | null;
  severity?: string | null;
  summary?: string | null;
  page?: string | null;
  status?: string | null;
  reporter?: string | null;
  createdAt?: number | null;
  details?: string | null;
};

type FailureGroup = { key: string; label: string; count: number };

type IssuesData = {
  items: IssueRow[];
  openCount: number;
  failureGroups?: FailureGroup[];
};

const STATUS_OPTIONS: { key: string; label: string }[] = [
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "closed", label: "Closed" },
];

const SEVERITY_TONE: Record<string, StatusBadgeTone> = {
  high: "danger",
  critical: "danger",
  medium: "warning",
  low: "neutral",
};

const STATUS_TONE: Record<string, StatusBadgeTone> = {
  new: "info",
  reviewing: "warning",
  closed: "success",
};

const FILTER_SEGMENTS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "Open" },
  { id: "closed", label: "Resolved" },
  { id: "critical", label: "Critical" },
];

const CATEGORY_OPTIONS: { key: string; label: string }[] = [
  { key: "all", label: "All categories" },
  { key: "bug", label: "Bug" },
  { key: "ux", label: "UX" },
  { key: "feature_request", label: "Feature request" },
  { key: "reliability", label: "Reliability" },
  { key: "billing", label: "Billing" },
  { key: "other", label: "Other" },
];

function formatTime(ts?: number | null): string {
  if (ts == null) return "-";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminIssuesPage() {
  const [filter, setFilter] = useState("all");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<IssuesData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<IssueRow | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filter === "new") q.set("status", "new");
    else if (filter === "closed") q.set("status", "closed");
    if (category !== "all") q.set("category", category);
    const res = await fetch(`/api/admin/issues?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load issue triage");
      setLoading(false);
      return;
    }
    setError("");
    setData(body.data as IssuesData);
    setLoading(false);
  }, [filter, category]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusChange = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    await fetch("/api/admin/issues", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id, status: newStatus }),
    });
    setUpdatingId(null);
    void load();
  };

  const filteredItems = useMemo(() => {
    if (data == null) return [] as IssueRow[];
    let rows = data.items;
    if (filter === "critical") {
      rows = rows.filter((r) => r.severity === "high" || r.severity === "critical");
    }
    if (search.trim().length > 0) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) =>
        (r.summary ?? "").toLowerCase().includes(q) ||
        (r.page ?? "").toLowerCase().includes(q) ||
        (r.reporter ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [data, filter, search]);

  const totalCount = data?.items.length ?? 0;
  const openCount = data?.openCount ?? 0;
  const criticalCount = useMemo(() => {
    return (data?.items ?? []).filter(
      (r) => r.severity === "high" || r.severity === "critical",
    ).length;
  }, [data]);
  const resolvedCount = Math.max(totalCount - openCount, 0);

  const columns: DataTableColumn<IssueRow>[] = [
    {
      key: "severity",
      header: "Severity",
      width: "120px",
      render: (r) => (
        <StatusBadge tone={SEVERITY_TONE[r.severity ?? ""] ?? "neutral"}>
          {r.severity ?? "-"}
        </StatusBadge>
      ),
    },
    {
      key: "summary",
      header: "Title",
      render: (r) => (
        <div className="flex flex-col gap-0.5 max-w-[380px]">
          <span className="font-medium text-[#111] truncate">
            {r.summary ?? "(untitled)"}
          </span>
          <span className="t-caption text-[#8E8E93] truncate">
            {r.category ?? "uncategorized"}
            {r.page != null ? ` - ${r.page}` : ""}
          </span>
        </div>
      ),
    },
    {
      key: "reporter",
      header: "Reporter",
      render: (r) => (
        <span className="t-caption text-[#3C3C43]">{r.reporter ?? "anon"}</span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (r) => (
        <span className="t-caption text-[#8E8E93]">{formatTime(r.createdAt)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (r) => (
        <StatusBadge tone={STATUS_TONE[r.status ?? "new"] ?? "neutral"}>
          {r.status ?? "new"}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Issues"
        subtitle="Triage feedback and reported defects."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => void load()}
              isDisabled={loading}
            >
              {loading ? <Spinner size="xs" /> : <RefreshCw size={14} />}
              <span className="ml-1.5">Refresh</span>
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={14} />
              <span className="ml-1.5">New issue</span>
            </Button>
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard label="Total issues" value={totalCount} />
        <MetricCard
          label="Open"
          value={openCount}
          delta={openCount > 0 ? "needs triage" : "all clear"}
          deltaTone={openCount > 0 ? "down" : "up"}
        />
        <MetricCard
          label="Critical"
          value={criticalCount}
          delta={criticalCount > 0 ? "investigate" : "ok"}
          deltaTone={criticalCount > 0 ? "down" : "up"}
        />
        <MetricCard label="Resolved" value={resolvedCount} deltaTone="up" />
      </div>

      {/* Error */}
      {error ? (
        <CardShell className="border-[#FCA5A5]">
          <CardBody>
            <div className="flex items-center gap-3" style={{ color: "#991B1B" }}>
              <AlertTriangle size={18} />
              <div>
                <p className="t-label font-semibold">Operator access required</p>
                <p className="t-caption text-[#8E8E93]">{error}</p>
              </div>
            </div>
          </CardBody>
        </CardShell>
      ) : null}

      {/* Toolbar + Table card */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <SegmentedControl
              items={FILTER_SEGMENTS}
              value={filter}
              onChange={setFilter}
            />
            <div className="flex items-center gap-2 lg:w-auto w-full">
              <div className="w-full lg:w-72">
                <SearchInput
                  value={search}
                  onChange={setSearch}
                  placeholder="Search title, page, reporter"
                />
              </div>
              <div className="w-44 shrink-0">
                <Select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Filter by category"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.key} value={opt.key}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Failure rollup chips */}
        {data?.failureGroups != null && data.failureGroups.length > 0 ? (
          <div className="px-4 py-3 surface-subtle border-b border-black/[0.06]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="t-overline text-[#8E8E93] mr-2">Failure rollup</span>
              {data.failureGroups.map((g) => (
                <StatusBadge
                  key={g.key}
                  tone={g.count > 0 ? "danger" : "neutral"}
                >
                  {g.label} {g.count}
                </StatusBadge>
              ))}
            </div>
          </div>
        ) : null}

        <CardBody className="p-0">
          {loading && data == null ? (
            <div className="p-4 flex flex-col gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : (
            <DataTable
              columns={columns}
              rows={filteredItems}
              dense
              onRowClick={(r) => setSelected(r)}
              emptyState={
                <EmptyState
                  title="No feedback in this view"
                  description="Adjust filters above or wait for new reports."
                />
              }
            />
          )}
        </CardBody>
      </CardShell>

      {/* Detail dialog */}
      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        title={selected?.summary ?? "Issue detail"}
        description={
          selected != null
            ? `Reported ${formatTime(selected.createdAt)} by ${selected.reporter ?? "anon"}`
            : undefined
        }
        size="md"
        footer={
          selected != null ? (
            <>
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close
              </Button>
            </>
          ) : null
        }
      >
        {selected != null ? (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <StatusBadge tone={SEVERITY_TONE[selected.severity ?? ""] ?? "neutral"}>
                Severity: {selected.severity ?? "-"}
              </StatusBadge>
              <StatusBadge tone={STATUS_TONE[selected.status ?? "new"] ?? "neutral"}>
                {selected.status ?? "new"}
              </StatusBadge>
              <StatusBadge tone="neutral">
                {selected.category ?? "uncategorized"}
              </StatusBadge>
            </div>
            {selected.page != null ? (
              <div className="flex flex-col gap-1">
                <span className="t-overline text-[#8E8E93]">Page</span>
                <code className="t-mono t-caption text-[#3C3C43] surface-muted px-2 py-1 rounded-md w-fit">
                  {selected.page}
                </code>
              </div>
            ) : null}
            {selected.details != null ? (
              <div className="flex flex-col gap-1">
                <span className="t-overline text-[#8E8E93]">Details</span>
                <p className="t-label text-[#3C3C43] whitespace-pre-wrap">
                  {selected.details}
                </p>
              </div>
            ) : null}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[var(--color-line)]">
              <span className="t-overline text-[#8E8E93]">Update status</span>
              <div className="flex items-center gap-2">
                {updatingId === selected.id ? (
                  <Spinner size="sm" />
                ) : (
                  <Select
                    value={selected.status ?? "new"}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== selected.status) {
                        void handleStatusChange(selected.id, val);
                      }
                    }}
                    aria-label="Set status"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.key} value={opt.key}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                )}
              </div>
              <HelpText>Status changes apply immediately.</HelpText>
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* Create dialog */}
      <NewIssueDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          void load();
        }}
      />
    </div>
  );
}

function NewIssueDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [summary, setSummary] = useState("");
  const [details, setDetails] = useState("");
  const [severity, setSeverity] = useState("medium");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (summary.trim().length === 0) return;
    setSubmitting(true);
    try {
      await fetch("/api/admin/issues", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          summary,
          details,
          severity,
          category: "other",
          status: "new",
        }),
      });
      setSummary("");
      setDetails("");
      setSeverity("medium");
      onCreated();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New issue"
      description="Create a manual issue entry for triage."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isDisabled={submitting}>
            {submitting ? <Spinner size="xs" /> : null}
            <span className={submitting ? "ml-1.5" : ""}>Create</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">Summary</label>
          <Input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Short title"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">Severity</label>
          <Select
            value={severity}
            onChange={(e) => setSeverity(e.target.value)}
            aria-label="Severity"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">Details</label>
          <Textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Steps to reproduce, expected vs actual..."
          />
        </div>
      </div>
    </Dialog>
  );
}
