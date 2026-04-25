"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Accordion,
  Button,
  Card,
  Chip,
  Modal,
  Separator,
  Spinner,
} from "@heroui/react";
import { CheckCircle2, Download, Eye, MessageSquare, Package, XCircle } from "lucide-react";
import type {
  HandoffAcceptanceCriteria,
  HandoffArtifact,
  HandoffPackage,
} from "@/domain/handoff/model";

// ── types ──────────────────────────────────────────────────────────────────

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

// ── constants ──────────────────────────────────────────────────────────────

const TARGET_LABELS: Record<string, string> = {
  human_engineer: "👤 Human Engineer",
  codex: "🤖 Codex",
  claude_code: "🧠 Claude Code",
  general_llm_builder: "🌐 LLM Builder",
};

const TARGET_OPTIONS = [
  { value: "human_engineer", label: "👤 Human Engineer" },
  { value: "codex", label: "🤖 Codex" },
  { value: "claude_code", label: "🧠 Claude Code" },
  { value: "general_llm_builder", label: "🌐 LLM Builder" },
];

// ── helpers ────────────────────────────────────────────────────────────────

type StatusColor = "warning" | "success" | "danger" | "default";

function statusColor(status: string): StatusColor {
  if (status === "in_review" || status === "revision_requested") return "warning";
  if (status === "approved" || status === "exported") return "success";
  if (status === "rejected") return "danger";
  return "default";
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

function criteriaStatusColor(status: string): StatusColor {
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

// ── sub-components ─────────────────────────────────────────────────────────

function StatusChip({ status }: { status: string }) {
  return (
    <Chip color={statusColor(status)} size="sm" variant="soft">
      {statusLabel(status)}
    </Chip>
  );
}

function CriteriaRow({ criterion }: { criterion: HandoffAcceptanceCriteria }) {
  const icon =
    criterion.status === "satisfied" ? (
      <CheckCircle2 className="shrink-0 text-success-500" size={15} />
    ) : criterion.status === "blocked" ? (
      <XCircle className="shrink-0 text-danger-500" size={15} />
    ) : (
      <div className="shrink-0 w-[15px] h-[15px] rounded-full border-2 border-warning-400" />
    );

  return (
    <div className="flex items-start gap-3 rounded-lg bg-default-50 px-3 py-2.5">
      <div className="pt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{criterion.title}</p>
        <p className="text-xs text-default-500 mt-0.5">{criterion.description}</p>
      </div>
      <Chip color={criteriaStatusColor(criterion.status)} size="sm" variant="soft">
        {criterion.status}
      </Chip>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────

export default function SystemHandoffPage({
  params,
}: {
  params: { systemId: string };
}) {
  const [target, setTarget] = useState("human_engineer");
  const [packages, setPackages] = useState<HandoffPackage[]>([]);
  const [selected, setSelected] = useState<PackageDetail | null>(null);
  const [sandboxArtifacts, setSandboxArtifacts] = useState<SandboxArtifact[]>([]);
  const [generating, setGenerating] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);

  // ── data loading ───────────────────────────────────────────────────────

  const load = useCallback(async () => {
    const res = await fetch(`/api/handoff/systems/${params.systemId}/packages`);
    const data = await res.json();
    setPackages(data.data ?? []);
  }, [params.systemId]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── handlers ───────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/handoff/systems/${params.systemId}/packages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ target }),
      });
      await load();
    } finally {
      setGenerating(false);
    }
  };

  const openDetail = async (pkg: HandoffPackage) => {
    setSelected(null);
    setSandboxArtifacts([]);
    setLoadingDetail(true);
    setDetailOpen(true);
    try {
      const detail = await fetch(`/api/handoff/packages/${pkg.id}`).then((r) => r.json());
      setSelected(detail.data);
      const runId = (detail.data as PackageDetail)?.package?.sourceRunId;
      if (runId) {
        const arts = await fetch(`/api/agent/runs/${runId}/sandbox/artifacts`).then((r) =>
          r.json()
        );
        setSandboxArtifacts(arts.data ?? []);
      }
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleReview = async (
    decision: "approved" | "rejected" | "revision_requested",
    note?: string
  ) => {
    if (!selected) return;
    setReviewLoading(true);
    try {
      await fetch(`/api/handoff/packages/${selected.package.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, ...(note ? { note } : {}) }),
      });
      const updated = await fetch(`/api/handoff/packages/${selected.package.id}`).then((r) =>
        r.json()
      );
      setSelected(updated.data);
      await load();
    } finally {
      setReviewLoading(false);
    }
  };

  const handleExport = async () => {
    if (!selected) return;
    const exported = await fetch(`/api/handoff/packages/${selected.package.id}/export`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ format: "markdown_bundle" }),
    }).then((r) => r.json());
    // eslint-disable-next-line no-alert
    alert(`Export digest: ${exported.data.record.digest}`);
    await load();
  };

  // ── derived ────────────────────────────────────────────────────────────

  const selectedStatus = selected?.package.status;
  const isInReview = selectedStatus === "in_review";
  const isApproved = selectedStatus === "approved";

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">

      {/* ── Page header ── */}
      <div className="flex flex-col gap-1">
        <Link
          href={`/systems/${params.systemId}`}
          className="w-fit text-sm text-default-400 hover:text-default-700 transition-colors"
        >
          ← System
        </Link>
        <h1 className="text-2xl font-bold">Handoff Packages</h1>
        <p className="text-sm text-default-500">
          Generate build-ready documentation for your engineering team
        </p>
      </div>

      {/* ── Generate package ── */}
      <Card>
        <Card.Content className="flex flex-col gap-4 p-5">
          <h2 className="text-base font-semibold">Create new package</h2>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <select
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              aria-label="Handoff target"
              className="sm:max-w-xs border border-default-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {TARGET_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <Button
              variant="primary"
              size="sm"
              isDisabled={generating}
              onPress={handleGenerate}
            >
              {generating ? <Spinner size="sm" /> : <Package size={15} />}
              {generating ? "Generating…" : "Generate package"}
            </Button>
          </div>
        </Card.Content>
      </Card>

      {/* ── Packages list ── */}
      <div className="flex flex-col gap-3">
        {packages.length === 0 ? (
          <Card>
            <Card.Content className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <Package className="text-default-300" size={40} />
              <p className="font-medium text-default-500">No handoff packages yet</p>
              <p className="text-sm text-default-400">
                Generate a package after your system design is accepted.
              </p>
            </Card.Content>
          </Card>
        ) : (
          packages.map((pkg) => (
            <Card
              key={pkg.id}
              className="transition-shadow hover:shadow-md"
            >
              <Card.Content className="flex flex-col gap-3 p-5">

                {/* Title row */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-default-400">{pkg.id}</span>
                    <span className="text-sm font-semibold">{pkg.title}</span>
                  </div>
                  <span className="text-xs text-default-400 shrink-0">{formatDate(pkg.generatedAt)}</span>
                </div>

                <Separator />

                {/* Badges */}
                <div className="flex flex-wrap items-center gap-2">
                  <Chip color="default" size="sm" variant="soft">
                    {TARGET_LABELS[pkg.target] ?? pkg.target}
                  </Chip>
                  <StatusChip status={pkg.status} />
                  <Chip color="default" size="sm" variant="soft">
                    v{pkg.version}
                  </Chip>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => void openDetail(pkg)}
                  >
                    <Eye size={14} />
                    View details
                  </Button>

                  {pkg.status === "in_review" && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={async () => {
                          await openDetail(pkg);
                          await handleReview("approved");
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onPress={async () => {
                          await openDetail(pkg);
                          await handleReview("revision_requested", "Need stricter rollout steps");
                        }}
                      >
                        <MessageSquare size={14} />
                        Request revision
                      </Button>
                    </>
                  )}

                  {pkg.status === "approved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={async () => {
                        await openDetail(pkg);
                        await handleExport();
                      }}
                    >
                      <Download size={14} />
                      Export markdown
                    </Button>
                  )}
                </div>
              </Card.Content>
            </Card>
          ))
        )}
      </div>

      {/* ── Package detail modal ── */}
      <Modal isOpen={detailOpen} onOpenChange={setDetailOpen}>
        <Modal.Container size="lg">
          <Modal.Dialog>
            {/* Header */}
            <Modal.Header className="flex flex-col gap-1 pb-2">
              {loadingDetail || !selected ? (
                <div className="flex items-center gap-2 text-base">
                  <Spinner size="sm" />
                  <span>Loading package…</span>
                </div>
              ) : (
                <>
                  <span className="text-lg font-bold leading-snug">{selected.package.title}</span>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="font-mono text-xs text-default-400">{selected.package.id}</span>
                    <Chip color="default" size="sm" variant="soft">
                      {TARGET_LABELS[selected.package.target] ?? selected.package.target}
                    </Chip>
                    <StatusChip status={selected.package.status} />
                    <span className="text-xs text-default-400">
                      {formatDate(selected.package.generatedAt)}
                    </span>
                  </div>
                </>
              )}
            </Modal.Header>

            {/* Body */}
            <Modal.Body className="flex flex-col gap-5 pb-4">
              {!loadingDetail && selected && (
                <>
                  {/* Artifacts */}
                  {selected.artifacts.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <h3 className="text-sm font-semibold text-default-700">
                        Artifacts ({selected.artifacts.length})
                      </h3>
                      <Accordion allowsMultipleExpanded={true}>
                        {selected.artifacts.map((artifact) => (
                          <Accordion.Item
                            key={artifact.id}
                            id={artifact.id}
                          >
                            <Accordion.Heading>
                              <Accordion.Trigger>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-medium">{artifact.title}</span>
                                  <Chip color="default" size="sm" variant="soft">
                                    {artifact.type.replace(/_/g, " ")}
                                  </Chip>
                                </div>
                              </Accordion.Trigger>
                            </Accordion.Heading>
                            <Accordion.Panel>
                              <Accordion.Body>
                                <p className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-default-600">
                                  {artifact.content.length > 200
                                    ? `${artifact.content.slice(0, 200)}…`
                                    : artifact.content}
                                </p>
                              </Accordion.Body>
                            </Accordion.Panel>
                          </Accordion.Item>
                        ))}
                      </Accordion>
                    </div>
                  )}

                  {/* Acceptance Criteria */}
                  {selected.acceptanceCriteria.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-default-700">
                          Acceptance Criteria
                        </h3>
                        <div className="flex flex-col gap-2">
                          {selected.acceptanceCriteria.map((criterion) => (
                            <CriteriaRow key={criterion.id} criterion={criterion} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Sandbox Artifacts */}
                  {sandboxArtifacts.length > 0 && (
                    <>
                      <Separator />
                      <div className="flex flex-col gap-2">
                        <h3 className="text-sm font-semibold text-default-700">
                          Sandbox Artifacts ({sandboxArtifacts.length})
                        </h3>
                        <div className="flex flex-col gap-2">
                          {sandboxArtifacts.map((a) => (
                            <div
                              key={a.artifactId}
                              className="flex items-center justify-between gap-2 rounded-lg bg-default-50 px-3 py-2"
                            >
                              <span className="truncate font-mono text-xs text-default-600">
                                {a.artifactId}
                              </span>
                              <div className="flex shrink-0 items-center gap-2">
                                <Chip color="default" size="sm" variant="soft">
                                  {a.type}
                                </Chip>
                                <Chip
                                  color={a.normalized ? "success" : "default"}
                                  size="sm"
                                  variant="soft"
                                >
                                  {a.normalized ? "normalized" : "raw"}
                                </Chip>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </Modal.Body>

            {/* Footer */}
            <Modal.Footer className="flex flex-wrap gap-2 justify-end">
              {!loadingDetail && selected && (
                <>
                  {isInReview && (
                    <>
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={reviewLoading}
                        onPress={() => void handleReview("approved")}
                      >
                        {reviewLoading ? <Spinner size="sm" /> : <CheckCircle2 size={14} />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        isDisabled={reviewLoading}
                        onPress={() => void handleReview("rejected")}
                      >
                        {reviewLoading ? <Spinner size="sm" /> : <XCircle size={14} />}
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        isDisabled={reviewLoading}
                        onPress={() =>
                          void handleReview("revision_requested", "Need stricter rollout steps")
                        }
                      >
                        {reviewLoading ? <Spinner size="sm" /> : <MessageSquare size={14} />}
                        Request revision
                      </Button>
                    </>
                  )}

                  {isApproved && (
                    <Button
                      size="sm"
                      variant="outline"
                      onPress={() => void handleExport()}
                    >
                      <Download size={14} />
                      Export markdown
                    </Button>
                  )}

                  <Button size="sm" variant="ghost" onPress={() => setDetailOpen(false)}>
                    Close
                  </Button>
                </>
              )}

              {loadingDetail && (
                <Button size="sm" variant="ghost" onPress={() => setDetailOpen(false)}>
                  Cancel
                </Button>
              )}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal>
    </div>
  );
}
