"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarPlus,
  CheckCircle2,
  RefreshCw,
  XCircle,
} from "lucide-react";
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
  SkeletonCard,
  Spinner,
  StatusBadge,
  Textarea,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@/components/ui";

type ProviderReadiness = Record<string, boolean | string | undefined>;

type FlowItem = { id?: string; key: string; route: string; status: string };
type FlowRow = { id: string; key: string; route: string; status: string };

type FailureItem = { label: string; count: number };

type ReleaseRow = {
  id: string;
  version: string;
  released: string;
  author: string;
  status: string;
  notes: string;
};

type ReleaseData = {
  environment: {
    runtimeMode: string;
    plan?: string | null;
    billingStatus?: string | null;
    configurationWarning?: string | null;
    configurationWarnings?: string[];
    providerReadiness?: ProviderReadiness;
  };
  summaries: {
    signupActivation: {
      signupStarted?: number;
      onboardingCompleted?: number;
      activationAchieved?: number;
    };
    failures?: FailureItem[];
    protocolErrors?: unknown[];
    editorReliability?: {
      editorCrashBoundary?: number;
      autosaveFailure?: number;
    };
    inviteAndBilling?: {
      inviteAccepted?: number;
      billingFailures?: number;
    };
  };
  checklist: {
    criticalFlows?: FlowItem[];
  };
  links?: { href: string; label: string }[];
};

const FLOW_TONE: Record<string, StatusBadgeTone> = {
  pass: "success",
  ok: "success",
  ready: "success",
  warn: "warning",
  degraded: "warning",
  fail: "danger",
};

function flowTone(status: string): StatusBadgeTone {
  return FLOW_TONE[status] ?? "danger";
}

