"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Chip,
  Spinner,
  Table,
  Tooltip,
} from "@heroui/react";
import { Download, Filter, RefreshCw, Search } from "lucide-react";

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

function actionColor(action: string): string {
  if (action.startsWith("signal")) return "text-violet-500";
  if (action.startsWith("governance")) return "text-amber-500";
  if (action.startsWith("protocol")) return "text-sky-500";
  if (action.startsWith("agent")) return "text-emerald-500";
  return "text-default-600";
}

function getTransport(metadata?: string): string {
  try {
    return JSON.parse(metadata ?? "{}").transport ?? "-";
  } catch {
    return "-";
  }
}

function truncate(str: string, n = 32): string {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

// ── page ──────────────────────────────────────────────────────────────────

export default function AuditSettingsPage() {
  // ── filter state (preserved) ──
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const [actorType, setActorType] = useState("");
  const [actorId, setActorId] = useState("");
  const [actionPrefix, setActionPrefix] = useState("");
  const [systemId, setSystemId] = useState("");
  const [transport, setTransport] = useState("");
  const [outcome, setOutcome] = useState("");
  const [since, setSince] = useState("");

  // pending (debounced) text fields
  const [pendingActorId, setPendingActorId] = useState("");
  const [pendingActionPrefix, setPendingActionPrefix] = useState("");
  const [pendingSystemId, setPendingSystemId] = useState("");

  // ── debounce (220 ms, preserved) ──
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function debounceCommit(setter: (v: string) => void, value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setter(value), 220);
  }

  // ── CSV export URL ──
  const csvParams = new URLSearchParams({
    actorType,
    actorId,
    actionPrefix,
    systemId,
    transport,
    outcome,
    since,
    format: "csv",
  });
  // strip empty values
  Array.from(csvParams.keys()).forEach((k) => {
    if (!csvParams.get(k)) csvParams.delete(k);
  });
  const csvUrl = `/api/settings/audit?${csvParams.toString()}`;

  // ── fetch (preserved API call + query params) ──
  const load = useCallback(() => {
    const query = new URLSearchParams();
    if (actorType) query.set("actorType", actorType);
    if (actorId) query.set("actorId", actorId);
    if (actionPrefix) query.set("actionPrefix", actionPrefix);
    if (systemId) query.set("systemId", systemId);
    if (transport) query.set("transport", transport);
    if (outcome) query.set("outcome", outcome);
    if (since) query.set("since", since);
    setLoading(true);
    fetch(`/api/settings/audit?${query.toString()}`)
      .then((r) => r.json())
      .then((d) => setEvents(d.data ?? []))
      .finally(() => setLoading(false));
  }, [actorType, actorId, actionPrefix, outcome, since, systemId, transport]);

  useEffect(() => {
    load();
  }, [load]);

  // ── clear all filters ──
  function clearFilters() {
    setActorType("");
    setActorId("");
    setPendingActorId("");
    setActionPrefix("");
    setPendingActionPrefix("");
    setSystemId("");
    setPendingSystemId("");
    setTransport("");
    setOutcome("");
    setSince("");
  }

  // ── render ──
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">

      {/* ── 1. Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Audit Log</h1>
          <p className="mt-1 text-sm text-default-500">
            Track all actions in your workspace
          </p>
        </div>
        <a href={csvUrl} download className="inline-flex items-center gap-1.5 rounded-lg border border-default-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-default-50 transition-colors">
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      {/* ── 2. Filter toolbar ── */}
      <Card className="shadow-sm">
        <Card.Content className="space-y-3 p-4">

          {/* row 1: Actor Type · Actor ID · Action prefix */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex items-center gap-1.5 self-center text-sm text-default-500">
              <Filter className="h-4 w-4 shrink-0" />
              <span className="font-medium">Filters</span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Actor Type</label>
              <select
                value={actorType || "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setActorType(v === "all" ? "" : v);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Actor type filter"
              >
                <option value="all">All actors</option>
                <option value="user">User</option>
                <option value="agent">Agent</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Actor ID</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-default-400" />
                <input type="text" placeholder="e.g. user_abc123" value={pendingActorId} onChange={(e) => { setPendingActorId(e.target.value); debounceCommit(setActorId, e.target.value); }} className="w-52 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Action prefix</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-default-400" />
                <input type="text" placeholder="signal.*, governance.*" value={pendingActionPrefix} onChange={(e) => { setPendingActionPrefix(e.target.value); debounceCommit(setActionPrefix, e.target.value); }} className="w-52 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
          </div>

          {/* row 2: System ID · Transport · Outcome */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">System ID</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-default-400" />
                <input type="text" placeholder="e.g. sys_xyz" value={pendingSystemId} onChange={(e) => { setPendingSystemId(e.target.value); debounceCommit(setSystemId, e.target.value); }} className="w-52 rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Transport</label>
              <select
                value={transport || "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setTransport(v === "all" ? "" : v);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Transport filter"
              >
                <option value="all">All transports</option>
                <option value="rest">REST</option>
                <option value="mcp">MCP</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Outcome</label>
              <select
                value={outcome || "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setOutcome(v === "all" ? "" : v);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                aria-label="Outcome filter"
              >
                <option value="all">All outcomes</option>
                <option value="success">Success</option>
                <option value="failure">Failure</option>
              </select>
            </div>
          </div>

          {/* row 3: Since · Apply · Clear */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-default-500">Since</label>
              <input type="datetime-local" value={since} onChange={(e) => setSince(e.target.value)} className="w-56 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <Button
              size="sm"
              variant="primary"
              onPress={load}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Apply filters
            </Button>
            <Button size="sm" variant="secondary" onPress={clearFilters}>
              Clear
            </Button>
          </div>

        </Card.Content>
      </Card>

      {/* ── 3 / 4 / 5. Table · Loading · Empty ── */}
      {loading ? (
        /* 4. Loading state */
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      ) : events.length === 0 ? (
        /* 5. Empty state */
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <p className="text-base font-medium text-default-600">
            No audit events found
          </p>
          <p className="text-sm text-default-400">
            No audit events found with current filters
          </p>
        </div>
      ) : (
        /* 3. Audit log table */
        <Table
          aria-label="Audit log events"
        >
          <Table.Content>
            <Table.Header>
              <Table.Row>
                <Table.Column>Time</Table.Column>
                <Table.Column>Actor</Table.Column>
                <Table.Column>Action</Table.Column>
                <Table.Column>Target</Table.Column>
                <Table.Column>Transport</Table.Column>
                <Table.Column>Outcome</Table.Column>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {events.map((ev) => {
                const t = getTransport(ev.metadata);
                const actor = truncate(`${ev.actorType}:${ev.actorId}`);
                const target = truncate(
                  `${ev.targetType}${ev.targetId ? "/" + ev.targetId : ""}`,
                );

                return (
                  <Table.Row key={ev.id}>

                    {/* Time — relative + full-timestamp tooltip */}
                    <Table.Cell className="whitespace-nowrap text-sm">
                      <Tooltip>
                        <Tooltip.Trigger><span className="cursor-default text-default-500">{relativeTime(ev.createdAt)}</span></Tooltip.Trigger>
                        <Tooltip.Content>{formatFull(ev.createdAt)}</Tooltip.Content>
                      </Tooltip>
                    </Table.Cell>

                    {/* Actor — "type:id", truncated */}
                    <Table.Cell className="max-w-[160px] truncate text-sm text-default-700">
                      <Tooltip>
                        <Tooltip.Trigger><span className="cursor-default">{actor}</span></Tooltip.Trigger>
                        <Tooltip.Content>{ev.actorType}:{ev.actorId}</Tooltip.Content>
                      </Tooltip>
                    </Table.Cell>

                    {/* Action — monospace, color-coded by prefix */}
                    <Table.Cell>
                      <span
                        className={`font-mono text-xs ${actionColor(ev.action)}`}
                      >
                        {ev.action}
                      </span>
                    </Table.Cell>

                    {/* Target — "type/id", truncated */}
                    <Table.Cell className="max-w-[160px] truncate text-sm text-default-600">
                      <Tooltip>
                        <Tooltip.Trigger><span className="cursor-default">{target}</span></Tooltip.Trigger>
                        <Tooltip.Content>{ev.targetType}{ev.targetId ? "/" + ev.targetId : ""}</Tooltip.Content>
                      </Tooltip>
                    </Table.Cell>

                    {/* Transport — Chip (rest=default, mcp=accent) */}
                    <Table.Cell>
                      {t === "-" ? (
                        <span className="text-sm text-default-400">—</span>
                      ) : (
                        <Chip
                          size="sm"
                          variant="soft"
                          color={t === "mcp" ? "accent" : "default"}
                        >
                          {t}
                        </Chip>
                      )}
                    </Table.Cell>

                    {/* Outcome — Chip (success=success, failure=danger) */}
                    <Table.Cell>
                      <Chip
                        size="sm"
                        variant="soft"
                        color={ev.outcome === "success" ? "success" : "danger"}
                      >
                        {ev.outcome}
                      </Chip>
                    </Table.Cell>

                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table>
      )}

    </div>
  );
}
