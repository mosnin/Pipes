"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Download, Filter } from "lucide-react";
import {
  Button,
  CardShell,
  CardHeader,
  CardBody,
  DataTable,
  EmptyState,
  HelpText,
  PageHeader,
  SearchInput,
  SegmentedControl,
  Spinner,
  StatusBadge,
  Tooltip,
  type DataTableColumn,
} from "@/components/ui";
import { cn } from "@/lib/utils";

// ── types ──────────────────────────────────────────────────────────────────

interface AuditEvent {
  id: string;
  createdAt: string;
  actorType: string;
  actorId: string;
  action: string;
  targetType: string;
  targetId?: string;
  outcome: string;
  systemId?: string;
  metadata?: string;
}

type ActorFilter = "all" | "user" | "agent";

// ── helpers ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const abs = Math.abs(diff);
    if (abs < 60_000) return "just now";
    if (abs < 3_600_000) return `${Math.floor(abs / 60_000)} min ago`;
    if (abs < 86_400_000) return `${Math.floor(abs / 3_600_000)} hr ago`;
    return `${Math.floor(abs / 86_400_000)} d ago`;
  } catch {
    return iso;
  }
}

function formatFull(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function getTransport(metadata?: string): string {
  try {
    const parsed = JSON.parse(metadata ?? "{}") as { transport?: string; ip?: string };
    return parsed.transport ?? "-";
  } catch {
    return "-";
  }
}

function getIp(metadata?: string): string {
  try {
    const parsed = JSON.parse(metadata ?? "{}") as { ip?: string };
    return parsed.ip ?? "-";
  } catch {
    return "-";
  }
}

function safeParseJson(value?: string): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// ── page ──────────────────────────────────────────────────────────────────

export default function AuditSettingsPage() {
  const [events, setEvents]   = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [actorType, setActorType]         = useState<ActorFilter>("all");
  const [actionPrefix, setActionPrefix]   = useState("");
  const [pendingActionPrefix, setPendingActionPrefix] = useState("");
  const [since, setSince]                 = useState("");
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debounceCommit(setter: (v: string) => void, value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setter(value), 220);
  }

  // ── CSV export URL ──
  const csvUrl = useMemo(() => {
    const csvParams = new URLSearchParams({ format: "csv" });
    if (actorType !== "all") csvParams.set("actorType", actorType);
    if (actionPrefix)        csvParams.set("actionPrefix", actionPrefix);
    if (since)               csvParams.set("since", since);
    return `/api/settings/audit?${csvParams.toString()}`;
  }, [actorType, actionPrefix, since]);

  // ── fetch ──
  const load = useCallback(() => {
    const query = new URLSearchParams();
    if (actorType !== "all") query.set("actorType", actorType);
    if (actionPrefix)        query.set("actionPrefix", actionPrefix);
    if (since)               query.set("since", since);
    setLoading(true);
    fetch(`/api/settings/audit?${query.toString()}`)
      .then((r) => r.json())
      .then((d: { data?: AuditEvent[] }) => setEvents(d.data ?? []))
      .finally(() => setLoading(false));
  }, [actorType, actionPrefix, since]);

  useEffect(() => {
    load();
  }, [load]);

  function outcomeTone(outcome: string): "success" | "danger" | "neutral" {
    if (outcome === "success") return "success";
    if (outcome === "failure") return "danger";
    return "neutral";
  }

  const columns: DataTableColumn<AuditEvent>[] = [
    {
      key: "createdAt",
      header: "Timestamp",
      width: "168px",
      render: (row) => (
        <Tooltip content={formatFull(row.createdAt)}>
          <span className="t-label text-[#3C3C43] cursor-default">
            {relativeTime(row.createdAt)}
          </span>
        </Tooltip>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => (
        <div className="flex flex-col">
          <span className="t-label text-[#111] truncate">{row.actorId}</span>
          <span className="t-micro text-[#8E8E93]">{row.actorType}</span>
        </div>
      ),
    },
    {
      key: "action",
      header: "Event",
      render: (row) => (
        <span className="t-mono text-[12px] text-[#111]">{row.action}</span>
      ),
    },
    {
      key: "target",
      header: "Resource",
      render: (row) => (
        <span className="t-label text-[#3C3C43] truncate">
          {row.targetType}
          {row.targetId != null ? `/${row.targetId}` : ""}
        </span>
      ),
    },
    {
      key: "ip",
      header: "IP",
      width: "140px",
      render: (row) => (
        <span className="t-mono text-[12px] text-[#8E8E93]">{getIp(row.metadata)}</span>
      ),
    },
    {
      key: "outcome",
      header: "Outcome",
      width: "120px",
      render: (row) => (
        <StatusBadge tone={outcomeTone(row.outcome)}>{row.outcome}</StatusBadge>
      ),
    },
    {
      key: "expand",
      header: "",
      width: "40px",
      align: "right",
      render: (row) => (
        <ChevronDown
          size={14}
          className={cn(
            "text-[#8E8E93] transition-transform",
            expandedId === row.id && "rotate-180",
          )}
        />
      ),
    },
  ];

  function clearFilters() {
    setActorType("all");
    setActionPrefix("");
    setPendingActionPrefix("");
    setSince("");
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit log"
        subtitle="Every action taken in this workspace by users, agents, and integrations."
        actions={
          <a href={csvUrl} download>
            <Button variant="outline" className="flex items-center gap-1.5">
              <Download size={14} />
              Export CSV
            </Button>
          </a>
        }
      />

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-[#8E8E93]" />
            <h2 className="t-title text-[#111]">Filters</h2>
          </div>
          <p className="mt-1 t-caption text-[#8E8E93]">
            Refine the timeline by actor, event prefix, or date.
          </p>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1.5">
              <span className="t-overline text-[#8E8E93]">Actor</span>
              <SegmentedControl
                size="sm"
                value={actorType}
                onChange={(id) => setActorType(id as ActorFilter)}
                items={[
                  { id: "all",   label: "All" },
                  { id: "user",  label: "Users" },
                  { id: "agent", label: "Agents" },
                ]}
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[220px] max-w-sm">
              <span className="t-overline text-[#8E8E93]">Event prefix</span>
              <SearchInput
                value={pendingActionPrefix}
                onChange={(v) => {
                  setPendingActionPrefix(v);
                  debounceCommit(setActionPrefix, v);
                }}
                placeholder="signal., governance., protocol."
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-[220px]">
              <span className="t-overline text-[#8E8E93]">Since</span>
              <input
                type="datetime-local"
                value={since}
                onChange={(e) => setSince(e.target.value)}
                className="h-9 rounded-lg border border-black/[0.08] bg-white px-3 t-label text-[#111] outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              />
            </div>

            <div className="flex items-end gap-2 ml-auto">
              <Button variant="ghost" onPress={clearFilters}>
                Clear
              </Button>
            </div>
          </div>
        </CardBody>
      </CardShell>

      <CardShell>
        <CardHeader bordered>
          <div className="flex items-center justify-between">
            <h2 className="t-title text-[#111]">Events</h2>
            <HelpText>
              {loading ? "Loading..." : `${events.length} event${events.length === 1 ? "" : "s"}`}
            </HelpText>
          </div>
        </CardHeader>

        {loading ? (
          <CardBody>
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          </CardBody>
        ) : events.length === 0 ? (
          <CardBody>
            <EmptyState
              title="No audit events"
              description="No audit events match these filters. Try widening the date range or clearing filters."
            />
          </CardBody>
        ) : (
          <>
            <DataTable
              columns={columns}
              rows={events}
              onRowClick={(row) =>
                setExpandedId((prev) => (prev === row.id ? null : row.id))
              }
            />
            {expandedId != null && (
              <div className="border-t border-[var(--color-line)] bg-[#FAFAFA] px-4 py-4">
                {(() => {
                  const ev = events.find((e) => e.id === expandedId);
                  if (!ev) return null;
                  return (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="t-label font-semibold text-[#111]">
                          Event details
                        </h3>
                        <span className="t-mono text-[12px] text-[#8E8E93]">
                          {ev.id}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <DetailRow label="Timestamp" value={formatFull(ev.createdAt)} />
                        <DetailRow label="Outcome" value={ev.outcome} />
                        <DetailRow
                          label="Actor"
                          value={`${ev.actorType}:${ev.actorId}`}
                        />
                        <DetailRow
                          label="Target"
                          value={`${ev.targetType}${ev.targetId ? "/" + ev.targetId : ""}`}
                        />
                        <DetailRow label="Transport" value={getTransport(ev.metadata)} />
                        <DetailRow label="IP" value={getIp(ev.metadata)} />
                        {ev.systemId != null && (
                          <DetailRow label="System" value={ev.systemId} />
                        )}
                      </div>
                      {ev.metadata && (
                        <div>
                          <div className="t-overline text-[#8E8E93] mb-1">Metadata</div>
                          <pre className="t-mono text-[11px] text-[#111] bg-white border border-[var(--color-line)] rounded-md p-3 overflow-x-auto">
                            {JSON.stringify(safeParseJson(ev.metadata), null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            <div className="px-4 py-3 border-t border-[var(--color-line)] flex items-center justify-between">
              <HelpText>Click a row for full event detail.</HelpText>
              <div className="flex items-center gap-2">
                <Button variant="ghost" isDisabled>
                  Previous
                </Button>
                <Button variant="ghost" isDisabled>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </CardShell>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="t-overline text-[#8E8E93]">{label}</span>
      <span className="t-label text-[#111] truncate">{value}</span>
    </div>
  );
}