export default function AdminReleasePage() {
  const [since, setSince] = useState("");
  const [data, setData] = useState<ReleaseData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (since) q.set("since", since);
    const res = await fetch(`/api/admin/release?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load release review");
      setLoading(false);
      return;
    }
    setError("");
    setData(body.data as ReleaseData);
    setLoading(false);
  }, [since]);

  useEffect(() => {
    void load();
  }, [load]);

  const releaseRows: ReleaseRow[] = [
    {
      id: "v0.9.4",
      version: "v0.9.4",
      released: "today",
      author: "platform",
      status: "live",
      notes: "Editor autosave hotfix",
    },
    {
      id: "v0.9.3",
      version: "v0.9.3",
      released: "2 days ago",
      author: "platform",
      status: "live",
      notes: "MCP token rotation",
    },
    {
      id: "v0.9.2",
      version: "v0.9.2",
      released: "1 week ago",
      author: "platform",
      status: "live",
      notes: "Subsystem blueprints",
    },
  ];

  const releaseColumns: DataTableColumn<ReleaseRow>[] = [
    {
      key: "version",
      header: "Version",
      render: (r) => <span className="t-mono font-medium">{r.version}</span>,
    },
    { key: "released", header: "Released" },
    { key: "author", header: "Author" },
    {
      key: "status",
      header: "Status",
      render: (r) => (
        <StatusBadge tone={r.status === "live" ? "success" : "info"}>
          {r.status}
        </StatusBadge>
      ),
    },
    {
      key: "notes",
      header: "Notes",
      render: (r) => <span className="t-caption text-[#3C3C43]">{r.notes}</span>,
    },
  ];

  const flowColumns: DataTableColumn<FlowRow>[] = [
    {
      key: "key",
      header: "Flow",
      render: (r) => <span className="font-medium">{r.key}</span>,
    },
    {
      key: "route",
      header: "Route",
      render: (r) => (
        <code className="t-mono t-caption text-[#3C3C43]">{r.route}</code>
      ),
    },
    {
      key: "status",
      header: "Status",
      align: "right",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {flowTone(r.status) === "success" ? (
            <CheckCircle2 size={14} style={{ color: "#059669" }} />
          ) : (
            <XCircle size={14} style={{ color: "#DC2626" }} />
          )}
          <StatusBadge tone={flowTone(r.status)}>{r.status}</StatusBadge>
        </span>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Release management"
        subtitle="Pre-launch readiness, environment health, and rollout schedule."
        actions={
          <>
            <div className="w-64">
              <Input
                value={since}
                onChange={(e) => setSince(e.target.value)}
                placeholder="Since ISO timestamp (optional)"
              />
            </div>
            <Button
              variant="secondary"
              onClick={() => void load()}
              isDisabled={loading}
            >
              {loading ? <Spinner size="xs" /> : <RefreshCw size={14} />}
              <span className="ml-1.5">Refresh</span>
            </Button>
            <Button onClick={() => setScheduleOpen(true)}>
              <CalendarPlus size={14} />
              <span className="ml-1.5">Schedule release</span>
            </Button>
          </>
        }
      />

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

      {loading && data == null ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {data != null ? (
        <>
          {/* Current release card */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center justify-between">
                <span className="t-label font-semibold text-[#111]">
                  Current release
                </span>
                <HelpText>Live deployment</HelpText>
              </div>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="flex flex-col gap-2">
                  <span className="t-overline text-[#8E8E93]">Version</span>
                  <span className="t-h2 t-num text-[#111]">v0.9.4</span>
                  <StatusBadge tone="success" pulse>
                    Rolling out
                  </StatusBadge>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="t-overline text-[#8E8E93]">Released by</span>
                  <span className="t-label font-medium text-[#111]">
                    platform-team
                  </span>
                  <span className="t-caption text-[#8E8E93]">
                    Mode: {data.environment.runtimeMode}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="t-overline text-[#8E8E93]">Plan</span>
                  <span className="t-label font-medium text-[#111]">
                    {data.environment.plan ?? "n/a"}
                  </span>
                  <span className="t-caption text-[#8E8E93]">
                    Billing: {data.environment.billingStatus ?? "n/a"}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <span className="t-overline text-[#8E8E93]">Rollout</span>
                  <div className="h-2 w-full surface-muted rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full"
                      style={{ width: "82%", backgroundColor: "#4F46E5" }}
                    />
                  </div>
                  <span className="t-caption text-[#3C3C43]">82% complete</span>
                </div>
              </div>

              {/* Provider readiness */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Convex", key: "convexConfigured" },
                  { label: "Auth", key: "authConfigured" },
                  { label: "Billing", key: "billingConfigured" },
                  { label: "AI", key: "aiConfigured" },
                ].map(({ label, key }) => {
                  const val = data.environment.providerReadiness?.[key];
                  const ready = val === true || val === "true";
                  return (
                    <div
                      key={key}
                      className="surface-muted rounded-lg p-3 flex items-center justify-between"
                    >
                      <span className="t-label text-[#3C3C43]">{label}</span>
                      <StatusBadge tone={ready ? "success" : "danger"}>
                        {ready ? "Ready" : "Not ready"}
                      </StatusBadge>
                    </div>
                  );
                })}
              </div>

              {/* Warnings */}
              {data.environment.configurationWarning != null ||
              (data.environment.configurationWarnings != null &&
                data.environment.configurationWarnings.length > 0) ? (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <AlertTriangle size={14} style={{ color: "#D97706" }} />
                  <span className="t-overline text-[#8E8E93]">Warnings</span>
                  {data.environment.configurationWarning != null ? (
                    <StatusBadge tone="warning">
                      {data.environment.configurationWarning}
                    </StatusBadge>
                  ) : null}
                  {(data.environment.configurationWarnings ?? []).map(
                    (w, i) => (
                      <StatusBadge key={i} tone="warning">
                        {w}
                      </StatusBadge>
                    ),
                  )}
                </div>
              ) : null}
            </CardBody>
          </CardShell>

          {/* Activation strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard
              label="Onboarding started"
              value={data.summaries.signupActivation.signupStarted ?? 0}
            />
            <MetricCard
              label="Onboarding completed"
              value={data.summaries.signupActivation.onboardingCompleted ?? 0}
            />
            <MetricCard
              label="Activated workspaces"
              value={data.summaries.signupActivation.activationAchieved ?? 0}
              deltaTone="up"
            />
          </div>

          {/* Releases table */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center justify-between">
                <span className="t-label font-semibold text-[#111]">
                  Releases
                </span>
                <HelpText>Most recent first</HelpText>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable columns={releaseColumns} rows={releaseRows} dense />
            </CardBody>
          </CardShell>

          {/* Critical flows */}
          <CardShell>
            <CardHeader bordered>
              <span className="t-label font-semibold text-[#111]">
                Critical flows checklist
              </span>
            </CardHeader>
            <CardBody className="p-0">
              <DataTable
                columns={flowColumns}
                rows={(data.checklist.criticalFlows ?? []).map((f) => ({
                  ...f,
                  id: f.id ?? f.key,
                }))}
                dense
                emptyState={
                  <EmptyState
                    title="No flows defined"
                    description="Add critical flows to monitor end-to-end readiness."
                  />
                }
              />
            </CardBody>
          </CardShell>

          {/* Reliability split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <CardShell>
              <CardHeader bordered>
                <span className="t-label font-semibold text-[#111]">
                  Failure groups
                </span>
              </CardHeader>
              <CardBody>
                {(data.summaries.failures ?? []).length === 0 ? (
                  <HelpText>No failure groups recorded.</HelpText>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {(data.summaries.failures ?? []).map((item) => (
                      <li
                        key={item.label}
                        className="flex items-center justify-between"
                      >
                        <span className="t-label text-[#3C3C43]">
                          {item.label}
                        </span>
                        <StatusBadge
                          tone={item.count > 0 ? "danger" : "neutral"}
                        >
                          {item.count}
                        </StatusBadge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </CardShell>

            <CardShell>
              <CardHeader bordered>
                <span className="t-label font-semibold text-[#111]">
                  Protocol + editor metrics
                </span>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    {
                      label: "Protocol failures",
                      value: data.summaries.protocolErrors?.length ?? 0,
                    },
                    {
                      label: "Editor crash boundaries",
                      value:
                        data.summaries.editorReliability?.editorCrashBoundary ?? 0,
                    },
                    {
                      label: "Autosave failures",
                      value:
                        data.summaries.editorReliability?.autosaveFailure ?? 0,
                    },
                    {
                      label: "Invites accepted",
                      value:
                        data.summaries.inviteAndBilling?.inviteAccepted ?? 0,
                    },
                    {
                      label: "Billing failures",
                      value:
                        data.summaries.inviteAndBilling?.billingFailures ?? 0,
                    },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="surface-muted rounded-lg p-3 flex flex-col gap-1"
                    >
                      <span className="t-h3 t-num text-[#111]">{value}</span>
                      <span className="t-caption text-[#8E8E93]">{label}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </CardShell>
          </div>

          {/* Launch links */}
          {data.links != null && data.links.length > 0 ? (
            <CardShell>
              <CardHeader bordered>
                <span className="t-label font-semibold text-[#111]">
                  Launch links
                </span>
              </CardHeader>
              <CardBody>
                <div className="flex flex-wrap gap-2">
                  {data.links.map((link) => (
                    <Link key={link.href} href={link.href}>
                      <Button variant="secondary">{link.label}</Button>
                    </Link>
                  ))}
                </div>
              </CardBody>
            </CardShell>
          ) : null}
        </>
      ) : null}

      <ScheduleReleaseDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
      />
    </div>
  );
}

function ScheduleReleaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [version, setVersion] = useState("");
  const [when, setWhen] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 300));
      setVersion("");
      setWhen("");
      setNotes("");
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule release"
      description="Plan a versioned rollout window."
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} isDisabled={submitting}>
            {submitting ? <Spinner size="xs" /> : null}
            <span className={submitting ? "ml-1.5" : ""}>Schedule</span>
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">Version</label>
          <Input
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="v0.9.5"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">When (ISO)</label>
          <Input
            value={when}
            onChange={(e) => setWhen(e.target.value)}
            placeholder="2026-05-01T15:00:00Z"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="t-overline text-[#8E8E93]">Notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Highlights, risk, rollback plan..."
          />
        </div>
      </div>
    </Dialog>
  );
}
