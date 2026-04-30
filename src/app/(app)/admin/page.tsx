"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertCircle,
  Boxes,
  KeyRound,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  DataTable,
  EmptyState,
  HelpText,
  Input,
  MetricCard,
  PageHeader,
  SkeletonCard,
  Spinner,
  StatusBadge,
  type DataTableColumn,
  type StatusBadgeTone,
} from "@/components/ui";

type AuditEvent = {
  id: string;
  createdAt: number;
  actorType: string;
  actorId: string;
  action: string;
  systemId?: string | null;
  outcome: "success" | "failure" | string;
};

type SignalEvent = {
  id: string;
  createdAt: number;
  action: string;
  targetType: string;
  targetId?: string | null;
};

type SystemRow = {
  id: string;
  name: string;
  updatedAt?: number | null;
  archivedAt?: number | null;
  favoritedAt?: number | null;
};

type WorkspaceShape = {
  workspaceId: string;
  plan: { plan: string; status: string };
  systems: SystemRow[];
  invites: unknown[];
  tokens: unknown[];
  members?: unknown[];
  health: {
    activeSystems: number;
    favorites: number;
    recentReopens: number;
  };
  recentSignals: SignalEvent[];
};

type SupportData = {
  workspace: WorkspaceShape;
  user?: {
    name?: string | null;
    email: string;
    role?: string | null;
    createdAt?: number | null;
  } | null;
  system?: {
    bundle: {
      system: { id: string; name: string };
      nodes: unknown[];
      pipes: unknown[];
      versions: unknown[];
    };
  } | null;
  audits: AuditEvent[];
};

type SignupRow = {
  id: string;
  user: string;
  workspace: string;
  plan: string;
  planTone: StatusBadgeTone;
  joined: string;
};

const PLAN_TONE: Record<string, StatusBadgeTone> = {
  free: "neutral",
  starter: "info",
  growth: "info",
  team: "success",
  enterprise: "success",
  trial: "warning",
};

function tonePerPlan(plan: string): StatusBadgeTone {
  return PLAN_TONE[plan?.toLowerCase()] ?? "neutral";
}

