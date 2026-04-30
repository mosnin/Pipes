"use client";

import { useEffect, useState } from "react";
import { Activity, Bell, Gauge, Plug, Sliders } from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  CardFooter,
  DataTable,
  EmptyState,
  HelpText,
  PageHeader,
  Spinner,
  StatusBadge,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@/components/ui";

// ── types ──────────────────────────────────────────────────────────────────

interface PresetRow {
  id?: string;
  name?: string;
  batchingPosture?: string;
  reviewHint?: string;
  active?: boolean;
}

interface VersionRow {
  id: string;
  name: string;
  type: "prompt" | "strategy";
  version: string;
  status: string;
}

interface SkillRow {
  skillId?: string;
  version?: string | number;
  status?: string;
}

interface WebhookRow {
  id: string;
  name: string;
  endpoint: string;
  events: string[];
  status: "active" | "paused" | "errored";
  lastDelivery?: string;
}

// ── helpers ────────────────────────────────────────────────────────────────

function statusTone(status?: string): StatusBadgeTone {
  switch (status) {
    case "active":
      return "success";
    case "candidate":
    case "paused":
      return "warning";
    case "deprecated":
    case "errored":
      return "danger";
    default:
      return "neutral";
  }
}

// ── page ──────────────────────────────────────────────────────────────────

