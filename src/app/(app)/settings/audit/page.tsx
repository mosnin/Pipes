"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Lock, RefreshCw, Zap } from "lucide-react";
import Link from "next/link";
import {
  Button,
  CardShell,
  CardBody,
  DataTable,
  EmptyState,
  PageHeader,
  SegmentedControl,
  Spinner,
  StatusBadge,
  type DataTableColumn,
} from "@/components/ui";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuditEvent {
  id: string;
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: string;
  createdAt: string;
  systemId?: string;
  metadata?: string;
}

type OutcomeFilter = "all" | "success" | "failure";
type ActorFilter = "all" | "user" | "agent";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatAction(action: string): string {
  return action.replace(/\./g, " › ").replace(/_/g, " ");
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AuditLogPage() {
  const [events, setEvents] = useState<AuditEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [outcomeFilter, setOutcomeFilter] = useState<OutcomeFilter>("all");
  const [actorFilter, setActorFilter] = useState<ActorFilter>("all");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);
      if (actorFilter !== "all") params.set("actorType", actorFilter);
      const res = await fetch(`/api/settings/audit?${params}`);
      const data = await res.json();
      if (res.status === 403) {
        setError("upgrade");
        return;
      }
      if (!data.ok) throw new Error(data.error ?? "Failed to load audit log");
      setEvents(Array.isArray(data.data) ? data.data : []);
    } catch (e) {
      const msg = (e as Error).message;
      if (msg.includes("upgrade") || msg.includes("requires")) {
        setError("upgrade");
      } else {
        toast.error("Could not load audit log");
        setEvents([]);
      }
    } finally {
      setLoading(false);
    }
  }, [outcomeFilter, actorFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleDownloadCsv = async () => {
    try {
      const params = new URLSearchParams({ format: "csv" });
      if (outcomeFilter !== "all") params.set("outcome", outcomeFilter);
      if (actorFilter !== "all") params.set("actorType", actorFilter);
      const res = await fetch(`/api/settings/audit?${params}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not export audit log");
    }
  };

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: "createdAt",
      header: "Time",
      width: "120px",
      render: (row) => (
        <span className="t-caption text-ink-2" title={row.createdAt}>
          {formatRelative(row.createdAt)}
        </span>
      ),
    },
    {
      key: "actorType",
      header: "Actor",
      width: "100px",
      render: (row) => (
        <StatusBadge tone={row.actorType === "agent" ? "info" : "neutral"}>
          {row.actorType}
        </StatusBadge>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <span className="t-label text-ink-1 font-mono text-[11px]">
          {formatAction(row.action)}
        </span>
      ),
    },
    {
      key: "targetType",
      header: "Target",
      width: "120px",
      render: (row) => (
        <span className="t-caption text-ink-2">{row.targetType}</span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      width: "100px",
      render: (row) => (
        <StatusBadge tone={row.outcome === "success" ? "success" : "danger"}>
          {row.outcome}
        </StatusBadge>
      ),
    },
  ];

  if (error === "upgrade") {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Audit log"
          subtitle="Track all actions taken in your workspace by users and agents."
        />
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-5 py-4 flex items-start gap-4">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Lock size={14} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="t-label font-semibold text-indigo-900">Audit log requires Builder</p>
            <p className="t-caption text-indigo-700/80 mt-1 leading-relaxed">
              Upgrade to Builder to access the full workspace audit log, including agent API calls,
              member changes, and version history.
            </p>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-indigo-600 text-white t-caption font-semibold hover:bg-indigo-700 transition-colors"
            >
              <Zap size={11} aria-hidden />
              Upgrade to Builder
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Audit log"
        subtitle="Track all actions taken in your workspace by users and agents."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onPress={() => void load()} isDisabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onPress={() => void handleDownloadCsv()} isDisabled={loading || !events?.length}>
              <Download size={14} />
              Export CSV
            </Button>
          </div>
        }
      />

      <CardShell>
        <CardBody>
          <div className="flex items-center gap-3 mb-4">
            <SegmentedControl
              size="sm"
              value={actorFilter}
              onChange={(v) => setActorFilter(v as ActorFilter)}
              items={[
                { id: "all", label: "All actors" },
                { id: "user", label: "Users" },
                { id: "agent", label: "Agents" },
              ]}
            />
            <SegmentedControl
              size="sm"
              value={outcomeFilter}
              onChange={(v) => setOutcomeFilter(v as OutcomeFilter)}
              items={[
                { id: "all", label: "All" },
                { id: "success", label: "Success" },
                { id: "failure", label: "Failure" },
              ]}
            />
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          ) : !events || events.length === 0 ? (
            <EmptyState
              title="No audit events"
              description="Events will appear here as users and agents take actions in your workspace."
            />
          ) : (
            <DataTable columns={columns} rows={events} dense />
          )}
        </CardBody>
      </CardShell>
    </div>
  );
}
