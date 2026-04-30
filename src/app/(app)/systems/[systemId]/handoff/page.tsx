"use client";

import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Download,
  Eye,
  MessageSquare,
  Package,
  XCircle,
  Copy,
  FileText,
  Code,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import {
  Button,
  Spinner,
  Breadcrumbs,
  PageHeader,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  Select,
  Badge,
  StatusBadge,
  Dialog,
  Toolbar,
  EmptyState,
  HelpText,
  InlineCode,
  Tooltip,
} from "@/components/ui";
import type {
  HandoffAcceptanceCriteria,
  HandoffArtifact,
  HandoffPackage,
} from "@/domain/handoff/model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PackageDetail = {
  package: HandoffPackage;
  artifacts: HandoffArtifact[];
  reviews: unknown[];
  acceptanceCriteria: HandoffAcceptanceCriteria[];
};

type SandboxArtifact = {
  artifactId: string;
  type: string;
  status: string;
  normalized: boolean;
};

type ReviewDecision = "approved" | "rejected" | "revision_requested";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TARGET_LABELS: Record<string, string> = {
  human_engineer: "Human Engineer",
  codex: "Codex",
  claude_code: "Claude Code",
  general_llm_builder: "LLM Builder",
};

const TARGET_OPTIONS: { value: string; label: string }[] = [
  { value: "human_engineer", label: "Human Engineer" },
  { value: "codex", label: "Codex" },
  { value: "claude_code", label: "Claude Code" },
  { value: "general_llm_builder", label: "LLM Builder" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type Tone = "success" | "warning" | "danger" | "info" | "neutral";

function statusTone(status: string): Tone {
  if (status === "approved" || status === "exported") return "success";
  if (status === "in_review" || status === "revision_requested") return "warning";
  if (status === "rejected") return "danger";
  return "neutral";
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    in_review: "In Review",
    approved: "Approved",
    rejected: "Rejected",
    revision_requested: "Revision Requested",
    draft: "Draft",
    exported: "Exported",
  };
  return labels[status] ?? status;
}

function criteriaTone(status: string): Tone {
  if (status === "satisfied") return "success";
  if (status === "blocked") return "danger";
  return "warning";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function copyToClipboard(text: string) {
  void navigator.clipboard.writeText(text).then(() => {
    toast.success("Copied to clipboard");
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function CriteriaRow({ criterion }: { criterion: HandoffAcceptanceCriteria }) {
  const icon =
    criterion.status === "satisfied" ? (
      <CheckCircle2 className="shrink-0 text-[#059669]" size={14} />
    ) : criterion.status === "blocked" ? (
      <XCircle className="shrink-0 text-[#DC2626]" size={14} />
    ) : (
      <span className="shrink-0 w-3.5 h-3.5 rounded-full border-2 border-[#D97706]" />
    );

  return (
    <div className="flex items-start gap-3 rounded-[8px] surface-muted px-3 py-2.5">
      <div className="pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="t-label font-semibold text-[#111]">{criterion.title}</p>
        <p className="t-caption text-[#8E8E93] mt-0.5 leading-snug">
          {criterion.description}
        </p>
      </div>
      <StatusBadge tone={criteriaTone(criterion.status)}>
        {criterion.status}
      </StatusBadge>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SystemHandoffPage({
  params,
}: {
  params: Promise<{ systemId: string }>;
}) {
  const { systemId } = use(params);

  const [target, setTarget] = useState("human_engineer");
  const [packages, setPackages] = useState<HandoffPackage[]>([]);
  const [systemName, setSystemName] = useState<string>("System");
  const [selected, setSelected] = useState<PackageDetail | null>(null);
  const [sandboxArtifacts, setSandboxArtifacts] = useState<SandboxArtifact[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [expandedArtifact, setExpandedArtifact] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data
  // -------------------------------------------------------------------------

  const load = useCallback(async () => {
    const res = await fetch(`/api/handoff/systems/${systemId}/packages`);
    const data = await res.json();
    setPackages((data.data as HandoffPackage[]) ?? []);
  }, [systemId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(`/api/systems/${systemId}`);
        const data = await res.json();
        if (data.ok && data.data?.name) {
          setSystemName(String(data.data.name));
        }
      } catch {
        // tolerate; name is decorative
      }
    })();
  }, [systemId]);

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/handoff/systems/${systemId}/packages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      await load();
      toast.success("Package generated");
    } catch {
      toast.error("Failed to generate package");
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (pkg: HandoffPackage) => {
    setSelected(null);
    setSandboxArtifacts([]);
    setLoadingDetail(true);
    setDetailOpen(true);
    setExpandedArtifact(null);
    try {
      const detail = await fetch(`/api/handoff/packages/${pkg.id}`).then((r) =>
        r.json(),
      );
      setSelected(detail.data as PackageDetail);
      const runId = (detail.data as PackageDetail)?.package?.sourceRunId;
      if (runId) {
        const arts = await fetch(
          `/api/agent/runs/${runId}/sandbox/artifacts`,
        ).then((r) => r.json());
        setSandboxArtifacts((arts.data as SandboxArtifact[]) ?? []);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReview = async (decision: ReviewDecision, note?: string) => {
    if (!selected) return;
    setReviewLoading(true);
    try {
      await fetch(`/api/handoff/packages/${selected.package.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
      });
      const updated = await fetch(
        `/api/handoff/packages/${selected.package.id}`,
      ).then((r) => r.json());
      setSelected(updated.data as PackageDetail);
      await load();
      toast.success(`Marked as ${decision.replace("_", " ")}`);
    } finally {
      setReviewLoading(false);
    }
  };

  const handleExportMarkdown = async () => {
    if (!selected) return;
    const exported = await fetch(
      `/api/handoff/packages/${selected.package.id}/export`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format: "markdown_bundle" }),
      },
    ).then((r) => r.json());
    if (exported?.data?.record?.digest) {
      copyToClipboard(exported.data.record.digest);
      toast.success("Markdown bundle exported -- digest copied");
    }
    await load();
  };

  const handleExportSchema = async () => {
    const res = await fetch(`/api/systems/${systemId}/export`);
    if (!res.ok) {
      toast.error("Schema export failed");
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${systemName.toLowerCase().replace(/\s+/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Schema downloaded");
  };

  // -------------------------------------------------------------------------
  // Derived
  // -------------------------------------------------------------------------

  const selectedStatus = selected?.package.status;
  const isInReview = selectedStatus === "in_review";
  const isApproved = selectedStatus === "approved";

  const sortedPackages = useMemo(
    () =>
      [...packages].sort(
        (a, b) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime(),
      ),
    [packages],
  );

  const schemaPreview = useMemo(
    () =>
      `{
  "pipes_schema_v1": {
    "system": {
      "id": "${systemId}",
      "name": "${systemName}",
      "version": 1
    },
    "nodes": [ ... ],
    "pipes": [ ... ]
  }
}`,
    [systemId, systemName],
  );

  const mcpUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/protocol/mcp`;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="surface-subtle min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <Breadcrumbs
          items={[
            { label: "Systems", href: "/dashboard" },
            { label: systemName, href: `/systems/${systemId}` },
            { label: "Handoff" },
          ]}
        />
        <div className="mt-3">
          <PageHeader
            title={`Handoff -- ${systemName}`}
            subtitle="Generate build-ready documentation. Export schema, MCP token, or markdown spec."
          />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* LEFT: summary + packages */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Summary */}
            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center justify-between gap-2">
                  <p className="t-label font-semibold text-[#111]">
                    System summary
                  </p>
                  <StatusBadge tone="info">v1</StatusBadge>
                </div>
              </CardHeader>
              <CardBody>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Name</dt>
                    <dd className="t-label text-[#111] mt-1">{systemName}</dd>
                  </div>
                  <div>
                    <dt className="t-overline text-[#8E8E93]">System ID</dt>
                    <dd className="mt-1">
                      <InlineCode>{systemId}</InlineCode>
                    </dd>
                  </div>
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Packages</dt>
                    <dd className="t-label text-[#111] mt-1">
                      {packages.length}
                    </dd>
                  </div>
                  <div>
                    <dt className="t-overline text-[#8E8E93]">Latest</dt>
                    <dd className="t-label text-[#111] mt-1">
                      {sortedPackages[0]
                        ? formatDate(sortedPackages[0].generatedAt)
                        : "Never"}
                    </dd>
                  </div>
                </dl>
              </CardBody>
            </CardShell>

            {/* Generate package */}
            <CardShell>
              <CardHeader bordered>
                <p className="t-label font-semibold text-[#111]">
                  Create a new handoff package
                </p>
                <p className="t-caption text-[#8E8E93] mt-0.5">
                  Pick a target audience. Pipes will tailor artifacts for it.
                </p>
              </CardHeader>
              <CardBody>
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label
                      htmlFor="target"
                      className="t-overline text-[#8E8E93] block mb-1"
                    >
                      Target
                    </label>
                    <Select
                      id="target"
                      value={target}
                      onChange={(e) => setTarget(e.target.value)}
                      aria-label="Handoff target"
                    >
                      {TARGET_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    isDisabled={generating}
                    onPress={handleGenerate}
                  >
                    {generating ? <Spinner size="xs" /> : <Package size={14} />}
                    {generating ? "Generating..." : "Generate package"}
                  </Button>
                </div>
              </CardBody>
            </CardShell>

            {/* Packages list */}
            <CardShell>
              <Toolbar
                left={
                  <div>
                    <p className="t-label font-semibold text-[#111]">
                      Packages
                    </p>
                    <p className="t-caption text-[#8E8E93] mt-0.5">
                      {packages.length} total
                    </p>
                  </div>
                }
              />
              <CardBody className="p-0">
                {sortedPackages.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      title="No handoff packages yet"
                      description="Generate a package once your system design is accepted."
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-[var(--color-line)]">
                    {sortedPackages.map((pkg) => (
                      <li
                        key={pkg.id}
                        className="px-4 py-3 hover:bg-[#FAFAFA] transition-colors"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="t-label font-semibold text-[#111] truncate">
                                {pkg.title}
                              </p>
                              <StatusBadge tone={statusTone(pkg.status)}>
                                {statusLabel(pkg.status)}
                              </StatusBadge>
                              <Badge tone="neutral">v{pkg.version}</Badge>
                              <Badge tone="neutral">
                                {TARGET_LABELS[pkg.target] ?? pkg.target}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <InlineCode>{pkg.id}</InlineCode>
                              <span className="t-caption text-[#8E8E93]">
                                {formatDate(pkg.generatedAt)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onPress={() => void openDetail(pkg)}
                            >
                              <Eye size={14} />
                              View
                            </Button>
                            {pkg.status === "in_review" && (
                              <Button
                                variant="primary"
                                size="sm"
                                onPress={async () => {
                                  await openDetail(pkg);
                                  await handleReview("approved");
                                }}
                              >
                                <CheckCircle2 size={14} />
                                Approve
                              </Button>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </CardShell>
          </div>

          {/* RIGHT: export options */}
          <div className="flex flex-col gap-4">
            {/* Schema JSON */}
            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Code size={16} className="text-indigo-600" />
                    <p className="t-label font-semibold text-[#111]">
                      pipes_schema_v1 JSON
                    </p>
                  </div>
                </div>
                <p className="t-caption text-[#8E8E93] mt-1">
                  Canonical export for any system that speaks the schema.
                </p>
              </CardHeader>
              <CardBody>
                <div className="surface-inverse rounded-[8px] p-3 overflow-hidden">
                  <pre className="t-caption font-mono text-emerald-300 leading-relaxed overflow-x-auto whitespace-pre-wrap">
                    {schemaPreview}
                  </pre>
                </div>
              </CardBody>
              <CardFooter>
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => copyToClipboard(schemaPreview)}
                >
                  <Copy size={14} />
                  Copy preview
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={handleExportSchema}
                >
                  <Download size={14} />
                  Download
                </Button>
              </CardFooter>
            </CardShell>

            {/* MCP URL */}
            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center gap-2">
                  <Link2 size={16} className="text-indigo-600" />
                  <p className="t-label font-semibold text-[#111]">
                    MCP endpoint
                  </p>
                </div>
                <p className="t-caption text-[#8E8E93] mt-1">
                  Drop into any MCP-compatible agent.
                </p>
              </CardHeader>
              <CardBody>
                <div className="surface-muted rounded-[8px] p-3">
                  <code className="t-caption font-mono text-[#111] break-all">
                    {mcpUrl}
                  </code>
                </div>
              </CardBody>
              <CardFooter>
                <HelpText>Pair with an agent token from Connect.</HelpText>
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => copyToClipboard(mcpUrl)}
                >
                  <Copy size={14} />
                  Copy URL
                </Button>
              </CardFooter>
            </CardShell>

            {/* Markdown spec */}
            <CardShell>
              <CardHeader bordered>
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-indigo-600" />
                  <p className="t-label font-semibold text-[#111]">
                    Markdown spec
                  </p>
                </div>
                <p className="t-caption text-[#8E8E93] mt-1">
                  A human-readable bundle from an approved package.
                </p>
              </CardHeader>
              <CardBody>
                <HelpText>
                  Approve a package first, then export from its detail view.
                </HelpText>
              </CardBody>
              <CardFooter>
                <Tooltip content="Open the latest package to export">
                  <Button
                    variant="outline"
                    size="sm"
                    onPress={() => {
                      if (sortedPackages[0]) void openDetail(sortedPackages[0]);
                    }}
                    isDisabled={sortedPackages.length === 0}
                  >
                    <Eye size={14} />
                    Open latest
                  </Button>
                </Tooltip>
              </CardFooter>
            </CardShell>
          </div>
        </div>
      </div>

      {/* Package detail Dialog */}
      <Dialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        size="lg"
        title={selected?.package.title ?? "Loading package..."}
        description={
          selected
            ? `${TARGET_LABELS[selected.package.target] ?? selected.package.target} -- v${selected.package.version}`
            : undefined
        }
        footer={
          loadingDetail || !selected ? (
            <Button
              variant="ghost"
              size="sm"
              onPress={() => setDetailOpen(false)}
            >
              Cancel
            </Button>
          ) : (
            <>
              {isInReview && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    isDisabled={reviewLoading}
                    onPress={() =>
                      void handleReview(
                        "revision_requested",
                        "Need stricter rollout steps",
                      )
                    }
                  >
                    {reviewLoading ? <Spinner size="xs" /> : <MessageSquare size={14} />}
                    Request revision
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    isDisabled={reviewLoading}
                    onPress={() => void handleReview("rejected")}
                  >
                    {reviewLoading ? <Spinner size="xs" /> : <XCircle size={14} />}
                    Reject
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    isDisabled={reviewLoading}
                    onPress={() => void handleReview("approved")}
                  >
                    {reviewLoading ? <Spinner size="xs" /> : <CheckCircle2 size={14} />}
                    Approve
                  </Button>
                </>
              )}
              {isApproved && (
                <Button
                  variant="primary"
                  size="sm"
                  onPress={() => void handleExportMarkdown()}
                >
                  <Download size={14} />
                  Export markdown
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onPress={() => setDetailOpen(false)}
              >
                Close
              </Button>
            </>
          )
        }
      >
        {loadingDetail || !selected ? (
          <div className="flex items-center justify-center py-10">
            <Spinner size="md" />
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 flex-wrap">
              <InlineCode>{selected.package.id}</InlineCode>
              <StatusBadge tone={statusTone(selected.package.status)}>
                {statusLabel(selected.package.status)}
              </StatusBadge>
              <span className="t-caption text-[#8E8E93]">
                Generated {formatDate(selected.package.generatedAt)}
              </span>
            </div>

            {/* Artifacts */}
            {selected.artifacts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="t-label font-semibold text-[#111]">
                  Artifacts ({selected.artifacts.length})
                </p>
                <div className="border border-black/[0.08] rounded-[10px] overflow-hidden">
                  {selected.artifacts.map((artifact, i) => {
                    const expanded = expandedArtifact === artifact.id;
                    return (
                      <div
                        key={artifact.id}
                        className={
                          (i > 0 ? "border-t border-black/[0.06] " : "") +
                          "bg-white"
                        }
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedArtifact(expanded ? null : artifact.id)
                          }
                          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 hover:bg-[#FAFAFA] transition-colors"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="t-label font-semibold text-[#111] truncate">
                              {artifact.title}
                            </span>
                            <Badge tone="neutral">
                              {artifact.type.replace(/_/g, " ")}
                            </Badge>
                          </div>
                          <span className="t-caption text-[#8E8E93]">
                            {expanded ? "Hide" : "Show"}
                          </span>
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3">
                            <pre className="surface-muted rounded-[8px] p-3 t-caption font-mono text-[#3C3C43] whitespace-pre-wrap leading-relaxed max-h-64 overflow-auto">
                              {artifact.content.length > 1200
                                ? `${artifact.content.slice(0, 1200)}\n\n... (truncated)`
                                : artifact.content}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Acceptance Criteria */}
            {selected.acceptanceCriteria.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="t-label font-semibold text-[#111]">
                  Acceptance criteria
                </p>
                <div className="flex flex-col gap-2">
                  {selected.acceptanceCriteria.map((criterion) => (
                    <CriteriaRow key={criterion.id} criterion={criterion} />
                  ))}
                </div>
              </div>
            )}

            {/* Sandbox Artifacts */}
            {sandboxArtifacts.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="t-label font-semibold text-[#111]">
                  Sandbox artifacts ({sandboxArtifacts.length})
                </p>
                <div className="flex flex-col gap-2">
                  {sandboxArtifacts.map((a) => (
                    <div
                      key={a.artifactId}
                      className="flex items-center justify-between gap-2 rounded-[8px] surface-muted px-3 py-2"
                    >
                      <span className="truncate t-caption font-mono text-[#3C3C43]">
                        {a.artifactId}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge tone="neutral">{a.type}</Badge>
                        <StatusBadge tone={a.normalized ? "success" : "neutral"}>
                          {a.normalized ? "normalized" : "raw"}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
