"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Card,
  Chip,
  Separator,
  Spinner,
  Table,
  Tabs,
} from "@heroui/react";
import { AlertTriangle } from "lucide-react";

const CATEGORY_COLORS: Record<string, "default" | "accent" | "default" | "success" | "warning" | "danger"> = {
  bug: "danger",
  ux: "warning",
  feature_request: "accent",
  reliability: "default",
  billing: "success",
  other: "default",
};

const SEVERITY_COLORS: Record<string, "default" | "accent" | "default" | "success" | "warning" | "danger"> = {
  high: "danger",
  medium: "warning",
  low: "default",
};

const STATUS_OPTIONS = [
  { key: "new", label: "New" },
  { key: "reviewing", label: "Reviewing" },
  { key: "closed", label: "Closed" },
];

const CATEGORY_OPTIONS = [
  { key: "all", label: "All categories" },
  { key: "bug", label: "Bug" },
  { key: "ux", label: "UX" },
  { key: "feature_request", label: "Feature request" },
  { key: "reliability", label: "Reliability" },
  { key: "billing", label: "Billing" },
  { key: "other", label: "Other" },
];

export default function AdminIssuesPage() {
  const [status, setStatus] = useState("all");
  const [category, setCategory] = useState("all");
  const [data, setData] = useState<any | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (status !== "all") q.set("status", status);
    if (category !== "all") q.set("category", category);
    const res = await fetch(`/api/admin/issues?${q.toString()}`);
    const body = await res.json();
    if (!body.ok) {
      setError(body.error ?? "Failed to load issue triage");
      setLoading(false);
      return;
    }
    setError("");
    setData(body.data);
    setLoading(false);
  }, [status, category]);

  useEffect(() => { void load(); }, [load]);

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

  const totalCount = data?.items?.length ?? 0;
  const openCount = data?.openCount ?? 0;

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">Issue Triage</h1>
            <p className="text-default-500 text-sm mt-1">Early beta feedback queue with lightweight issue triage statuses.</p>
          </div>
          {data && (
            <div className="flex items-center gap-2 ml-2">
              <Chip size="sm" variant="soft" color="default">
                {totalCount} total
              </Chip>
              <Chip size="sm" variant="soft" color="warning">
                {openCount} open
              </Chip>
            </div>
          )}
        </div>
        <button
          className="px-4 py-2 rounded-lg border border-default-200 text-sm font-medium hover:bg-default-100 transition-colors"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <Card className="border border-danger-200 bg-danger-50">
          <Card.Content className="flex flex-row items-center gap-3 py-4">
            <AlertTriangle className="w-5 h-5 text-danger flex-shrink-0" />
            <div>
              <p className="font-semibold text-danger">Operator access required</p>
              <p className="text-sm text-danger-600">{error}</p>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Status tabs */}
        <Tabs
          selectedKey={status}
          onSelectionChange={(key) => setStatus(String(key))}
          aria-label="Status filter"
        >
          <Tabs.List>
            <Tabs.Tab id="all">All</Tabs.Tab>
            <Tabs.Tab id="new">New</Tabs.Tab>
            <Tabs.Tab id="reviewing">Reviewing</Tabs.Tab>
            <Tabs.Tab id="closed">Closed</Tabs.Tab>
          </Tabs.List>
        </Tabs>

        {/* Category filter */}
        <div className="w-48">
          <select
            aria-label="Category filter"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && !data && (
        <div className="flex items-center justify-center py-16">
          <Spinner size="lg" />
        </div>
      )}

      {data && (
        <>
          {/* Failure Groups Rollup */}
          {data.failureGroups?.length > 0 && (
            <Card>
              <Card.Header className="pb-2">
                <h2 className="text-base font-semibold">Failure Rollup</h2>
              </Card.Header>
              <Separator />
              <Card.Content>
                <div className="flex flex-wrap gap-2">
                  {data.failureGroups.map((group: any) => (
                    <div
                      key={group.key}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-default-50 border border-default-100"
                    >
                      <span className="text-xs text-default-600">{group.label}</span>
                      <Chip size="sm" color={group.count > 0 ? "danger" : "default"} variant="soft">
                        {group.count}
                      </Chip>
                    </div>
                  ))}
                </div>
              </Card.Content>
            </Card>
          )}

          {/* Issues Table */}
          <Card>
            <Card.Header className="pb-2">
              <h2 className="text-lg font-semibold">Feedback Items</h2>
            </Card.Header>
            <Separator />
            <Card.Content className="px-0 pb-0">
              {data.items.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center px-6">
                  <p className="font-medium text-default-600">No feedback items</p>
                  <p className="text-sm text-default-400">Feedback submitted by users appears here for triage.</p>
                </div>
              ) : (
                <Table
                  aria-label="Issues table"
                >
                  <Table.Content>
                    <Table.Header>
                      <Table.Row>
                        <Table.Column>Time</Table.Column>
                        <Table.Column>Category</Table.Column>
                        <Table.Column>Severity</Table.Column>
                        <Table.Column>Summary</Table.Column>
                        <Table.Column>Page</Table.Column>
                        <Table.Column>Status</Table.Column>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {data.items.map((item: any) => (
                        <Table.Row key={item.id}>
                          <Table.Cell>
                            <span className="text-xs text-default-500 whitespace-nowrap">
                              {item.createdAt
                                ? new Date(item.createdAt).toLocaleString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "-"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={CATEGORY_COLORS[item.category] ?? "default"}
                              variant="soft"
                            >
                              {item.category ?? "-"}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <Chip
                              size="sm"
                              color={SEVERITY_COLORS[item.severity] ?? "default"}
                              variant="soft"
                            >
                              {item.severity ?? "-"}
                            </Chip>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-sm max-w-xs block truncate" title={item.summary}>
                              {item.summary ?? "-"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <span className="text-xs text-default-500 font-mono">
                              {item.page ?? "-"}
                            </span>
                          </Table.Cell>
                          <Table.Cell>
                            <div className="w-36">
                              {updatingId === item.id ? (
                                <Spinner size="sm" />
                              ) : (
                                <select
                                  aria-label={`Status for ${item.id}`}
                                  value={item.status ?? "new"}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val && val !== item.status) {
                                      void handleStatusChange(item.id, val);
                                    }
                                  }}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                  {STATUS_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>{opt.label}</option>
                                  ))}
                                </select>
                              )}
                            </div>
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
      )}
    </div>
  );
}