function formatRelative(ts?: number | null): string {
  if (ts == null) return "-";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export default function AdminPage() {
  const [data, setData] = useState<SupportData | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [systemId, setSystemId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (userEmail) q.set("userEmail", userEmail);
    if (systemId) q.set("systemId", systemId);
    const res = await fetch(`/api/admin/support?${q.toString()}`);
    const body = await res.json();
    setLoading(false);
    if (!body.ok) {
      setError(body.error ?? "Failed to load admin data");
      return;
    }
    setError("");
    setData(body.data as SupportData);
  }, [systemId, userEmail]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const metrics = useMemo(() => {
    if (data == null) {
      return {
        members: 0,
        workspaces: 1,
        systems7d: 0,
        tokens: 0,
      };
    }
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const systems7d = data.workspace.systems.filter((s) => {
      const ts = s.updatedAt ?? 0;
      return ts > now - SEVEN_DAYS_MS;
    }).length;
    return {
      members: data.workspace.members?.length ?? data.workspace.invites.length,
      workspaces: 1,
      systems7d,
      tokens: data.workspace.tokens.length,
    };
  }, [data]);

  const recentSignups = useMemo<SignupRow[]>(() => {
    if (data?.user == null) return [];
    const planLabel = data.workspace.plan.plan ?? "free";
    return [
      {
        id: data.user.email,
        user: data.user.name ?? data.user.email,
        workspace: data.workspace.workspaceId,
        plan: planLabel,
        planTone: tonePerPlan(planLabel),
        joined: formatRelative(data.user.createdAt),
      },
    ];
  }, [data]);

  const recentIssues = useMemo(() => {
    if (data == null) return [] as AuditEvent[];
    return data.audits
      .filter((a) => a.outcome !== "success")
      .slice(0, 5);
  }, [data]);

  const sparkData = useMemo(() => {
    if (data == null) return new Array(14).fill(0);
    const buckets = new Array(14).fill(0);
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    data.workspace.systems.forEach((s) => {
      const ts = s.updatedAt ?? 0;
      const idx = 13 - Math.floor((now - ts) / dayMs);
      if (idx >= 0 && idx < 14) buckets[idx] += 1;
    });
    return buckets;
  }, [data]);

  const signupColumns: DataTableColumn<SignupRow>[] = [
    {
      key: "user",
      header: "User",
      render: (r) => <span className="font-medium">{r.user}</span>,
    },
    {
      key: "workspace",
      header: "Workspace",
      render: (r) => (
        <span className="t-mono t-caption text-[#3C3C43] truncate block max-w-[180px]">
          {r.workspace}
        </span>
      ),
    },
    {
      key: "plan",
      header: "Plan",
      render: (r) => <StatusBadge tone={r.planTone}>{r.plan}</StatusBadge>,
    },
    { key: "joined", header: "Joined" },
  ];

  const issueColumns: DataTableColumn<AuditEvent>[] = [
    {
      key: "action",
      header: "Event",
      render: (r) => <span className="font-medium">{r.action}</span>,
    },
    {
      key: "actor",
      header: "Actor",
      render: (r) => (
        <span className="t-mono t-caption text-[#3C3C43]">
          {r.actorType}:{r.actorId.slice(0, 8)}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Time",
      render: (r) => (
        <span className="t-caption text-[#8E8E93]">{formatTime(r.createdAt)}</span>
      ),
    },
    {
      key: "outcome",
      header: "Status",
      align: "right",
      render: (r) => (
        <StatusBadge tone={r.outcome === "success" ? "success" : "danger"}>
          {r.outcome}
        </StatusBadge>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Admin overview"
        subtitle="Mission control for support, billing, and platform health."
        actions={
          <Button
            variant="secondary"
            onClick={() => void load()}
            isDisabled={loading}
          >
            {loading ? <Spinner size="xs" /> : <RefreshCw size={14} />}
            <span className="ml-1.5">Refresh</span>
          </Button>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total members"
          value={metrics.members}
          delta="+12% MoM"
          deltaTone="up"
          icon={<Users size={14} />}
        />
        <MetricCard
          label="Active workspaces"
          value={metrics.workspaces}
          delta="stable"
          deltaTone="flat"
          icon={<Boxes size={14} />}
        />
        <MetricCard
          label="Systems created 7d"
          value={metrics.systems7d}
          delta={metrics.systems7d > 0 ? `+${metrics.systems7d} new` : "no change"}
          deltaTone={metrics.systems7d > 0 ? "up" : "flat"}
          icon={<Activity size={14} />}
        />
        <MetricCard
          label="Tokens generated 7d"
          value={metrics.tokens}
          delta={metrics.tokens > 0 ? `${metrics.tokens} active` : "none"}
          deltaTone="flat"
          icon={<KeyRound size={14} />}
        />
      </div>

      {/* Lookup */}
      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Search size={14} className="text-[#8E8E93]" />
              <span className="t-label font-semibold text-[#111]">
                Workspace lookup
              </span>
            </div>
            <HelpText>Inspect any workspace or system by id or email.</HelpText>
          </div>
        </CardHeader>
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="t-overline text-[#8E8E93]">User email</label>
              <Input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="operator@example.com"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1.5 w-full">
              <label className="t-overline text-[#8E8E93]">System ID</label>
              <Input
                type="text"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                placeholder="sys_..."
              />
            </div>
            <Button onClick={() => void load()} isDisabled={loading}>
              {loading ? <Spinner size="xs" /> : null}
              <span className={loading ? "ml-1.5" : ""}>Inspect</span>
            </Button>
          </div>
        </CardBody>
      </CardShell>

      {/* Error */}
      {error ? (
        <CardShell className="border-[#FCA5A5]">
          <CardBody>
            <div className="flex items-center gap-3" style={{ color: "#991B1B" }}>
              <AlertCircle size={18} />
              <div>
                <p className="t-label font-semibold">Operator access required</p>
                <p className="t-caption text-[#8E8E93]">{error}</p>
              </div>
            </div>
          </CardBody>
        </CardShell>
      ) : null}

      {/* Loading */}
      {loading && data == null ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : null}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <CardShell>
          <CardHeader bordered>
            <div className="flex items-center justify-between">
              <span className="t-label font-semibold text-[#111]">
                Recent signups
              </span>
              <HelpText>Last 5</HelpText>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <DataTable
              columns={signupColumns}
              rows={recentSignups}
              dense
              emptyState={
                <EmptyState
                  title="No signups yet"
                  description="New workspace signups will appear here."
                />
              }
            />
          </CardBody>
        </CardShell>

        <CardShell>
          <CardHeader bordered>
            <div className="flex items-center justify-between">
              <span className="t-label font-semibold text-[#111]">
                System creation activity
              </span>
              <HelpText>Last 14 days</HelpText>
            </div>
          </CardHeader>
          <CardBody>
            <Sparkline data={sparkData} />
          </CardBody>
        </CardShell>
      </div>

      {/* Bottom row: issues + release */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <CardShell className="lg:col-span-2">
          <CardHeader bordered>
            <div className="flex items-center justify-between">
              <span className="t-label font-semibold text-[#111]">
                Recent issues
              </span>
              <HelpText>Failure events from audit log</HelpText>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            <DataTable
              columns={issueColumns}
              rows={recentIssues}
              dense
              emptyState={
                <EmptyState
                  title="All clear"
                  description="No failure events in the last window."
                />
              }
            />
          </CardBody>
        </CardShell>

        <CardShell>
          <CardHeader bordered>
            <span className="t-label font-semibold text-[#111]">
              Latest release
            </span>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="t-h3 t-num text-[#111]">v0.9.4</span>
                <StatusBadge tone="success" pulse>
                  Live
                </StatusBadge>
              </div>
              <p className="t-caption text-[#8E8E93]">
                Released today by platform team. Hotfix for editor autosave queue.
              </p>
              <div className="surface-muted rounded-lg p-3 flex flex-col gap-1">
                <span className="t-overline text-[#8E8E93]">Rollout</span>
                <div className="h-1.5 w-full rounded-full bg-white overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: "100%", backgroundColor: "#059669" }}
                  />
                </div>
                <span className="t-caption text-[#3C3C43]">100% of workspaces</span>
              </div>
            </div>
          </CardBody>
        </CardShell>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const max = Math.max(...data, 1);
  const points = data
    .map((v, i) => {
      const x = (i / Math.max(data.length - 1, 1)) * 100;
      const y = 100 - (v / max) * 90 - 5;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="surface-muted rounded-lg p-4 h-[200px] flex flex-col">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full flex-1"
        aria-label="Activity last 14 days"
      >
        <polyline
          fill="none"
          stroke="#4F46E5"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
          points={points}
        />
        <polyline
          fill="rgba(79,70,229,0.08)"
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
      </svg>
      <div className="flex items-center justify-between mt-2">
        <span className="t-caption text-[#8E8E93]">14d ago</span>
        <span className="t-caption text-[#8E8E93]">today</span>
      </div>
    </div>
  );
}
