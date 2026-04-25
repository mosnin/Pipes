"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Chip,
  Separator,
  Spinner,
  Table,
} from "@heroui/react";
import { Activity, AlertCircle, Users } from "lucide-react";

export default function AdminPage() {
  const [data, setData] = useState<any | null>(null);
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
    setData(body.data);
  }, [systemId, userEmail]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Admin Support</h1>
      </div>

      {/* Lookup toolbar */}
      <Card className="shadow-sm">
        <Card.Header className="pb-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-default-600">
            <Users size={16} />
            Lookup
          </div>
        </Card.Header>
        <Separator />
        <Card.Content>
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-medium text-default-500 uppercase tracking-wide">
                User email
              </label>
              <input
                type="email"
                value={userEmail}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="operator@example.com"
                className="w-full px-3 py-2 rounded-lg border border-default-200 bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <label className="text-xs font-medium text-default-500 uppercase tracking-wide">
                System ID
              </label>
              <input
                type="text"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                placeholder="sys_..."
                className="w-full px-3 py-2 rounded-lg border border-default-200 bg-default-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <button
              onClick={() => void load()}
              disabled={loading}
              className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              {loading ? <Spinner size="sm" /> : null}
              Inspect
            </button>
          </div>
        </Card.Content>
      </Card>

      {/* Error state */}
      {error ? (
        <Card className="shadow-sm border-danger-200">
          <Card.Content>
            <div className="flex items-center gap-3 text-danger">
              <AlertCircle size={18} />
              <div>
                <p className="font-semibold text-sm">Operator access required</p>
                <p className="text-xs text-default-500 mt-0.5">{error}</p>
              </div>
            </div>
          </Card.Content>
        </Card>
      ) : null}

      {/* Results */}
      {data ? (
        <>
          {/* Workspace summary */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-sm">Workspace Summary</span>
                <div className="flex gap-2">
                  <Chip size="sm" variant="soft" color="accent">
                    {data.workspace.plan.plan}
                  </Chip>
                  <Chip
                    size="sm"
                    variant="soft"
                    color={data.workspace.plan.status === "active" ? "success" : "warning"}
                  >
                    {data.workspace.plan.status}
                  </Chip>
                </div>
              </div>
            </Card.Header>
            <Separator />
            <Card.Content className="flex flex-col gap-4">
              <p className="text-xs text-default-400 font-mono">{data.workspace.workspaceId}</p>

              {/* Big stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Systems", value: data.workspace.systems.length },
                  { label: "Invites", value: data.workspace.invites.length },
                  { label: "Tokens", value: data.workspace.tokens.length },
                  {
                    label: "Members",
                    value:
                      data.workspace.members?.length ??
                      data.workspace.invites.length,
                  },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    className="flex flex-col gap-1 p-3 rounded-xl bg-default-50 border border-default-100"
                  >
                    <span className="text-xs text-default-400 font-medium">{label}</span>
                    <span className="text-2xl font-bold text-default-800">{value}</span>
                  </div>
                ))}
              </div>

              {/* Health metrics */}
              <div className="flex flex-col gap-3">
                <span className="text-xs font-semibold text-default-500 uppercase tracking-wide">
                  Activation Health
                </span>
                {[
                  {
                    label: "Active Systems",
                    value: data.workspace.health.activeSystems,
                    max: Math.max(data.workspace.systems.length, 1),
                    colorClass: "bg-green-500",
                  },
                  {
                    label: "Favorites",
                    value: data.workspace.health.favorites,
                    max: Math.max(data.workspace.systems.length, 1),
                    colorClass: "bg-indigo-600",
                  },
                  {
                    label: "Recent Reopens",
                    value: data.workspace.health.recentReopens,
                    max: 10,
                    colorClass: "bg-purple-500",
                  },
                ].map(({ label, value, max, colorClass }) => {
                  const pct = Math.min((value / max) * 100, 100);
                  return (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-default-500 w-32 shrink-0">{label}</span>
                      <div className="flex-1 w-full bg-slate-200 rounded-full h-1.5">
                        <div
                          className={`${colorClass} h-1.5 rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-default-700 w-6 text-right">
                        {value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </Card.Content>
          </Card>

          {/* User detail */}
          {data.user ? (
            <Card className="shadow-sm">
              <Card.Header className="pb-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Users size={15} />
                  User Detail
                </div>
              </Card.Header>
              <Separator />
              <Card.Content>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Name", value: data.user.name ?? "—" },
                    { label: "Email", value: data.user.email },
                    { label: "Role", value: data.user.role ?? "member" },
                    {
                      label: "Joined",
                      value: data.user.createdAt
                        ? new Date(data.user.createdAt).toLocaleDateString()
                        : "—",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-xs text-default-400 font-medium uppercase tracking-wide">
                        {label}
                      </span>
                      <span className="text-sm font-semibold text-default-800 truncate" title={value}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          ) : null}

          {/* System summary */}
          {data.system ? (
            <Card className="shadow-sm">
              <Card.Header className="pb-2">
                <span className="font-semibold text-sm">System Summary</span>
              </Card.Header>
              <Separator />
              <Card.Content>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-default-800">
                      {data.system.bundle.system.name}
                    </span>
                    <Chip size="sm" variant="soft" color="default">
                      {data.system.bundle.system.id}
                    </Chip>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Nodes", value: data.system.bundle.nodes.length },
                      { label: "Pipes", value: data.system.bundle.pipes.length },
                      { label: "Versions", value: data.system.bundle.versions.length },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="flex flex-col gap-1 p-3 rounded-xl bg-default-50 border border-default-100"
                      >
                        <span className="text-xs text-default-400">{label}</span>
                        <span className="text-xl font-bold">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card.Content>
            </Card>
          ) : null}

          {/* Recent audit events */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Activity size={15} />
                Recent Audit Events
                <Chip size="sm" variant="soft" color="default" className="ml-auto">
                  last 20
                </Chip>
              </div>
            </Card.Header>
            <Separator />
            <Card.Content className="px-0 pb-0">
              {data.audits.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-default-400">
                  <AlertCircle size={24} className="mb-2" />
                  <p className="text-sm font-medium">No audit events</p>
                  <p className="text-xs">No events in the selected filter.</p>
                </div>
              ) : (
                <Table
                  aria-label="Recent audit events"
                >
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Time</Table.Column>
                        <Table.Column>Actor</Table.Column>
                        <Table.Column>Action</Table.Column>
                        <Table.Column>Target</Table.Column>
                        <Table.Column>Outcome</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.audits.slice(0, 20).map((a: any, i: number) => (
                        <Table.Row key={i}>
                          <Table.Cell className="text-xs text-default-500 whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleString()}
                          </Table.Cell>
                          <Table.Cell className="text-xs font-mono">
                            {a.actorType}:{a.actorId}
                          </Table.Cell>
                          <Table.Cell className="text-xs font-medium">{a.action}</Table.Cell>
                          <Table.Cell className="text-xs text-default-500">
                            {a.systemId ?? "—"}
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              variant="soft"
                              color={a.outcome === "success" ? "success" : "danger"}
                            >
                              {a.outcome}
                            </Chip>
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>

          {/* Product signals */}
          <Card className="shadow-sm">
            <Card.Header className="pb-2">
              <span className="font-semibold text-sm">Product Signals</span>
            </Card.Header>
            <Separator />
            <Card.Content className="px-0 pb-0">
              {data.workspace.recentSignals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-default-400">
                  <AlertCircle size={24} className="mb-2" />
                  <p className="text-sm font-medium">No signals</p>
                  <p className="text-xs">No recent signal events yet.</p>
                </div>
              ) : (
                <Table
                  aria-label="Recent product signals"
                >
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Time</Table.Column>
                        <Table.Column>Signal</Table.Column>
                        <Table.Column>Target</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.workspace.recentSignals.map((a: any, i: number) => (
                        <Table.Row key={i}>
                          <Table.Cell className="text-xs text-default-500 whitespace-nowrap">
                            {new Date(a.createdAt).toLocaleString()}
                          </Table.Cell>
                          <Table.Cell className="text-xs font-medium">{a.action}</Table.Cell>
                          <Table.Cell className="text-xs font-mono text-default-500">
                            {a.targetType}:{a.targetId ?? ""}
                          </Table.Cell>
                        </Table.Row>
                      ))}
                    </Table.Body>
                  </Table.Content>
                </Table>
              )}
            </Card.Content>
          </Card>
        </>
      ) : null}
    </div>
  );
}