export default function OperationsSettingsPage() {
  const [presets, setPresets] = useState<PresetRow[]>([]);
  const [versions, setVersions] = useState<{
    promptVersions: PresetRow[];
    strategyVersions: PresetRow[];
  }>({
    promptVersions: [],
    strategyVersions: [],
  });
  const [skills, setSkills] = useState<SkillRow[]>([]);
  const [loading, setLoading] = useState(true);

  // ── workspace defaults ──
  const [defaultPlan, setDefaultPlan]     = useState("Free");
  const [defaultRole, setDefaultRole]     = useState("Viewer");

  // ── notifications ──
  const [emailDigest, setEmailDigest]     = useState(true);
  const [agentAlerts, setAgentAlerts]     = useState(true);
  const [billingAlerts, setBillingAlerts] = useState(true);

  // ── rate limits ──
  const [rateLimitPerMin, setRateLimitPerMin]     = useState("60");
  const [rateLimitBurst, setRateLimitBurst]       = useState("120");
  const [rateLimitConcurrency, setRateLimitConcurrency] = useState("4");

  // ── webhooks (mock display) ──
  const [webhooks] = useState<WebhookRow[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/agent/presets")
        .then((r) => r.json())
        .then((d: { data?: PresetRow[] }) => setPresets(d.data ?? [])),
      fetch("/api/agent/versions")
        .then((r) => r.json())
        .then((d: { data?: { promptVersions: PresetRow[]; strategyVersions: PresetRow[] } }) =>
          setVersions(d.data ?? { promptVersions: [], strategyVersions: [] }),
        ),
      fetch("/api/agent/skills")
        .then((r) => r.json())
        .then((d: { data?: SkillRow[] }) => setSkills(d.data ?? [])),
    ]).finally(() => setLoading(false));
  }, []);

  const allVersions: VersionRow[] = [
    ...versions.promptVersions.map((p, i) => ({
      id: `prompt-${p.id ?? i}`,
      name: p.name ?? p.id ?? "-",
      type: "prompt" as const,
      version: String((p as { version?: string }).version ?? p.id ?? "-"),
      status: (p as { status?: string }).status ?? "unknown",
    })),
    ...versions.strategyVersions.map((s, i) => ({
      id: `strategy-${s.id ?? i}`,
      name: s.name ?? s.id ?? "-",
      type: "strategy" as const,
      version: String((s as { version?: string }).version ?? s.id ?? "-"),
      status: (s as { status?: string }).status ?? "unknown",
    })),
  ];

  // ── columns ──
  type RowPreset = PresetRow & { id: string };
  const presetRows: RowPreset[] = presets.map((p, i) => ({ ...p, id: p.id ?? `preset-${i}` }));

  const presetColumns: DataTableColumn<RowPreset>[] = [
    { key: "name", header: "Name", render: (r) => <span className="t-label font-medium text-[#111]">{r.name ?? "-"}</span> },
    { key: "batchingPosture", header: "Batching", render: (r) => <span className="t-label text-[#3C3C43]">{r.batchingPosture ?? "-"}</span> },
    { key: "reviewHint", header: "Review", render: (r) => <span className="t-label text-[#3C3C43]">{r.reviewHint ?? "-"}</span> },
    {
      key: "active",
      header: "Status",
      width: "120px",
      render: (r) => (
        <StatusBadge tone={r.active ? "success" : "neutral"}>
          {r.active ? "Active" : "Inactive"}
        </StatusBadge>
      ),
    },
  ];

  const versionColumns: DataTableColumn<VersionRow>[] = [
    { key: "name", header: "Name", render: (r) => <span className="t-label font-medium text-[#111]">{r.name}</span> },
    { key: "type", header: "Type", render: (r) => <span className="t-caption text-[#8E8E93] capitalize">{r.type}</span> },
    { key: "version", header: "Version", render: (r) => <span className="t-mono text-[12px] text-[#111]">{r.version}</span> },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>,
    },
  ];

  type RowSkill = SkillRow & { id: string };
  const skillRows: RowSkill[] = skills.map((s, i) => ({ ...s, id: s.skillId ?? `skill-${i}` }));

  const skillColumns: DataTableColumn<RowSkill>[] = [
    { key: "skillId", header: "Skill", render: (r) => <span className="t-label font-medium text-[#111]">{r.skillId ?? "-"}</span> },
    { key: "version", header: "Version", render: (r) => <span className="t-mono text-[12px] text-[#111]">{String(r.version ?? "-")}</span> },
    {
      key: "status",
      header: "Binding",
      width: "120px",
      render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status ?? "unknown"}</StatusBadge>,
    },
  ];

  const webhookColumns: DataTableColumn<WebhookRow>[] = [
    { key: "name", header: "Name", render: (r) => <span className="t-label font-medium text-[#111]">{r.name}</span> },
    { key: "endpoint", header: "Endpoint", render: (r) => <span className="t-mono text-[12px] text-[#3C3C43] truncate">{r.endpoint}</span> },
    { key: "events", header: "Events", render: (r) => <span className="t-caption text-[#8E8E93]">{r.events.join(", ")}</span> },
    {
      key: "status",
      header: "Status",
      width: "120px",
      render: (r) => <StatusBadge tone={statusTone(r.status)}>{r.status}</StatusBadge>,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operations"
        subtitle="Workspace defaults, notifications, integrations, and runtime limits."
      />

      {loading ? (
        <CardShell>
          <CardBody>
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          </CardBody>
        </CardShell>
      ) : (
        <>
          {/* ── Workspace defaults ────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center gap-2">
                <Sliders size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Workspace defaults</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Defaults applied to newly created systems and members.
              </p>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="default-plan" className="t-label font-medium text-[#111]">
                  Default plan for new workspaces
                </label>
                <select
                  id="default-plan"
                  value={defaultPlan}
                  onChange={(e) => setDefaultPlan(e.target.value)}
                  className="h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Free">Free</option>
                  <option value="Pro">Pro</option>
                  <option value="Builder">Builder</option>
                </select>
                <HelpText>Used when admins provision additional workspaces.</HelpText>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="default-role" className="t-label font-medium text-[#111]">
                  Default role for invitees
                </label>
                <select
                  id="default-role"
                  value={defaultRole}
                  onChange={(e) => setDefaultRole(e.target.value)}
                  className="h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                >
                  <option value="Viewer">Viewer</option>
                  <option value="Commenter">Commenter</option>
                  <option value="Editor">Editor</option>
                </select>
                <HelpText>Pre-selected when sending an invite.</HelpText>
              </div>
            </CardBody>
            <CardFooter>
              <HelpText>Changes are saved per workspace.</HelpText>
              <Button variant="primary" isDisabled>
                Save changes
              </Button>
            </CardFooter>
          </CardShell>

          {/* ── Notifications ────────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Notifications</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Where Pipes should reach you.
              </p>
            </CardHeader>
            <CardBody className="space-y-1">
              <ToggleRow
                label="Weekly email digest"
                description="Summary of activity, changes, and pending reviews."
                checked={emailDigest}
                onChange={setEmailDigest}
              />
              <ToggleRow
                label="Agent run alerts"
                description="Notify when agent runs complete, fail, or stall."
                checked={agentAlerts}
                onChange={setAgentAlerts}
              />
              <ToggleRow
                label="Billing alerts"
                description="Receipts, failed payments, and plan changes."
                checked={billingAlerts}
                onChange={setBillingAlerts}
              />
            </CardBody>
            <CardFooter>
              <HelpText>Per-user preferences override workspace defaults.</HelpText>
              <Button variant="primary" isDisabled>
                Save changes
              </Button>
            </CardFooter>
          </CardShell>

          {/* ── Webhooks ─────────────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Plug size={14} className="text-[#8E8E93]" />
                    <h2 className="t-title text-[#111]">Webhooks</h2>
                  </div>
                  <p className="mt-1 t-caption text-[#8E8E93]">
                    Forward workspace events to external systems.
                  </p>
                </div>
                <Button variant="outline">Add endpoint</Button>
              </div>
            </CardHeader>
            {webhooks.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="No webhooks configured"
                  description="Add an endpoint to receive system, agent, and audit events."
                />
              </CardBody>
            ) : (
              <DataTable columns={webhookColumns} rows={webhooks} />
            )}
          </CardShell>

          {/* ── Rate limits ──────────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center gap-2">
                <Gauge size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">API rate limits</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Protect the workspace from runaway integrations.
              </p>
            </CardHeader>
            <CardBody className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <FormField
                id="rate-per-min"
                label="Requests / minute"
                value={rateLimitPerMin}
                onChange={setRateLimitPerMin}
                helper="Sustained limit per token."
              />
              <FormField
                id="rate-burst"
                label="Burst capacity"
                value={rateLimitBurst}
                onChange={setRateLimitBurst}
                helper="Short-window peak."
              />
              <FormField
                id="rate-conc"
                label="Concurrent runs"
                value={rateLimitConcurrency}
                onChange={setRateLimitConcurrency}
                helper="Parallel agent runs."
              />
            </CardBody>
            <CardFooter>
              <HelpText>Hard caps - exceeding requests return 429.</HelpText>
              <Button variant="primary" isDisabled>
                Save changes
              </Button>
            </CardFooter>
          </CardShell>

          {/* ── Builder presets ──────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <div className="flex items-center gap-2">
                <Activity size={14} className="text-[#8E8E93]" />
                <h2 className="t-title text-[#111]">Builder presets</h2>
              </div>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Active preset configuration for this workspace.
              </p>
            </CardHeader>
            {presetRows.length === 0 ? (
              <CardBody>
                <EmptyState title="No presets" description="No builder presets are configured." />
              </CardBody>
            ) : (
              <DataTable columns={presetColumns} rows={presetRows} />
            )}
          </CardShell>

          {/* ── Versions ─────────────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <h2 className="t-title text-[#111]">Prompt and strategy versions</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Deployed prompt and strategy artifacts.
              </p>
            </CardHeader>
            {allVersions.length === 0 ? (
              <CardBody>
                <EmptyState title="No versions" description="No deployed versions found." />
              </CardBody>
            ) : (
              <DataTable columns={versionColumns} rows={allVersions} />
            )}
          </CardShell>

          {/* ── Skill bindings ───────────────────────────────────────────── */}
          <CardShell>
            <CardHeader bordered>
              <h2 className="t-title text-[#111]">Skill bindings</h2>
              <p className="mt-1 t-caption text-[#8E8E93]">
                Skill version bindings for this workspace.
              </p>
            </CardHeader>
            {skillRows.length === 0 ? (
              <CardBody>
                <EmptyState title="No skill bindings" description="No skill bindings configured." />
              </CardBody>
            ) : (
              <DataTable columns={skillColumns} rows={skillRows} />
            )}
          </CardShell>
        </>
      )}
    </div>
  );
}

// ── helpers UI ─────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 border-b border-[var(--color-line)] last:border-b-0 cursor-pointer">
      <div>
        <div className="t-label font-medium text-[#111]">{label}</div>
        <HelpText>{description}</HelpText>
      </div>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-indigo-600 w-4 h-4 cursor-pointer"
      />
    </label>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  helper,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  helper?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="t-label font-medium text-[#111]">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
      />
      {helper && <HelpText>{helper}</HelpText>}
    </div>
  );
}
